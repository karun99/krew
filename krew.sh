#!/usr/bin/env bash
# KREW — command-line wrapper. Delegates to the KREW CLI core.
set -euo pipefail

KREW_ROOT="$(cd "$(dirname "$0")" && pwd)"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js >= 18 is required to run KREW." >&2
  exit 1
fi

exec node "$KREW_ROOT/core/krew.ts" "$@"
