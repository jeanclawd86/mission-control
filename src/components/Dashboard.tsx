'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { TasksData, Task, TaskStatus } from '@/lib/types';
import { isArchived } from '@/lib/utils';
import Sidebar from './Sidebar';
import ProjectTabs from './ProjectTabs';
import KanbanBoard from './KanbanBoard';
import ThemeToggle from './ThemeToggle';

const ARCHIVE_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

const AUTH_HEADERS: HeadersInit = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.NEXT_PUBLIC_MC_API_KEY}`,
};

// ─── CreateTaskModal ─────────────────────────────────────────────────────────

interface CreateTaskModalProps {
  topics: { id: number; name: string }[];
  projects: { id: string; name: string }[];
  defaultTopic: number | null;
  defaultProject: string | null;
  onClose: () => void;
  onCreate: (task: {
    title: string;
    description: string;
    topic: number;
    project: string;
    priority: string;
    status: string;
  }) => void;
}

function CreateTaskModal({ topics, projects, defaultTopic, defaultProject, onClose, onCreate }: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topic, setTopic] = useState<number>(defaultTopic ?? topics[0]?.id ?? 0);
  const [project, setProject] = useState(defaultProject ?? '');
  const [priority, setPriority] = useState('p2');
  const [status, setStatus] = useState('not-started');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    onCreate({ title, description, topic, project, priority, status });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 sm:rounded-xl rounded-t-xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full sm:max-w-md sm:mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="px-5 pt-5 pb-4 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">New Task</h2>

            {/* Title */}
            <div>
              <input
                autoFocus
                type="text"
                placeholder="Task title..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500"
              />
            </div>

            {/* Description */}
            <div>
              <textarea
                placeholder="Description (optional)"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 resize-none"
              />
            </div>

            {/* Row: Topic + Project */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Topic</label>
                <select
                  value={topic}
                  onChange={e => setTopic(Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                >
                  {topics.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Project</label>
                <select
                  value={project}
                  onChange={e => setProject(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                >
                  <option value="">None</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row: Priority + Status */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Priority</label>
                <div className="flex gap-1.5">
                  {['p1', 'p2', 'p3'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex-1 py-1 text-[11px] font-medium rounded-md border transition-colors ${
                        priority === p
                          ? p === 'p1' ? 'bg-red-500/20 text-red-400 border-red-500/40'
                            : p === 'p2' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            : 'bg-gray-500/20 text-gray-400 border-gray-500/40'
                          : 'bg-transparent text-gray-500 border-gray-300 dark:border-gray-700 hover:border-gray-500'
                      }`}
                    >
                      {p.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                >
                  <option value="not-started">Not Started</option>
                  <option value="in-progress">In Progress</option>
                  <option value="waiting">Waiting</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 flex justify-end gap-2 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || submitting}
              className="px-4 py-1.5 text-xs font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {submitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const HIDDEN_TOPICS_KEY = 'mission-control-hidden-topics';

function loadHiddenTopics(): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(HIDDEN_TOPICS_KEY);
    if (stored) return new Set(JSON.parse(stored));
  } catch {}
  return new Set();
}

function saveHiddenTopics(hidden: Set<number>) {
  try {
    localStorage.setItem(HIDDEN_TOPICS_KEY, JSON.stringify(Array.from(hidden)));
  } catch {}
}

interface Props {
  data: TasksData;
}

