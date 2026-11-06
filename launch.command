#!/bin/bash
# Pacific Highway Trail - One-Click Launcher
# Double-click this file in Finder to launch the game without terminal.

set -e
cd "$(dirname "$0")"
PROJECT_DIR="$(pwd)"
mkdir -p logs

if [ -f "$PROJECT_DIR/.venv/bin/python3" ]; then
    PYTHON_BIN="$PROJECT_DIR/.venv/bin/python3"
elif command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="$(command -v python3)"
else
    echo "Error: Python 3 was not found on your system."
    exit 1
fi

# Start uvicorn in the background if not already running on port 8000
if ! lsof -i :8000 >/dev/null 2>&1; then
    nohup "$PYTHON_BIN" -m uvicorn app.main:app --port 8000 > logs/server.log 2>&1 &
    sleep 1.2
fi

# Open default browser to the game UI
open "http://127.0.0.1:8000"

# Gracefully close the launcher Terminal window
osascript -e 'tell application "Terminal" to close (every window whose name contains "launch.command")' 2>/dev/null || true
exit 0
