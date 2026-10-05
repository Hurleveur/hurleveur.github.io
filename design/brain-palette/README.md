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
| 6-pearls | mineral pigments | pearl: highlight up-left, pigment body, darker rim — tried, rejected |
| 7-soft-core | mineral pigments | lit core v2: white point, hue around it, fading out with no edge |
| 8-soft-bloom | mineral pigments | soft core, and overlapping halos add their light |
| 9-soft-spikes | mineral pigments | soft bloom plus faint diffraction spikes on room hubs |
| 10-obsidian | mineral pigments | dark glass fleck, hue only as a sheen at its edge |

## Findings

- **Home rotunda:** ember (5) sits inside the painted glass brain instead of on
  top of it. Rooms are barely told apart at rest; the hover and tour glow
  already raise the halo, so the colour returns when someone looks for it.
- **Night side panel and observatory:** pigment with a lit core (3) looks like
  starlight rather than tokens, and rooms stay readable.
- **Day theme:** a lit core looks hollow on the pale sky (light column of 2 and
  3). Day wants flat pigment discs (1).

**Shipped: variant 3**, the mineral-pigment palette with a lit core on every
night sky (rotunda, dark side panel, dark observatory) and flat discs by day.

Since lit core v2 the home rotunda follows the theme as well: by day it keeps the
white glass brain (`rotunda.webp`), where bright stars wash out, so it keeps
flat pigment discs and a lit room turns vivid (saturated, not lightened). An ink
wash (pigments deepened 30%, halos multiplied) was tried and rejected: it looked
muddy and made a lit room darker instead of brighter; at night it paints a dark brain (`rotunda-night.webp`) under the
soft bloom.

Pearls (6) were tried on top of it and rejected: the off-centre highlight and
darker rim give each star volume, which brought the game-like look straight
back. Lit from the centre, a star reads as light; shaded as a sphere, it reads
as an object.

### Lit core v2

The hard rim of the disc is what makes a star read as a token. Soft core (7)
drops it: a white point fades through the room's hue to nothing, and a room
hub becomes a light source instead of a coloured ball. Bloom (8) adds the
halos together where they overlap, so a dense room glows like a nebula; it is
the candidate. Diffraction spikes (9) are invisible at these sizes and would
only show once large enough to read as decoration. Obsidian (10) fails: on the
rotunda the dark flecks read as burns, on a night sky as hollow rings. At
2–5px a material is only its colour; a texture needs about 20px, which only
the room hubs ever reach, so materials per room are left to the hubs if tried
again.

## Files

- `litcore-v2.webp` and `litcore-v2-closeup.webp` — lit core v2 against the
  shipped lit core, and obsidian.
- `pearls.webp` — the rejected pearls: rotunda, observatory night and day, side
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
them shipped (commit `7589b1f1`); `6-pearls` rendered the working tree at commit `3d788793`, before it was reverted; 7–10
patch the lit core as shipped in `5420b0a1`.
Add a variant by adding an entry to `VARIANTS`.
