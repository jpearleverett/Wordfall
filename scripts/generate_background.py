#!/usr/bin/env python3
"""Generate synthwave background matching the reference image."""

from PIL import Image, ImageDraw, ImageFilter, ImageChops
import math

W, H = 1080, 1920

img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# === SKY GRADIENT ===
# Reference: deep purple top → warm pink/magenta middle → peachy pink at horizon
sky_colors = [
    (0, (45, 20, 80)),      # top: deep purple-blue
    (0.15, (60, 30, 100)),   # upper: purple
    (0.3, (90, 45, 120)),    # mid-upper: warm purple
    (0.45, (140, 70, 140)),  # mid: magenta-purple
    (0.55, (180, 100, 150)), # mid-lower: pink-purple
    (0.65, (210, 130, 160)), # lower: warm pink
    (0.72, (230, 160, 170)), # near horizon: peachy
    (0.78, (240, 180, 180)), # horizon: warm peach
    (1.0, (140, 80, 130)),   # below horizon: purple again (grid area)
]

for y in range(H):
    t = y / H
    # Find surrounding color stops
    c0, c1 = sky_colors[0], sky_colors[-1]
    for i in range(len(sky_colors) - 1):
        if sky_colors[i][0] <= t <= sky_colors[i+1][0]:
            c0, c1 = sky_colors[i], sky_colors[i+1]
            break

    frac = (t - c0[0]) / max(c1[0] - c0[0], 0.001)
    frac = max(0, min(1, frac))
    r = int(c0[1][0] + (c1[1][0] - c0[1][0]) * frac)
    g = int(c0[1][1] + (c1[1][1] - c0[1][1]) * frac)
    b = int(c0[1][2] + (c1[1][2] - c0[1][2]) * frac)
    draw.line([(0, y), (W, y)], fill=(r, g, b, 255))

# === SUN ===
# Large semi-circle at horizon line, pink→white gradient with glow
sun_cx, sun_cy = W // 2, int(H * 0.62)
sun_radius = 280

# Sun glow (large soft)
glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
glow_draw = ImageDraw.Draw(glow)
for r in range(sun_radius + 200, sun_radius, -2):
    alpha = int(60 * (1 - (r - sun_radius) / 200))
    glow_draw.ellipse(
        [sun_cx - r, sun_cy - r, sun_cx + r, sun_cy + r],
        fill=(255, 200, 220, max(0, alpha))
    )
glow = glow.filter(ImageFilter.GaussianBlur(radius=40))
img = Image.alpha_composite(img, glow)

# Sun body - gradient from pink edge to white center
sun = Image.new('RGBA', (W, H), (0, 0, 0, 0))
sun_draw = ImageDraw.Draw(sun)
for r in range(sun_radius, 0, -1):
    frac = 1 - (r / sun_radius)  # 0 at edge, 1 at center
    # Pink at edge → white at center
    red = int(255)
    green = int(160 + 95 * frac)
    blue = int(200 + 55 * frac)
    alpha = 255
    sun_draw.ellipse(
        [sun_cx - r, sun_cy - r, sun_cx + r, sun_cy + r],
        fill=(red, green, blue, alpha)
    )

# Add horizontal scan lines across sun (synthwave style)
for y_off in range(-sun_radius, sun_radius, 12):
    y = sun_cy + y_off
    if y_off > -20:  # Only in lower portion
        # Calculate width of sun at this y
        dy = abs(y - sun_cy)
        if dy < sun_radius:
            half_w = int(math.sqrt(sun_radius**2 - dy**2))
            sun_draw.rectangle(
                [sun_cx - half_w, y, sun_cx + half_w, y + 3],
                fill=(0, 0, 0, 0)  # transparent gaps
            )

img = Image.alpha_composite(img, sun)

# === ATMOSPHERIC HAZE around sun ===
haze = Image.new('RGBA', (W, H), (0, 0, 0, 0))
haze_draw = ImageDraw.Draw(haze)
for r in range(400, 100, -3):
    alpha = int(25 * (1 - (r - 100) / 300))
    haze_draw.ellipse(
        [sun_cx - r * 1.5, sun_cy - r * 0.6, sun_cx + r * 1.5, sun_cy + r * 0.6],
        fill=(240, 180, 200, max(0, alpha))
    )
haze = haze.filter(ImageFilter.GaussianBlur(radius=30))
img = Image.alpha_composite(img, haze)

# === PERSPECTIVE GRID ===
horizon_y = int(H * 0.62)
grid_bottom = H
grid = Image.new('RGBA', (W, H), (0, 0, 0, 0))
grid_draw = ImageDraw.Draw(grid)

