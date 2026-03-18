"use client";

import { useEffect, useState } from "react";

interface Task {
  title: string;
  done: boolean;
  priority: string;
}

interface MemFile {
  name: string;
  size: number;
  modified: string;
}

interface Income {
  name: string;
  status: string;
  monthly: string;
}

interface DashData {
  timestamp: string;
  tasks: {
    queued: Task[];
    waiting: Task[];
    completed: Task[];
    total: number;
  };
  memory: {
    fileCount: number;
    totalSizeKB: number;
    files: MemFile[];
  };
  income: Income[] | null;
  dailyFiles: MemFile[];
}

function formatBytes(kb: number) {
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function priorityColor(p: string) {
  switch (p) {
    case "P0": return "text-red-400";
    case "P1": return "text-amber-400";
    case "P2": return "text-blue-400";
    case "P3": return "text-gray-400";
    case "W": return "text-purple-400";
    default: return "text-gray-400";
  }
}

function priorityBg(p: string) {
  switch (p) {
    case "P0": return "bg-red-500/10 border-red-500/20";
    case "P1": return "bg-amber-500/10 border-amber-500/20";
    case "P2": return "bg-blue-500/10 border-blue-500/20";
    case "P3": return "bg-gray-500/10 border-gray-500/20";
    case "W": return "bg-purple-500/10 border-purple-500/20";
    default: return "bg-gray-500/10 border-gray-500/20";
  }
}

function StatusDot({ color }: { color: string }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${color} pulse-dot`} />
  );
}

function StatCard({ label, value, sub, color = "text-amber-400" }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 card-hover">
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(e.message));

    const interval = setInterval(() => {
      fetch("/api/status")
        .then((r) => r.json())
        .then(setData)
        .catch(() => {});
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading mission data...</div>
      </div>
    );
  }

  const completionRate = data.tasks.total > 0
    ? Math.round((data.tasks.completed.length / data.tasks.total) * 100)
    : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🥋</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Mission Control</h1>
            <p className="text-sm text-gray-500">Jean Clawd — Operational Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <StatusDot color="bg-green-400" />
          <span>Online</span>
          <span className="mx-2">·</span>
          <span>Updated {timeAgo(data.timestamp)}</span>
        </div>
      </div>

      {/* Mission Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4 mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-amber-400 font-semibold text-sm">🎯 MISSION</span>
        </div>
        <p className="text-gray-300 text-sm">
          Help Chris build financial independence. Target: <span className="text-amber-400 font-bold">$10K/month</span> income ASAP while building UserLabs into a viable business.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Completion" value={`${completionRate}%`} sub={`${data.tasks.completed.length}/${data.tasks.total} tasks`} />
        <StatCard label="Queued" value={data.tasks.queued.length} sub="active tasks" color="text-blue-400" />
        <StatCard label="Waiting on Chris" value={data.tasks.waiting.length} sub="needs input" color="text-purple-400" />
        <StatCard label="Memory Files" value={data.memory.fileCount} sub={formatBytes(data.memory.totalSizeKB)} color="text-green-400" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Active Tasks */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 card-hover">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            📋 Active Tasks
          </h2>
          {data.tasks.queued.length === 0 ? (
            <p className="text-gray-600 text-sm italic">All tasks complete! 🎉</p>
          ) : (
            <div className="space-y-2">
              {data.tasks.queued.map((t, i) => (
                <div key={i} className={`flex items-center gap-3 p-2 rounded-lg border ${priorityBg(t.priority)}`}>
                  <span className={`text-xs font-mono font-bold ${priorityColor(t.priority)}`}>{t.priority}</span>
                  <span className="text-sm text-gray-300 flex-1">{t.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Waiting on Chris */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 card-hover">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            ⏳ Waiting on Chris
          </h2>
          {data.tasks.waiting.length === 0 ? (
            <p className="text-gray-600 text-sm italic">Nothing pending</p>
          ) : (
            <div className="space-y-2">
              {data.tasks.waiting.map((t, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg border bg-purple-500/5 border-purple-500/15">
                  <span className="text-purple-400 text-xs">⬜</span>
                  <span className="text-sm text-gray-300 flex-1">{t.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Income Streams */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 card-hover">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            💰 Income Streams
          </h2>
          {!data.income || data.income.length === 0 ? (
            <p className="text-gray-600 text-sm italic">No income data found</p>
          ) : (
            <div className="space-y-2">
              {data.income.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg border border-gray-800 bg-gray-800/30">
                  <div>
                    <span className="text-sm text-gray-300">{s.name}</span>
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                      s.status.toLowerCase().includes("active") ? "bg-green-500/15 text-green-400" :
                      s.status.toLowerCase().includes("pipeline") || s.status.toLowerCase().includes("prospect") ? "bg-amber-500/15 text-amber-400" :
                      s.status.toLowerCase().includes("ending") || s.status.toLowerCase().includes("wind") ? "bg-red-500/15 text-red-400" :
                      "bg-gray-500/15 text-gray-400"
                    }`}>{s.status}</span>
                  </div>
                  <span className="text-sm font-mono text-green-400">{s.monthly}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Memory Health */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 card-hover">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            🧠 Memory Health
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total files</span>
              <span className="text-gray-300">{data.memory.fileCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total size</span>
              <span className="text-gray-300">{formatBytes(data.memory.totalSizeKB)}</span>
            </div>
            <div className="border-t border-gray-800 pt-3 mt-3">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Recent Files</div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {data.memory.files.slice(0, 10).map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 truncate flex-1 mr-2">{f.name}</span>
                    <span className="text-gray-600 whitespace-nowrap">{timeAgo(f.modified)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Completed */}
        <div className="md:col-span-2 bg-gray-900/50 border border-gray-800 rounded-xl p-5 card-hover">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            ✅ Recently Completed ({data.tasks.completed.length})
          </h2>
          <div className="grid md:grid-cols-2 gap-2">
            {data.tasks.completed.slice(0, 12).map((t, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-green-500/5 border border-green-500/10">
                <span className="text-green-500 text-xs">✓</span>
                <span className={`text-xs font-mono ${priorityColor(t.priority)}`}>{t.priority}</span>
                <span className="text-sm text-gray-400 flex-1 truncate">{t.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Activity Timeline */}
        <div className="md:col-span-2 bg-gray-900/50 border border-gray-800 rounded-xl p-5 card-hover">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            📅 Daily Activity
          </h2>
          <div className="flex gap-2 flex-wrap">
            {data.dailyFiles.map((f, i) => {
              const date = f.name.replace(".md", "");
              const sizeKB = Math.round(f.size / 1024);
              // Intensity based on file size
              const intensity = Math.min(sizeKB / 10, 1);
              return (
                <div
                  key={i}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-800"
                  title={`${date}: ${sizeKB} KB`}
                >
                  <div
                    className="w-8 h-8 rounded-md"
                    style={{
                      backgroundColor: `rgba(245, 158, 11, ${0.1 + intensity * 0.6})`,
                    }}
                  />
                  <span className="text-[10px] text-gray-500">{date.slice(5)}</span>
                  <span className="text-[10px] text-gray-600">{sizeKB}KB</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-gray-600">
        <p>🥋 Jean Clawd Mission Control · Auto-refreshes every 30s</p>
      </div>
    </div>
  );
}
