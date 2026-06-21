import { NextResponse } from 'next/server';
import { getDb, saveDb } from '../../../lib/local-db';

export async function POST(request) {
  const body = await request.json();
  const db = await getDb();
  const task = db.tasks.find(item => item.id === body.taskId);

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  task.status = body.nextStatus || task.status;
  task.updatedAt = new Date().toISOString();

  db.feedback.unshift({
    id: `feedback_${Date.now()}`,
    taskId: body.taskId,
    action: body.action,
    rating: body.rating,
    comment: body.comment,
    requiredChanges: body.action === 'return' ? ['按反馈修改', '重新提交审核'] : ['进入下一步'],
    createdAt: new Date().toISOString()
  });

  await saveDb(db);
  return NextResponse.json(db);
}
