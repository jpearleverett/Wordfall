#!/usr/bin/env python3
"""Generate Wordfall Play Store listing assets per agent_docs/store_listing.md G/H/I."""
import math
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = "/home/user/Wordfall"
OUT = os.path.join(ROOT, "store-assets")
os.makedirs(OUT, exist_ok=True)
os.makedirs(os.path.join(OUT, "captions"), exist_ok=True)

FONT_BOLD = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"

NEON_CYAN = (0, 212, 255)
NEON_PINK = (255, 62, 200)
BG_TOP = (18, 8, 42)
BG_BOT = (43, 15, 69)

# ---------------------------------------------------------------- Play icon
# 1024x1024, opaque, square-edged: keep the full rounded-rect art (with its
# margins) and fill the transparent corner arcs with a blurred, slightly
# zoomed continuation of the art itself — a seamless dark extension that
# Play's own in-store rounded mask mostly crops away again.
icon = Image.open(os.path.join(ROOT, "assets/icon.png")).convert("RGBA")

zoom = int(1024 * 1.12)
bg = icon.resize((zoom, zoom), Image.LANCZOS)
off = (zoom - 1024) // 2
bg = bg.crop((off, off, off + 1024, off + 1024)).filter(ImageFilter.GaussianBlur(22))
flat = Image.new("RGB", (1024, 1024), (10, 6, 26))
flat.paste(bg.convert("RGB"), (0, 0))
art = icon.resize((1024, 1024), Image.LANCZOS)
flat.paste(art, (0, 0), art)
flat.save(os.path.join(OUT, "play-icon-1024.png"))
print("play-icon-1024.png written (blur-extended corners)")

# ---------------------------------------------------------- Feature graphic
W, H = 1024, 500
fg = Image.new("RGB", (W, H))
px = fg.load()
for y in range(H):
    t = y / (H - 1)
    r = int(BG_TOP[0] + (BG_BOT[0] - BG_TOP[0]) * t)
    g = int(BG_TOP[1] + (BG_BOT[1] - BG_TOP[1]) * t)
    b = int(BG_TOP[2] + (BG_BOT[2] - BG_TOP[2]) * t)
    for x in range(W):
        px[x, y] = (r, g, b)

draw = ImageDraw.Draw(fg, "RGBA")

# Subtle upper grid
for gx in range(0, W + 1, 64):
    draw.line([(gx, 0), (gx, H * 0.62)], fill=(0, 212, 255, 14), width=1)
for gy in range(0, int(H * 0.62), 64):
    draw.line([(0, gy), (W, gy)], fill=(0, 212, 255, 14), width=1)

