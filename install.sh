#!/usr/bin/env bash
# KREW — Linux installer.
# One-time setup: checks prerequisites, creates runtime directories
# (config defaults, zones, logs). Idempotent — safe to re-run.
set -euo pipefail

KREW_ROOT="$(cd "$(dirname "$0")" && pwd)"
NODE_MIN_MAJOR=18

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js >= ${NODE_MIN_MAJOR} is required but was not found." >&2
  echo "       Install it from https://nodejs.org and re-run this script." >&2
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt "$NODE_MIN_MAJOR" ]; then
  echo "ERROR: Node.js >= ${NODE_MIN_MAJOR} is required (found ${NODE_MAJOR})." >&2
  echo "       Upgrade Node.js and re-run this script." >&2
  exit 1
fi

mkdir -p "$KREW_ROOT/zones" "$KREW_ROOT/logs"
mkdir -p "$KREW_ROOT/config"

echo "KREW installed. Runtime directories ready."
echo "Next: run './run.sh' to launch the KREW CLI."
