import { sql } from '@vercel/postgres';
import { Task, Topic, Project, TasksData } from './types';

// ─── Mapping helpers ────────────────────────────────────────────────────────

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) || '',
    status: row.status as Task['status'],
    priority: (row.priority as Task['priority']) || 'p2',
    project: (row.project_id as string) || '',
    topic: row.topic_id as number,
    actionInstructions: (row.action_instructions as string) || undefined,
    createdAt: (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
    updatedAt: (row.updated_at as Date)?.toISOString?.() ?? (row.updated_at as string),
    archivedAt: row.archived_at ? ((row.archived_at as Date)?.toISOString?.() ?? (row.archived_at as string)) : null,
  };
}

function rowToTopic(row: Record<string, unknown>): Topic {
  return {
    id: row.id as number,
    name: row.name as string,
    telegramUrl: (row.telegram_url as string) || '',
  };
}

function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) || '',
    status: (row.status as Project['status']) || 'active',
    topics: [],
  };
}

// ─── Queries ────────────────────────────────────────────────────────────────

export async function getTopics(): Promise<Topic[]> {
  const { rows } = await sql`SELECT * FROM topics ORDER BY id`;
  return rows.map(rowToTopic);
}

export async function getProjects(): Promise<Project[]> {
  const { rows: projectRows } = await sql`SELECT * FROM projects ORDER BY name`;
  const { rows: ptRows } = await sql`SELECT project_id, topic_id FROM project_topics`;

  const projects = projectRows.map(rowToProject);
  const topicMap = new Map<string, number[]>();
  for (const pt of ptRows) {
    const list = topicMap.get(pt.project_id as string) || [];
    list.push(pt.topic_id as number);
    topicMap.set(pt.project_id as string, list);
  }
  for (const p of projects) {
    p.topics = topicMap.get(p.id) || [];
  }
  return projects;
}

export async function getTasks(): Promise<Task[]> {
  const { rows } = await sql`SELECT * FROM tasks ORDER BY created_at DESC`;
  return rows.map(rowToTask);
}

export async function getAllData(): Promise<TasksData> {
  const [topics, projects, tasks] = await Promise.all([
    getTopics(),
    getProjects(),
    getTasks(),
  ]);
  return { topics, projects, tasks };
}

export async function createTask(data: {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  project?: string;
  topic: number;
  actionInstructions?: string;
}): Promise<Task> {
  const id = `task-${data.topic}-${Date.now()}`;
  const { rows } = await sql`
    INSERT INTO tasks (id, title, description, status, priority, project_id, topic_id, action_instructions)
    VALUES (
      ${id},
      ${data.title},
      ${data.description || ''},
      ${data.status || 'not-started'},
      ${data.priority || 'p2'},
      ${data.project || ''},
      ${data.topic},
      ${data.actionInstructions || null}
    )
    RETURNING *
  `;
  return rowToTask(rows[0]);
}

export async function updateTask(
  id: string,
  patch: Partial<{
    status: string;
    archivedAt: string | null;
    priority: string;
    title: string;
    description: string;
    actionInstructions: string;
  }>
): Promise<Task> {
  // Build dynamic update
  const sets: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (patch.status !== undefined) {
    sets.push(`status = $${paramIndex++}`);
    values.push(patch.status);
  }
  if (patch.archivedAt !== undefined) {
    sets.push(`archived_at = $${paramIndex++}`);
    values.push(patch.archivedAt);
  }
  if (patch.priority !== undefined) {
    sets.push(`priority = $${paramIndex++}`);
    values.push(patch.priority);
  }
  if (patch.title !== undefined) {
    sets.push(`title = $${paramIndex++}`);
    values.push(patch.title);
  }
  if (patch.description !== undefined) {
    sets.push(`description = $${paramIndex++}`);
    values.push(patch.description);
  }
  if (patch.actionInstructions !== undefined) {
    sets.push(`action_instructions = $${paramIndex++}`);
    values.push(patch.actionInstructions);
  }

  sets.push('updated_at = now()');

  // Use sql template literal with dynamic query via sql.query
  const query = `UPDATE tasks SET ${sets.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
  values.push(id);

  const { rows } = await sql.query(query, values);
  if (rows.length === 0) throw new Error('Task not found');
  return rowToTask(rows[0]);
}

export async function createTopic(data: { id: number; name: string; telegramUrl?: string }): Promise<Topic> {
  const { rows } = await sql`
    INSERT INTO topics (id, name, telegram_url)
    VALUES (${data.id}, ${data.name}, ${data.telegramUrl || ''})
    RETURNING *
  `;
  return rowToTopic(rows[0]);
}

export async function createProject(data: {
  id: string;
  name: string;
  description?: string;
  status?: string;
  topics?: number[];
}): Promise<Project> {
  const { rows } = await sql`
    INSERT INTO projects (id, name, description, status)
    VALUES (${data.id}, ${data.name}, ${data.description || ''}, ${data.status || 'active'})
    RETURNING *
  `;
  const project = rowToProject(rows[0]);

  if (data.topics && data.topics.length > 0) {
    for (const topicId of data.topics) {
      await sql`INSERT INTO project_topics (project_id, topic_id) VALUES (${data.id}, ${topicId})`;
    }
    project.topics = data.topics;
  }

  return project;
}

export async function runSetup(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      telegram_url TEXT
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'active'
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS project_topics (
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
      PRIMARY KEY (project_id, topic_id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'not-started',
      priority TEXT DEFAULT 'p2',
      project_id TEXT DEFAULT '',
      topic_id INTEGER REFERENCES topics(id),
      action_instructions TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      archived_at TIMESTAMPTZ
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_topic ON tasks(topic_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`;
}
