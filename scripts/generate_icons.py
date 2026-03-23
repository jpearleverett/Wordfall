#!/usr/bin/env python3
"""Generate all icon assets matching the reference image."""

import cairosvg
import os

OUT = '/home/user/Wordfall/assets/images'

def save_svg_as_png(svg_str, filename, width, height):
    """Convert SVG string to PNG at specified size."""
    path = os.path.join(OUT, filename)
    cairosvg.svg2png(
        bytestring=svg_str.encode('utf-8'),
        write_to=path,
        output_width=width,
        output_height=height,
    )
    print(f'  Saved {filename} ({width}x{height})')

# ============================
# BATTERY / PROGRESS ICON
# ============================
# Chrome battery shape - horizontal, rounded, with terminal nub on right
# Interior left empty (will be filled by code with cyan)
battery_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 90">
  <defs>
    <linearGradient id="batteryChrome" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#c0c8e0"/>
      <stop offset="25%" stop-color="#8090b0"/>
      <stop offset="50%" stop-color="#606880"/>
      <stop offset="75%" stop-color="#8090b0"/>
      <stop offset="100%" stop-color="#c0c8e0"/>
    </linearGradient>
    <linearGradient id="batteryInner" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a1040"/>
      <stop offset="100%" stop-color="#0d0820"/>
    </linearGradient>
    <linearGradient id="batteryHighlight" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.3)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
  </defs>
  <!-- Outer chrome shell -->
  <rect x="4" y="8" width="172" height="74" rx="14" ry="14"
        fill="url(#batteryChrome)" />
  <!-- Inner dark well -->
  <rect x="10" y="14" width="160" height="62" rx="10" ry="10"
        fill="url(#batteryInner)" />
  <!-- Top highlight -->
  <rect x="10" y="14" width="160" height="30" rx="10" ry="10"
        fill="url(#batteryHighlight)" />
  <!-- Terminal nub -->
  <rect x="176" y="28" width="16" height="34" rx="4" ry="4"
        fill="url(#batteryChrome)" />
  <!-- Terminal inner -->
  <rect x="178" y="32" width="12" height="26" rx="3" ry="3"
        fill="#1a1040" />
</svg>'''

save_svg_as_png(battery_svg, 'icon-battery.png', 200, 90)

# Battery fill overlay (just the cyan fill area, transparent elsewhere)
battery_fill_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 90">
  <defs>
    <linearGradient id="cyanFill" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#00d4ff"/>
      <stop offset="100%" stop-color="#00a8e0"/>
    </linearGradient>
  </defs>
  <!-- Fill area (mask this to desired fill level in code) -->
  <rect x="14" y="18" width="152" height="54" rx="7" ry="7"
        fill="url(#cyanFill)" opacity="0.85"/>
  <!-- Shine overlay -->
  <rect x="14" y="18" width="152" height="25" rx="7" ry="7"
        fill="rgba(255,255,255,0.15)"/>
</svg>'''

save_svg_as_png(battery_fill_svg, 'icon-battery-fill.png', 200, 90)

