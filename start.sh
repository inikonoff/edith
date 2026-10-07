#!/bin/bash
# Launcher for Linux — run from a terminal, or mark executable and launch
# from your file manager if it supports that.
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required to run Edith but wasn't found."
  echo "Install it from https://nodejs.org and run this again."
  exit 1
fi

node server.mjs
