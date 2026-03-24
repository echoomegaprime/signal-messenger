import { json, verifyToken } from './index.js';
import { translate } from './translate.js';

export async function handleMessages(request, env, path) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return json({ error: 'Unauthorized' }, 401);
  const user = await verifyToken(token, env);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  // GET /conversations — list all conversations
  if (path === '/conversations' && request.method === 'GET') {
    return getConversations(user, env);
  }

  // POST /conversations — start or get conversation with another user
  if (path === '/conversations' && request.method === 'POST') {
    return startConversation(request, user, env);
  }

  // GET /conversations/:id/messages
  const msgMatch = path.match(/^\/conversations\/([^\/]+)\/messages$/);
  if (msgMatch && request.method === 'GET') {
    return getMessages(msgMatch[1], user, env, request);
  }

  // POST /messages — send a message
  if (path === '/messages' && request.method === 'POST') {
    return sendMessage(request, user, env);
  }

  // POST /messages/:id/react
  const reactMatch = path.match(/^\/messages\/([^\/]+)\/react$/);
  if (reactMatch && request.method === 'POST') {
    return toggleReaction(reactMatch[1], request, user, env);
  }

  // GET /messages/:id/reactions
  const reactGetMatch = path.match(/^\/messages\/([^\/]+)\/reactions$/);
  if (reactGetMatch && request.method === 'GET') {
    return getReactions(reactGetMatch[1], user, env);
  }

  // POST /conversations/:id/pin
  const pinMatch = path.match(/^\/conversations\/([^\/]+)\/pin$/);
  if (pinMatch && request.method === 'POST') {
    return pinMessage(pinMatch[1], request, user, env);
  }

  // GET /conversations/:id/pin
  const pinGetMatch = path.match(/^\/conversations\/([^\/]+)\/pin$/);
  if (pinGetMatch && request.method === 'GET') {
    return getPinnedMessage(pinGetMatch[1], user, env);
  }

  // DELETE /messages/:id
  const delMatch = path.match(/^\/messages\/([^\/]+)$/);
  if (delMatch && request.method === 'DELETE') {
    return deleteMessage(delMatch[1], user, env);
  }

  return json({ error: 'Not found' }, 404);
}

async function getConversations(user, env) {
  const convs = await env.DB.prepare(`
    SELECT c.id, c.created_at,
      CASE WHEN c.user_a = ? THEN c.user_b ELSE c.user_a END as other_user_id,
      u.display_name as other_name, u.avatar_url as other_avatar, u.last_seen as other_last_seen,
      (SELECT content_en FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_at
    FROM conversations c
    JOIN users u ON u.id = CASE WHEN c.user_a = ? THEN c.user_b ELSE c.user_a END
    WHERE c.user_a = ? OR c.user_b = ?
    ORDER BY last_at DESC
  `).bind(user.id, user.id, user.id, user.id).all();

  return json(convs.results || []);
}

async function startConversation(request, user, env) {
  const { other_user_id } = await request.json();
  if (!other_user_id) return json({ error: 'Missing other_user_id' }, 400);
  if (other_user_id === user.id) return json({ error: 'Cannot message yourself' }, 400);

  // Verify other user exists
  const otherUser = await env.DB.prepare('SELECT id FROM users WHERE id = ? AND verified = 1').bind(other_user_id).first();
  if (!otherUser) return json({ error: 'User not found' }, 404);

  // Check if conversation already exists
  const existing = await env.DB.prepare(
    'SELECT id FROM conversations WHERE (user_a = ? AND user_b = ?) OR (user_a = ? AND user_b = ?)'
  ).bind(user.id, other_user_id, other_user_id, user.id).first();

  if (existing) return json({ conversation_id: existing.id });

  const id = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO conversations (id, user_a, user_b, created_at) VALUES (?, ?, ?, ?)'
  ).bind(id, user.id, other_user_id, Date.now()).run();

  return json({ conversation_id: id });
}

async function getMessages(convId, user, env, request) {
  // Verify user is in this conversation
  const conv = await env.DB.prepare(
    'SELECT * FROM conversations WHERE id = ? AND (user_a = ? OR user_b = ?)'
  ).bind(convId, user.id, user.id).first();
  if (!conv) return json({ error: 'Not found' }, 404);

  const url = new URL(request.url);
  const before = url.searchParams.get('before');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

  let query, binds;
  if (before) {
    query = `
      SELECT m.*, u.display_name as sender_name, u.avatar_url as sender_avatar
      FROM messages m JOIN users u ON u.id = m.sender_id
      WHERE m.conversation_id = ? AND m.created_at < ?
      ORDER BY m.created_at DESC LIMIT ?`;
    binds = [convId, parseInt(before), limit];
  } else {
    query = `
      SELECT m.*, u.display_name as sender_name, u.avatar_url as sender_avatar
      FROM messages m JOIN users u ON u.id = m.sender_id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at DESC LIMIT ?`;
    binds = [convId, limit];
  }

  const msgs = await env.DB.prepare(query).bind(...binds).all();
  // Return in chronological order
  return json((msgs.results || []).reverse());
}

