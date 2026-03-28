#!/bin/bash
# Demo sequence — simulates Claude Code working on a project
# Usage: bash demo.sh [session]

SESSION="${1:-default}"
URL="http://localhost:3420/api/message/$SESSION"
DELAY=4

send() {
  curl -s "$URL" -H 'Content-Type: application/json' -d "{\"lines\":$1}" > /dev/null
  sleep "$DELAY"
}

send '["CLAUDE ONLINE","READY TO WORK"]'
send '["READING","PACKAGE.JSON"]'
send '["SEARCHING ENDPOINTS","IN SRC/**/*.TS"]'
send '["READING","SRC/ROUTES/API.TS"]'
send '["AGENT","EXPLORING CODEBASE"]'
send '["EDITING SERVER.TS","ADDING AUTH LAYER"]'
send '["RUNNING NPM TEST"]'
send '["3 TESTS PASSED"]'
send '["EDITING AUTH.TS","TOKEN VALIDATION"]'
send '["RUNNING BUILD"]'
send '["BUILD OK","NO ERRORS"]'
send '["CREATING TABLE","USERS MIGRATION"]'
send '["RUNNING NPM TEST"]'
send '["12 TESTS PASSED"]'
send '["TASK COMPLETE","READY"]'

echo "Demo finished ($SESSION)."