export default function Dashboard({ data }: Props) {
  const [dark, setDark] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [hiddenTopics, setHiddenTopics] = useState<Set<number>>(new Set());
  const [tasks, setTasks] = useState<Task[]>(data.tasks);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load hidden topics from localStorage on mount
  useEffect(() => {
    setHiddenTopics(loadHiddenTopics());
  }, []);

  // Poll for task changes every 5 seconds (picks up agent writes to tasks.json)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/tasks', { headers: AUTH_HEADERS });
        if (res.ok) {
          const fresh: TasksData = await res.json();
          setTasks(fresh.tasks);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-archive: done tasks with updatedAt older than 3 days get archivedAt set
  useEffect(() => {
    const now = Date.now();
    setTasks(prev => {
      let changed = false;
      const next = prev.map(t => {
        if (t.status === 'done' && !t.archivedAt) {
          const updatedTime = new Date(t.updatedAt).getTime();
          if (now - updatedTime >= ARCHIVE_THRESHOLD_MS) {
            changed = true;
            return { ...t, archivedAt: new Date().toISOString() };
          }
        }
        return t;
      });
      return changed ? next : prev;
    });
  }, []);

  const handleArchive = useCallback((taskId: string) => {
    const archivedAt = new Date().toISOString();
    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, archivedAt } : t
    ));
    // Persist to API
    fetch('/api/tasks', {
      method: 'PATCH',
      headers: AUTH_HEADERS,
      body: JSON.stringify({ id: taskId, archivedAt }),
    }).catch(() => {
      // Revert on failure
      setTasks(prev => prev.map(t => {
        const original = data.tasks.find(ot => ot.id === taskId);
        return t.id === taskId && original ? { ...t, archivedAt: original.archivedAt } : t;
      }));
    });
  }, [data.tasks]);

  const handleUnarchive = useCallback((taskId: string) => {
    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, archivedAt: null } : t
    ));
    // Persist to API
    fetch('/api/tasks', {
      method: 'PATCH',
      headers: AUTH_HEADERS,
      body: JSON.stringify({ id: taskId, archivedAt: null }),
    }).catch(() => {
      // Revert on failure
      setTasks(prev => prev.map(t => {
        const original = data.tasks.find(ot => ot.id === taskId);
        return t.id === taskId && original ? { ...t, archivedAt: original.archivedAt } : t;
      }));
    });
  }, [data.tasks]);

  const handleStatusChange = useCallback((taskId: string, newStatus: TaskStatus) => {
    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t
    ));
    // Persist to API
    fetch('/api/tasks', {
      method: 'PATCH',
      headers: AUTH_HEADERS,
      body: JSON.stringify({ id: taskId, status: newStatus }),
    }).catch(() => {
      // Revert on failure
      setTasks(prev => prev.map(t => {
        const original = data.tasks.find(ot => ot.id === taskId);
        return t.id === taskId && original ? { ...t, status: original.status } : t;
      }));
    });
  }, [data.tasks]);

  const handleCreate = useCallback(async (taskData: {
    title: string;
    description: string;
    topic: number;
    project: string;
    priority: string;
    status: string;
  }) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: AUTH_HEADERS,
        body: JSON.stringify(taskData),
      });
      if (res.ok) {
        const { task } = await res.json();
        setTasks(prev => [...prev, task]);
        setShowCreateModal(false);
      }
    } catch {}
  }, []);

  const handleReorder = useCallback((reorderedTasks: Task[]) => {
    // For now, reorder is client-side only (priority still determines visual order)
    setTasks(prev => {
      const reorderedIds = new Set(reorderedTasks.map(t => t.id));
      const unchanged = prev.filter(t => !reorderedIds.has(t.id));
      return [...reorderedTasks, ...unchanged];
    });
  }, []);

  const toggleHidden = useCallback((topicId: number) => {
    setHiddenTopics(prev => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      saveHiddenTopics(next);
      return next;
    });
  }, []);

  // Tasks scoped by topic (hidden topics excluded from "All Topics" view)
  const topicTasks = useMemo(() => {
    if (selectedTopic === null) {
      return tasks.filter(t => !hiddenTopics.has(t.topic));
    }
    return tasks.filter(t => t.topic === selectedTopic);
  }, [tasks, selectedTopic, hiddenTopics]);

  // Projects visible in current topic scope
  const visibleProjects = useMemo(() => {
    if (selectedTopic === null) {
      // Show projects that have at least one task in non-hidden topics
      const visibleProjectIds = new Set(topicTasks.map(t => t.project));
      return data.projects.filter(p => visibleProjectIds.has(p.id));
    }
    return data.projects.filter(p => p.topics.includes(selectedTopic));
  }, [data.projects, selectedTopic, topicTasks]);

  // Reset project selection when topic changes and project isn't in new scope
  const effectiveProject = useMemo(() => {
    if (selectedProject === null) return null;
    if (visibleProjects.some(p => p.id === selectedProject)) return selectedProject;
    return null;
  }, [selectedProject, visibleProjects]);

  // Tasks scoped by topic + project
  const filteredTasks = useMemo(() => {
    if (effectiveProject === null) return topicTasks;
    return topicTasks.filter(t => t.project === effectiveProject);
  }, [topicTasks, effectiveProject]);

  const activeTasks = useMemo(
    () => filteredTasks.filter((t: Task) => !isArchived(t)),
    [filteredTasks]
  );
  const archivedTasks = useMemo(
    () => filteredTasks.filter((t: Task) => isArchived(t)),
    [filteredTasks]
  );

  // Derive current scope label
  const scopeLabel = useMemo(() => {
    const topic = selectedTopic !== null
      ? data.topics.find(t => t.id === selectedTopic)?.name
      : 'All Topics';
    return topic || 'All Topics';
  }, [selectedTopic, data.topics]);

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="h-screen flex bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          topics={data.topics}
          tasks={tasks}
          selectedTopic={selectedTopic}
          hiddenTopics={hiddenTopics}
          onSelectTopic={(id) => {
            setSelectedTopic(id);
            setSelectedProject(null);
            setSidebarOpen(false);
          }}
          onToggleHidden={toggleHidden}
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Bar */}
          <header className="shrink-0 border-b border-gray-200 dark:border-gray-800/80 bg-white dark:bg-gray-900/30 backdrop-blur-sm">
            <div className="px-3 py-2 md:px-6 md:py-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {/* Hamburger — mobile only */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden shrink-0 p-1.5 -ml-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Open menu"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div className="min-w-0">
                  <h1 className="text-base md:text-lg font-semibold tracking-tight truncate">{scopeLabel}</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                    {activeTasks.length} active task{activeTasks.length !== 1 ? 's' : ''}
                    {effectiveProject && (
                      <span> in {visibleProjects.find(p => p.id === effectiveProject)?.name}</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 text-xs font-medium text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden sm:inline">New Task</span>
                </button>
                <ThemeToggle dark={dark} onToggle={() => setDark(!dark)} />
              </div>
            </div>

            {/* Project Tabs */}
            <div className="px-3 md:px-6 pb-2 md:pb-3 -mx-0 overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
              <ProjectTabs
                projects={visibleProjects}
                tasks={topicTasks}
                selectedProject={effectiveProject}
                onSelectProject={setSelectedProject}
              />
            </div>
          </header>

          {/* Board + Archive */}
          <main className="flex-1 overflow-y-auto">
            <div className="px-3 py-3 md:px-6 md:py-5 space-y-5">
              <KanbanBoard
                tasks={activeTasks}
                topics={data.topics}
                onArchive={handleArchive}
                onStatusChange={handleStatusChange}
                onReorder={handleReorder}
              />

              {/* Archived */}
              {archivedTasks.length > 0 && (
                <section className="pt-2">
                  <button
                    onClick={() => setShowArchived(!showArchived)}
                    className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <svg
                      className={`w-3 h-3 transition-transform ${showArchived ? 'rotate-90' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    Archived
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 tabular-nums">
                      {archivedTasks.length}
                    </span>
                  </button>
                  {showArchived && (
                    <div className="mt-2 space-y-1">
                      {archivedTasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800/60 opacity-50 hover:opacity-75 transition-opacity group/archived"
                        >
                          <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-xs line-through text-gray-500 dark:text-gray-500 flex-1">{task.title}</span>
                          <button
                            onClick={() => handleUnarchive(task.id)}
                            className="shrink-0 p-1 rounded text-gray-400 hover:text-gray-200 hover:bg-gray-700/30 opacity-0 group-hover/archived:opacity-100 transition-all"
                            title="Unarchive"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 11V5a2 2 0 012-2h10a2 2 0 012 2v6M3 11h18M12 11v8m0 0l-3-3m3 3l3-3" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          topics={data.topics}
          projects={data.projects}
          defaultTopic={selectedTopic}
          defaultProject={effectiveProject}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
