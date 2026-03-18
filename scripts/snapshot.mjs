#!/usr/bin/env node
/**
 * Generates a static data snapshot from workspace files for Vercel deployment.
 * Run before `vercel deploy` to bake in current state.
 */
import fs from "fs";
import path from "path";

const WORKSPACE = process.env.WORKSPACE_PATH || "/Users/jeanclawd/openclaw/workspace";

function safeRead(filePath) {
  try {
    return fs.readFileSync(path.join(WORKSPACE, filePath), "utf-8");
  } catch {
    return null;
  }
}

function parseTaskQueue(content) {
  const lines = content.split("\n");
  const tasks = [];
  let currentPriority = "";

  for (const line of lines) {
    const prioMatch = line.match(/^### (P\d)/);
    if (prioMatch) currentPriority = prioMatch[1];
    const taskMatch = line.match(/^- \[([ x])\] \*\*(.+?)\*\*/);
    if (taskMatch) {
      tasks.push({ done: taskMatch[1] === "x", title: taskMatch[2], priority: currentPriority });
    }
  }

  let inWaiting = false;
  for (const line of lines) {
    if (line.includes("## Waiting on Chris")) { inWaiting = true; continue; }
    if (line.startsWith("## ") && inWaiting) break;
    if (inWaiting) {
      const wMatch = line.match(/^- \[([ x])\] (.+)/);
      if (wMatch) {
        tasks.push({ done: wMatch[1] === "x", title: wMatch[2].replace(/\*\*/g, ""), priority: "W" });
      }
    }
  }
  return tasks;
}

function getMemoryHealth() {
  const memDir = path.join(WORKSPACE, "memory");
  const files = [];
  let totalSize = 0;

  for (const sub of ["", "topics", "projects"]) {
    const dir = sub ? path.join(memDir, sub) : memDir;
    try {
      for (const e of fs.readdirSync(dir)) {
        const full = path.join(dir, e);
        const stat = fs.statSync(full);
        if (stat.isFile() && (e.endsWith(".md") || e.endsWith(".json"))) {
          const name = sub ? `${sub}/${e}` : e;
          files.push({ name, size: stat.size, modified: stat.mtime.toISOString() });
          totalSize += stat.size;
        }
      }
    } catch {}
  }

  try {
    const memStat = fs.statSync(path.join(WORKSPACE, "MEMORY.md"));
    files.push({ name: "MEMORY.md", size: memStat.size, modified: memStat.mtime.toISOString() });
    totalSize += memStat.size;
  } catch {}

  return { fileCount: files.length, totalSizeKB: Math.round(totalSize / 1024), files: files.sort((a, b) => b.modified.localeCompare(a.modified)) };
}

function getIncomeStatus() {
  const content = safeRead("memory/projects/income-tracker.md");
  if (!content) return null;
  const streams = [];
  const lines = content.split("\n");
  let inTable = false;
  for (const line of lines) {
    if (line.includes("| Stream") || line.includes("|---")) { inTable = true; continue; }
    if (inTable && line.startsWith("|")) {
      const cols = line.split("|").filter(Boolean).map(c => c.trim());
      if (cols.length >= 3) streams.push({ name: cols[0], status: cols[1], monthly: cols[2] });
    } else if (inTable && !line.startsWith("|")) { inTable = false; }
  }
  return streams;
}

const taskContent = safeRead("memory/task-queue.md");
const tasks = taskContent ? parseTaskQueue(taskContent) : [];
const memory = getMemoryHealth();
const income = getIncomeStatus();

const queuedTasks = tasks.filter(t => !t.done && t.priority !== "W");
const waitingTasks = tasks.filter(t => t.priority === "W" && !t.done);
const completedTasks = tasks.filter(t => t.done);
const dailyFiles = memory.files.filter(f => f.name.match(/^\d{4}-\d{2}-\d{2}\.md$/)).slice(0, 7);

const snapshot = {
  timestamp: new Date().toISOString(),
  tasks: { queued: queuedTasks, waiting: waitingTasks, completed: completedTasks, total: tasks.length },
  memory,
  income,
  dailyFiles,
};

const outDir = path.join(process.cwd(), "public");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "snapshot.json"), JSON.stringify(snapshot, null, 2));
console.log(`✅ Snapshot written (${tasks.length} tasks, ${memory.fileCount} files)`);
