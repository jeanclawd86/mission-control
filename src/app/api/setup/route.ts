import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';
import { runSetup, createTopic, createProject, createTask } from '@/lib/db';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!validateAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Run schema creation
    await runSetup();

    // Optionally seed data from JSON payload
    const body = await request.json().catch(() => null);
    if (body && body.topics) {
      // Seed topics
      for (const topic of body.topics) {
        await sql`
          INSERT INTO topics (id, name, telegram_url)
          VALUES (${topic.id}, ${topic.name}, ${topic.telegramUrl || ''})
          ON CONFLICT (id) DO NOTHING
        `;
      }

      // Seed projects
      if (body.projects) {
        for (const project of body.projects) {
          await sql`
            INSERT INTO projects (id, name, description, status)
            VALUES (${project.id}, ${project.name}, ${project.description || ''}, ${project.status || 'active'})
            ON CONFLICT (id) DO NOTHING
          `;
          if (project.topics) {
            for (const topicId of project.topics) {
              await sql`
                INSERT INTO project_topics (project_id, topic_id)
                VALUES (${project.id}, ${topicId})
                ON CONFLICT DO NOTHING
              `;
            }
          }
        }
      }

      // Seed tasks
      if (body.tasks) {
        for (const task of body.tasks) {
          await sql`
            INSERT INTO tasks (id, title, description, status, priority, project_id, topic_id, action_instructions, created_at, updated_at, archived_at)
            VALUES (
              ${task.id},
              ${task.title},
              ${task.description || ''},
              ${task.status || 'not-started'},
              ${task.priority || 'p2'},
              ${task.project || ''},
              ${task.topic},
              ${task.actionInstructions || null},
              ${task.createdAt || new Date().toISOString()},
              ${task.updatedAt || new Date().toISOString()},
              ${task.archivedAt || null}
            )
            ON CONFLICT (id) DO NOTHING
          `;
        }
      }

      return NextResponse.json({ success: true, seeded: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 });
  }
}
