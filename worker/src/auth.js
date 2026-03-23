import { json, makeToken } from './index.js';

export async function handleAuth(request, env, path) {
  if (path === '/auth/register' && request.method === 'POST') {
    return register(request, env);
  }
  if (path === '/auth/login' && request.method === 'POST') {
    return login(request, env);
  }
  if (path.startsWith('/auth/verify/') && request.method === 'GET') {
    return verify(path.split('/')[3], env);
  }
  return json({ error: 'Not found' }, 404);
}

async function hashPassword(password) {
  const data = new TextEncoder().encode(password + 'echo-signal-salt-2026');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function register(request, env) {
  const { email, password, display_name, language } = await request.json();
  if (!email || !password || !display_name) return json({ error: 'Missing fields: email, password, display_name required' }, 400);
  if (password.length < 6) return json({ error: 'Password must be at least 6 characters' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Invalid email format' }, 400);

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase()).first();
  if (existing) return json({ error: 'Email already registered' }, 409);

  const id = crypto.randomUUID();
  const password_hash = await hashPassword(password);
  const verify_token = crypto.randomUUID();
  const now = Date.now();

  await env.DB.prepare(
    'INSERT INTO users (id, email, display_name, password_hash, language, verify_token, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, email.toLowerCase(), display_name, password_hash, language || 'en', verify_token, now).run();

  return json({
    ok: true,
    message: 'Account created. Check your email to verify.',
    verify_url: `/auth/verify/${verify_token}`
  });
}

async function login(request, env) {
  const { email, password } = await request.json();
  if (!email || !password) return json({ error: 'Missing email or password' }, 400);

  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email.toLowerCase()).first();
  if (!user) return json({ error: 'Invalid credentials' }, 401);
  if (!user.verified) return json({ error: 'Email not verified. Check your email for verification link.' }, 403);

  const password_hash = await hashPassword(password);
  if (password_hash !== user.password_hash) return json({ error: 'Invalid credentials' }, 401);

  await env.DB.prepare('UPDATE users SET last_seen = ? WHERE id = ?').bind(Date.now(), user.id).run();

  const token = makeToken(user.id);
  const { password_hash: ph, verify_token, ...safe } = user;
  return json({ token, user: safe });
}

async function verify(token, env) {
  if (!token) return json({ error: 'Missing verification token' }, 400);

  const user = await env.DB.prepare('SELECT id FROM users WHERE verify_token = ?').bind(token).first();
  if (!user) return json({ error: 'Invalid or expired verification token' }, 400);

  await env.DB.prepare('UPDATE users SET verified = 1, verify_token = NULL WHERE id = ?').bind(user.id).run();
  const newToken = makeToken(user.id);

  return new Response(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta http-equiv="refresh" content="3;url=/?token=${newToken}">
<style>body{font-family:sans-serif;text-align:center;padding:60px;background:#0a0a0c;color:#C9A84C;}h2{font-family:'Cinzel',serif;}a{color:#4DB6AC;}</style>
</head><body><h2>Email Verified</h2><p>Your account is now active.</p><p>Redirecting to Signal Messenger...</p><p><a href="/?token=${newToken}">Click here if not redirected</a></p></body></html>`,
    { headers: { 'Content-Type': 'text/html' } });
}
