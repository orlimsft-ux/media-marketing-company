import { NextResponse } from 'next/server';
import { addUploadedTestVideo, getDb, saveDb } from '../../../lib/local-db';

const maxUploadSize = 60 * 1024 * 1024;
const allowedTypes = new Set(['video/mp4', 'video/quicktime', 'video/webm']);

export async function POST(request) {
  const formData = await request.formData();
  const video = formData.get('video');

  if (!video || typeof video === 'string') {
    return NextResponse.json({ error: 'Video file is required' }, { status: 400 });
  }

  if (video.size > maxUploadSize) {
    return NextResponse.json({ error: 'Video file is too large for this prototype' }, { status: 413 });
  }

  if (video.type && !allowedTypes.has(video.type)) {
    return NextResponse.json({ error: 'Unsupported video type' }, { status: 415 });
  }

  const db = await getDb();
  const result = await addUploadedTestVideo(db, {
    name: video.name || 'test-video.mp4',
    type: video.type || '',
    arrayBuffer: await video.arrayBuffer()
  });

  await saveDb(result.db);

  return NextResponse.json({
    ...result.db,
    uploadedVideoResult: result.uploadedVideoResult
  });
}
