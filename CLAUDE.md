When we implement a feature, make sure the local server is running but don't test it with playwright yourself, I'll handle manual verifications.

- The dev server always runs on port 8050: `npm run serve` (or `npm run tune` for `/?tune`), never Quartz's default 8080.

## content/ is a snapshot, not the source

The vault is `~/Documents/private`. `content/` is an rsync copy that refreshes **only** when `deploy.sh` runs its step-1 rsync.

- A note edited in the vault — new frontmatter, a rename, a move — is invisible here until a resync. Check the vault before concluding a feature is broken; that mistake has already cost a debugging session.
- Editing `content/` directly is pointless, the next resync overwrites it.
- `content/` is excluded in `.git/info/exclude`, not `.gitignore` — Quartz's input glob honors `.gitignore` and saw 0 input files (7413e91c).
- That file is per-clone and untracked: a fresh clone has no such rule and `git add -A` publishes the whole private vault to this public repo. Check `git check-ignore -v "content/Daily Journal"` before any broad `git add`; if it prints nothing, re-add `content/*` and `!content/index.md` there.
- Drift accumulates. A resync can move hundreds of files. Dry-run it (`rsync -avn --delete …`, same flags as deploy.sh) and read the deletion list before running it for real — renames and reorganisation show up as deletes.

## How the site actually publishes

`deploy.sh` is the only publish path: rsync vault → `content/`, build to `~/.cache/loci-build`, mirror into a throwaway `gh-pages` worktree, push. GitHub Pages serves the `gh-pages` branch (legacy build) — pushing `v5` publishes nothing.

- It runs daily via the `loci-deploy.timer` user unit → `loci-deploy.service`. Not a vault watcher; a clock — a vault edit waits until midnight.
- `SITE` resolves to the clone the script lives in. It used to hardcode `~/Sites/loci`, a second checkout that went stale and silently deployed Jul-29 source for a week while `v5` kept advancing. One clone only — if a second ever appears, that bug is back.
- **`git fetch origin v5` and check `v5..origin/v5` before deploying** — deploy.sh builds this clone's working tree, so a checkout behind the other box publishes a site missing its commits. `origin/v5..v5` alone only shows ahead.
- **"Deployed N minutes ago but the feature is missing" is not a Pages problem.** A green deploy only proves _something_ built. Check what it built from: `git log origin/gh-pages -1` for the deploy time, then confirm the feature's own artifact is live (`curl -sI https://hurleveur.github.io/static/categoryIndex.json`). Chasing the site before checking the source cost a session.
- The timer's `Persistent=true` makes it fire at boot catch-up, before the desktop session is ready. Two things are missing then and both kill the push _after_ a full build: DNS (`Could not resolve host`) and the login keyring (`could not read Username for 'https://github.com'` — the helper is `!/usr/bin/gh auth git-credential` and `gh`'s token lives in the keyring). `loci-deploy.service`'s `ExecStartPre` polls both for 15 min. A user unit can order against neither: `network-online.target` is a system target, and nothing signals "keyring unlocked".
- `ExecStartPre` only proves DNS worked _before_ the build; resolution can still fail at push time three minutes later. `deploy.sh` retries the push 5× / 30s so a finished build is never thrown away.
- A failed deploy raises a critical desktop notification — `loci-deploy.service` has `OnFailure=loci-deploy-notify.service`, which is just a `notify-send` (the user manager already carries `DBUS_SESSION_BUS_ADDRESS` and `DISPLAY`). Before it existed, three keyring failures passed unnoticed for two weeks.
- Built CSS and scripts are content-hashed (`index-<hash>.css`, `static/scripts/script-N-<hash>.js`); `/index.css` 404s in production. Take the live name from `~/.cache/loci-build/index.html` before curling it.
- Reading deploy history: `journalctl --user -u loci-deploy.service | grep -E 'Finished|Failed|gh-pages ->'` is honest. `git log origin/gh-pages -1` is not — a plain `git fetch origin gh-pages` writes FETCH_HEAD and leaves the tracking ref stale, which once made a 3-day gap look like an 11-day outage. Use `git ls-remote origin gh-pages`.
- `deploy.sh` force-resets `gh-pages` to `origin/gh-pages` before building, so a local ref left behind by an aborted run can't make the push non-fast-forward.
- `npm ci` needs `--allow-git=root`: npm 12 blocks git deps by default and `@quartz-community/{types,utils}` are `github:` specs. `root` allows only the two direct ones. The blocked `esbuild`/`@parcel/watcher` install scripts are fine to leave blocked — both resolve prebuilt binaries through optional deps.
- Every run rewrites ~275 files even with zero content change (build nondeterminism), so a fat `deploy` commit means nothing on its own.

