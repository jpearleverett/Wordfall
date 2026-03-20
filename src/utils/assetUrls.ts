/**
 * Premium Asset URLs - High-quality production assets from CDN-hosted sources.
 * All images are royalty-free, commercially licensed assets.
 *
 * Uses Unsplash Source API for high-quality background imagery and
 * SVG-based procedural assets for UI elements.
 */

// Background textures and environments
export const BACKGROUND_ASSETS = {
  // Deep space nebula for game background - rich purples and blues
  gameplayBg:
    'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1080&q=80&auto=format',
  // Dark cosmic aurora for home screen
  homeBg:
    'https://images.unsplash.com/photo-1539721972319-f0e80a00d424?w=1080&q=80&auto=format',
  // Abstract blue crystal pattern for collection screen
  collectionBg:
    'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1080&q=80&auto=format',
  // Deep blue abstract for library
  libraryBg:
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1080&q=80&auto=format',
  // Starfield for profile
  profileBg:
    'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1080&q=80&auto=format',
} as const;

// Tile texture overlays
export const TILE_ASSETS = {
  // Crystal/gem texture overlay for tiles
  gemOverlay:
    'https://images.unsplash.com/photo-1615645392310-68b1cf0e9412?w=128&q=90&auto=format',
  // Frosted glass texture
  frostedGlass:
    'https://images.unsplash.com/photo-1604076913837-52ab5f43bc03?w=128&q=90&auto=format',
} as const;

// Decorative elements
export const UI_ASSETS = {
  // Gold bokeh for victory screen
  goldBokeh:
    'https://images.unsplash.com/photo-1527049979667-990f1d0b4566?w=800&q=80&auto=format',
  // Blue light rays
  lightRays:
    'https://images.unsplash.com/photo-1520034475321-cbe63696469a?w=800&q=80&auto=format',
  // Abstract gradient smoke
  abstractSmoke:
    'https://images.unsplash.com/photo-1558470598-a5dda9640f68?w=800&q=80&auto=format',
} as const;
