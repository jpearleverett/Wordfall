# Wordfall — Audio Commission Brief

> Pass this document to your composer / sound designer. Specifies every asset needed to swap synth fallback for production audio.
>
> **Code wire-up:** drop delivered files into `assets/audio/` then update `src/services/sound.ts:47-67` — replace each `null` with `require('../../assets/audio/<filename>.mp3')`.
>
> **Format spec:** all assets MP3, mono, 44.1 kHz, normalized to -14 LUFS short-term (mobile-friendly, headroom-preserving). Loop points pre-baked in BGM where applicable.

---

## Reference & Tone

**Game genre:** gravity-based word puzzle. Think Candy Crush dopamine + Wordscapes warmth.

**Audio inspirations:**
- **Candy Crush Saga** — bright, percussive, generous use of harmonic stacking on word-found events
- **Wordscapes** — warm, slightly muted palette; tactile click sounds
- **Toy Blast / Royal Match** — punchy ceremony moments, satisfying combo escalations

**Avoid:**
- Aggressive synth leads (out of place for casual puzzle)
- Long sustains on SFX (must not bleed into next interaction)
- Vocal samples (locale issues)

---

## SFX Library — 11 files

Drop into `assets/audio/`. Filenames must match exactly (case-sensitive).

### Tier 1 — high-frequency interactions

