#!/usr/bin/env bash
# Build the site locally and publish ONLY the built output to the gh-pages branch.
# The private vault (content/) never enters git — main stays source-only, gh-pages is
# pure static output. Point GitHub Pages (or Cloudflare Pages) at the gh-pages branch.
set -euo pipefail

VAULT="/home/alexandertg/Documents/private"
SITE="$HOME/Sites/loci"
WT="$HOME/.cache/loci-gh-pages"   # throwaway worktree, outside the repo
cd "$SITE"

# 1. Snapshot publishable vault -> content/ (strips .obsidian/caches/dotfiles; carves Website/).
#    Nothing here decides what publishes — ExplicitPublish (publish: true) + publish-exceptions.txt do.
rsync -a --delete \
  --exclude '.*' \
  --include '/Website/' \
  --include '/Website/the prophet.md' \
  --include '/Website/Interesting persons to follow.md' \
  --include '/Website/Recommended app list.md' \
  --include '/Website/Latin.md' \
  --include '/Website/quote.md' \
  --include '/Website/*.html' \
  --exclude '/Website/*' \
  --exclude '/index.md' --exclude '/brain.md' --exclude '/Books/index.md' \
  "$VAULT/" "$SITE/content/"

# 2. Build the static site into public/.
npx quartz build

# 3. Publish public/ -> gh-pages branch via an isolated worktree.
rm -rf "$WT"          # clear any leftover from a previous aborted run
git worktree prune
if git show-ref --verify --quiet refs/heads/gh-pages; then
  git worktree add -f "$WT" gh-pages
else
  # First run: orphan branch so gh-pages carries zero source history.
  git worktree add --detach -f "$WT"
  git -C "$WT" checkout --orphan gh-pages
  git -C "$WT" rm -rf . >/dev/null 2>&1 || true
fi

# Mirror the freshly built output into the worktree (delete stale pages, keep .git).
rsync -a --delete --exclude '.git' "$SITE/public/" "$WT/"
touch "$WT/.nojekyll"   # tell GitHub Pages to serve files verbatim, no Jekyll pass

git -C "$WT" add -A
if git -C "$WT" diff --cached --quiet; then
  echo "No changes to deploy."
else
  git -C "$WT" commit -m "deploy $(date -u +%FT%TZ)"
  git -C "$WT" push origin gh-pages
fi

git worktree remove -f "$WT"
echo "Done. gh-pages updated (push it to your repo's origin if not already)."