## Plugin forks live in local-plugins/

`.quartz/plugins/` holds clones of the community plugins. It is **gitignored and regenerated** by `prebuild` (`npm run install-plugins`), so edits there get wiped. To change a community plugin: copy it to `local-plugins/<name>/`, point `source:` at that path in `quartz.config.yaml` with a `# patched:` comment saying why, and mark every changed hunk with a `LOCI PATCH` comment so the diff against upstream stays findable.

Seven forks so far: `content-index`, `canvas-page`, `obsidian-plugin-excalidraw`, `explorer`, `content-meta`, `darkmode`, `toc-rail`.

- `dist/` must be committed — the loader's entry is `dist/index.js`, not `src/`.
- Delete the copied `.git` before `git add`, or the fork commits as an empty gitlink instead of its files.
- After patching a fork: `npm install --allow-git=root && npm run build` inside it, **then restart the dev server**. It bundles `dist` at startup and silently serves the stale build otherwise.
- `quartz.lock.json` keeps a now-unused entry per forked plugin. Leave it: its `commit` records the upstream fork point for a future re-sync.
- `node_modules/` inside a fork is gitignored and only needed to rebuild `dist`.
- The explorer's sort/filter/map rules come from `Explorer.tsx`'s `defaultOptions`, serialised into `data-data-fns` and rebuilt with `new Function()`; the same functions in `explorer.inline.ts` never run, and a serialised one can close over nothing.

## Two files are hand-formatted — never prettier them

`quartz/static/vaultbrain.js` and `quartz/styles/custom.scss` deliberately fail `prettier --check` (aligned comments, compact arrays — 150 and 45 diff lines respectively). Never `--write` them. To check just your own additions: `npx prettier <file> | diff <file> -` and confirm your block contributes nothing to the diff.

## The rotunda is fitted to a painted image

The home hero is `quartz/static/rotunda.png` (1376x768), drawn full-screen and cropped like `background-size: cover` by `.rotunda-stage`; everything over the image is placed in % of that stage, so image px map 1:1 at every size.

- The room names are carved into the image. `quartz/static/frieze/extract.py` diffs it against the same render without the carving and writes one glyph mask per room plus the `CARVED` box table in `vaultbrain.js`; a new image means re-running it, never hand-placing words.
- The mini-brain box (`#vault-brain` insets in `custom.scss`) is the one thing still set by eye: `npm run tune`, open `/?tune`, drag the box, paste the numbers back.
- The mini brain seats every note on an even grid inside `BRAIN_OUTLINE` in `vaultbrain.js` (`seatBrain`, rooms get slices sized to their note count), the painted brain traced by hand in image px; a new image means re-tracing it, and `rotunda.test.ts` checks the outline and the spread.
- **Start the dev server with `dangerouslyDisableSandbox: true`.** The Bash sandbox unshares the network namespace, so a server started inside it prints "listening at 8050" while nothing is bound on the host — the browser gets nothing. Confirm with `ss -ltn | grep :8050`, never with `curl` from inside the sandbox (always `000`).
- The panel mirrors itself to `tune.out` at the repo root (gitignored): `tunePanel` POSTs its text to `/__tune`, which the dev server writes to disk. Read that file instead of asking for a paste.
- A carved word may reach into the `#vault-brain` box: the frieze sits above the canvas (`z-index: 2`) and is `pointer-events: none` except on `.frieze-word`, so a word over the brain still clicks through to its room. Delete any part of that and those words silently open `/brain` instead — `quartz/static/rotunda.test.ts` is the only thing that notices.
- `#vb-desc` is one element in two places — the mini brain and the full-screen observatory — so any rem-only size cap on it overflows a phone screen; keep a `100vw` term in the cap.
- `.palace-hero` is painted in literal daylight hex, not theme variables. Any colour added there needs a matching `[saved-theme="dark"]` rule or it is invisible at night.
- Dark theme paints `rotunda-night.webp` (master `rotunda-night.png`): the same hall, pixel-aligned, with a dark brain. Every inset, mask and outline must fit both images, and a new image is checked for a (0,0) offset against the other before it lands.
- The band is painted from `rotunda.webp`; `rotunda.png` is the lossless master the insets are measured against and is never referenced by the page. Re-encode after editing the master: `python3 -c "from PIL import Image; Image.open('rotunda.png').convert('RGB').save('rotunda.webp','WEBP',quality=86,method=6)"`.

