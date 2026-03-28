const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3420;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// SSE clients
const clients = [];

app.get('/api/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  res.flushHeaders();
  clients.push(res);
  req.on('close', () => {
    const i = clients.indexOf(res);
    if (i !== -1) clients.splice(i, 1);
  });
});

const COLS = 20;
const ROWS = 8;

// Detect if a line has a "label  value" pattern (label then spaces then value)
function formatLine(line) {
  line = line.trim().toUpperCase();
  if (line.length === 0) return '';

  // Try to detect "LABEL   VALUE" pattern (2+ spaces separating)
  const match = line.match(/^(.+?)\s{2,}(.+)$/);
  if (match) {
    const label = match[1].trim();
    const value = match[2].trim();
    const gap = COLS - label.length - value.length;
    if (gap >= 1) {
      return label + ' '.repeat(gap) + value;
    }
  }

  // No pattern detected: center the line
  const pad = Math.floor((COLS - line.length) / 2);
  return ' '.repeat(Math.max(0, pad)) + line;
}

// POST /api/message { lines: ["LINE 1", "LINE 2", ...] }
app.post('/api/message', (req, res) => {
  const { lines } = req.body;
  if (!lines || !Array.isArray(lines) || !lines.every(l => typeof l === 'string')) {
    return res.status(400).json({ error: 'Send { lines: ["LINE1", "LINE2", ...] }' });
  }

  // Filter empty lines to count real content for vertical centering
  const contentLines = lines.filter(l => l.trim().length > 0);
  const topPadding = Math.floor((ROWS - contentLines.length) / 2);

  const result = [];
  let contentIdx = 0;
  for (let r = 0; r < ROWS; r++) {
    const lineIdx = r - topPadding;
    if (lineIdx >= 0 && lineIdx < contentLines.length) {
      result.push(formatLine(contentLines[lineIdx]).slice(0, COLS));
    } else {
      result.push('');
    }
  }

  const data = JSON.stringify({ lines: result });
  clients.forEach(c => c.write(`data: ${data}\n\n`));
  res.json({ ok: true, clients: clients.length });
});

app.listen(PORT, () => {
  console.log(`Split-flap server running at http://localhost:${PORT}`);
});
