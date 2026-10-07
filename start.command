#!/bin/bash
# Double-click launcher for macOS (Finder runs .command files in Terminal).
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required to run Edith but wasn't found on this Mac."
  echo "Install it from https://nodejs.org and run this again."
  read -n 1 -s -r -p "Press any key to close this window..."
  echo
  exit 1
fi

node server.mjs
echo
read -n 1 -s -r -p "Edith's server stopped. Press any key to close this window..."
echo
