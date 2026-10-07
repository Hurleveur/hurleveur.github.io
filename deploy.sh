#!/usr/bin/env bash
# Build the site locally and publish ONLY the built output to the gh-pages branch.
# The private vault (content/) never enters git — main stays source-only, gh-pages is
# pure static output. Point GitHub Pages (or Cloudflare Pages) at the gh-pages branch.
set -euo pipefail

VAULT="/home/alexandertg/Documents/private"
# The clone this script lives in — never a hardcoded path. A second checkout once
# went stale and silently deployed month-old source for a week.
SITE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WT="$HOME/.cache/loci-gh-pages"   # throwaway worktree, outside the repo
BUILD="$HOME/.cache/loci-build"   # deploy build output, isolated from the live `--serve` public/
# Outside content/ and outside the repo's tracked files, next to $BUILD — a
# resync or a git checkout can't touch it, and it never gets published.
STAMP="$HOME/.cache/loci-deploy.stamp"

FORCE="${FORCE:-}"
for arg in "$@"; do
  [ "$arg" = "--force" ] && FORCE=1
done

cd "$SITE"

# Fingerprint of everything that decides the build's output, so a night with
# zero vault/source change skips the build and the ~275-file no-op commit that
# build nondeterminism produces even then. Covers: content/ (paths+bytes, hashed
# directly since content/ is gitignored), this clone's commit, and its uncommitted
# tracked changes (deploy.sh builds the working tree, not HEAD) — the last two
# together already cover every tracked input (publish-exceptions.txt,
# quartz.config.yaml, package-lock.json, local-plugins/) since they're all
# tracked files in this same clone.
compute_fingerprint() {
  local content_hash head_sha diff_hash
  content_hash=$(find content -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum | cut -d' ' -f1)
  head_sha=$(git rev-parse HEAD)
  diff_hash=$(git diff HEAD | sha256sum | cut -d' ' -f1)
  printf '%s %s %s\n' "$content_hash" "$head_sha" "$diff_hash" | sha256sum | cut -d' ' -f1
}

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
  --exclude '/index.md' --exclude '/brain.md' \
  "$VAULT/" "$SITE/content/"

# 1a. Pre-deploy content check: prints warnings (unfinished notes, leaked
#     private names, secret-shaped strings, links to now-private notes) and
#     never affects the deploy's outcome, by design.
node "$SITE/scripts/predeploy-warn.mjs" "$SITE/content" || true

# 1b. Skip the build+push entirely if nothing that determines the output has
#     changed since the last successful push. --force / FORCE=1 bypasses this.
FINGERPRINT="$(compute_fingerprint)"
if [ -z "$FORCE" ] && [ -f "$STAMP" ] && [ "$(cat "$STAMP")" = "$FINGERPRINT" ]; then
  echo "Unchanged since last successful deploy ($FINGERPRINT); skipping build. Use --force to override."
  exit 0
fi

# 2. Build the static site into an isolated dir (NOT public/).
#    `npx quartz build` is production mode (hashed asset names). A running
#    `quartz build --serve --watch` writes UNHASHED names into public/; if the
#    two share public/ they clobber each other and pages end up referencing
#    assets that don't exist (404 CSS = broken styling). Keep them separate.
npx quartz build -o "$BUILD"

# 3. Publish public/ -> gh-pages branch via an isolated worktree.
rm -rf "$WT"          # clear any leftover from a previous aborted run
git worktree prune
if git fetch origin gh-pages 2>/dev/null; then
  # Track origin, not whatever this clone last saw — another checkout may have
  # deployed since, and committing on a stale base makes the push non-fast-forward.
  git branch -f gh-pages FETCH_HEAD
  git worktree add -f "$WT" gh-pages
elif git show-ref --verify --quiet refs/heads/gh-pages; then
  git worktree add -f "$WT" gh-pages
else
  # First run: orphan branch so gh-pages carries zero source history.
  git worktree add --detach -f "$WT"
  git -C "$WT" checkout --orphan gh-pages
  git -C "$WT" rm -rf . >/dev/null 2>&1 || true
fi

# Mirror the freshly built output into the worktree (delete stale pages, keep .git).
rsync -a --delete --exclude '.git' "$BUILD/" "$WT/"
touch "$WT/.nojekyll"   # tell GitHub Pages to serve files verbatim, no Jekyll pass

git -C "$WT" add -A
if git -C "$WT" diff --cached --quiet; then
  echo "No changes to deploy."
else
  git -C "$WT" commit -m "deploy $(date -u +%FT%TZ)"
  # Retry the push. ExecStartPre only proves DNS resolved *before* the build; three
  # minutes later, on a still-settling boot, resolution can fail once and throw the
  # whole build away ("Could not resolve host: github.com", 2026-08-19).
  pushed=
  for i in 1 2 3 4 5; do
    if git -C "$WT" push origin gh-pages; then pushed=1; break; fi
    echo "push failed (attempt $i/5), retrying in 30s" >&2
    sleep 30
  done
  [ -n "$pushed" ] || { echo "push failed after 5 attempts" >&2; exit 1; }
fi

# Live site now matches this fingerprint (pushed, or already identical). Written
# atomically — a crash mid-write must never leave a half-written stamp read back
# as a false "unchanged" next run.
stamp_tmp="$(mktemp "$STAMP.XXXXXX")"
printf '%s\n' "$FINGERPRINT" > "$stamp_tmp"
mv "$stamp_tmp" "$STAMP"

git worktree remove -f "$WT"
echo "Done. gh-pages updated (push it to your repo's origin if not already)."
