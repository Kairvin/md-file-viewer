#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "========================================================"
echo "           🚀 MD Preview Pro — Launching...              "
echo "========================================================"
echo "Starting local high-fidelity preview server..."

# Launch Vite server and auto-open browser
npx vite --port 5173 --open
