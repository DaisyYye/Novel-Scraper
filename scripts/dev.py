from __future__ import annotations

import signal
import subprocess
import sys
import time
import os
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FRONTEND_DIR = ROOT / "frontend"


def find_backend_command() -> list[str]:
    user_script = (
        Path.home()
        / "AppData"
        / "Roaming"
        / "Python"
        / f"Python{sys.version_info.major}{sys.version_info.minor}"
        / "Scripts"
        / "uvicorn.exe"
    )

    # Prefer the user-level pip script because it is the most reliable
    # installation layout on this Windows machine.
    if user_script.parent.exists():
        return [str(user_script), "backend.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"]

    candidates = [
        ROOT / ".python_packages" / "bin" / "uvicorn.exe",
        ROOT / ".python_packages" / "Scripts" / "uvicorn.exe",
    ]

    for candidate in candidates:
        if candidate.exists():
            return [str(candidate), "backend.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"]

    return [sys.executable, "-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"]


def start_process(command: list[str], cwd: Path) -> subprocess.Popen[bytes]:
    env = os.environ.copy()
    python_path_parts = [str(ROOT)]
    existing_python_path = env.get("PYTHONPATH")
    if existing_python_path:
        python_path_parts.append(existing_python_path)
    env["PYTHONPATH"] = os.pathsep.join(python_path_parts)
    return subprocess.Popen(command, cwd=str(cwd), env=env)


def terminate_process(process: subprocess.Popen[bytes]) -> None:
    if process.poll() is not None:
        return

    process.terminate()
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()


def main() -> int:
    print("Starting backend on http://127.0.0.1:8000")
    backend = start_process(find_backend_command(), ROOT)

    time.sleep(1)

    print("Starting frontend on http://127.0.0.1:5173")
    frontend = start_process(["npm.cmd", "run", "dev"], FRONTEND_DIR)

    def handle_signal(_signum: int, _frame: object | None) -> None:
        terminate_process(frontend)
        terminate_process(backend)
        raise SystemExit(0)

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    try:
        while True:
            if backend.poll() is not None:
                terminate_process(frontend)
                return backend.returncode or 1
            if frontend.poll() is not None:
                terminate_process(backend)
                return frontend.returncode or 1
            time.sleep(0.5)
    finally:
        terminate_process(frontend)
        terminate_process(backend)


if __name__ == "__main__":
    raise SystemExit(main())