## Desktop page layout

The text column's position depends on viewport width only, never on ☰ or ✦ (✦ only moves the shelf under the side brain, never the column) — the explorer opens into the left margin or overlays the text with a shadow (block after `$explorerFitsAt` in `custom.scss`).

- `.center` needs `min-width: 0` beside its `max-width: $readWidth`: `base.scss` gives it `min-width: 100%`, which beats max-width and silently spreads the text under the side brain.
- `.page-header` lives inside `.center`; give it no centring of its own or it is offset twice.
- Past `$explorerFitsAt` the text starts 2rem right of the explorer edge and grows to `$readWidthMax` (840px), extra width split evenly.
- The right column is `$rightCol` (`clamp(320px, 24vw, 480px)`); `$explorerFitsAt` is solved by hand for that clamp, so change one and re-solve the other.
- The home hero title is placed in the rotunda stage's own cover-crop coordinates and shares `--band-zoom` (on `:root`) with `.rotunda-stage`; change the stage's sizing formula and the hero's must follow.
- The `toc-rail` fork sizes itself in JS to the free margin between the window edge (or the explorer panel, when it sits beside the text) and `.center`; it is moved onto `body` because the phone top bar's hide transform would carry a fixed child with it.

## The side brain (right column)

`vaultbrain.js` `initSideBrain()` injects the constellation into `.sidebar.right`
at runtime on every page but home; it replaces `quartz-community/graph`, which is
`enabled: false` in the config for that reason.

- Three modes share `init()`: `data-mini` (rotunda), neither (observatory
  overlay), `data-side` (right column). Anything gated on `!mini` must say what
  it means for `side` too — wheel-zoom and pan are off there, or the panel eats
  the page scroll.
- The panel shows a neighbourhood, not the vault: the current page, what it
  links to, what links back (`local`). A folder note, or a note with no links,
  falls back to its folder's shelf. Only `local` drops the section hub stars —
  their counts are the whole vault's and would lie inside a neighbourhood.
- A hover lights in two tiers: the section (`hlW`, set through `hlEmit`, which
  the frieze and tour share) and the star (`n.lw` glow, `n.cw` own threads, from
  `adj`). Outside `local` the room glows at half and the star tier whole, its
  threads and rings in `sky.label` ink; `local` uses the star tier alone.
- ⤢ from a page opens the whole vault, never the neighbourhood (`local` needs
  `side`); `vbFrom === "side"` keeps the page's ring and softly lit room there.
- `⤢` on the panel and `✦` in the top bar both reach the full vault through the
  same `toggleExpand()` the home rotunda uses; `wrap.dataset.vbFrom` is what
  sends the close back to the right mode.
- Below `$desktop` the panel's markup is still injected but hidden (the wrapper
  is what `toggleExpand` expands, so `#vb-side` is `display: contents`, never
  `none`), and `✦` opens the overlay directly.
- `init()` bails on a wrapper with no box. That is what keeps the hidden phone
  panel from mounting a zero-size canvas; hide `#vault-brain` under 640px and the
  portrait home brain silently shows only "Enter the mind".
- `initFolderRail()` moves a folder or tag page's `.page-listing` into the right
  column under the map, desktop only. It moves the node rather than re-emitting
  it, so dates, tags and the category guests `initFolderAssets()` appends later
  travel with it. There it re-sorts the shelf by latest edit alone and drops
  folders whose note has no text (`contentIndex.json` content empty).
