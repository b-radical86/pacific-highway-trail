"""Pacific Highway Trail - One-Click Launcher Helper.

Starts Uvicorn in a detached session (PPID 1, no controlling TTY),
opens the default browser, and cleanly closes the launcher Terminal window
without triggering macOS Terminal process-termination confirmation sheets.
"""

import os
import socket
import subprocess
import sys
import time
from pathlib import Path


def is_port_in_use(port: int = 8000) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", port)) == 0


def main() -> None:
    root_dir = Path(__file__).resolve().parent.parent
    os.chdir(root_dir)
    logs_dir = root_dir / "logs"
    logs_dir.mkdir(exist_ok=True)
    server_log = logs_dir / "server.log"

    # 1. Start server detached if not already running on port 8000
    if not is_port_in_use(8000):
        with open(server_log, "a") as f:
            subprocess.Popen(
                [sys.executable, "-m", "uvicorn", "app.main:app", "--port", "8000"],
                stdout=f,
                stderr=subprocess.STDOUT,
                start_new_session=True,  # Disconnects from controlling TTY entirely
            )

        # Wait up to 3 seconds for server to be ready
        for _ in range(30):
            time.sleep(0.1)
            if is_port_in_use(8000):
                break

    # 2. Open default browser
    subprocess.run(["open", "http://127.0.0.1:8000"], check=False)

    # 3. Close the Terminal window cleanly from an external detached process.
    # Delay 0.6s so that this launcher script has completely exited and Terminal
    # has executed its trailing 'exit;'. When the detached osascript runs,
    # the window has zero running processes and closes without any modal prompt.
    close_script = (
        "delay 0.6\n"
        'tell application "Terminal"\n'
        '    set targetWins to (every window whose name contains "launch.command")\n'
        "    repeat with w in targetWins\n"
        "        close w\n"
        "    end repeat\n"
        "end tell\n"
    )
    subprocess.Popen(
        ["osascript", "-e", close_script],
        start_new_session=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


if __name__ == "__main__":
    main()
