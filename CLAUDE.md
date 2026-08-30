When we implement a feature, make sure the local server is running but don't test it with playwright yourself, I'll handle manual verifications.

## content/ is a snapshot, not the source

The vault is `~/Documents/private`. `content/` is an rsync copy that refreshes **only** when `deploy.sh` runs its step-1 rsync.

- A note edited in the vault — new frontmatter, a rename, a move — is invisible here until a resync. Check the vault before concluding a feature is broken; that mistake has already cost a debugging session.
- Editing `content/` directly is pointless, the next resync overwrites it.
- `content/` is gitignored except `content/index.md`, so vault content never enters git.
- Drift accumulates. A resync can move hundreds of files. Dry-run it (`rsync -avn --delete …`, same flags as deploy.sh) and read the deletion list before running it for real — renames and reorganisation show up as deletes.

## How the site actually publishes

`deploy.sh` is the only publish path: rsync vault → `content/`, build to `~/.cache/loci-build`, mirror into a throwaway `gh-pages` worktree, push. GitHub Pages serves the `gh-pages` branch (legacy build) — pushing `v5` publishes nothing.

- It runs daily via the `loci-deploy.timer` user unit → `loci-deploy.service`. Not a vault watcher; a clock — a vault edit waits until midnight.
- `SITE` resolves to the clone the script lives in. It used to hardcode `~/Sites/loci`, a second checkout that went stale and silently deployed Jul-29 source for a week while `v5` kept advancing. One clone only — if a second ever appears, that bug is back.
- **"Deployed N minutes ago but the feature is missing" is not a Pages problem.** A green deploy only proves _something_ built. Check what it built from: `git log origin/gh-pages -1` for the deploy time, then confirm the feature's own artifact is live (`curl -sI https://hurleveur.github.io/static/categoryIndex.json`). Chasing the site before checking the source cost a session.
- The timer's `Persistent=true` makes it fire at boot catch-up, before the desktop session is ready. Two things are missing then and both kill the push *after* a full build: DNS (`Could not resolve host`) and the login keyring (`could not read Username for 'https://github.com'` — the helper is `!/usr/bin/gh auth git-credential` and `gh`'s token lives in the keyring). `loci-deploy.service`'s `ExecStartPre` polls both for 15 min. A user unit can order against neither: `network-online.target` is a system target, and nothing signals "keyring unlocked".
- `ExecStartPre` only proves DNS worked *before* the build; resolution can still fail at push time three minutes later. `deploy.sh` retries the push 5× / 30s so a finished build is never thrown away.
- A failed deploy raises a critical desktop notification — `loci-deploy.service` has `OnFailure=loci-deploy-notify.service`, which is just a `notify-send` (the user manager already carries `DBUS_SESSION_BUS_ADDRESS` and `DISPLAY`). Before it existed, three keyring failures passed unnoticed for two weeks.
- Reading deploy history: `journalctl --user -u loci-deploy.service | grep -E 'Finished|Failed|gh-pages ->'` is honest. `git log origin/gh-pages -1` is not — a plain `git fetch origin gh-pages` writes FETCH_HEAD and leaves the tracking ref stale, which once made a 3-day gap look like an 11-day outage. Use `git ls-remote origin gh-pages`.
- `deploy.sh` force-resets `gh-pages` to `origin/gh-pages` before building, so a local ref left behind by an aborted run can't make the push non-fast-forward.
- `npm ci` needs `--allow-git=root`: npm 12 blocks git deps by default and `@quartz-community/{types,utils}` are `github:` specs. `root` allows only the two direct ones. The blocked `esbuild`/`@parcel/watcher` install scripts are fine to leave blocked — both resolve prebuilt binaries through optional deps.
- Every run rewrites ~275 files even with zero content change (build nondeterminism), so a fat `deploy` commit means nothing on its own.

## Plugin forks live in local-plugins/

`.quartz/plugins/` holds clones of the community plugins. It is **gitignored and regenerated** by `prebuild` (`npm run install-plugins`), so edits there get wiped. To change a community plugin: copy it to `local-plugins/<name>/`, point `source:` at that path in `quartz.config.yaml` with a `# patched:` comment saying why, and mark every changed hunk with a `LOCI PATCH` comment so the diff against upstream stays findable.

