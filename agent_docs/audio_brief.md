# Wordfall — Audio Commission Brief

> Pass this document to your composer / sound designer. Specifies every asset needed to swap synth fallback for production audio.
>
> **Code wire-up:** drop delivered files into `assets/audio/` then open `src/services/sound.ts` and flip the matching `null` to `require('../../assets/audio/<filename>.mp3')` in the `REAL_SOUND_FILES` / `REAL_MUSIC_FILES` maps. Partial deliveries are fully supported — the runtime falls back to synthesis per-slot. The game is playable the whole time.
>
> **Format spec:** all assets MP3 (192 kbps CBR), mono, 44.1 kHz, normalized to -14 LUFS short-term (mobile-friendly, headroom-preserving), peak -1 dBTP. Loop points pre-baked in BGM where applicable.
>
> **Total scope:** 72 SFX + 10 BGM = **82 files**, organized into three priority tiers:
> - **P0 (13 SFX + 5 BGM = 18 files)** — ship blockers. Core gameplay, Option A dopamine layer, core BGM. Without these the game feels broken.
> - **P1 (32 SFX)** — strong polish. Ceremony fanfares, failure states, timer warnings, per-booster variants, signature monetization moments (piggy break, purchase success, high-value unlock), mystery wheel, chapter/tier milestones. Moves the game from "indie polish" to "top-tier F2P perceived quality."
> - **P2 (27 SFX + 5 BGM = 32 files)** — optional polish. UI micro-sounds, minor economy pings, social pings, offers, tutorial, BGM variants. Each one adds a small increment; none individually moves KPIs.
>
> See `assets/audio/README.md` for the full per-slot manifest with priorities + live/dormant status. This brief details the 14 highest-priority SFX + 5 core BGM with full tone direction; the remaining 58 SFX + 5 BGM are listed in the README with one-line triggers — use the synth fallbacks at `src/services/sound.ts:SOUND_DEFS` as pitch/length references when commissioning those.
>
> **Commission in waves** if budget requires staging. P0 alone ($1.5K–$4K) is enough to ship to Google Play; P0+P1 ($4K–$11K) hits top-tier polish; P2 is live-ops work over 6–12 months.

---

## Reference & Tone

**Game genre:** word-search-with-gravity (NOT match-3; see `agent_docs/game_mechanics.md`). Thoughtful strategic puzzle, not a reflex arcade.

**Audio inspirations:**
- **Wordscapes / Word Cookies** — warm, slightly muted palette; tactile click sounds; calm gameplay bed
- **Royal Match** — punchy ceremony moments without aggression
- **NYT Games suite** — minimal but crisp UI feedback, no intrusive loops

**Avoid:**
- Match-3 style cascade/chain escalation escalations — Wordfall has no cascades
- Aggressive synth leads (out of place for a thoughtful puzzle)
- Long sustains on SFX (must not bleed into next interaction)
- Vocal samples (locale issues)

---

## SFX Library — 72 files total (14 detailed below, 58 abbreviated in the README)

Drop into `assets/audio/`. Filenames must match exactly (case-sensitive, underscores not hyphens). The 14 slots below have full tone direction; the remaining 58 are listed in `assets/audio/README.md` with one-line triggers — use the synth fallbacks at `src/services/sound.ts:SOUND_DEFS` as pitch/length references when commissioning those.

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

#### `combo.mp3` (big-word sting, NOT a combo meter)
- **Trigger:** valid word of 7+ letters is found (the "big word" emotional highlight)
- **Length:** 700–1000 ms
- **Tone:** big, anthemic; layered chord with a percussive hit; the "impressive find" moment. **Not** a combo-counter sound — Wordfall has no successive-find combo multiplier (ripped Apr 2026). This slot was kept and repurposed for long-word celebration.

#### `star_earn.mp3`
- **Trigger:** each star earned on the victory screen (per-puzzle 1/2/3 stars, staggered reveal)
- **Length:** 500–800 ms
- **Tone:** sparkle / magical chime; should pair well when 3 plays in quick succession

#### `puzzle_complete.mp3`
- **Trigger:** all list words found — victory screen entrance
- **Length:** 1.2–1.8 s
- **Tone:** big celebratory fanfare; brass + percussion + sustain; can have a subtle reverb tail

### Tier 2 — dopamine layer (Option A: last-word tension + flawless)

These three are the core of Wordfall's honest-to-genre dopamine architecture. Every puzzle ends on a tension moment; every clean solve rewards with a gold pill; every 3/5/7/10/15/20th flawless streak fires a full-screen ceremony.

#### `last_word.mp3`
- **Trigger:** fires **once** per puzzle, the moment `remainingWords` transitions 2 → 1. Paired with a BGM crossfade to the tense track.
- **Length:** 500–800 ms
- **Tone:** anticipatory tension riser — low-to-mid frequency slide upward. NOT triumphant; should feel like "one away" rather than "you won." Avoid percussive attack — smooth swell.
- **Reference:** the stinger right before a boss appears in classic RPGs; Wordscapes "last letter" moment; *not* a fanfare.

#### `flawless_badge.mp3`
- **Trigger:** inline "FLAWLESS" pill reveals on victory screen. Plays on **every** puzzle solved with no hints, no undos, no shuffle. Common enough that it has to stay satisfying without tiring.
- **Length:** 400–600 ms
- **Tone:** warm gold arpeggio, bright but not overwhelming. Think "achievement unlocked" at a calm volume. Should sit naturally alongside `star_earn.mp3` when both fire close together.