# ============================
# HINT / LIGHTBULB ICON
# ============================
# Warm gold lightbulb with glow, matching reference's purple/gold style
hint_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="hintGlow" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="rgba(255,215,0,0.6)"/>
      <stop offset="60%" stop-color="rgba(255,215,0,0.15)"/>
      <stop offset="100%" stop-color="rgba(255,215,0,0)"/>
    </radialGradient>
    <linearGradient id="bulbGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffe566"/>
      <stop offset="50%" stop-color="#ffd700"/>
      <stop offset="100%" stop-color="#e6a800"/>
    </linearGradient>
  </defs>
  <!-- Glow halo -->
  <circle cx="50" cy="40" r="45" fill="url(#hintGlow)"/>
  <!-- Bulb body -->
  <path d="M50 10 C30 10 18 28 18 42 C18 54 28 60 32 68 L36 72 L64 72 L68 68 C72 60 82 54 82 42 C82 28 70 10 50 10Z"
        fill="url(#bulbGrad)" stroke="rgba(255,230,100,0.5)" stroke-width="1"/>
  <!-- Inner glow -->
  <path d="M50 18 C36 18 26 32 26 42 C26 50 32 56 36 62"
        fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2" stroke-linecap="round"/>
  <!-- Filament lines -->
  <line x1="42" y1="50" x2="42" y2="62" stroke="#e6a800" stroke-width="2"/>
  <line x1="50" y1="48" x2="50" y2="62" stroke="#e6a800" stroke-width="2"/>
  <line x1="58" y1="50" x2="58" y2="62" stroke="#e6a800" stroke-width="2"/>
  <!-- Base/screw -->
  <rect x="36" y="72" width="28" height="6" rx="2" fill="#c0a030"/>
  <rect x="38" y="78" width="24" height="5" rx="2" fill="#a08828"/>
  <rect x="40" y="83" width="20" height="4" rx="2" fill="#907820"/>
  <!-- Screw ridges -->
  <line x1="36" y1="75" x2="64" y2="75" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>
  <line x1="38" y1="81" x2="62" y2="81" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>
</svg>'''

save_svg_as_png(hint_svg, 'icon-hint.png', 100, 100)

# ============================
# UNDO ARROW ICON
# ============================
# Curved arrow pointing left/back, cyan-purple tint
undo_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="undoGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#d0a0ff"/>
      <stop offset="100%" stop-color="#b070e0"/>
    </linearGradient>
  </defs>
  <!-- Curved arrow -->
  <path d="M30 35 L15 50 L30 65" fill="none" stroke="url(#undoGrad)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M15 50 L55 50 C72 50 82 40 82 28 C82 16 72 8 55 8 L45 8"
        fill="none" stroke="url(#undoGrad)" stroke-width="7" stroke-linecap="round"/>
</svg>'''

save_svg_as_png(undo_svg, 'icon-undo.png', 100, 100)

