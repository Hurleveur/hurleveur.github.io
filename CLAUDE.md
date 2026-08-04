When we implement a feature, make sure the local server is running but don't test it with playwright yourself, I'll handle manual verifications.

## content/ is a snapshot, not the source

The vault is `~/Documents/private`. `content/` is an rsync copy that refreshes **only** when `deploy.sh` runs its step-1 rsync.

- A note edited in the vault — new frontmatter, a rename, a move — is invisible here until a resync. Check the vault before concluding a feature is broken; that mistake has already cost a debugging session.
- Editing `content/` directly is pointless, the next resync overwrites it.
- `content/` is gitignored except `content/index.md`, so vault content never enters git.
- Drift accumulates. A resync can move hundreds of files. Dry-run it (`rsync -avn --delete …`, same flags as deploy.sh) and read the deletion list before running it for real — renames and reorganisation show up as deletes.

## Plugin forks live in local-plugins/

`.quartz/plugins/` holds clones of the community plugins. It is **gitignored and regenerated** by `prebuild` (`npm run install-plugins`), so edits there get wiped. To change a community plugin: copy it to `local-plugins/<name>/`, point `source:` at that path in `quartz.config.yaml` with a `# patched:` comment saying why, and mark every changed hunk with a `LOCI PATCH` comment so the diff against upstream stays findable.

Four forks so far: `content-index`, `canvas-page`, `obsidian-plugin-excalidraw`, `explorer`.

- `dist/` must be committed — the loader's entry is `dist/index.js`, not `src/`.
- After patching a fork: `npm i && npm run build` inside it, **then restart the dev server**. It bundles `dist` at startup and silently serves the stale build otherwise.
- `quartz.lock.json` keeps a now-unused entry per forked plugin. Leave it: its `commit` records the upstream fork point for a future re-sync.
- `node_modules/` inside a fork is gitignored and only needed to rebuild `dist`.

## Two files are hand-formatted — never prettier them

`quartz/static/vaultbrain.js` and `quartz/styles/custom.scss` deliberately fail `prettier --check` (aligned comments, compact arrays — 252 and 45 diff lines respectively). Never `--write` them. To check just your own additions: `npx prettier <file> | diff <file> -` and confirm your block contributes nothing to the diff.

## Publishing gates

Markdown publishes on `publish: true` frontmatter. Everything else — pdf, html, canvas, excalidraw, images — needs a glob in `publish-exceptions.txt`, whose header explains the rest. Default is deny, in both paths.

## Categories → folder membership

A note's `categories:` frontmatter lists it inside any published folder of that name, wherever it physically lives — a book under `Alignment/` carrying `[[Library]]` appears in `/library` too, marked as a guest with its real origin. `quartz/plugins/emitters/categories.ts` emits `static/categoryIndex.json`; `vaultbrain.js` merges it into folder listing pages, the `explorer` fork into the sidebar trie. No category name is hardcoded: a category starts working the moment a published folder of that name exists.
