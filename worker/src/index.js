import { handleAuth } from './auth.js';
import { handleMessages } from './messages.js';
import { handleMedia } from './media.js';
import { handleNotes } from './notes.js';
export { ChatRoom } from './rooms.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Serve frontend at root
    if (path === '/' || path === '/index.html') {
      const html = await env.MEDIA.get('frontend/index.html');
      if (html) {
        return new Response(html.body, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=300',
            ...CORS
          }
        });
      }
    }

    if (path === '/health') {
      return json({ ok: true, service: 'signal-messenger', version: '1.0.0', timestamp: new Date().toISOString() });
    }

    // WebSocket upgrade for real-time chat
    if (path.startsWith('/ws/')) {
      const roomId = path.split('/')[2];
      if (!roomId) return json({ error: 'Missing room ID' }, 400);
      const roomObj = env.ROOMS.get(env.ROOMS.idFromName(roomId));
      return roomObj.fetch(request);
    }

    let response;
    try {
      if (path.startsWith('/auth/')) {
        response = await handleAuth(request, env, path);
      } else if (path.startsWith('/messages') || path.startsWith('/conversations')) {
        response = await handleMessages(request, env, path);
      } else if (path.startsWith('/media/')) {
        response = await handleMedia(request, env, path);
      } else if (path.startsWith('/notes')) {
        response = await handleNotes(request, env, path);
      } else if (path === '/users/search') {
        response = await handleUserSearch(request, env);
      } else if (path === '/users/list') {
        response = await handleUserList(request, env);
      } else if (path === '/users/me') {
        response = await handleGetMe(request, env);
      } else if (path === '/users/language' && request.method === 'POST') {
        response = await handleSetLanguage(request, env);
      } else {
        response = json({ error: 'Not found', endpoints: ['/health', '/auth/register', '/auth/login', '/auth/verify/:token', '/conversations', '/messages', '/media/upload', '/users/search', '/users/me', '/users/language', '/ws/:roomId'] }, 404);
      }
    } catch (e) {
      response = json({ error: e.message }, 500);
    }

    // Add CORS to all responses
    const newHeaders = new Headers(response.headers);
    Object.entries(CORS).forEach(([k, v]) => newHeaders.set(k, v));
    return new Response(response.body, {
      status: response.status,
      headers: newHeaders
    });
  }
};

async function handleUserList(request, env) {
  const user = await authGuard(request, env);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const results = await env.DB.prepare(
    'SELECT id, display_name, email, avatar_url, language, last_seen FROM users WHERE verified = 1 AND id != ? ORDER BY display_name ASC LIMIT 50'
  ).bind(user.id).all();

  return json(results.results || []);
}

async function handleUserSearch(request, env) {
  const user = await authGuard(request, env);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const url = new URL(request.url);
  const q = url.searchParams.get('q');
  if (!q || q.length < 2) return json([]);

  const results = await env.DB.prepare(
    'SELECT id, display_name, email, avatar_url FROM users WHERE (email LIKE ? OR display_name LIKE ?) AND verified = 1 AND id != ? LIMIT 10'
  ).bind(`%${q}%`, `%${q}%`, user.id).all();

  return json(results.results || []);
}

async function handleGetMe(request, env) {
  const user = await authGuard(request, env);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  const { password_hash, verify_token, ...safe } = user;
  return json(safe);
}

async function handleSetLanguage(request, env) {
  const user = await authGuard(request, env);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  const { language } = await request.json();
  if (!['en', 'ur', 'ne', 'es'].includes(language)) return json({ error: 'Invalid language. Use: en, ur, ne, es' }, 400);
  await env.DB.prepare('UPDATE users SET language = ? WHERE id = ?').bind(language, user.id).run();
  return json({ ok: true, language });
}

async function authGuard(request, env) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return verifyToken(token, env);
}

export async function verifyToken(token, env) {
  try {
    const decoded = atob(token);
    const { userId, exp } = JSON.parse(decoded);
    if (Date.now() > exp) return null;
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
    return user?.verified ? user : null;
  } catch { return null; }
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export function makeToken(userId) {
  return btoa(JSON.stringify({ userId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
}
