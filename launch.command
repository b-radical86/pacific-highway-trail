#!/bin/bash
# Pacific Highway Trail - One-Click Launcher
# Double-click this file in Finder to launch the game without terminal.

set -e
cd "$(dirname "$0")"
PROJECT_DIR="$(pwd)"

if [ -f "$PROJECT_DIR/.venv/bin/python3" ]; then
    PYTHON_BIN="$PROJECT_DIR/.venv/bin/python3"
elif command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="$(command -v python3)"
else
    echo "Error: Python 3 was not found on your system."
    exit 1
fi

exec "$PYTHON_BIN" scripts/launcher.py
