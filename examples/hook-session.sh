#!/bin/bash
SESSION="${USER:-$(whoami)}"
curl -s "http://localhost:3420/api/message/$SESSION" \
  -H 'Content-Type: application/json' \
  -d '{"lines":["CLAUDE ONLINE","READY TO WORK"]}' > /dev/null 2>&1 || true
