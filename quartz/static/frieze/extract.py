"""Cut one glyph mask per carved room name out of the rotunda image.

The rotunda exists twice, from the same render: once with the frieze blank
(``blank``) and once with the room names carved into it (``carved``). Where the
carved image is darker than the blank one is exactly the new grooves, so the
difference gives the letters pixel-for-pixel, with no fitting and no tuner.

Writes ``<folder>.png`` (white glyphs on black, a luminance mask cropped to the
word) beside this script and prints the ``CARVED`` table for vaultbrain.js.

    uv run --with pillow --with numpy --with scipy python extract.py \
        ../../../new_marble.jpeg ../../../marble_new_names.jpeg
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

# the names as carved, left to right along the frieze
WORDS = ["alignment", "work", "travel", "friends", "shared", "library", "meaning"]
THRESH = 14  # grey levels of darkening that count as groove, not JPEG noise
PAD = 3  # px of margin around each word's box, so the glow is not clipped
SCALE = 3  # masks are written at 3x the image, so the gilding stays crisp on a
# screen that shows the rotunda larger than its 1376px
CRACK = 2  # px at SCALE: widest vein gap closed inside a letter
SOLID = 3  # alpha gain: a groove a third as dark as the rest still gilds fully
SPECK = 400  # px at SCALE: islands smaller than this are noise, not glyphs


def disk(r):
    y, x = np.ogrid[-r : r + 1, -r : r + 1]
    return x * x + y * y <= r * r

here = Path(__file__).parent
blank = np.asarray(Image.open(sys.argv[1]).convert("L"), float)
carved = np.asarray(Image.open(sys.argv[2]).convert("L"), float)
dark = ndimage.gaussian_filter(carved, 0.6) - ndimage.gaussian_filter(blank, 0.6)
dark = np.clip(-dark, 0, None)  # positive where the carving darkened the stone
mask = dark > THRESH
mask[:120] = mask[400:] = False  # the frieze runs between these rows

# letters of one word sit a few px apart, words ~15px: close the letter gaps,
# keep the word gaps, then each blob is a word
# only darkening near a groove counts, so stray JPEG noise inside a word's box
# stays black in its mask
def mask_near(m):
    return ndimage.binary_dilation(m, iterations=2)


blobs, n = ndimage.label(ndimage.binary_dilation(mask, iterations=4))
boxes = [b for b in ndimage.find_objects(blobs) if (b[1].stop - b[1].start) > 25]
boxes.sort(key=lambda b: b[1].start)
assert len(boxes) == len(WORDS), f"found {len(boxes)} words, expected {len(WORDS)}"

H, W = carved.shape
rows = []
for word, (ys, xs) in zip(WORDS, boxes):
    y0, y1 = max(0, ys.start - PAD), min(H, ys.stop + PAD)
    x0, x1 = max(0, xs.start - PAD), min(W, xs.stop + PAD)
    # upsample the darkening itself, then threshold: the letter edges follow
    # the bicubic curve between pixels instead of the 1x pixel staircase
    crop = Image.fromarray((dark * mask_near(mask))[y0:y1, x0:x1].astype(np.float32), "F")
    up = np.asarray(crop.resize(((x1 - x0) * SCALE, (y1 - y0) * SCALE), Image.BICUBIC))
    # soft ramp around the threshold rather than a hard cut: antialiased edges
    alpha = np.clip((up - (THRESH - 6)) / 16, 0, 1)
    # a marble vein crossing a groove barely darkens it, so the raw mask goes
    # grey or black there and the gold shows the crack: solid inside a letter,
    # soft only at its edge, and hairline gaps closed. The radius stays under
    # a letter's counter, so A, B, R keep their holes.
    alpha = np.clip(alpha * SOLID, 0, 1)
    alpha = ndimage.grey_closing(alpha, footprint=disk(CRACK))
    # and drop specks that are not part of any letter
    blobs, n = ndimage.label(alpha > 0)
    sizes = ndimage.sum(alpha > 0.5, blobs, range(1, n + 1))
    alpha[np.isin(blobs, np.flatnonzero(sizes < SPECK) + 1)] = 0
    Image.fromarray((alpha * 255).astype("uint8")).save(here / f"{word}.png", optimize=True)
    rows.append(f"    {word}: [{x0}, {y0}, {x1 - x0}, {y1 - y0}],")

print("const CARVED = {\n" + "\n".join(rows) + "\n}")