Four forks so far: `content-index`, `canvas-page`, `obsidian-plugin-excalidraw`, `explorer`.

- `dist/` must be committed — the loader's entry is `dist/index.js`, not `src/`.
- After patching a fork: `npm i && npm run build` inside it, **then restart the dev server**. It bundles `dist` at startup and silently serves the stale build otherwise.
- `quartz.lock.json` keeps a now-unused entry per forked plugin. Leave it: its `commit` records the upstream fork point for a future re-sync.
- `node_modules/` inside a fork is gitignored and only needed to rebuild `dist`.

## Two files are hand-formatted — never prettier them

`quartz/static/vaultbrain.js` and `quartz/styles/custom.scss` deliberately fail `prettier --check` (aligned comments, compact arrays — 150 and 45 diff lines respectively). Never `--write` them. To check just your own additions: `npx prettier <file> | diff <file> -` and confirm your block contributes nothing to the diff.

## The rotunda is fitted to a painted image — `/?tune` refits it

Two numbers on the home hero are eyeballed against `quartz/static/rotunda.png` (1252x428 image px, the SVG viewBox and the band's own aspect ratio, so % insets map 1:1 at every width) and live in two different files: the mini-brain box (`#vault-brain` insets in `custom.scss`) and the frieze band ellipse the room names ride (`BAND` + `SIDES` in `vaultbrain.js`).

- Run `npm run tune` and open `/?tune`: drag the brain box, slide the band, paste the panel's numbers back into the source. Nothing else is a reliable way to set these.
- **Start the dev server with `dangerouslyDisableSandbox: true`.** The Bash sandbox unshares the network namespace, so a server started inside it prints "listening at 8080" while nothing is bound on the host — the browser gets nothing. Confirm with `ss -ltn | grep :8080`, never with `curl` from inside the sandbox (always `000`).
- The panel mirrors itself to `tune.out` at the repo root (gitignored): `tunePanel` POSTs its text to `/__tune`, which the dev server writes to disk. Read that file instead of asking for a paste.
- `SIDES` may reach into the `#vault-brain` box: the frieze sits above the canvas (`z-index: 2`) and is `pointer-events: none` except on `.frieze-word`, so a word over the brain still clicks through to its room. Delete any part of that and those words silently open `/brain` instead — `quartz/static/rotunda.test.ts` is the only thing that notices.
- `BAND` is a least-squares fit of the cornice line in the image, not a guess; the words ride its true tangent, so a per-word lift or rotation fudge means the fit is wrong, not the word.

## Publishing gates

Markdown publishes on `publish: true` frontmatter. Everything else — pdf, html, canvas, excalidraw, images — needs a glob in `publish-exceptions.txt`, whose header explains the rest. Default is deny, in both paths.

`quartz/static/pages/` sits outside both gates: anything committed there ships verbatim and is public the moment it is pushed — the repo itself is public. Nothing from the vault goes there without Alexandre saying so; a vault HTML page publishes through `publish-exceptions.txt`, never by copying it under `static/`.

`build.ts` sets `ctx.allFiles` to the full, unfiltered file list before the `ExplicitPublish` filter ever runs — it stays unfiltered for the whole build, gate or no gate. Every emitter and pageType gets a separately filtered `content`/`allFiles` argument passed into `emit()`, and that filtered argument is the only file list that respects `publish: true`. Read `ctx.allFiles` anywhere in an emitter and private vault files leak into the public build. Hit twice already (community plugins doing exactly this) — when patching a fork in `local-plugins/` or writing a new emitter, always use the passed-in `content`/`allFiles`, never `ctx.allFiles`.

## Categories → folder membership

A note's `categories:` frontmatter lists it inside any published folder of that name, wherever it physically lives — a book under `Alignment/` carrying `[[Library]]` appears in `/library` too, marked as a guest with its real origin. `quartz/plugins/emitters/categories.ts` emits `static/categoryIndex.json`; `vaultbrain.js` merges it into folder listing pages, the `explorer` fork into the sidebar trie. No category name is hardcoded: a category starts working the moment a published folder of that name exists.

Only the wikilink's **last segment** names the category. A folder note has to be linked by its full path (`[[Shared/Clippings/Clippings|Clippings]]`) because `markdownLinkResolution: shortest` can't resolve `[[Clippings]]` — `Folder/Folder.md` slugs to `folder/index`.
