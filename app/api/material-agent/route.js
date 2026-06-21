import { NextResponse } from 'next/server';
import { getDb, runMaterialAgent, saveDb } from '../../../lib/local-db';

export async function POST() {
  const db = await getDb();
  const result = await runMaterialAgent(db);
  await saveDb(result.db);

  return NextResponse.json({
    ...result.db,
    materialAgentResult: result.run
  });
}
