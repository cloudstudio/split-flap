const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3420;
const COLS = 20;
const ROWS = 8;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// State
const sessions = new Map();
const globalClients = [];
const lastMessage = new Map();
const lastActivity = new Map(); // timestamp of last POST per session

// Cleanup sessions with no SSE clients and no activity in 5 minutes
const SESSION_TTL = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [id, clients] of sessions) {
    if (clients.length === 0) {
      const activity = lastActivity.get(id) || 0;
      if (now - activity > SESSION_TTL) {
        sessions.delete(id);
        lastMessage.delete(id);
        lastActivity.delete(id);
      }
    }
  }
  broadcastSessionList();
}, 60 * 1000);

function getSession(id) {
  if (!sessions.has(id)) sessions.set(id, []);
  return sessions.get(id);
}

function broadcastSessionList() {
  const list = [];
  for (const [id, clients] of sessions) {
    list.push({ id, clients: clients.length });
  }
  const data = JSON.stringify({ type: 'sessions', list });
  globalClients.forEach(c => c.write(`data: ${data}\n\n`));
}

function formatLine(line) {
  line = line.trim().toUpperCase();
  if (line.length === 0) return '';

  // "LABEL   VALUE" pattern — align to edges
  const match = line.match(/^(.+?)\s{2,}(.+)$/);
  if (match) {
    const label = match[1].trim();
    const value = match[2].trim();
    const gap = COLS - label.length - value.length;
    if (gap >= 1) return label + ' '.repeat(gap) + value;
  }

  // Center the line
  const pad = Math.floor((COLS - line.length) / 2);
  return ' '.repeat(Math.max(0, pad)) + line;
}

function formatMessage(lines) {
  const contentLines = lines.filter(l => l.trim().length > 0);
  const topPadding = Math.floor((ROWS - contentLines.length) / 2);
  const result = [];
  for (let r = 0; r < ROWS; r++) {
    const lineIdx = r - topPadding;
    if (lineIdx >= 0 && lineIdx < contentLines.length) {
      result.push(formatLine(contentLines[lineIdx]).slice(0, COLS));
    } else {
      result.push('');
    }
  }
  return result;
}

// --- SSE endpoints ---

// Per-session stream (used by individual displays)
app.get(['/api/events', '/api/events/:session'], (req, res) => {
  const session = req.params.session || 'default';
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  res.flushHeaders();
  const clients = getSession(session);
  clients.push(res);
  broadcastSessionList();
  req.on('close', () => {
    const i = clients.indexOf(res);
    if (i !== -1) clients.splice(i, 1);
    if (clients.length === 0) {
      const activity = lastActivity.get(session) || 0;
      // Keep session alive if it has recent POST activity (e.g. Claude hooks)
      if (Date.now() - activity > SESSION_TTL) {
        sessions.delete(session);
        lastMessage.delete(session);
        lastActivity.delete(session);
      }
    }
    broadcastSessionList();
  });
});

// Global stream (used by dashboard — single connection for all sessions)
app.get('/api/events-all', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  res.flushHeaders();

  // Send current state
  for (const [id, lines] of lastMessage) {
    res.write(`data: ${JSON.stringify({ session: id, lines })}\n\n`);
  }
  // Send current session list
  const list = [];
  for (const [id, clients] of sessions) {
    list.push({ id, clients: clients.length });
  }
  res.write(`data: ${JSON.stringify({ type: 'sessions', list })}\n\n`);

  globalClients.push(res);
  req.on('close', () => {
    const i = globalClients.indexOf(res);
    if (i !== -1) globalClients.splice(i, 1);
  });
});

// --- REST endpoints ---

app.post(['/api/message', '/api/message/:session'], (req, res) => {
  const session = req.params.session || 'default';
  const { lines } = req.body;
  if (!lines || !Array.isArray(lines) || !lines.every(l => typeof l === 'string')) {
    return res.status(400).json({ error: 'Send { lines: ["LINE1", "LINE2", ...] }' });
  }

  const isNew = !sessions.has(session);
  const result = formatMessage(lines);
  lastMessage.set(session, result);
  lastActivity.set(session, Date.now());

  // Push to session clients
  const clients = getSession(session);
  const data = JSON.stringify({ lines: result });
  clients.forEach(c => c.write(`data: ${data}\n\n`));

  // Push to dashboard clients
  const globalData = JSON.stringify({ session, lines: result });
  globalClients.forEach(c => c.write(`data: ${globalData}\n\n`));

  // Notify dashboard of new session (even without SSE viewers)
  if (isNew) broadcastSessionList();

  res.json({ ok: true, session, clients: clients.length });
});

app.get('/api/sessions', (req, res) => {
  const list = [];
  for (const [id, clients] of sessions) {
    list.push({ id, clients: clients.length });
  }
  res.json(list);
});

// --- Pages ---

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/:session', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Split-flap server running at http://localhost:${PORT}`);
});
