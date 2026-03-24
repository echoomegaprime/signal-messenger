CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  verified INTEGER DEFAULT 0,
  verify_token TEXT,
  avatar_url TEXT,
  created_at INTEGER NOT NULL,
  last_seen INTEGER
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_a TEXT NOT NULL,
  user_b TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_a) REFERENCES users(id),
  FOREIGN KEY (user_b) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  content_en TEXT NOT NULL,
  content_ur TEXT,
  content_ne TEXT,
  content_es TEXT,
  media_url TEXT,
  media_type TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  FOREIGN KEY (sender_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS contacts (
  user_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  approved INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, contact_id)
);

CREATE TABLE IF NOT EXISTS message_reactions (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (message_id) REFERENCES messages(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS note_folders (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_id TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  folder_id TEXT,
  owner_id TEXT NOT NULL,
  shared_with TEXT,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (folder_id) REFERENCES note_folders(id),
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_users ON conversations(user_a, user_b);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reactions_unique ON message_reactions(message_id, user_id, emoji);
CREATE INDEX IF NOT EXISTS idx_reactions_message ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_notes_owner ON notes(owner_id);
CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes(folder_id);
CREATE INDEX IF NOT EXISTS idx_folders_owner ON note_folders(owner_id);
