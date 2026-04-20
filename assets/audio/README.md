# Wordfall Audio Assets

Place professional audio files in this directory. The sound service will automatically detect and use them, falling back to synthesized tones when a file is missing.

**Filenames MUST match the entries in `REAL_SOUND_FILES` / `REAL_MUSIC_FILES` at `src/services/sound.ts:47-67`.** Files with other names will not be picked up by the runtime. See `agent_docs/audio_brief.md` for the full composer brief with triggers, durations, and tone direction.

## Currently wired filenames (what to actually ship)

### SFX (11 files, underscores — not hyphens)

| File | Trigger |
|------|---------|
| `tap.mp3` | Every letter cell tap |
| `button_press.mp3` | Any UI button (menu, back, close) |
| `gravity.mp3` | Letters falling after a word clears |
| `word_found.mp3` | Valid word from the list auto-resolves (trace match) |
| `word_invalid.mp3` | **Synth-only fallback — this slot is effectively dead code.** Wordfall has no submit button and invalid words are impossible; the sound plays only if a stray call site is hit. Safe to skip. |
| `combo.mp3` | 7+ letter "big word" celebration (NOT a successive-find combo — see `agent_docs/game_mechanics.md`) |
| `star_earn.mp3` | Star reveal on victory screen + last-word tension sting + flawless-badge reveal (until dedicated assets land) |
| `puzzle_complete.mp3` | All list words found |
| `hint_used.mp3` | Hint booster activated |
| `undo_used.mp3` | Undo booster activated |
| `booster_combo.mp3` | Eagle Eye / Lucky Roll / Power Surge activates (two-booster synergy, separate from the removed successive-find combo) |

### BGM (5 files)

| File | Usage |
|------|-------|
| `bgm_menu.mp3` | Home screen, menus |
| `bgm_gameplay.mp3` | Standard gameplay loop |
| `bgm_tense.mp3` | Time Pressure mode + **last-word tension crossfade** (remaining:1) |
| `bgm_relax.mp3` | Relax mode |
| `bgm_victory.mp3` | Post-puzzle victory |

### Tier 1 future slots (drop in when ready, wire to existing key)

- **`last_word_sting.mp3`** — dedicated sting for `remainingWords: 2 → 1`. Currently reusing `starEarn`. When delivered, either swap the `starEarn` entry in `REAL_SOUND_FILES` or add a new `lastWord` key to the `SoundName` union.
- **`flawless_badge.mp3`** — dedicated reveal sting for the FLAWLESS badge. Same swap pattern.

See `agent_docs/audio_brief.md` §"Last-word + Flawless dopamine layer" for tone direction on both.

## Do NOT commission these (referenced in older drafts, but the runtime ignores them)

These files were listed in prior versions of this README but have no corresponding `REAL_SOUND_FILES` entry — dropping them in does nothing:

- `chain-bonus.mp3` / `chain_bonus.mp3` (mechanic ripped Apr 2026)
- `wheel-spin.mp3`, `wheel-result.mp3`, `level-up.mp3`, `collection-complete.mp3`, `achievement-unlock.mp3`, `feature-unlock.mp3`, `streak-milestone.mp3`, `ceremony-fanfare.mp3`, `booster-used.mp3` (not wired)
- Any hyphenated filenames (the code uses underscores exclusively)

## Format requirements

- MP3 format, 44.1 kHz sample rate, mono (no stereo — mobile speakers don't benefit)
- Normalize loudness to -14 LUFS short-term, peak -1 dBTP
- SFX should have minimal silence at start/end
- BGM must loop cleanly (seamless loop point pre-baked)
- Keep file sizes small: SFX under 100 KB each, BGM under 2 MB each
- **Filenames use underscores, case-sensitive, exactly as specified above**
