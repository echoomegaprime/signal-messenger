import { json, verifyToken } from './index.js';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/mpeg', 'audio/ogg', 'audio/webm', 'audio/wav',
  'application/pdf',
];

export async function handleMedia(request, env, path) {
  // GET /media/get/:key — serve media (public with key knowledge)
  if (path.startsWith('/media/get/') && request.method === 'GET') {
    const key = path.replace('/media/get/', '');
    const obj = await env.MEDIA.get(key);
    if (!obj) return new Response('Not found', { status: 404 });

    return new Response(obj.body, {
      headers: {
        'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400',
      }
    });
  }

  // All other media routes require auth
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return json({ error: 'Unauthorized' }, 401);
  const user = await verifyToken(token, env);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  // POST /media/upload — request upload slot
  if (path === '/media/upload' && request.method === 'POST') {
    const { filename, content_type } = await request.json();
    if (!filename) return json({ error: 'Missing filename' }, 400);
    if (content_type && !ALLOWED_TYPES.includes(content_type)) {
      return json({ error: `File type not allowed. Supported: ${ALLOWED_TYPES.join(', ')}` }, 400);
    }

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${user.id}/${Date.now()}-${safeName}`;

    return json({ upload_key: key, upload_endpoint: `/media/put/${key}` });
  }

  // PUT /media/put/:key — actual upload
  if (path.startsWith('/media/put/') && request.method === 'PUT') {
    const key = path.replace('/media/put/', '');

    // Verify key belongs to this user
    if (!key.startsWith(user.id + '/')) return json({ error: 'Unauthorized' }, 403);

    const contentType = request.headers.get('Content-Type') || 'application/octet-stream';
    const contentLength = parseInt(request.headers.get('Content-Length') || '0');

    if (contentLength > MAX_FILE_SIZE) {
      return json({ error: `File too large. Max ${MAX_FILE_SIZE / 1024 / 1024}MB` }, 413);
    }

    await env.MEDIA.put(key, request.body, {
      httpMetadata: { contentType },
      customMetadata: { uploadedBy: user.id, uploadedAt: Date.now().toString() }
    });

    return json({ url: `/media/get/${key}`, key });
  }

  // DELETE /media/delete/:key
  if (path.startsWith('/media/delete/') && request.method === 'DELETE') {
    const key = path.replace('/media/delete/', '');
    if (!key.startsWith(user.id + '/')) return json({ error: 'Unauthorized' }, 403);

    await env.MEDIA.delete(key);
    return json({ ok: true, deleted: key });
  }

  return json({ error: 'Not found' }, 404);
}
