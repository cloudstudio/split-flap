# Split-Flap Display

Real-time split-flap display simulator in the browser. Push messages via API and watch them flip into place with mechanical sound effects and color flashes — like an airport departure board.

<!-- Replace with an actual screenshot or GIF of the display -->
<!-- ![screenshot](screenshot.png) -->

![node >= 18](https://img.shields.io/badge/node-%3E%3D18-green) ![License: MIT](https://img.shields.io/badge/license-MIT-blue)

## Quick Start

```bash
npm install
npm start
```

Open http://localhost:3420

## How It Works

The display is a 20-column x 8-row grid. Each cell animates through random characters before landing on the target — just like a real split-flap mechanism. A new color palette is generated for every transition.

**In the browser:**

- **SFX** button toggles procedural mechanical sound (Web Audio API)

## API

### Push a message

```bash
curl -X POST http://localhost:3420/api/message \
  -H 'Content-Type: application/json' \
  -d '{"lines": ["HELLO", "WORLD"]}'
```

**Response:**

```json
{ "ok": true, "clients": 2 }
```

Text is automatically uppercased and centered on the grid. If a line contains two or more consecutive spaces, it's treated as a label-value pair and aligned to the edges:

```
Input:  "GATE  B42"
Output: "GATE              B42"
```

### Live updates (SSE)

```bash
curl http://localhost:3420/api/events
```

All connected browsers receive messages in real-time via Server-Sent Events. Open the display on a TV, tablet, or second monitor and push messages from anywhere on the network.

### URL parameters

Load a message on page open:

```
http://localhost:3420?lines=FLIGHT+1234|GATE+B42|ON+TIME
```

Lines are separated by `|`.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT`   | `3420`  | Server port |

```bash
PORT=8080 npm start
```

## Claude Code Integration

The `examples/` directory contains shell scripts that hook into [Claude Code](https://claude.ai/claude-code) events and display tool usage on the split-flap board in real-time.

> Requires `jq` and `curl` on your system.

Add hooks to your Claude Code settings (`.claude/settings.json`):

```json
{
  "hooks": {
    "SessionStart": [{ "command": "bash examples/hook-session.sh" }],
    "PreToolUse":   [{ "command": "bash examples/hook-prompt.sh" }],
    "PostToolUse":  [{ "command": "bash examples/hook-notify.sh" }],
    "Stop":         [{ "command": "bash examples/hook-stop.sh" }]
  }
}
```

| Hook | Displays |
|------|----------|
| `hook-session.sh` | "CLAUDE ONLINE / READY TO WORK" on session start |
| `hook-prompt.sh` | "PROCESSING / NEW REQUEST" on new prompt |
| `hook-notify.sh` | Tool name + context (e.g. "EDITING server.js", "SEARCHING pattern") |
| `hook-stop.sh` | "TASK COMPLETE / READY" when done |

## Features

- 20x8 character grid with split-flap flip animation
- Procedural mechanical sound (Web Audio API, two-layer synthesis)
- Random color palette flashes during transitions
- SSE real-time push to all connected clients
- Responsive — fills any screen size
- Zero external frontend dependencies
- Single `express` backend dependency

## License

MIT
