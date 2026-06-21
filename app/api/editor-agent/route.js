import { NextResponse } from 'next/server';
import { getDb, runEditorAgent, saveDb } from '../../../lib/local-db';

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const db = await getDb();
  const result = runEditorAgent(db, {
    sourceUrl: body.sourceUrl
  });
  await saveDb(result.db);

  return NextResponse.json({
    ...result.db,
    editorAgentResult: result.run
  });
}