#### `flawless_milestone.mp3`
- **Trigger:** full-screen flawless-streak milestone ceremony at 3 / 5 / 7 / 10 / 15 / 20 consecutive flawless solves. Rare — rarest in the game.
- **Length:** 1.0–1.8 s
- **Tone:** biggest ceremony fanfare in the game. Full orchestral swell, rising through harmonic stacks, satisfying resolution. Should feel like an honest-to-god achievement — players who hear this at streak 20 should remember it.
- **Reference:** Candy Crush "Sweet!" at 5x intensity; the NYT Crossword solve fanfare scaled up.

### Tier 3 — system & fallback

#### `hint_used.mp3`
- **Trigger:** hint booster activated
- **Length:** 300–500 ms
- **Tone:** revealing / "aha" sound; airy, with a slight chime tail

#### `undo_used.mp3`
- **Trigger:** undo booster activated
- **Length:** 200–400 ms
- **Tone:** rewinding / time-reversal feel; subtle "swoop back"; quieter than `hint_used`

#### `word_invalid.mp3` (OPTIONAL — synth fallback is fine)
- **Trigger:** traced path doesn't match any list word. In practice Wordfall has no submit button and the player just keeps dragging until a match — this slot is mostly theoretical. **Safe to skip commissioning** and let the synth fallback cover edge cases.
- **Length:** 200–350 ms
- **Tone:** if commissioned, keep it gentle — a soft descending two-note denial, NOT harsh. Must not discourage retries.

---

**Deleted in Apr 2026 (Option A refactor):** `chain_bonus.mp3` was removed. There is no chain reaction in Wordfall — gravity never auto-resolves a word. If an older brief mentions "chain combos" or "chain reactions," that framing was based on a prototype design that was ripped. The `combo.mp3` slot was kept but repurposed as the "big word" (7+ letter) celebration, not a combo multiplier.

---

## BGM Tracks — 10 files total (5 detailed below, 5 abbreviated in the README)

The 5 slots below are the launch-day essentials. The remaining 5 (`bgm_gameplay_alt`, `bgm_defeat`, `bgm_shop`, `bgm_social`, `bgm_event`) are in the drop-in manifest with short tone direction — commission in Wave 2/3.

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

## Booster combo — wired as `booster_combo.mp3`

Already in the SFX map (`boosterCombo` slot). Triggered when the player pairs two boosters (Eagle Eye / Lucky Roll / Power Surge). Roughly 800 ms, bright and layered — the "synergy activated" moment. Spec inline with the main SFX list.

## Future slots (NOT wired yet — ignore unless you want a bigger brief)

These don't have code slots today. If you want dedicated SFX for them, the slot needs to be added to `SoundName` in `src/services/sound.ts` first. Tell me which you want wired and I'll plumb them in.

- `piggy_bank_break.mp3` — gem jar smashing open (satisfying ceramic break + coins falling, ~1.2 s)
- `season_pass_tier_unlock.mp3` — battle pass tier reached (ascending fanfare, ~1 s)
- `referral_reward.mp3` — friend joined and reward landed (warm, social-positive, ~600 ms)
- Per-star staggered chimes (currently all three stars play the same `star_earn`)

---

## Delivery Format

- **File format:** MP3, 192 kbps CBR (good balance of size + quality)
- **Sample rate:** 44.1 kHz
- **Channels:** mono (we don't use stereo separation in mobile)
- **Loudness:** -14 LUFS short-term, peak -1 dBTP
- **Naming:** EXACTLY as specified above (case-sensitive, underscores not hyphens)
- **Total payload:** target ~6–8 MB for all 19 files combined (BGM dominates; SFX are small)

---

## Acceptance Criteria

When you receive deliverables:

1. Drop all files into `assets/audio/` (create the directory if missing)
2. Open `src/services/sound.ts` and flip each matching `null` to `require('../../assets/audio/<filename>.mp3')` in `REAL_SOUND_FILES` / `REAL_MUSIC_FILES`
3. Reload Metro (no APK rebuild needed — JS-only change)
4. Test on dev client: every sound triggers cleanly, BGM transitions smoothly between menu → gameplay → tense (on last word) → victory, no clicks/pops at loop boundaries
5. Verify on a real device with phone speaker (not just headphones) — bass-heavy mixes can disappear on phone speakers

---

## Budget Reference

Industry rates (April 2026):
- **SFX:** $50–$150 per asset (72 SFX = $3,600–$10,800)
- **BGM short loop:** $300–$800 per track (10 BGM = $3,000–$8,000)
- **Full scope (82 files):** $6,600–$18,800 mid-tier; $14,000–$36,000 premium named composer
- **Wave 1 only (~22 launch essentials):** $2,000–$5,000 — enough to ship to Google Play
- **Budget-tier alternative:** royalty-free libraries (Pixabay, Freesound, Kenney.nl) curated at ~$200–500 for Wave 1, a weekend of work. Good enough for soft launch; re-commission higher tiers after KPIs confirm retention.

Partial delivery is fine — the game works on synth fallback per-slot, so you can ship what's ready and add the rest in a follow-up round without any code changes beyond flipping `null` to `require()`.
