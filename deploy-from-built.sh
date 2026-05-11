#!/bin/bash
# Run after GitHub Actions has pushed to `built-output` branch.
# Fetches the built artifact + deploys via wrangler.
set -euo pipefail
cd "$(dirname "$0")"

# Fetch latest built-output branch into a worktree path
WORKTREE="/tmp/nros-built"
rm -rf "$WORKTREE"

git fetch origin built-output:built-output 2>&1 | tail -3 || git fetch origin built-output 2>&1 | tail -3
git worktree add --force "$WORKTREE" built-output

echo "=== built-output contents ==="
ls -la "$WORKTREE" | head -20
echo "size: $(du -sh "$WORKTREE" | cut -f1)"

echo ""
echo "=== deploying to Cloudflare Pages ==="
./node_modules/.bin/wrangler pages deploy "$WORKTREE" \
  --project-name=nextrealmos \
  --branch=main \
  --commit-dirty=true

echo ""
echo "=== verifying ==="
sleep 3
curl -sI https://nextrealmos.pages.dev/ | head -1

# Clean up the worktree
git worktree remove --force "$WORKTREE" 2>&1 || true
