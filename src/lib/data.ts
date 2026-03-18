import { TasksData } from './types';
import { getAllData } from './db';

/** Server-only: fetches fresh data from Postgres every call. Do NOT import in client components. */
export async function getData(): Promise<TasksData> {
  return getAllData();
}
