#!/usr/bin/env bash
# Render build step: install runtime deps plus a local anvil chain node. Free plans have
# no persistent disk, so the chain lives beside the API and is rebuilt on every boot.
set -euo pipefail

npm ci

export FOUNDRY_DIR="$PWD/.foundry"
curl -sSL https://foundry.paradigm.xyz | bash
"$FOUNDRY_DIR/bin/foundryup"
"$FOUNDRY_DIR/bin/anvil" --version
