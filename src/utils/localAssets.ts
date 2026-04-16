// All image assets are served as WebP from `assets/images/optimized/` for
// smaller bundle size. The source PNGs were removed in the launch-readiness
// bundle trim. To add a new image: drop the source PNG in assets/images/,
// run `scripts/optimize-assets.sh` to produce a WebP, then register it below.
export const LOCAL_IMAGES = {
  // Background images (5 shared across all screens)
  bg1: require('../../assets/images/optimized/bg1.webp'),
  bg2: require('../../assets/images/optimized/bg2.webp'),
  bg3: require('../../assets/images/optimized/bg3.webp'),
  bg4: require('../../assets/images/optimized/bg4.webp'),
  bg5: require('../../assets/images/optimized/bg5.webp'),

  tileGemTexture: require('../../assets/images/optimized/tile-gem-texture.webp'),
  neonSun: require('../../assets/images/optimized/neon-sun-element.webp'),
  neonFrame: require('../../assets/images/optimized/neon-frame-border.webp'),
  crystalGems: require('../../assets/images/optimized/crystal-gems-collection.webp'),

  trophyCrown: require('../../assets/images/optimized/trophy-crown-element.webp'),
  energyRing: require('../../assets/images/optimized/energy-ring-element.webp'),

  iconCoinGold: require('../../assets/images/optimized/icon-coin-gold.webp'),
  iconGemDiamond: require('../../assets/images/optimized/icon-gem-diamond.webp'),
  achievementBadge: require('../../assets/images/optimized/achievement-badge-frame.webp'),
  sparkleSprites: require('../../assets/images/optimized/sparkle-sprites.webp'),

  iconBattery: require('../../assets/images/optimized/icon-battery.webp'),
  iconHint: require('../../assets/images/optimized/icon-hint.webp'),
  iconUndo: require('../../assets/images/optimized/icon-undo.webp'),
  iconBack: require('../../assets/images/optimized/icon-back.webp'),

  shelfBooster: require('../../assets/images/optimized/shelf-booster.webp'),

  // PNG kept — logo renders at launch splash / branding surfaces; 259KB.
  wordfallLogo: require('../../assets/wordfalllogo.png'),

  playButton: require('../../assets/images/optimized/playbutton.webp'),
  statsCard: require('../../assets/images/optimized/statscard.webp'),
  shopButton: require('../../assets/images/optimized/shopbutton.webp'),
};

// Audio asset registry — maps sound names to require() sources.
// Each entry is wrapped in a try/catch getter so the app won't crash
// if an audio file hasn't been added yet. The sound service checks
// for null and falls back to synthesized tones.
//
// To add a real audio file: place it in assets/audio/ and uncomment
// the corresponding line below (or add a new entry).

// Audio assets are loaded dynamically at runtime via expo-audio's createAudioPlayer().
// Place .mp3 files in assets/audio/ and they will be picked up by the sound service.
// See assets/audio/README.md for the full list of expected audio files.
// We use an empty registry here — the sound service checks for file existence at runtime.
export const LOCAL_AUDIO: Record<string, any> = {};

// To enable audio assets, uncomment lines below AFTER placing the .mp3 files in assets/audio/:
// export const LOCAL_AUDIO: Record<string, any> = {
//   tap: require('../../assets/audio/tap.mp3'),
//   wordFound: require('../../assets/audio/word-found.mp3'),
//   wordInvalid: require('../../assets/audio/word-invalid.mp3'),
//   gravity: require('../../assets/audio/gravity-drop.mp3'),
//   combo: require('../../assets/audio/combo.mp3'),
//   puzzleComplete: require('../../assets/audio/puzzle-complete.mp3'),
//   hintUsed: require('../../assets/audio/hint-used.mp3'),
//   undoUsed: require('../../assets/audio/undo-used.mp3'),
//   buttonPress: require('../../assets/audio/button-press.mp3'),
//   boosterUsed: require('../../assets/audio/booster-used.mp3'),
//   ceremonyFanfare: require('../../assets/audio/ceremony-fanfare.mp3'),
//   wheelSpin: require('../../assets/audio/wheel-spin.mp3'),
//   wheelResult: require('../../assets/audio/wheel-result.mp3'),
//   streakMilestone: require('../../assets/audio/streak-milestone.mp3'),
//   bgmHome: require('../../assets/audio/bgm-home.mp3'),
//   bgmGameplay: require('../../assets/audio/bgm-gameplay.mp3'),
//   bgmVictory: require('../../assets/audio/bgm-victory.mp3'),
//   bgmRelax: require('../../assets/audio/bgm-relax.mp3'),
// };

export const LOCAL_VIDEOS = {
  synthwaveGridFlow: require('../../attached_assets/generated_videos/synthwave_grid_flow.mp4'),
  // Use the 753 KB optimized encode instead of the 4.9 MB source.
  bgHomescreen: require('../../assets/videos/bg-homescreen-optimized.mp4'),
  victoryCelebration: require('../../attached_assets/generated_videos/victory_celebration_burst.mp4'),
  neonAuroraAmbient: require('../../attached_assets/generated_videos/neon_aurora_ambient.mp4'),
};
