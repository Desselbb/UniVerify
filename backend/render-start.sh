#!/usr/bin/env bash
# Starts the bundled chain node next to the API so a single free instance serves both.
set -euo pipefail

ANVIL="$PWD/.foundry/bin/anvil"
CHAIN_PORT="${CHAIN_PORT:-8545}"

if [ -x "$ANVIL" ]; then
  "$ANVIL" --host 127.0.0.1 --port "$CHAIN_PORT" --gas-price 0 --base-fee 0 --silent &
  trap 'kill $! 2>/dev/null || true' EXIT
fi

exec node src/server.js
