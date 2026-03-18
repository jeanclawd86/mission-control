import { Task } from './types';

const ARCHIVE_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

export function isArchived(task: Task): boolean {
  if (task.archivedAt) return true;
  if (task.status !== 'done') return false;
  if (!task.updatedAt) return false;
  const doneDate = new Date(task.updatedAt).getTime();
  return Date.now() - doneDate >= ARCHIVE_THRESHOLD_MS;
}

export function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}
