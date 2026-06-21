import { NextResponse } from 'next/server';
import { createWorkDay, getDb, saveDb } from '../../../lib/local-db';

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const db = await getDb();
  const result = createWorkDay(db, body.date);
  await saveDb(result.db);
  return NextResponse.json({
    ...result.db,
    workDayResult: {
      created: result.created,
      workDay: result.workDay
    }
  });
}
