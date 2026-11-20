#!/usr/bin/env bash
# Refreshes the site captures on the Work room's cards (Work/Work.md in the
# vault): one 1440x900 headless screenshot per site, saved as a 1200px webp.
# Not here: endless-sky.webp (the game's own battle.jpg from
# endless-sky.github.io/screenshots.html) and the CSS-drawn cards.
set -euo pipefail
cd "$(dirname "$0")"
declare -A SITES=(
  [cloud]=https://cloud.ingram.tech/
  [ingram]=https://ingram.tech/
  [cyberspace]=https://www.cyberspace.team/
  [ctf]=https://robottech.vercel.app/
  [loci]=https://hurleveur.github.io/
)
tmp=$(mktemp -d)
for name in "${!SITES[@]}"; do
  # the budget lets client-rendered pages and their fonts settle before the shot
  chromium --headless=new --no-sandbox --hide-scrollbars --mute-audio \
    --user-data-dir="$tmp/profile" --window-size=1440,900 \
    --virtual-time-budget=8000 --screenshot="$tmp/$name.png" "${SITES[$name]}" 2>/dev/null
  magick "$tmp/$name.png" -resize 1200x -strip -quality 80 "$name.webp"
  echo "$name.webp"
done
rm -rf "$tmp"
