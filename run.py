"""
run.py — One-command launcher for DLP Chart Analyzer
======================================================
Installs dependencies and starts the Flask backend.
The frontend is served directly by Flask from the /frontend folder.
"""
import subprocess
import sys
import os

ROOT    = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.join(ROOT, "backend")
REQ     = os.path.join(BACKEND, "requirements.txt")
APP     = os.path.join(BACKEND, "app.py")

def install():
    print("📦  Installing Python dependencies…")
    subprocess.check_call(
        [sys.executable, "-m", "pip", "install", "-r", REQ],
        stdout=subprocess.DEVNULL
    )
    print("✅  Dependencies ready.\n")

def run():
    print("🚀  Starting DLP Chart Analyzer…")
    print("   Backend  → http://127.0.0.1:5000")
    print("   Frontend → http://127.0.0.1:5000  (open in your browser)\n")
    os.chdir(BACKEND)
    os.environ["FLASK_APP"] = "app.py"
    os.environ["FLASK_ENV"] = "development"
    subprocess.call([sys.executable, APP])

if __name__ == "__main__":
    install()
    run()
