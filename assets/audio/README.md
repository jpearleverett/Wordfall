# Wordfall Audio Assets

Place professional audio files in this directory. The sound service will automatically
detect and use them, falling back to synthesized tones when a file is missing.

## Sound Effects Needed

| File | Duration | Description |
|------|----------|-------------|
| tap.mp3 | 50-100ms | Subtle click/pop for cell selection |
| word-found.mp3 | 300ms | Satisfying chime/ding for valid word |
| word-invalid.mp3 | 200ms | Soft buzz/error tone for invalid word |
| gravity-drop.mp3 | 200ms | Whoosh/thud for gravity physics |
| combo.mp3 | 500ms | Escalating chime for chain combos |
| puzzle-complete.mp3 | 1-2s | Victory fanfare |
| hint-used.mp3 | 300ms | Sparkle/reveal sound |
| undo-used.mp3 | 300ms | Rewind/swipe-back sound |
| button-press.mp3 | 100ms | UI click |
| star-earn.mp3 | 300ms | Bright sparkle arpeggio |
| chain-bonus.mp3 | 450ms | Rising major chord shimmer |
| booster-used.mp3 | 400ms | Power-up sound |
| ceremony-fanfare.mp3 | 2s | Celebration trumpets |
| wheel-spin.mp3 | 2-3s | Spinning/clicking roulette sound |
| wheel-result.mp3 | 500ms | Result reveal sting |
| streak-milestone.mp3 | 1s | Achievement unlock sound |
| level-up.mp3 | 1s | Level up jingle |
| collection-complete.mp3 | 1.5s | Collection completion fanfare |
| achievement-unlock.mp3 | 1s | Achievement earned sound |
| feature-unlock.mp3 | 1.5s | Feature/tab unlock fanfare |

## Background Music Needed

| File | Duration | Description |
|------|----------|-------------|
| bgm-home.mp3 | Looping | Calm/inviting home screen music |
| bgm-gameplay.mp3 | Looping | Focused/light tension for gameplay |
| bgm-victory.mp3 | Short | Celebration music |
| bgm-relax.mp3 | Looping | Ambient/peaceful for relax mode |

## Format Requirements

- MP3 format, 44.1kHz sample rate
- Normalize loudness to -14 LUFS
- Sound effects should have minimal silence at start/end
- Background music should loop cleanly (seamless loop point)
- Keep file sizes small: SFX under 100KB, BGM under 2MB each
