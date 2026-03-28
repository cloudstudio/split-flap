#!/bin/bash
curl -s http://localhost:3420/api/message \
  -H 'Content-Type: application/json' \
  -d '{"lines":["TASK COMPLETE","READY"]}' > /dev/null 2>&1 || true