# Vertical lines converging to center at horizon
num_vlines = 24
for i in range(-num_vlines, num_vlines + 1):
    bottom_x = W // 2 + i * 90
    top_x = W // 2

    for y in range(horizon_y, grid_bottom, 1):
        frac = (y - horizon_y) / (grid_bottom - horizon_y)
        x = int(top_x + (bottom_x - top_x) * frac)
        # Much brighter cyan lines
        base_alpha = int(140 * frac * (1 - abs(i) / (num_vlines + 1)) + 40 * frac)
        alpha = min(200, max(0, base_alpha))
        grid_draw.point((x, y), fill=(0, 212, 255, alpha))
        # Thicker lines (anti-aliased neighbors)
        grid_draw.point((x+1, y), fill=(0, 212, 255, alpha * 2 // 3))
        if frac > 0.5:
            grid_draw.point((x-1, y), fill=(0, 212, 255, alpha // 3))

# Horizontal lines with perspective spacing - brighter and thicker
y = horizon_y + 3
spacing = 2
while y < grid_bottom:
    frac = (y - horizon_y) / (grid_bottom - horizon_y)
    alpha = int(100 + 120 * frac)
    alpha = min(220, alpha)
    line_w = 1 if frac < 0.4 else 2
    grid_draw.line([(0, y), (W, y)], fill=(0, 212, 255, alpha), width=line_w)
    spacing = int(2 + 50 * frac * frac)
    y += max(spacing, 2)

grid = grid.filter(ImageFilter.GaussianBlur(radius=0.8))
img = Image.alpha_composite(img, grid)

# === GRID GLOW (reflection on ground) ===
grid_glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
gg_draw = ImageDraw.Draw(grid_glow)
for y in range(horizon_y, min(horizon_y + 200, H)):
    frac = 1 - (y - horizon_y) / 200
    alpha = int(40 * frac)
    gg_draw.line([(0, y), (W, y)], fill=(0, 180, 255, alpha))
grid_glow = grid_glow.filter(ImageFilter.GaussianBlur(radius=20))
img = Image.alpha_composite(img, grid_glow)

# === PALM TREES (silhouettes) ===
palm = Image.new('RGBA', (W, H), (0, 0, 0, 0))
palm_draw = ImageDraw.Draw(palm)

def draw_palm(draw, base_x, base_y, trunk_h, lean, scale=1.0):
    """Draw a simple palm tree silhouette."""
    color = (30, 15, 50, 200)

    # Trunk - slight curve
    trunk_w = int(8 * scale)
    for i in range(trunk_h):
        frac = i / trunk_h
        x_off = int(lean * frac * frac * 30)
        y = base_y - i
        w = int(trunk_w * (1 - frac * 0.4))
        draw.rectangle([base_x + x_off - w, y, base_x + x_off + w, y + 1], fill=color)

    # Fronds at top
    top_x = base_x + int(lean * 30)
    top_y = base_y - trunk_h

    frond_angles = [-140, -110, -70, -40, -160, -20, -90]
    for angle_deg in frond_angles:
        angle = math.radians(angle_deg)
        frond_len = int(80 * scale)
        droop = 0.015

        points = []
        for t in range(frond_len):
            tf = t / frond_len
            x = top_x + int(t * math.cos(angle))
            y = top_y + int(t * math.sin(angle)) + int(t * t * droop)
            points.append((x, y))
            # Draw leaflets
            if t > 10 and t % 4 == 0:
                leaf_angle = angle + math.pi / 2
                lx = int(12 * scale * (1 - tf * 0.5))
                draw.line(
                    [(x, y), (x + int(lx * math.cos(leaf_angle)), y + int(lx * math.sin(leaf_angle)))],
                    fill=color, width=2
                )
                draw.line(
                    [(x, y), (x - int(lx * math.cos(leaf_angle)), y - int(lx * math.sin(leaf_angle)))],
                    fill=color, width=2
                )

        if len(points) > 1:
            draw.line(points, fill=color, width=int(3 * scale))

# Right palm tree (visible in reference)
draw_palm(palm_draw, W - 80, int(H * 0.62), 250, -0.8, scale=1.2)
# Left palm tree (partially visible)
draw_palm(palm_draw, 50, int(H * 0.63), 200, 0.6, scale=1.0)
# Distant small palms
draw_palm(palm_draw, W - 200, int(H * 0.61), 120, -0.3, scale=0.6)
draw_palm(palm_draw, 180, int(H * 0.61), 100, 0.4, scale=0.5)

img = Image.alpha_composite(img, palm)

# === PURPLE OVERLAY at bottom ===
bottom_fade = Image.new('RGBA', (W, H), (0, 0, 0, 0))
bf_draw = ImageDraw.Draw(bottom_fade)
for y in range(int(H * 0.75), H):
    frac = (y - H * 0.75) / (H * 0.25)
    alpha = int(120 * frac)
    bf_draw.line([(0, y), (W, y)], fill=(20, 10, 40, alpha))
img = Image.alpha_composite(img, bottom_fade)

# === TOP VIGNETTE ===
top_fade = Image.new('RGBA', (W, H), (0, 0, 0, 0))
tf_draw = ImageDraw.Draw(top_fade)
for y in range(200):
    frac = 1 - y / 200
    alpha = int(60 * frac)
    tf_draw.line([(0, y), (W, y)], fill=(20, 10, 50, alpha))
img = Image.alpha_composite(img, top_fade)

img.save('/home/user/Wordfall/assets/images/bg-gameplay.png', 'PNG')
print(f'Background saved: {W}x{H}')
