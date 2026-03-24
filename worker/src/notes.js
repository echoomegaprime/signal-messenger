import { json, verifyToken } from './index.js';

export async function handleNotes(request, env, path) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return json({ error: 'Unauthorized' }, 401);
  const user = await verifyToken(token, env);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  // GET /notes — list all notes for user (own + shared)
  if (path === '/notes' && request.method === 'GET') {
    return listNotes(user, env, request);
  }

  // POST /notes — create note
  if (path === '/notes' && request.method === 'POST') {
    return createNote(request, user, env);
  }

  // GET /notes/:id
  const getMatch = path.match(/^\/notes\/([^\/]+)$/);
  if (getMatch && request.method === 'GET') {
    return getNote(getMatch[1], user, env);
  }

  // PUT /notes/:id
  const putMatch = path.match(/^\/notes\/([^\/]+)$/);
  if (putMatch && request.method === 'PUT') {
    return updateNote(putMatch[1], request, user, env);
  }

  // DELETE /notes/:id
  const delMatch = path.match(/^\/notes\/([^\/]+)$/);
  if (delMatch && request.method === 'DELETE') {
    return deleteNote(delMatch[1], user, env);
  }

  // POST /notes/:id/share — share note with another user
  const shareMatch = path.match(/^\/notes\/([^\/]+)\/share$/);
  if (shareMatch && request.method === 'POST') {
    return shareNote(shareMatch[1], request, user, env);
  }

  // GET /notes/folders/list — list all folders
  if (path === '/notes/folders/list' && request.method === 'GET') {
    return listFolders(user, env);
  }

  // POST /notes/folders — create folder
  if (path === '/notes/folders' && request.method === 'POST') {
    return createFolder(request, user, env);
  }

  // PUT /notes/folders/:id — rename folder
  const folderPut = path.match(/^\/notes\/folders\/([^\/]+)$/);
  if (folderPut && request.method === 'PUT') {
    return renameFolder(folderPut[1], request, user, env);
  }

  // DELETE /notes/folders/:id
  const folderDel = path.match(/^\/notes\/folders\/([^\/]+)$/);
  if (folderDel && request.method === 'DELETE') {
    return deleteFolder(folderDel[1], user, env);
  }

  return json({ error: 'Not found' }, 404);
}

async function listNotes(user, env, request) {
  const url = new URL(request.url);
  const folderId = url.searchParams.get('folder_id');

  let query, binds;
  if (folderId === 'null' || folderId === '') {
    // Root notes (no folder)
    query = `SELECT n.*, u.display_name as owner_name FROM notes n JOIN users u ON u.id = n.owner_id
             WHERE (n.owner_id = ? OR n.shared_with LIKE ?) AND n.folder_id IS NULL ORDER BY n.updated_at DESC`;
    binds = [user.id, `%${user.id}%`];
  } else if (folderId) {
    query = `SELECT n.*, u.display_name as owner_name FROM notes n JOIN users u ON u.id = n.owner_id
             WHERE (n.owner_id = ? OR n.shared_with LIKE ?) AND n.folder_id = ? ORDER BY n.updated_at DESC`;
    binds = [user.id, `%${user.id}%`, folderId];
  } else {
    // All notes
    query = `SELECT n.*, u.display_name as owner_name FROM notes n JOIN users u ON u.id = n.owner_id
             WHERE n.owner_id = ? OR n.shared_with LIKE ? ORDER BY n.updated_at DESC`;
    binds = [user.id, `%${user.id}%`];
  }

  const notes = await env.DB.prepare(query).bind(...binds).all();
  return json(notes.results || []);
}

