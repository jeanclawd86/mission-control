/**
 * Seed script: reads tasks.json and sends it to /api/setup to populate the database.
 *
 * Usage:
 *   MC_API_KEY=your-key npx ts-node scripts/seed.ts [base-url]
 *
 * Or directly with @vercel/postgres by setting POSTGRES_URL env var.
 */

import fs from 'fs';
import path from 'path';

const TASKS_FILE = path.join(__dirname, '..', 'tasks.json');
const BASE_URL = process.argv[2] || 'http://localhost:3000';
const API_KEY = process.env.MC_API_KEY;

async function main() {
  if (!API_KEY) {
    console.error('MC_API_KEY environment variable is required');
    process.exit(1);
  }

  let data;
  try {
    const raw = fs.readFileSync(TASKS_FILE, 'utf-8');
    data = JSON.parse(raw);
  } catch {
    console.error(`Could not read ${TASKS_FILE}`);
    process.exit(1);
  }

  console.log(`Seeding ${data.topics?.length || 0} topics, ${data.projects?.length || 0} projects, ${data.tasks?.length || 0} tasks...`);

  const res = await fetch(`${BASE_URL}/api/setup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Seed failed (${res.status}): ${text}`);
    process.exit(1);
  }

  const result = await res.json();
  console.log('Seed complete:', result);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
