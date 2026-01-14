#!/bin/bash

# Install git hooks from the scripts directory
# Run this script after cloning the repository: ./scripts/install-hooks.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HOOKS_DIR="$REPO_ROOT/.git/hooks"

echo "Installing git hooks..."

# Install pre-push hook
if [ -f "$SCRIPT_DIR/pre-push" ]; then
  cp "$SCRIPT_DIR/pre-push" "$HOOKS_DIR/pre-push"
  chmod +x "$HOOKS_DIR/pre-push"
  echo "✅ Installed pre-push hook"
else
  echo "❌ pre-push hook not found in scripts directory"
  exit 1
fi

echo ""
echo "Git hooks installed successfully!"
echo "The pre-push hook will run CI checks before every push."
echo "To bypass the hook, use: git push --no-verify"