# ============================
# SHUFFLE BOOSTER ICON
# ============================
# Magenta/pink crossing arrows - matches the reference's pink shuffle icon
shuffle_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="shuffleGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ff40ff"/>
      <stop offset="50%" stop-color="#e020d0"/>
      <stop offset="100%" stop-color="#c010a0"/>
    </linearGradient>
    <filter id="shuffleGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <g filter="url(#shuffleGlow)">
    <!-- Bottom-left to top-right arrow -->
    <path d="M20 85 L60 60 L100 35" fill="none" stroke="url(#shuffleGrad)" stroke-width="8" stroke-linecap="round"/>
    <path d="M82 28 L100 35 L93 53" fill="none" stroke="url(#shuffleGrad)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- Top-left to bottom-right arrow (crossing) -->
    <path d="M20 35 L45 52" fill="none" stroke="url(#shuffleGrad)" stroke-width="8" stroke-linecap="round"/>
    <path d="M75 68 L100 85" fill="none" stroke="url(#shuffleGrad)" stroke-width="8" stroke-linecap="round"/>
    <path d="M82 92 L100 85 L93 67" fill="none" stroke="url(#shuffleGrad)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- Extra decorative dots at intersections -->
    <circle cx="60" cy="60" r="4" fill="#ff60ff" opacity="0.6"/>
  </g>
</svg>'''

save_svg_as_png(shuffle_svg, 'icon-shuffle.png', 120, 120)

# ============================
# FREEZE / SNOWFLAKE ICON
# ============================
# Detailed 6-pointed snowflake crystal, cyan/white
freeze_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="freezeGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#80e8ff"/>
      <stop offset="50%" stop-color="#00d4ff"/>
      <stop offset="100%" stop-color="#0090cc"/>
    </linearGradient>
    <filter id="freezeGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <g transform="translate(60,60)" filter="url(#freezeGlow)">
    <!-- 6 main arms -->
    <g stroke="url(#freezeGrad)" stroke-width="5" stroke-linecap="round" fill="none">
      <!-- Arm 1 (up) -->
      <line x1="0" y1="0" x2="0" y2="-48"/>
      <line x1="0" y1="-20" x2="-12" y2="-32"/>
      <line x1="0" y1="-20" x2="12" y2="-32"/>
      <line x1="0" y1="-36" x2="-10" y2="-46"/>
      <line x1="0" y1="-36" x2="10" y2="-46"/>

      <!-- Arm 2 (60deg) -->
      <line x1="0" y1="0" x2="41.6" y2="-24" />
      <line x1="17.3" y1="-10" x2="27.7" y2="-24.3"/>
      <line x1="17.3" y1="-10" x2="29.6" y2="-4.3"/>
      <line x1="31.2" y1="-18" x2="40.4" y2="-30.8"/>
      <line x1="31.2" y1="-18" x2="43" y2="-13"/>

      <!-- Arm 3 (120deg) -->
      <line x1="0" y1="0" x2="41.6" y2="24"/>
      <line x1="17.3" y1="10" x2="29.6" y2="4.3"/>
      <line x1="17.3" y1="10" x2="27.7" y2="24.3"/>
      <line x1="31.2" y1="18" x2="43" y2="13"/>
      <line x1="31.2" y1="18" x2="40.4" y2="30.8"/>

      <!-- Arm 4 (down) -->
      <line x1="0" y1="0" x2="0" y2="48"/>
      <line x1="0" y1="20" x2="12" y2="32"/>
      <line x1="0" y1="20" x2="-12" y2="32"/>
      <line x1="0" y1="36" x2="10" y2="46"/>
      <line x1="0" y1="36" x2="-10" y2="46"/>

      <!-- Arm 5 (240deg) -->
      <line x1="0" y1="0" x2="-41.6" y2="24"/>
      <line x1="-17.3" y1="10" x2="-27.7" y2="24.3"/>
      <line x1="-17.3" y1="10" x2="-29.6" y2="4.3"/>
      <line x1="-31.2" y1="18" x2="-40.4" y2="30.8"/>
      <line x1="-31.2" y1="18" x2="-43" y2="13"/>

      <!-- Arm 6 (300deg) -->
      <line x1="0" y1="0" x2="-41.6" y2="-24"/>
      <line x1="-17.3" y1="-10" x2="-29.6" y2="-4.3"/>
      <line x1="-17.3" y1="-10" x2="-27.7" y2="-24.3"/>
      <line x1="-31.2" y1="-18" x2="-43" y2="-13"/>
      <line x1="-31.2" y1="-18" x2="-40.4" y2="-30.8"/>
    </g>
    <!-- Center crystal -->
    <circle cx="0" cy="0" r="5" fill="#b0f0ff" opacity="0.8"/>
  </g>
</svg>'''

save_svg_as_png(freeze_svg, 'icon-freeze.png', 120, 120)

# ============================
# PREVIEW / EYE ICON
# ============================
# Stylized eye with circuit/tech feel, cyan
preview_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="eyeGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#60e8ff"/>
      <stop offset="50%" stop-color="#00d4ff"/>
      <stop offset="100%" stop-color="#0088bb"/>
    </linearGradient>
    <radialGradient id="irisGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="30%" stop-color="#80e8ff"/>
      <stop offset="70%" stop-color="#00d4ff"/>
      <stop offset="100%" stop-color="#006688"/>
    </radialGradient>
    <filter id="eyeGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <g filter="url(#eyeGlow)">
    <!-- Eye outline -->
    <path d="M10 60 C10 60 30 25 60 25 C90 25 110 60 110 60 C110 60 90 95 60 95 C30 95 10 60 10 60Z"
          fill="none" stroke="url(#eyeGrad)" stroke-width="5" stroke-linejoin="round"/>
    <!-- Iris -->
    <circle cx="60" cy="60" r="22" fill="url(#irisGrad)" stroke="url(#eyeGrad)" stroke-width="2"/>
    <!-- Pupil -->
    <circle cx="60" cy="60" r="10" fill="#003344"/>
    <!-- Pupil highlight -->
    <circle cx="55" cy="55" r="4" fill="rgba(255,255,255,0.6)"/>
    <!-- Circuit lines radiating from eye (tech feel) -->
    <line x1="82" y1="60" x2="95" y2="60" stroke="url(#eyeGrad)" stroke-width="2" opacity="0.5"/>
    <line x1="38" y1="60" x2="25" y2="60" stroke="url(#eyeGrad)" stroke-width="2" opacity="0.5"/>
    <line x1="60" y1="38" x2="60" y2="30" stroke="url(#eyeGrad)" stroke-width="2" opacity="0.5"/>
    <line x1="60" y1="82" x2="60" y2="90" stroke="url(#eyeGrad)" stroke-width="2" opacity="0.5"/>
    <!-- Corner tech dots -->
    <circle cx="95" cy="60" r="2" fill="#00d4ff" opacity="0.5"/>
    <circle cx="25" cy="60" r="2" fill="#00d4ff" opacity="0.5"/>
  </g>
</svg>'''

save_svg_as_png(preview_svg, 'icon-preview.png', 120, 120)

# ============================
# BOOSTER SHELF
# ============================
# Metallic/chrome shelf strip with glass surface and reflective edge
shelf_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 180">
  <defs>
    <linearGradient id="shelfTop" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(180,200,240,0.25)"/>
      <stop offset="40%" stop-color="rgba(100,120,160,0.15)"/>
      <stop offset="100%" stop-color="rgba(40,50,80,0.1)"/>
    </linearGradient>
    <linearGradient id="shelfEdge" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(200,220,255,0.5)"/>
      <stop offset="30%" stop-color="rgba(140,160,200,0.4)"/>
      <stop offset="60%" stop-color="rgba(80,90,120,0.3)"/>
      <stop offset="100%" stop-color="rgba(40,50,70,0.2)"/>
    </linearGradient>
    <linearGradient id="shelfGlow" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,212,255,0.15)"/>
      <stop offset="100%" stop-color="rgba(0,212,255,0)"/>
    </linearGradient>
    <linearGradient id="shelfReflect" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.12)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
  </defs>

  <!-- Main shelf surface (3D perspective feel) -->
  <!-- Glass top surface -->
  <rect x="60" y="20" width="960" height="100" rx="8" ry="8" fill="url(#shelfTop)"/>

  <!-- Top glass reflection -->
  <rect x="60" y="20" width="960" height="45" rx="8" ry="8" fill="url(#shelfReflect)"/>

  <!-- Cyan glow on surface -->
  <rect x="120" y="30" width="840" height="80" rx="6" ry="6" fill="url(#shelfGlow)"/>

  <!-- Chrome front edge (the visible 3D lip) -->
  <rect x="40" y="120" width="1000" height="30" rx="4" ry="4" fill="url(#shelfEdge)"/>

  <!-- Edge highlight line -->
  <line x1="60" y1="121" x2="1020" y2="121" stroke="rgba(200,220,255,0.4)" stroke-width="1"/>

  <!-- Bottom shadow -->
  <rect x="50" y="150" width="980" height="20" rx="10" ry="10"
        fill="rgba(0,0,0,0.15)" filter="blur(8px)"/>

  <!-- Subtle divider lines between 3 booster positions -->
  <line x1="380" y1="35" x2="380" y2="110" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
  <line x1="700" y1="35" x2="700" y2="110" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
</svg>'''

save_svg_as_png(shelf_svg, 'shelf-booster.png', 1080, 180)

# ============================
# BACK CHEVRON
# ============================
back_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
  <defs>
    <linearGradient id="backGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#00d4ff"/>
      <stop offset="100%" stop-color="#0090cc"/>
    </linearGradient>
  </defs>
  <path d="M50 15 L22 40 L50 65" fill="none" stroke="url(#backGrad)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
</svg>'''

save_svg_as_png(back_svg, 'icon-back.png', 80, 80)

print('\nAll icons generated!')
