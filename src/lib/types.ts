export type TaskStatus = 'not-started' | 'in-progress' | 'waiting' | 'blocked' | 'done';
export type Priority = 'p1' | 'p2' | 'p3';
export type ProjectStatus = 'active' | 'paused' | 'complete';

export interface Topic {
  id: number;
  name: string;
  telegramUrl: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  topics: number[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  project: string;
  topic: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  actionInstructions?: string;
}

export interface TasksData {
  topics: Topic[];
  projects: Project[];
  tasks: Task[];
}

export const STATUS_COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: 'not-started', label: 'Not Started' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'waiting', label: 'Waiting on Input' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'done', label: 'Done' },
];

export const STATUS_COLORS: Record<TaskStatus, string> = {
  'not-started': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  'in-progress': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'waiting': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'blocked': 'bg-red-500/20 text-red-400 border-red-500/30',
  'done': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  p1: 'bg-red-500',
  p2: 'bg-amber-400',
  p3: 'bg-gray-400',
};

export const PROJECT_COLORS: Record<string, string> = {
  'nicks-app': 'bg-pink-500/20 text-pink-400 border-pink-500/40',
  fundraising: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  'side-income': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  openclaw: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
  'sales-materials': 'bg-violet-500/20 text-violet-400 border-violet-500/40',
};
