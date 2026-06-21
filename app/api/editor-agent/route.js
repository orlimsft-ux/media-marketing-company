import { NextResponse } from 'next/server';
import { getDb, runEditorAgent, saveDb } from '../../../lib/local-db';

export async function POST() {
  const db = await getDb();
  const result = runEditorAgent(db);
  await saveDb(result.db);

  return NextResponse.json({
    ...result.db,
    editorAgentResult: result.run
  });
}