# Perspective floor grid (synthwave horizon at 62% height)
horizon = int(H * 0.62)
vanish = (W // 2, horizon - 6)
for i in range(-14, 15):
    x_bottom = W // 2 + i * 110
    draw.line([vanish, (x_bottom, H)], fill=(255, 62, 200, 46), width=2)
yline = float(horizon)
step = 4.0
while yline < H:
    alpha = int(30 + 50 * (yline - horizon) / (H - horizon))
    draw.line([(0, yline), (W, yline)], fill=(255, 62, 200, alpha), width=2)
    yline += step
    step *= 1.45
draw.line([(0, horizon), (W, horizon)], fill=(0, 212, 255, 90), width=2)

# Falling letter tiles on the right, with motion streaks
tile_font = ImageFont.truetype(FONT_BOLD, 46)
def draw_tile(base, cx, cy, size, letter, streak_len):
    td = ImageDraw.Draw(base, "RGBA")
    half = size // 2
    # motion streak above the tile
    streak = Image.new("RGBA", (size - 12, streak_len), (0, 0, 0, 0))
    sd = ImageDraw.Draw(streak)
    for sy in range(streak_len):
        a = int(70 * sy / streak_len)
        sd.line([(0, sy), (size - 13, sy)], fill=(0, 212, 255, a))
    base.alpha_composite(streak, (cx - half + 6, cy - half - streak_len))
    box = [cx - half, cy - half, cx + half, cy + half]
    td.rounded_rectangle(box, radius=12, fill=(16, 10, 40, 235),
                         outline=(0, 212, 255, 255), width=3)
    bbox = td.textbbox((0, 0), letter, font=tile_font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    td.text((cx - tw / 2 - bbox[0], cy - th / 2 - bbox[1]), letter,
            font=tile_font, fill=(235, 245, 255, 255))

fg_rgba = fg.convert("RGBA")
# Two staggered columns spelling WORD / FALL, kept above the tagline zone.
tiles = [  # (col_x, col tiles as (y, letter, streak))
    (715, [(58, "W", 40), (156, "O", 64), (254, "R", 78), (352, "D", 88)]),
    (875, [(88, "F", 56), (186, "A", 72), (284, "L", 84), (378, "L", 92)]),
]
for col_x, col in tiles:
    for (cy, letter, streak) in col:
        draw_tile(fg_rgba, col_x, cy, 80, letter, streak)

# Logo centered-left with a soft glow backdrop
logo = Image.open(os.path.join(ROOT, "assets/wordfalllogo.png")).convert("RGBA")
lw = 460
lh = int(logo.height * lw / logo.width)
logo_s = logo.resize((lw, lh), Image.LANCZOS)
glow = logo_s.getchannel("A").point(lambda a: min(a, 110))
glow_img = Image.new("RGBA", logo_s.size, (255, 62, 200, 0))
glow_img.putalpha(glow)
glow_img = glow_img.filter(ImageFilter.GaussianBlur(18))
lx, ly = 52, (H - lh) // 2 - 8
fg_rgba.alpha_composite(glow_img, (lx, ly))
fg_rgba.alpha_composite(logo_s, (lx, ly))

# Tagline bottom-right with glow
tag_font = ImageFont.truetype(FONT_BOLD, 34)
tag = "G R A V I T Y   W O R D   P U Z Z L E"
td = ImageDraw.Draw(fg_rgba, "RGBA")
bbox = td.textbbox((0, 0), tag, font=tag_font)
tw = bbox[2] - bbox[0]
tx, ty = W - tw - 36, H - 74
glow_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow_layer)
gd.text((tx, ty), tag, font=tag_font, fill=(0, 212, 255, 190))
glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(6))
fg_rgba.alpha_composite(glow_layer)
td.text((tx, ty), tag, font=tag_font, fill=(220, 248, 255, 255))

fg_rgba.convert("RGB").save(os.path.join(OUT, "feature-graphic-1024x500.png"))
print("feature-graphic-1024x500.png written")

# ------------------------------------------------------------ Caption pills
CAPTIONS = [
    ("01", "Find Words. Watch Letters Fall."),
    ("02", "Gravity Reshapes the Board"),
    ("03", "10 Unique Modes. One Simple Rule."),
    ("04", "Restore the Grand Library"),
    ("05", "Every Day, a Fresh Puzzle"),
    ("06", "Collect Rare Tiles & Seasonal Stamps"),
    ("07", "Join a Club. Compete Together."),
    ("08", "Optional Boosts. Fair Free Play."),
]
PW, PH = 1080, 96
cap_font = ImageFont.truetype(FONT_BOLD, 44)
for num, text in CAPTIONS:
    pill = Image.new("RGBA", (PW, PH), (0, 0, 0, 0))
    pd = ImageDraw.Draw(pill)
    # gradient pill: neon cyan -> near-black, per brief
    grad = Image.new("RGBA", (PW - 48, PH - 12), (0, 0, 0, 0))
    gp = grad.load()
    gw, gh = grad.size
    for x in range(gw):
        t = x / (gw - 1)
        r = int(NEON_CYAN[0] * (1 - t) * 0.55 + 6 * t)
        g = int(NEON_CYAN[1] * (1 - t) * 0.55 + 6 * t)
        b = int(NEON_CYAN[2] * (1 - t) * 0.55 + 14 * t)
        for y in range(gh):
            gp[x, y] = (r, g, b, 232)
    mask = Image.new("L", grad.size, 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, gw - 1, gh - 1], radius=(PH - 12) // 2, fill=255)
    pill.paste(grad, (24, 6), mask)
    pd = ImageDraw.Draw(pill)
    pd.rounded_rectangle([24, 6, 24 + gw - 1, 6 + gh - 1], radius=(PH - 12) // 2,
                         outline=(0, 212, 255, 255), width=3)
    bbox = pd.textbbox((0, 0), text, font=cap_font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    pd.text(((PW - tw) / 2 - bbox[0], (PH - th) / 2 - bbox[1]), text,
            font=cap_font, fill=(255, 255, 255, 255))
    pill.save(os.path.join(OUT, "captions", f"{num}.png"))
print("caption pills 01-08 written")
