export class ChatRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map(); // userId -> WebSocket
  }

  async fetch(request) {
    const url = new URL(request.url);

    // Internal broadcast from messages.js
    if (url.pathname === '/broadcast' && request.method === 'POST') {
      const data = await request.json();
      this.broadcast(JSON.stringify(data));
      return new Response('ok');
    }

    // Internal: get online users
    if (url.pathname === '/online' && request.method === 'GET') {
      const online = [];
      for (const [userId, ws] of this.sessions) {
        try {
          ws.send(JSON.stringify({ type: 'ping' }));
          online.push(userId);
        } catch {
          this.sessions.delete(userId);
        }
      }
      return new Response(JSON.stringify({ online }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.handleSession(server, request);
      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response('Expected WebSocket', { status: 400 });
  }

  handleSession(ws, request) {
    ws.accept();
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId') || 'anon';

    // Close old connection for same user (prevent dupes)
    const old = this.sessions.get(userId);
    if (old) {
      try { old.close(1000, 'replaced'); } catch {}
    }

    this.sessions.set(userId, ws);

    ws.addEventListener('message', (msg) => {
      try {
        const data = JSON.parse(msg.data);

        switch (data.type) {
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
            break;

          case 'typing':
            // Broadcast typing indicator to others
            this.broadcastExcept(userId, JSON.stringify({
              type: 'typing', userId, displayName: data.displayName || userId
            }));
            break;

          case 'stop_typing':
            this.broadcastExcept(userId, JSON.stringify({
              type: 'stop_typing', userId
            }));
            break;

          case 'webrtc_signal':
            // Forward WebRTC signaling to specific user
            if (data.target_user_id) {
              const targetWs = this.sessions.get(data.target_user_id);
              if (targetWs) {
                try {
                  targetWs.send(JSON.stringify({
                    type: 'webrtc_signal',
                    signal: data.signal,
                    from: userId,
                    callType: data.callType || 'video'
                  }));
                } catch {}
              }
            }
            break;

          case 'call_end':
            if (data.target_user_id) {
              const targetWs = this.sessions.get(data.target_user_id);
              if (targetWs) {
                try {
                  targetWs.send(JSON.stringify({ type: 'call_end', from: userId }));
                } catch {}
              }
            }
            break;

          case 'call_reject':
            if (data.target_user_id) {
              const targetWs = this.sessions.get(data.target_user_id);
              if (targetWs) {
                try {
                  targetWs.send(JSON.stringify({ type: 'call_reject', from: userId }));
                } catch {}
              }
            }
            break;
        }
      } catch {}
    });

    ws.addEventListener('close', () => {
      this.sessions.delete(userId);
      this.broadcast(JSON.stringify({ type: 'user_offline', userId }));
    });

    ws.addEventListener('error', () => {
      this.sessions.delete(userId);
    });

    // Notify others this user is online
    this.broadcast(JSON.stringify({ type: 'user_online', userId }));

    // Send current online users to the new connection
    const onlineUsers = [...this.sessions.keys()];
    ws.send(JSON.stringify({ type: 'online_users', users: onlineUsers }));
  }

  broadcast(message) {
    for (const [userId, ws] of this.sessions) {
      try { ws.send(message); } catch {
        this.sessions.delete(userId);
      }
    }
  }

  broadcastExcept(excludeUserId, message) {
    for (const [userId, ws] of this.sessions) {
      if (userId === excludeUserId) continue;
      try { ws.send(message); } catch {
        this.sessions.delete(userId);
      }
    }
  }
}
