# Brain palette experiments

The vault brain colours each room with a rainbow "chakra" hue (`COLORS` in
`quartz/static/vaultbrain.js`), drawn as flat solid discs. On the pale painted
rotunda, and on a phone especially, that reads as bright and game-like. These
renders compare quieter alternatives on the real brain before any of them is
committed to the code.

The rainbow chakra scheme itself is not traditional: it comes from Christopher
Hills' *Discovery of the Rainbow Body* (1977). Older tantric texts colour the
elements of each centre, if they colour anything, and the paintings of that
tradition use mineral pigments (vermilion, saffron, ochre, malachite, lapis),
which is where the muted palette below comes from.

## Variants

| Variant | Palette | Star drawing |
|---|---|---|
| 0-current | current hexes | flat disc |
| 1-pigment | mineral pigments `#b8513f #c47a3c #c9a24a #6e9468 #4f7aa6 #53579a #86679f` | flat disc |
| 2-starlight | pastel | lit core: white centre fading to the hue at the rim |
| 3-pigment-core | mineral pigments | lit core |
| 4-gilded | hues pulled toward the site's gold | lit core |
| 5-ember | gilded | near-white star, hue only in the halo |
| 6-pearls | mineral pigments | pearl: highlight up-left, pigment body, darker rim — **shipped** |

## Findings

- **Home rotunda:** ember (5) sits inside the painted glass brain instead of on
  top of it. Rooms are barely told apart at rest; the hover and tour glow
  already raise the halo, so the colour returns when someone looks for it.
- **Night side panel and observatory:** pigment with a lit core (3) looks like
  starlight rather than tokens, and rooms stay readable.
- **Day theme:** a lit core looks hollow on the pale sky (light column of 2 and
  3). Day wants flat pigment discs (1).

Variant 3 was picked, then grew into **pearls** (6): moving the highlight
off-centre and darkening the rim gives each star volume, and the rim is what
lets one drawing hold on the pale day sky too, so pearls are drawn on every
sky, the rotunda and both observatory themes included.

## Files

- `pearls.webp` — pearls as shipped: rotunda, observatory night and day, side
  panel by day.
- `rotunda-current-vs-ember.webp` — the phone home brain, current vs ember.
- `sheet-panels.webp` — every variant on the phone rotunda and the side panel,
  dark and light.
- `sheet-observatory.webp` and `observatory-closeup.webp` — the full-screen
  observatory.

## Regenerating

With the dev server on port 8050, from the repo root:

```sh
npm i --no-save playwright-core
node design/brain-palette/render.mjs [variant ...]   # writes renders/ (gitignored)
python3 design/brain-palette/sheets.py # rebuilds the .webp sheets
```

`render.mjs` rewrites `vaultbrain.js` in flight for each variant, so the repo
source is never touched. Variants 0–5 patch the file as it stood before any of
them shipped (commit `7589b1f1`); `6-pearls` renders the working tree as is.
Add a variant by adding an entry to `VARIANTS`.
