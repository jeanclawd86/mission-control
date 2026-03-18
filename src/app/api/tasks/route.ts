import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { TasksData, TaskStatus } from '@/lib/types';

const TASKS_FILE = path.join(process.cwd(), 'tasks.json');

function readTasksFile(): TasksData {
  const raw = fs.readFileSync(TASKS_FILE, 'utf-8');
  return JSON.parse(raw) as TasksData;
}

function writeTasksFile(data: TasksData): void {
  fs.writeFileSync(TASKS_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

const VALID_STATUSES: TaskStatus[] = ['not-started', 'in-progress', 'waiting', 'blocked', 'done'];

export async function GET() {
  try {
    const data = readTasksFile();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to read tasks' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, topic, project, priority, status } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (topic === undefined || typeof topic !== 'number') {
      return NextResponse.json({ error: 'Topic ID is required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const taskId = `task-${topic}-${Date.now()}`;

    const newTask = {
      id: taskId,
      title: title.trim(),
      description: (description || '').trim(),
      status: VALID_STATUSES.includes(status) ? status : 'not-started',
      priority: ['p1', 'p2', 'p3'].includes(priority) ? priority : 'p2',
      project: (project || '').trim(),
      topic,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    };

    const data = readTasksFile();
    data.tasks.push(newTask);
    writeTasksFile(data);

    return NextResponse.json({ task: newTask }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, archivedAt } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid task id' }, { status: 400 });
    }

    const hasStatus = status !== undefined;
    const hasArchivedAt = archivedAt !== undefined;

    if (!hasStatus && !hasArchivedAt) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    if (hasStatus && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    if (hasArchivedAt && archivedAt !== null && typeof archivedAt !== 'string') {
      return NextResponse.json({ error: 'Invalid archivedAt value' }, { status: 400 });
    }

    const data = readTasksFile();
    const taskIndex = data.tasks.findIndex(t => t.id === id);

    if (taskIndex === -1) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (hasStatus) {
      data.tasks[taskIndex].status = status;
    }
    if (hasArchivedAt) {
      data.tasks[taskIndex].archivedAt = archivedAt;
    }
    data.tasks[taskIndex].updatedAt = new Date().toISOString();

    writeTasksFile(data);

    return NextResponse.json({ task: data.tasks[taskIndex] });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