async function sendMessage(request, user, env) {
  const { conversation_id, content, media_url, media_type } = await request.json();
  if (!conversation_id || (!content && !media_url)) return json({ error: 'Missing fields' }, 400);

  // Verify user is in conversation
  const conv = await env.DB.prepare(
    'SELECT * FROM conversations WHERE id = ? AND (user_a = ? OR user_b = ?)'
  ).bind(conversation_id, user.id, user.id).first();
  if (!conv) return json({ error: 'Not authorized' }, 403);

  // Translate the message to all supported languages
  const content_en = content || '';
  const content_ur = translate(content_en, 'ur');
  const content_ne = translate(content_en, 'ne');
  const content_es = content_en; // ES placeholder — extend translate.js later

  const id = crypto.randomUUID();
  const now = Date.now();

  await env.DB.prepare(`
    INSERT INTO messages (id, conversation_id, sender_id, content_en, content_ur, content_ne, content_es, media_url, media_type, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, conversation_id, user.id, content_en, content_ur, content_ne, content_es, media_url || null, media_type || null, now).run();

  const message = {
    id, conversation_id, sender_id: user.id,
    sender_name: user.display_name, sender_avatar: user.avatar_url,
    content_en, content_ur, content_ne, content_es,
    media_url, media_type, created_at: now
  };

  // Notify via Durable Object WebSocket
  try {
    const roomObj = env.ROOMS.get(env.ROOMS.idFromName(conversation_id));
    await roomObj.fetch(new Request('https://internal/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'new_message', message })
    }));
  } catch (e) { /* WebSocket broadcast best-effort */ }

  return json(message);
}

async function toggleReaction(msgId, request, user, env) {
  const { emoji } = await request.json();
  if (!emoji) return json({ error: 'Missing emoji' }, 400);

  // Check if reaction already exists
  const existing = await env.DB.prepare(
    'SELECT id FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?'
  ).bind(msgId, user.id, emoji).first();

  if (existing) {
    await env.DB.prepare('DELETE FROM message_reactions WHERE id = ?').bind(existing.id).run();
  } else {
    const id = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO message_reactions (id, message_id, user_id, emoji, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, msgId, user.id, emoji, Date.now()).run();
  }

  // Get updated reactions for this message
  const reactions = await env.DB.prepare(
    'SELECT r.emoji, r.user_id, u.display_name FROM message_reactions r JOIN users u ON u.id = r.user_id WHERE r.message_id = ? ORDER BY r.created_at'
  ).bind(msgId).all();

  // Get conversation_id for broadcast
  const msg = await env.DB.prepare('SELECT conversation_id FROM messages WHERE id = ?').bind(msgId).first();
  if (msg) {
    try {
      const roomObj = env.ROOMS.get(env.ROOMS.idFromName(msg.conversation_id));
      await roomObj.fetch(new Request('https://internal/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'reaction_update', message_id: msgId, reactions: reactions.results || [] })
      }));
    } catch (e) { /* best effort */ }
  }

  return json({ ok: true, reactions: reactions.results || [] });
}

async function getReactions(msgId, user, env) {
  const reactions = await env.DB.prepare(
    'SELECT r.emoji, r.user_id, u.display_name FROM message_reactions r JOIN users u ON u.id = r.user_id WHERE r.message_id = ? ORDER BY r.created_at'
  ).bind(msgId).all();
  return json(reactions.results || []);
}

async function pinMessage(convId, request, user, env) {
  const conv = await env.DB.prepare(
    'SELECT * FROM conversations WHERE id = ? AND (user_a = ? OR user_b = ?)'
  ).bind(convId, user.id, user.id).first();
  if (!conv) return json({ error: 'Not found' }, 404);

  const { message_id } = await request.json();
  // If message_id is null, unpin
  if (!message_id) {
    await env.DB.prepare('UPDATE conversations SET pinned_message_id = NULL WHERE id = ?').bind(convId).run();
    try {
      const roomObj = env.ROOMS.get(env.ROOMS.idFromName(convId));
      await roomObj.fetch(new Request('https://internal/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'pin_update', pinned: null })
      }));
    } catch (e) { /* best effort */ }
    return json({ ok: true, pinned: null });
  }

  // Verify message belongs to this conversation
  const msg = await env.DB.prepare(
    'SELECT m.*, u.display_name as sender_name FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.id = ? AND m.conversation_id = ?'
  ).bind(message_id, convId).first();
  if (!msg) return json({ error: 'Message not found in this conversation' }, 404);

  await env.DB.prepare('UPDATE conversations SET pinned_message_id = ? WHERE id = ?').bind(message_id, convId).run();

  try {
    const roomObj = env.ROOMS.get(env.ROOMS.idFromName(convId));
    await roomObj.fetch(new Request('https://internal/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'pin_update', pinned: msg })
    }));
  } catch (e) { /* best effort */ }

  return json({ ok: true, pinned: msg });
}

async function getPinnedMessage(convId, user, env) {
  const conv = await env.DB.prepare(
    'SELECT * FROM conversations WHERE id = ? AND (user_a = ? OR user_b = ?)'
  ).bind(convId, user.id, user.id).first();
  if (!conv) return json({ error: 'Not found' }, 404);

  if (!conv.pinned_message_id) return json({ pinned: null });

  const msg = await env.DB.prepare(
    'SELECT m.*, u.display_name as sender_name FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.id = ?'
  ).bind(conv.pinned_message_id).first();
  return json({ pinned: msg || null });
}

async function deleteMessage(msgId, user, env) {
  const msg = await env.DB.prepare('SELECT * FROM messages WHERE id = ? AND sender_id = ?').bind(msgId, user.id).first();
  if (!msg) return json({ error: 'Not found or not authorized' }, 404);

  await env.DB.prepare('DELETE FROM messages WHERE id = ?').bind(msgId).run();

  // If message had media, delete from R2
  if (msg.media_url) {
    try {
      const key = msg.media_url.split('/media/get/')[1];
      if (key) await env.MEDIA.delete(key);
    } catch (e) { /* best effort */ }
  }

  return json({ ok: true, deleted: msgId });
}
