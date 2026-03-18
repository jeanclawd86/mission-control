import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const WORKSPACE = process.env.WORKSPACE_PATH || "/Users/jeanclawd/openclaw/workspace";

function safeRead(filePath: string): string | null {
  try {
    return fs.readFileSync(path.join(WORKSPACE, filePath), "utf-8");
  } catch {
    return null;
  }
}

function parseTaskQueue(content: string) {
  const lines = content.split("\n");
  const tasks: { title: string; done: boolean; priority: string; output?: string }[] = [];
  let currentPriority = "";

  for (const line of lines) {
    const prioMatch = line.match(/^### (P\d)/);
    if (prioMatch) currentPriority = prioMatch[1];

    const taskMatch = line.match(/^- \[([ x])\] \*\*(.+?)\*\*/);
    if (taskMatch) {
      tasks.push({
        done: taskMatch[1] === "x",
        title: taskMatch[2],
        priority: currentPriority,
      });
    }
  }

  // Also parse "Waiting on Chris" section
  let inWaiting = false;
  for (const line of lines) {
    if (line.includes("## Waiting on Chris")) { inWaiting = true; continue; }
    if (line.startsWith("## ") && inWaiting) break;
    if (inWaiting) {
      const wMatch = line.match(/^- \[([ x])\] (.+)/);
      if (wMatch) {
        tasks.push({
          done: wMatch[1] === "x",
          title: wMatch[2].replace(/\*\*/g, ""),
          priority: "W",
        });
      }
    }
  }

  return tasks;
}

function getMemoryHealth() {
  const memDir = path.join(WORKSPACE, "memory");
  const files: { name: string; size: number; modified: string }[] = [];
  let totalSize = 0;

  try {
    // Daily files
    const entries = fs.readdirSync(memDir);
    for (const e of entries) {
      const full = path.join(memDir, e);
      const stat = fs.statSync(full);
      if (stat.isFile() && e.endsWith(".md")) {
        files.push({ name: e, size: stat.size, modified: stat.mtime.toISOString() });
        totalSize += stat.size;
      }
    }

    // Topic files
    const topicsDir = path.join(memDir, "topics");
    if (fs.existsSync(topicsDir)) {
      for (const e of fs.readdirSync(topicsDir)) {
        const full = path.join(topicsDir, e);
        const stat = fs.statSync(full);
        if (stat.isFile()) {
          files.push({ name: `topics/${e}`, size: stat.size, modified: stat.mtime.toISOString() });
          totalSize += stat.size;
        }
      }
    }

    // Project files
    const projDir = path.join(memDir, "projects");
    if (fs.existsSync(projDir)) {
      for (const e of fs.readdirSync(projDir)) {
        const full = path.join(projDir, e);
        const stat = fs.statSync(full);
        if (stat.isFile()) {
          files.push({ name: `projects/${e}`, size: stat.size, modified: stat.mtime.toISOString() });
          totalSize += stat.size;
        }
      }
    }
  } catch {}

  // MEMORY.md
  try {
    const memStat = fs.statSync(path.join(WORKSPACE, "MEMORY.md"));
    files.push({ name: "MEMORY.md", size: memStat.size, modified: memStat.mtime.toISOString() });
    totalSize += memStat.size;
  } catch {}

  return {
    fileCount: files.length,
    totalSizeKB: Math.round(totalSize / 1024),
    files: files.sort((a, b) => b.modified.localeCompare(a.modified)),
  };
}

function getIncomeStatus() {
  const content = safeRead("memory/projects/income-tracker.md");
  if (!content) return null;

  const streams: { name: string; status: string; monthly: string }[] = [];
  const lines = content.split("\n");
  let inTable = false;

  for (const line of lines) {
    if (line.includes("| Stream") || line.includes("|---")) {
      inTable = true;
      continue;
    }
    if (inTable && line.startsWith("|")) {
      const cols = line.split("|").filter(Boolean).map((c) => c.trim());
      if (cols.length >= 3) {
        streams.push({ name: cols[0], status: cols[1], monthly: cols[2] });
      }
    } else if (inTable && !line.startsWith("|")) {
      inTable = false;
    }
  }

  return streams;
}

export async function GET() {
  // Try live filesystem first; fall back to static snapshot
  const taskContent = safeRead("memory/task-queue.md");
  if (!taskContent) {
    // Running on Vercel — serve static snapshot
    try {
      const snapshotPath = path.join(process.cwd(), "public", "snapshot.json");
      const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf-8"));
      return NextResponse.json(snapshot);
    } catch {
      return NextResponse.json({ error: "No data available" }, { status: 500 });
    }
  }

  const tasks = taskContent ? parseTaskQueue(taskContent) : [];
  const memory = getMemoryHealth();
  const income = getIncomeStatus();

  // Count tasks
  const queuedTasks = tasks.filter((t) => !t.done && t.priority !== "W");
  const waitingTasks = tasks.filter((t) => t.priority === "W" && !t.done);
  const completedTasks = tasks.filter((t) => t.done);

  // Recent daily files (last 7)
  const dailyFiles = memory.files
    .filter((f) => f.name.match(/^\d{4}-\d{2}-\d{2}\.md$/))
    .slice(0, 7);

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    tasks: {
      queued: queuedTasks,
      waiting: waitingTasks,
      completed: completedTasks,
      total: tasks.length,
    },
    memory,
    income,
    dailyFiles,
  });
}
