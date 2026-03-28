#!/bin/bash
# Reads PostToolUse JSON from stdin, sends a descriptive message to split-flap

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')
[ -z "$TOOL" ] && exit 0

# Splits text into lines of max 20 chars, breaking on spaces
wrap() {
  echo "$1" | fold -s -w 20 | head -6 | jq -R . | jq -s .
}

# Strip long paths, keep only filenames
strip_paths() {
  echo "$1" | sed 's|/[^ ]*/|/|g' | sed 's|/||g'
}

case "$TOOL" in
  Write)
    FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' | xargs basename 2>/dev/null)
    TEXT="CREATED $FILE"
    ;;
  Edit)
    FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' | xargs basename 2>/dev/null)
    OLD=$(echo "$INPUT" | jq -r '.tool_input.old_string // empty' | tr '\n' ' ' | sed 's/  */ /g' | head -c 60)
    TEXT="EDITING $FILE $OLD"
    ;;
  Read)
    FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' | xargs basename 2>/dev/null)
    TEXT="READING $FILE"
    ;;
  Bash)
    # Strip paths from commands, keep just the key parts
    CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty' | tr '\n' ' ' | sed 's|/[^ ]*/||g' | sed 's/  */ /g' | head -c 80)
    TEXT="RUNNING $CMD"
    ;;
  Glob)
    PATTERN=$(echo "$INPUT" | jq -r '.tool_input.pattern // empty' | xargs basename 2>/dev/null)
    TEXT="FINDING $PATTERN"
    ;;
  Grep)
    PATTERN=$(echo "$INPUT" | jq -r '.tool_input.pattern // empty' | head -c 40)
    TEXT="SEARCHING $PATTERN"
    ;;
  Agent)
    DESC=$(echo "$INPUT" | jq -r '.tool_input.description // empty' | head -c 60)
    TEXT="AGENT $DESC"
    ;;
  Skill)
    SKILL=$(echo "$INPUT" | jq -r '.tool_input.skill // empty')
    TEXT="SKILL $SKILL"
    ;;
  *)
    TEXT="WORKING $TOOL"
    ;;
esac

LINES=$(wrap "$TEXT")

curl -s http://localhost:3420/api/message \
  -H 'Content-Type: application/json' \
  -d "{\"lines\":$LINES}" > /dev/null 2>&1 || true
