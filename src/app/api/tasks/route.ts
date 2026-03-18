import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';
import { getAllData, createTask, updateTask } from '@/lib/db';
import { TaskStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

const VALID_STATUSES: TaskStatus[] = ['not-started', 'in-progress', 'waiting', 'blocked', 'done'];

export async function GET(request: NextRequest) {
  if (!validateAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await getAllData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/tasks error:', error);
    return NextResponse.json({ error: 'Failed to read tasks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!validateAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, topic, project, priority, status } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (topic === undefined || typeof topic !== 'number') {
      return NextResponse.json({ error: 'Topic ID is required' }, { status: 400 });
    }

    const task = await createTask({
      title: title.trim(),
      description: (description || '').trim(),
      status: VALID_STATUSES.includes(status) ? status : 'not-started',
      priority: ['p1', 'p2', 'p3'].includes(priority) ? priority : 'p2',
      project: (project || '').trim(),
      topic,
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('POST /api/tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!validateAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, status, archivedAt, priority, title, description, actionInstructions } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid task id' }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      patch.status = status;
    }
    if (archivedAt !== undefined) patch.archivedAt = archivedAt;
    if (priority !== undefined) patch.priority = priority;
    if (title !== undefined) patch.title = title;
    if (description !== undefined) patch.description = description;
    if (actionInstructions !== undefined) patch.actionInstructions = actionInstructions;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const task = await updateTask(id, patch as Parameters<typeof updateTask>[1]);
    return NextResponse.json({ task });
  } catch (error) {
    if ((error as Error).message === 'Task not found') {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    console.error('PATCH /api/tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
