# Wordfall Audio Assets — Drop-In Reference

Place professional audio files in this directory. The sound service auto-detects them and falls back to synthesized tones per-slot when a file is missing. **The game is fully playable today on synth fallback** — drop files in progressively as they arrive and each one starts playing on the next reload.

**Filenames MUST match the entries in `REAL_SOUND_FILES` / `REAL_MUSIC_FILES` at `src/services/sound.ts`.** The code looks for these exact names. Files with other names will be ignored by the runtime.

See `agent_docs/audio_brief.md` for the full composer brief (triggers, durations, tone direction, format spec).

---

## Complete manifest (19 files: 14 SFX + 5 BGM)

### Sound effects (14 files, all underscored)

| File | Slot name | Trigger | Priority |
|------|-----------|---------|----------|
| `tap.mp3` | `tap` | Every letter cell tap | T1 |
| `button_press.mp3` | `buttonPress` | Any UI button (menu, back, close, booster activate) | T1 |
| `gravity.mp3` | `gravity` | Letters falling into cleared spaces | T1 |
| `word_found.mp3` | `wordFound` | Traced path matches a list word (auto-resolves) | T1 |
| `combo.mp3` | `combo` | 7+ letter "big word" celebration sting (NOT a successive-find combo — see `agent_docs/game_mechanics.md`) | T1 |
| `hint_used.mp3` | `hintUsed` | Hint booster activated | T1 |
| `undo_used.mp3` | `undoUsed` | Undo booster activated | T2 |
| `booster_combo.mp3` | `boosterCombo` | Eagle Eye / Lucky Roll / Power Surge activates (two-booster synergy) | T1 |
| `star_earn.mp3` | `starEarn` | Star reveal on victory screen (per star, staggered) | T1 |
| `puzzle_complete.mp3` | `puzzleComplete` | All list words found | T1 |
| `last_word.mp3` | `lastWord` | One-shot sting when `remainingWords` transitions 2 → 1 (paired with BGM crossfade to tense) | T1 |
| `flawless_badge.mp3` | `flawlessBadge` | Inline "FLAWLESS" pill reveals on victory screen (every clean solve — no hints/undos/shuffle) | T1 |
| `flawless_milestone.mp3` | `flawlessMilestone` | Full-screen flawless-streak milestone ceremony at 3 / 5 / 7 / 10 / 15 / 20 consecutive flawless solves | T1 |
| `word_invalid.mp3` | `wordInvalid` | **Optional — synth-only in practice.** Wordfall has no submit button so invalid words can't be submitted. Keep the synth fallback; skip the real asset unless you want belt-and-suspenders coverage for a theoretical edge case. | T3 |

### Background music (5 files, all looping except victory)

| File | Slot name | Usage |
|------|-----------|-------|
| `bgm_menu.mp3` | `menu` | Home screen, menus, inter-game lobby |
| `bgm_gameplay.mp3` | `gameplay` | Standard gameplay loop |
| `bgm_tense.mp3` | `tense` | Time Pressure mode **AND** last-word tension (crossfade in when `remainingWords === 1`) |
| `bgm_relax.mp3` | `relax` | Relax mode |
| `bgm_victory.mp3` | `victory` | Post-puzzle win screen (NOT looped) |

---

## How to wire a file once it arrives

Drop the MP3 into this directory, then open `src/services/sound.ts` and flip the matching `null` to a `require()`. For example, after dropping `tap.mp3`:

```ts
const REAL_SOUND_FILES: Record<SoundName, number | null> = {
  tap: require('../../assets/audio/tap.mp3'),   // was null
  gravity: null,                                 // still synth
  ...
};
```

BGM works identically via `REAL_MUSIC_FILES`. **Partial delivery is fine** — every `null` entry keeps playing the synth fallback, so the game never breaks while you wait for the rest.

No rebuild of the dev-client APK is needed — just reload Metro after editing `sound.ts`.

---

## Do NOT commission these

Listed in older drafts of this README but **not wired** in code. Dropping them in does nothing:

- `chain-bonus.mp3` / `chain_bonus.mp3` — mechanic ripped Apr 2026 (Option A refactor)
- `wheel-spin.mp3`, `wheel-result.mp3`, `level-up.mp3`, `collection-complete.mp3`, `achievement-unlock.mp3`, `feature-unlock.mp3`, `streak-milestone.mp3`, `ceremony-fanfare.mp3`, `booster-used.mp3`
- Any hyphenated filenames — the code uses underscores exclusively

If you want any of these wired in future, add the slot to the `SoundName` union in `src/services/sound.ts` and update this README to match.

---

## Format requirements

- **Format:** MP3, 192 kbps CBR
- **Sample rate:** 44.1 kHz
- **Channels:** mono (no stereo — mobile speakers don't benefit)
- **Loudness:** -14 LUFS short-term, peak -1 dBTP
- **Loop points:** pre-baked seamlessly for the 4 looping BGM tracks (menu, gameplay, tense, relax)
- **Filenames:** exactly as specified above, case-sensitive, underscores not hyphens
- **Size budgets:** SFX under 100 KB each; BGM under 2 MB each
- **Total payload target:** ~6-8 MB for all 19 files combined

---

## Budget reference (April 2026 rates)

- **SFX:** $50-$150/asset × 14 = $700-$2,100
- **BGM:** $300-$800/track × 5 = $1,500-$4,000
- **Realistic mid-tier total:** $2,500-$6,000, 3-5 weeks lead time
- **Budget-tier alternative:** royalty-free libraries (Pixabay, Freesound, Kenney.nl) + light editing — free-to-$200, a weekend of curation. Good enough for soft launch; re-commission if KPIs justify it.
