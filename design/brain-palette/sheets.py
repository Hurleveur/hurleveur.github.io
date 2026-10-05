"""Stitch render.mjs output into the comparison sheets committed beside it."""
from pathlib import Path
from PIL import Image, ImageDraw

HERE = Path(__file__).parent
R = HERE / "renders"
V = ["0-current", "1-pigment", "2-starlight", "3-pigment-core", "4-gilded", "5-ember"]


def save(img, name):
    img.save(HERE / name, "WEBP", quality=82, method=6)


def grid(views, name, h):
    rows = []
    for v in V:
        ims = [Image.open(R / f"{s}-{v}.png").convert("RGB") for s in views]
        ims = [i.resize((int(i.width * h / i.height), h)) for i in ims]
        row = Image.new("RGB", (sum(i.width + 10 for i in ims), h + 30), "white")
        x = 0
        for i in ims:
            row.paste(i, (x, 30))
            x += i.width + 10
        ImageDraw.Draw(row).text((6, 8), v, fill="black")
        rows.append(row)
    sheet = Image.new("RGB", (max(r.width for r in rows), sum(r.height for r in rows)), "white")
    y = 0
    for r in rows:
        sheet.paste(r, (0, y))
        y += r.height
    save(sheet, name)


grid(["phone-home", "side-dark", "side-light"], "sheet-panels.webp", 420)
grid(["obs-dark"], "sheet-observatory.webp", 380)

# close-up: one room in the observatory, current vs lit core vs ember
zoom = [Image.open(R / f"obs-dark-{v}.png").convert("RGB").crop((1500, 100, 2300, 800)) for v in ["0-current", "3-pigment-core", "5-ember"]]
s = Image.new("RGB", (810 * 3 - 10, 700), "white")
for i, im in enumerate(zoom):
    s.paste(im, (i * 810, 0))
save(s, "observatory-closeup.webp")

# home rotunda on a phone: current vs ember
a, b = (Image.open(R / f"phone-home-{v}.png").convert("RGB") for v in ["0-current", "5-ember"])
s = Image.new("RGB", (a.width * 2 + 10, a.height), "white")
s.paste(a, (0, 0))
s.paste(b, (a.width + 10, 0))
save(s, "rotunda-current-vs-ember.webp")
