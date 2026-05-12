#!/bin/bash
# One-click deploy: fetches latest built-output branch from GitHub
# (built by GitHub Actions on every push to main) and ships it to
# https://nextrealmos.pages.dev via wrangler.
#
#   Usage:  bash deploy-from-built.sh
#
# The GH Actions build runs automatically on every push to `main`.
# This script picks up whatever build is current and deploys it.
set -euo pipefail
cd "$(dirname "$0")"

# 1. Fetch the latest built-output branch
echo "▸ Fetching latest built-output from GitHub..."
git fetch origin built-output --force 2>&1 | tail -3 || true

# 2. Extract into a clean worktree
WORKTREE="/tmp/nros-built-$$"
rm -rf "$WORKTREE"
git worktree add --force "$WORKTREE" origin/built-output 2>&1 | tail -3

ARTIFACT_SHA=$(cat "$WORKTREE/.build-info" 2>/dev/null || echo "unknown")
echo "▸ Deploying artifact: $ARTIFACT_SHA"
echo "▸ Size: $(du -sh "$WORKTREE" | cut -f1)"

# 3. Deploy
./node_modules/.bin/wrangler pages deploy "$WORKTREE" \
  --project-name=nextrealmos \
  --branch=main \
  --commit-dirty=true \
  2>&1 | grep -E "Uploading|Success|Deploying|Deployment complete|peek over"

# 4. Verify
echo ""
echo "▸ Verifying https://nextrealmos.pages.dev ..."
sleep 4
status=$(curl -s -o /dev/null -w "%{http_code}" https://nextrealmos.pages.dev/)
if [ "$status" = "200" ]; then
  echo "  ✓ Production OK (HTTP $status)"
else
  echo "  ✗ Production returned HTTP $status — check Cloudflare dashboard"
  exit 1
fi

# 5. Clean up worktree
git worktree remove --force "$WORKTREE" 2>&1 || true

echo ""
echo "═══════════════════════════════════════════"
echo " Deployed: https://nextrealmos.pages.dev"
echo "═══════════════════════════════════════════"