async function createNote(request, user, env) {
  const { title, content, folder_id } = await request.json();
  if (!title) return json({ error: 'Title required' }, 400);

  const id = crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare(
    'INSERT INTO notes (id, folder_id, owner_id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, folder_id || null, user.id, title, content || '', now, now).run();

  return json({ id, folder_id: folder_id || null, owner_id: user.id, title, content: content || '', created_at: now, updated_at: now });
}

async function getNote(noteId, user, env) {
  const note = await env.DB.prepare(
    'SELECT n.*, u.display_name as owner_name FROM notes n JOIN users u ON u.id = n.owner_id WHERE n.id = ?'
  ).bind(noteId).first();
  if (!note) return json({ error: 'Not found' }, 404);
  if (note.owner_id !== user.id && !(note.shared_with || '').includes(user.id)) {
    return json({ error: 'Not authorized' }, 403);
  }
  return json(note);
}

async function updateNote(noteId, request, user, env) {
  const note = await env.DB.prepare('SELECT * FROM notes WHERE id = ?').bind(noteId).first();
  if (!note) return json({ error: 'Not found' }, 404);
  if (note.owner_id !== user.id && !(note.shared_with || '').includes(user.id)) {
    return json({ error: 'Not authorized' }, 403);
  }

  const { title, content, folder_id } = await request.json();
  const now = Date.now();
  await env.DB.prepare(
    'UPDATE notes SET title = ?, content = ?, folder_id = ?, updated_at = ? WHERE id = ?'
  ).bind(title ?? note.title, content ?? note.content, folder_id !== undefined ? folder_id : note.folder_id, now, noteId).run();

  return json({ ok: true, updated_at: now });
}

async function deleteNote(noteId, user, env) {
  const note = await env.DB.prepare('SELECT * FROM notes WHERE id = ?').bind(noteId).first();
  if (!note) return json({ error: 'Not found' }, 404);
  if (note.owner_id !== user.id) return json({ error: 'Only owner can delete' }, 403);

  await env.DB.prepare('DELETE FROM notes WHERE id = ?').bind(noteId).run();
  return json({ ok: true, deleted: noteId });
}

async function shareNote(noteId, request, user, env) {
  const note = await env.DB.prepare('SELECT * FROM notes WHERE id = ?').bind(noteId).first();
  if (!note) return json({ error: 'Not found' }, 404);
  if (note.owner_id !== user.id) return json({ error: 'Only owner can share' }, 403);

  const { user_id } = await request.json();
  if (!user_id) return json({ error: 'user_id required' }, 400);

  const existing = (note.shared_with || '').split(',').filter(Boolean);
  if (!existing.includes(user_id)) existing.push(user_id);
  const shared_with = existing.join(',');

  await env.DB.prepare('UPDATE notes SET shared_with = ? WHERE id = ?').bind(shared_with, noteId).run();
  return json({ ok: true, shared_with });
}

async function listFolders(user, env) {
  const folders = await env.DB.prepare(
    'SELECT * FROM note_folders WHERE owner_id = ? ORDER BY name ASC'
  ).bind(user.id).all();
  return json(folders.results || []);
}

async function createFolder(request, user, env) {
  const { name, parent_id } = await request.json();
  if (!name) return json({ error: 'Name required' }, 400);

  const id = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO note_folders (id, owner_id, name, parent_id, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, user.id, name, parent_id || null, Date.now()).run();

  return json({ id, owner_id: user.id, name, parent_id: parent_id || null });
}

async function renameFolder(folderId, request, user, env) {
  const folder = await env.DB.prepare('SELECT * FROM note_folders WHERE id = ? AND owner_id = ?').bind(folderId, user.id).first();
  if (!folder) return json({ error: 'Not found' }, 404);

  const { name } = await request.json();
  if (!name) return json({ error: 'Name required' }, 400);

  await env.DB.prepare('UPDATE note_folders SET name = ? WHERE id = ?').bind(name, folderId).run();
  return json({ ok: true, name });
}

async function deleteFolder(folderId, user, env) {
  const folder = await env.DB.prepare('SELECT * FROM note_folders WHERE id = ? AND owner_id = ?').bind(folderId, user.id).first();
  if (!folder) return json({ error: 'Not found' }, 404);

  // Move notes in this folder to root
  await env.DB.prepare('UPDATE notes SET folder_id = NULL WHERE folder_id = ?').bind(folderId).run();
  // Delete sub-folders
  await env.DB.prepare('DELETE FROM note_folders WHERE parent_id = ?').bind(folderId).run();
  // Delete the folder
  await env.DB.prepare('DELETE FROM note_folders WHERE id = ?').bind(folderId).run();

  return json({ ok: true, deleted: folderId });
}
