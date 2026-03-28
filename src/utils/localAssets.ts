export const LOCAL_IMAGES = {
  bgGameplay: require('../../assets/images/bg-synthwave-gameplay.png'),
  bgHome: require('../../assets/images/bg-home-neon.png'),
  bgOnboarding: require('../../assets/images/bg-onboarding.png'),
  bgVictory: require('../../assets/images/bg-victory.png'),
  tileGemTexture: require('../../assets/images/tile-gem-texture.png'),
  neonSun: require('../../assets/images/neon-sun-element.png'),
  neonFrame: require('../../assets/images/neon-frame-border.png'),
  crystalGems: require('../../assets/images/crystal-gems-collection.png'),

  bgShop: require('../../assets/images/bg-shop-neon.png'),
  bgLeaderboard: require('../../assets/images/bg-leaderboard.png'),
  bgCollections: require('../../assets/images/bg-collections.png'),
  bgProfile: require('../../assets/images/bg-profile.png'),
  bgGameOver: require('../../assets/images/bg-game-over.png'),
  bgLoading: require('../../assets/images/bg-loading-splash.png'),
  particleStarburst: require('../../assets/images/particle-starburst.png'),
  trophyCrown: require('../../assets/images/trophy-crown-element.png'),
  tileHolographic: require('../../assets/images/tile-holographic-texture.png'),
  energyRing: require('../../assets/images/energy-ring-element.png'),

  bgEvent: require('../../assets/images/bg-event-neon.png'),
  bgMastery: require('../../assets/images/bg-mastery-cosmic.png'),
  bgModes: require('../../assets/images/bg-modes-arcade.png'),
  bgSettings: require('../../assets/images/bg-settings-control.png'),
  bgClub: require('../../assets/images/bg-club-arena.png'),
  bgLibrary: require('../../assets/images/bg-library-archive.png'),
  iconCoinGold: require('../../assets/images/icon-coin-gold.png'),
  iconGemDiamond: require('../../assets/images/icon-gem-diamond.png'),
  achievementBadge: require('../../assets/images/achievement-badge-frame.png'),
  sparkleSprites: require('../../assets/images/sparkle-sprites.png'),

  iconBattery: require('../../assets/images/icon-battery.png'),
  iconBatteryFill: require('../../assets/images/icon-battery-fill.png'),
  iconHint: require('../../assets/images/icon-hint.png'),
  iconUndo: require('../../assets/images/icon-undo.png'),
  iconBack: require('../../assets/images/icon-back.png'),

  iconShuffle: require('../../assets/images/icon-shuffle.png'),
  iconFreeze: require('../../assets/images/icon-freeze.png'),
  iconPreview: require('../../assets/images/icon-preview.png'),

  shelfBooster: require('../../assets/images/shelf-booster.png'),

  wordfallLogo: require('../../assets/wordfalllogo.png'),

  playButton: require('../../assets/images/playbutton.png'),
  statsCard: require('../../assets/images/statscard.png'),
  shopButton: require('../../assets/images/shopbutton.png'),
};

// Audio asset registry — maps sound names to require() sources.
// Each entry is wrapped in a try/catch getter so the app won't crash
// if an audio file hasn't been added yet. The sound service checks
// for null and falls back to synthesized tones.
//
// To add a real audio file: place it in assets/audio/ and uncomment
// the corresponding line below (or add a new entry).

// Audio assets are loaded dynamically at runtime via expo-av's Audio.Sound.createAsync().
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
  bgHomescreen: require('../../assets/videos/bg-homescreen.mp4'),
  victoryCelebration: require('../../attached_assets/generated_videos/victory_celebration_burst.mp4'),
  neonAuroraAmbient: require('../../attached_assets/generated_videos/neon_aurora_ambient.mp4'),
};