#### `tap.mp3`
- **Trigger:** every cell tap during letter selection
- **Length:** 50–80 ms
- **Tone:** crisp, woody click; subtle pitch variance per tap (we'll randomize playback rate ±5% in code) to avoid auditory fatigue
- **Reference:** Wordscapes letter-tap sound

#### `button_press.mp3`
- **Trigger:** any UI button tap (menu, close, back)
- **Length:** 100–150 ms
- **Tone:** soft "tock" with brief tail; slightly rounder than `tap.mp3` to differentiate UI from gameplay

#### `gravity.mp3`
- **Trigger:** plays once when letters fall after a cleared word
- **Length:** 300–500 ms
- **Tone:** gentle whoosh + light percussion landing; suggests "blocks settling"; non-musical so it can stack with BGM

### Tier 2 — gameplay rewards

#### `word_found.mp3`
- **Trigger:** valid word submitted
- **Length:** 400–600 ms
- **Tone:** ascending 3-note arpeggio (e.g., C–E–G), bell-like, bright; the "yes!" moment
- **Variations:** ideally 2–3 micro-variants (we'll round-robin in code) to prevent fatigue

#### `chain_bonus.mp3`
- **Trigger:** word found immediately after gravity (chain reaction)
- **Length:** 600–900 ms
- **Tone:** more elaborate than `word_found` — add a flourish or upward slide; should feel "unlocked," not just rewarded

#### `combo.mp3`
- **Trigger:** combo counter reaches 3+
- **Length:** 700–1000 ms
- **Tone:** big, anthemic; layered chord with a percussive hit; the "you're on fire" moment

#### `star_earn.mp3`
- **Trigger:** any star earned (per-puzzle, 1/2/3 stars)
- **Length:** 500–800 ms
- **Tone:** sparkle / magical chime; should pair well with looping (when 3 stars play in quick succession)

### Tier 3 — feedback + system

#### `word_invalid.mp3`
- **Trigger:** invalid word submitted (not in dictionary, not adjacent, etc.)
- **Length:** 200–350 ms
- **Tone:** gentle "uh-uh" denial; descending two-note minor interval; NOT harsh or punishing — must not discourage retries

#### `puzzle_complete.mp3`
- **Trigger:** all words found, puzzle solved
- **Length:** 1.2–1.8 s
- **Tone:** big celebratory fanfare; brass + percussion + sustain; can have a subtle reverb tail

#### `hint_used.mp3`
- **Trigger:** hint booster activated
- **Length:** 300–500 ms
- **Tone:** revealing / "aha" sound; airy, with a slight chime tail

#### `undo_used.mp3`
- **Trigger:** undo booster activated
- **Length:** 200–400 ms
- **Tone:** rewinding / time-reversal feel; subtle "swoop back"; quieter than `hint_used`

---

## BGM Tracks — 5 files

Drop into `assets/audio/`. All loopable (composer should mark loop points).

### `bgm_menu.mp3`
- **Length:** 90–180 seconds, seamless loop
- **Tempo:** 90–110 BPM
- **Mood:** welcoming, light, slightly playful; sparse arrangement (player might leave it running while reading menus)
- **Instrumentation:** light marimba, soft pads, occasional bell accent
- **Reference:** Wordscapes home screen BGM

### `bgm_gameplay.mp3`
- **Length:** 120–180 seconds, seamless loop
- **Tempo:** 100–120 BPM
- **Mood:** focused, inviting, NOT distracting; this plays while the player is thinking
- **Instrumentation:** mid-range pad, sustained chords, subtle rhythmic element; melody should be background, not foreground
- **Critical:** must not have prominent melodic hooks that compete with the player's internal monologue

### `bgm_tense.mp3`
- **Length:** 90–150 seconds, seamless loop
- **Trigger context:** Time Pressure mode, last 30s of timer
- **Tempo:** 130–145 BPM
- **Mood:** urgent but not panic-inducing; driving rhythm; dark but not menacing
- **Instrumentation:** percussive, lower register, ostinato; should feel like a heartbeat speeding up

### `bgm_relax.mp3`
- **Length:** 120–240 seconds, seamless loop
- **Trigger context:** Relax mode (unlimited hints, low pressure)
- **Tempo:** 70–85 BPM
- **Mood:** spa-like, meditative; lo-fi-adjacent
- **Instrumentation:** soft piano, ambient pad, occasional water/wind texture
- **Reference:** Lo-fi study playlists

### `bgm_victory.mp3`
- **Length:** 60–90 seconds (NOT looped — plays once after `puzzle_complete.mp3`)
- **Tempo:** 110–130 BPM
- **Mood:** triumphant, warm, payoff
- **Instrumentation:** brass swell, percussion, melodic hook (this CAN have a hook — player just won)
- **Note:** ducks under the post-puzzle UI; should fade gracefully if cut short by user navigation

---

## Future SFX Slots (Reserve, Optional)

These will land with the upcoming feature branches. If budget allows, commission them in this round:

- `booster_combo.mp3` — booster synergy activation (epic, layered, ~800ms)
- `piggy_bank_break.mp3` — gem jar smashing open (satisfying ceramic break + coins falling, ~1.2s)
- `season_pass_tier_unlock.mp3` — battle pass tier reached (ascending fanfare, ~1s)
- `referral_reward.mp3` — friend joined and reward landed (warm, social-positive, ~600ms)

### Last-word + Flawless dopamine layer (April 2026 — replaces chain/combo popups)

Wordfall no longer tries to be match-3. Chain/combo popups were ripped; two new
moments carry the same emotional weight within the game's actual rules
(single-solution word-search with gravity).

- `last_word_sting.mp3` — fires once when `remainingWords` transitions `2 → 1`.
  500–800ms soft tension riser, subtle but distinct from `wordFound`. Pair with
  a BGM crossfade to the tense bed. Currently using `starEarn` synth as the
  stand-in; flip `src/services/sound.ts` once the real asset lands (either by
  swapping `starEarn`'s `REAL_SOUND_FILES` entry or by adding a dedicated
  `lastWord` slot to the `SoundName` union).
- `flawless_badge.mp3` — plays when the "FLAWLESS" badge reveals on the victory
  screen (~400–600ms bright chime, gold-hued, celebratory but brief — the
  full-screen fanfare is reserved for flawless-streak milestones at 3/5/7/
  10/15/20 solves in a row). Currently borrows the `starEarn` synth as
  placeholder; rescued the orphaned slot.

Both are Tier 1 additions — commission alongside the 11 SFX above rather than
as a separate round.

---

## Delivery Format

- **File format:** MP3, 192 kbps CBR (good balance of size + quality)
- **Sample rate:** 44.1 kHz
- **Channels:** mono (we don't use stereo separation in mobile)
- **Loudness:** -14 LUFS short-term, peak -1 dBTP
- **Naming:** EXACTLY as specified above (case-sensitive, underscores not hyphens)
- **Total payload:** target ~4–6 MB for all 16 files combined (BGM dominates; SFX are small)

---

## Acceptance Criteria

When you receive deliverables:

1. Drop all files into `assets/audio/` (create the directory if missing)
2. Update `src/services/sound.ts:47-67` — replace `null` with `require()` for each filename
3. Run `npm test src/__tests__/audio.test.ts` (will be created in Branch 13) — must pass
4. Test on dev client: every sound triggers cleanly, BGM transitions smoothly between menu → gameplay → victory, no clicks/pops at loop boundaries
5. Verify on a real device with phone speaker (not just headphones) — bass-heavy mixes can disappear on phone speakers

---

## Budget Reference

Industry rates (April 2026):
- **SFX:** $50–$150 per asset (11 SFX = $550–$1650)
- **BGM short loop:** $300–$800 per track (5 BGM = $1500–$4000)
- **Total mid-tier:** $2000–$5500
- **Total premium (named composer):** $5000–$15000

Budget $3000–$8000 for a quality result; allow 3–5 weeks lead time.
