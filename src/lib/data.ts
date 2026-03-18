import { TasksData } from './types';

/** Server-only: reads fresh from disk every call. Do NOT import in client components. */
export function getData(): TasksData {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('path');
  const TASKS_FILE = path.join(process.cwd(), 'tasks.json');
  const raw = fs.readFileSync(TASKS_FILE, 'utf-8');
  return JSON.parse(raw) as TasksData;
}