- `✦` off (`body.brain-off`, desktop) keeps the side brain and moves everything
  under it to `#vb-shelf-foot` at the end of `.center` (`placeShelf`, rerun every nav).
- The side brain is `position: sticky` inside the scrolling right column; it needs
  its opaque background or the shelf shows through as it scrolls under.
- `initCrumbBar()` moves the breadcrumbs from `.page-header` into the top bar
  above 800px and drops their "Home" link, so "Loci ❯ Work" reads as one path;
  the header's zeroed forecourt in `custom.scss` assumes they left.
- Hover previews are one document-level listener in `popover.inline.ts`: a new
  kind of link previews by joining `POPOVER_LINKS`; a canvas star calls `window.quartzPopover`.
- Frieze words never preview (kept out of `POPOVER_LINKS`); a brain star (any mode) opens its
  preview only after `PREVIEW_DELAY` in `vaultbrain.js`, an explorer link after
  `EXPLORER_DELAY` in `popover.inline.ts` (both 500ms, 0.7s with the CSS delay).
- The panel is DOM the build never emits, so nothing typechecks it —
  `quartz/static/sidebrain.test.ts` guards the seams that fail silently,
  including the `:not(.vb-expanded)` the overlay needs to outrank two ids.

## Frontmatter on a page

`note-properties` is the frontmatter parser here — its transformer is what sets
`file.data.frontmatter`, and no separate frontmatter plugin is configured. Disabling it
makes every note fail the publish gate (a full build emits 74 files instead of ~1460).
Turn off its view with `hidePropertiesView: true`, never the plugin.

- `description` and `aliases` render as their own elements in the `content-meta` fork
  (`.note-description`, `.note-aliases`), not as rows in the Properties table.
- The vault's agent marks — the `#llm-written[/confidence]` tag and the `generated-*`
  keys — are stripped from the public build by `quartz/plugins/transformers/hideLlmMarks.ts`,
  a first-party transformer registered in `config-loader.ts`'s `builtinTransformers`.
  A tag written inside a sentence keeps its words and loses its link, so the vault's own
  rule notes still read; everything else about the mark is gone, tag page included.

## Publishing gates

Markdown publishes on `publish: true` frontmatter. Everything else — pdf, html, canvas, excalidraw, images — needs a glob in `publish-exceptions.txt`, whose header explains the rest. Default is deny, in both paths.

`quartz/static/pages/` sits outside both gates: anything committed there ships verbatim and is public the moment it is pushed — the repo itself is public. Nothing from the vault goes there without Alexandre saying so; a vault HTML page publishes through `publish-exceptions.txt`, never by copying it under `static/`.

`build.ts` sets `ctx.allFiles` to the full, unfiltered file list before the `ExplicitPublish` filter ever runs — it stays unfiltered for the whole build, gate or no gate. Every emitter and pageType gets a separately filtered `content`/`allFiles` argument passed into `emit()`, and that filtered argument is the only file list that respects `publish: true`. Read `ctx.allFiles` anywhere in an emitter and private vault files leak into the public build. Hit twice already (community plugins doing exactly this) — when patching a fork in `local-plugins/` or writing a new emitter, always use the passed-in `content`/`allFiles`, never `ctx.allFiles`.

## Categories → folder membership

A note's `categories:` frontmatter lists it inside any published folder of that name, wherever it physically lives — a book under `Alignment/` carrying `[[Library]]` appears in `/library` too, marked as a guest with its real origin. `quartz/plugins/emitters/categories.ts` emits `static/categoryIndex.json`; `vaultbrain.js` merges it into folder listing pages, the `explorer` fork into the sidebar trie. No category name is hardcoded: a category starts working the moment a published folder of that name exists.

Only the wikilink's **last segment** names the category. A folder note has to be linked by its full path (`[[Shared/Clippings/Clippings|Clippings]]`) because `markdownLinkResolution: shortest` can't resolve `[[Clippings]]` — `Folder/Folder.md` slugs to `folder/index`.

The full path only wins when no other note shares that name. Where one does, every link form loses to it and there is no wikilink that reaches the folder note — `[[Meaning]]`, `[[Meaning/Meaning]]` and `[[Meaning/index]]` all land on `Friends/Meaning.md`. Build such a link in code as `/<folder>/`, or link a different note.
