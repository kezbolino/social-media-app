#!/bin/bash
# Double-click this file to start the Instagram Caption Grabber.
# It opens the tool in your web browser. Keep the window that appears open
# while you use it; close it when you're done.

cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  Node.js needs to be installed first (one-time, free)."
  echo "  Opening the download page in your browser…"
  echo "  Install the big green 'LTS' version, then double-click this file again."
  echo ""
  open "https://nodejs.org/en/download" 2>/dev/null
  read -n 1 -s -r -p "  Press any key to close this window."
  echo ""
  exit 1
fi

node server.js
