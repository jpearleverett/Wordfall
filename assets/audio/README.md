# Wordfall Audio Assets — Full Drop-In Manifest

**72 SFX + 10 BGM = 82 files.** Every slot is wired in `src/services/sound.ts` with a synth fallback, so the game is fully playable today on pure synth. Drop real MP3s in progressively — each one starts playing on the next reload.

Two dimensions per slot:
- **Status** — *Live* (trigger site exists in code; playing today on synth) or *Dormant* (file loads cleanly but no `playSound()` call site yet; a small follow-up wires the trigger).
- **Priority** — *P0* (critical; ship blocker), *P1* (strong polish; strongly recommended), *P2* (optional; nice-to-have completeness).

See `agent_docs/audio_brief.md` for the composer-facing brief (tone, length, inspiration per sound).

---

## How to drop files in

1. Drop the MP3 into this directory using the canonical filename from the tables below.
2. Open `src/services/sound.ts`. In `REAL_SOUND_FILES` or `REAL_MUSIC_FILES`, change `tap: null` (or whichever slot) to `tap: require('../../assets/audio/tap.mp3')`.
3. Press `r` in Metro to reload. No APK rebuild required — JS-only change.

**Partial delivery is fully supported.** Every `null` slot keeps playing the synth fallback, so the game never breaks while you wait for more files.

---

## Priority summary

| Priority | Count | What it covers |
|---|---|---|
| **P0** (critical) | **13 SFX + 5 BGM = 18 files** | Without these, the game feels broken. Every core gameplay moment (tap / word / gravity / complete), all Option A dopamine hooks (last-word, flawless badge, flawless streak milestone), and the 5 core BGM tracks. **Commission these first.** |
| **P1** (strong polish) | **32 SFX = 32 files** | Ceremony fanfare tiers, failure states, timer warnings, per-booster variants, big-moment economy (piggy break, purchase success, high-value unlock), mystery wheel, chapter/tier/first-win milestones. These separate "mid-tier" from "top-tier" perceived quality. |
| **P2** (optional) | **27 SFX + 5 BGM = 32 files** | UI micro-sounds (toggles, back button), minor economy pings (coin small, hint token earned), social pings (gifts, club goals, friend beat score), offer sounds, tutorial sounds, BGM variants (gameplay alt, defeat, shop, social, event). Won't move the needle in isolation. |
| **Total** | **82 files** | |

**Budget rule of thumb:** P0 alone (~$1,500–$4,000 mid-tier) is enough to ship to Google Play. P0+P1 (~$4,000–$11,000) hits top-tier F2P polish. P2 is post-launch live-ops work.

---

## SFX — 72 files (underscores, case-sensitive)

### Core taps & selection (6)

| File | Slot | Trigger | Status | Priority |
|------|------|---------|--------|----------|
| `tap.mp3` | `tap` | Every letter cell tap | **Live** | **P0** |
| `tap_rare.mp3` | `tapRare` | Tap lands on a rare / wildcard tile | Dormant | P2 |
| `button_press.mp3` | `buttonPress` | Any UI button | **Live** | **P0** |
| `back_button.mp3` | `backButton` | Back / close button | Dormant | P2 |
| `toggle_on.mp3` | `toggleOn` | Settings toggle on | Dormant | P2 |
| `toggle_off.mp3` | `toggleOff` | Settings toggle off | Dormant | P2 |

### Word events (4)

| File | Slot | Trigger | Status | Priority |
|------|------|---------|--------|----------|
| `word_found.mp3` | `wordFound` | Traced path matches a list word (<7 letters) | **Live** | **P0** |
| `combo.mp3` | `combo` | 7+ letter "big word" sting | **Live** | **P0** |
| `word_found_rare.mp3` | `wordFoundRare` | Word contained a rare/wildcard tile | Dormant | P1 |
| `word_invalid.mp3` | `wordInvalid` | Rare edge case; mostly synth fallback covers | **Live** (rarely fires) | P2 |

### Physics / board (3)

| File | Slot | Trigger | Status | Priority |
|------|------|---------|--------|----------|
| `gravity.mp3` | `gravity` | Letters falling into cleared spaces | **Live** | **P0** |
| `board_shuffle.mp3` | `boardShuffle` | Smart Shuffle booster activation | Dormant | P1 |
| `board_stuck.mp3` | `boardStuck` | Dead-end detection banner | Dormant | P1 |

### Boosters (7)

| File | Slot | Trigger | Status | Priority |
|------|------|---------|--------|----------|
| `booster_wildcard.mp3` | `boosterWildcard` | Wildcard booster activated | Dormant | P1 |
| `booster_spotlight.mp3` | `boosterSpotlight` | Spotlight booster activated | Dormant | P1 |
| `booster_shuffle.mp3` | `boosterShuffle` | Smart Shuffle booster activated | Dormant | P1 |
| `hint_used.mp3` | `hintUsed` | Hint activated | **Live** | **P0** |
| `undo_used.mp3` | `undoUsed` | Undo activated | **Live** | **P0** |
| `booster_combo.mp3` | `boosterCombo` | Eagle Eye / Lucky Roll / Power Surge activation | **Live** | **P0** |
| `booster_combo_mega.mp3` | `boosterComboMega` | Combo still active after 3rd word | Dormant | P1 |

### Puzzle completion & stars (5)

| File | Slot | Trigger | Status | Priority |
|------|------|---------|--------|----------|
| `puzzle_complete.mp3` | `puzzleComplete` | Victory screen entrance | **Live** | **P0** |
| `puzzle_complete_perfect.mp3` | `puzzleCompletePerfect` | Flawless completion (dedicated variant) | Dormant | P1 |
| `star_earn.mp3` | `starEarn` | Per-star reveal (staggered 140/340/560 ms) | **Live** | **P0** |
| `bonus_countdown_tick.mp3` | `bonusCountdownTick` | Coin-tally tick during post-puzzle bonus | Dormant | P1 |
| `bonus_countdown_end.mp3` | `bonusCountdownEnd` | Final total reveal after tally | Dormant | P1 |

### Failure states (3)

| File | Slot | Trigger | Status | Priority |
|------|------|---------|--------|----------|
| `puzzle_fail_stuck.mp3` | `puzzleFailStuck` | Unwinnable board state | Dormant | P1 |
| `puzzle_fail_time.mp3` | `puzzleFailTime` | Time Pressure timeout | Dormant | P1 |
| `puzzle_fail_instant.mp3` | `puzzleFailInstant` | Perfect-Solve mode violation | Dormant | P1 |

### Timer warnings (2)

| File | Slot | Trigger | Status | Priority |
|------|------|---------|--------|----------|
| `timer_warning_30s.mp3` | `timerWarning30s` | 30s remaining in Time Pressure | Dormant | P1 |
| `timer_warning_10s.mp3` | `timerWarning10s` | 10s remaining — more urgent | Dormant | P1 |

### Ceremony fanfares — tiered (6)

These tiered slots map to ~19 distinct ceremony types via weight/importance.

| File | Slot | Weight / example ceremonies | Status | Priority |
|------|------|-----------------------------|--------|----------|
| `fanfare_minor.mp3` | `fanfareMinor` | quest_step_complete, first_rare_tile | Dormant | P1 |
| `fanfare_medium.mp3` | `fanfareMedium` | level_up, streak_milestone | Dormant | P1 |
| `fanfare_major.mp3` | `fanfareMajor` | mode_unlock, first_win, first_booster | Dormant | P1 |
| `fanfare_epic.mp3` | `fanfareEpic` | feature_unlock, wing_complete, collection_complete | Dormant | P1 |
| `fanfare_legendary.mp3` | `fanfareLegendary` | prestige, perfect_milestone | Dormant | P1 |
| `fanfare_jackpot.mp3` | `fanfareJackpot` | mystery_wheel_jackpot | Dormant | P1 |

### Option A dopamine layer (3)

| File | Slot | Trigger | Status | Priority |
|------|------|---------|--------|----------|
| `last_word.mp3` | `lastWord` | `remainingWords` transitions 2 → 1 | **Live** | **P0** |
| `flawless_badge.mp3` | `flawlessBadge` | Inline FLAWLESS pill reveals on victory screen | **Live** | **P0** |
| `flawless_milestone.mp3` | `flawlessMilestone` | Full-screen streak ceremony at 3/5/7/10/15/20 | **Live** | **P0** |

### Economy pings (7)

| File | Slot | Trigger | Status | Priority |
|------|------|---------|--------|----------|
| `coin_small.mp3` | `coinSmall` | < 100 coins earned | Dormant | P2 |
| `coin_medium.mp3` | `coinMedium` | 100–500 coins | Dormant | P2 |
| `coin_large.mp3` | `coinLarge` | 500+ coins (big reward) | Dormant | P1 |
| `gem_earned.mp3` | `gemEarned` | Any gem earned (rare currency) | Dormant | P1 |
| `hint_token_earned.mp3` | `hintTokenEarned` | Hint added to inventory | Dormant | P2 |
| `booster_token_earned.mp3` | `boosterTokenEarned` | Booster added to inventory | Dormant | P2 |
| `life_refilled.mp3` | `lifeRefilled` | Life restored | Dormant | P2 |

### Shop & IAP (4)

| File | Slot | Trigger | Status | Priority |
|------|------|---------|--------|----------|
| `shop_open.mp3` | `shopOpen` | Shop screen entered | Dormant | P2 |
| `purchase_success.mp3` | `purchaseSuccess` | IAP transaction success | Dormant | P1 |
| `purchase_fail.mp3` | `purchaseFail` | IAP failed / cancelled | Dormant | P2 |
| `high_value_unlock.mp3` | `highValueUnlock` | $9.99+ purchase reveal | Dormant | P1 |

### Piggy bank (3)

| File | Slot | Trigger | Status | Priority |
|------|------|---------|--------|----------|
| `piggy_fill.mp3` | `piggyFill` | Coin added to piggy on puzzle complete | Dormant | P2 |
| `piggy_ready.mp3` | `piggyReady` | Piggy full / ready-to-break notification | Dormant | P2 |
| `piggy_break.mp3` | `piggyBreak` | Smash ceremony (Royal Match signature moment) | Dormant | P1 |

### Mystery wheel (3)

| File | Slot | Trigger | Status | Priority |
|------|------|---------|--------|----------|
| `wheel_spin.mp3` | `wheelSpin` | Wheel starts spinning | Dormant | P1 |
| `wheel_tick.mp3` | `wheelTick` | Each segment passing pointer (loopable) | Dormant | P1 |
| `wheel_stop.mp3` | `wheelStop` | Final stop on segment | Dormant | P1 |

### Progression pings (4)

| File | Slot | Trigger | Status | Priority |
|------|------|---------|--------|----------|
| `xp_gain.mp3` | `xpGain` | Season-pass XP added (subtle) | Dormant | P2 |
| `tier_unlock.mp3` | `tierUnlock` | Season-pass tier crossed | Dormant | P1 |
| `login_claim.mp3` | `loginClaim` | Login-calendar daily reward claimed | Dormant | P2 |
| `chapter_complete.mp3` | `chapterComplete` | Last puzzle in chapter cleared | Dormant | P1 |

### Social & club (6)

| File | Slot | Trigger | Status | Priority |
|------|------|---------|--------|----------|
| `gift_received.mp3` | `giftReceived` | Gift appears in inbox | Dormant | P2 |
| `gift_sent.mp3` | `giftSent` | Send-gift success | Dormant | P2 |
| `club_goal_progress.mp3` | `clubGoalProgress` | Player contribution to club goal | Dormant | P2 |
| `club_goal_complete.mp3` | `clubGoalComplete` | Club goal reached | Dormant | P2 |
| `friend_beat_score.mp3` | `friendBeatScore` | Push — friend overtook your score | Dormant | P2 |
| `referral_success.mp3` | `referralSuccess` | Referred friend completed first puzzle | Dormant | P2 |

### Offers & urgency (3)

| File | Slot | Trigger | Status | Priority |
|------|------|---------|--------|----------|
| `offer_appear.mp3` | `offerAppear` | Contextual offer banner slides in | Dormant | P2 |
| `offer_tick.mp3` | `offerTick` | Offer countdown final 10s | Dormant | P2 |
| `notification_banner.mp3` | `notificationBanner` | In-app toast / push | Dormant | P2 |

### Tutorial / FTUE (3)

| File | Slot | Trigger | Status | Priority |
|------|------|---------|--------|----------|
| `tutorial_appear.mp3` | `tutorialAppear` | Tutorial overlay fades in | Dormant | P2 |
| `tutorial_advance.mp3` | `tutorialAdvance` | Tutorial step advance | Dormant | P2 |
| `ftue_first_win.mp3` | `ftueFirstWin` | First-ever puzzle solved | Dormant | P1 |

---

## BGM — 10 tracks

| File | Slot | Usage | Status | Priority |
|------|------|-------|--------|----------|
| `bgm_menu.mp3` | `menu` | Home, menus | **Live** | **P0** |
| `bgm_gameplay.mp3` | `gameplay` | Standard gameplay | **Live** | **P0** |
| `bgm_gameplay_alt.mp3` | `gameplayAlt` | Alternate gameplay (rotation for fatigue) | Dormant | P2 |
| `bgm_tense.mp3` | `tense` | Time Pressure + last-word crossfade | **Live** | **P0** |
| `bgm_relax.mp3` | `relax` | Relax mode | **Live** | **P0** |
| `bgm_victory.mp3` | `victory` | Post-puzzle win (NOT looped) | **Live** | **P0** |
| `bgm_defeat.mp3` | `defeat` | Post-puzzle loss / stuck | Dormant | P2 |
| `bgm_shop.mp3` | `shop` | Shop, Piggy-bank, IAP flows | Dormant | P2 |
| `bgm_social.mp3` | `social` | Club / Friends / Leaderboard | Dormant | P2 |
| `bgm_event.mp3` | `event` | Season pass, limited-time events | Dormant | P2 |

---

## P0 checklist (the 18 ship-blockers)

Commission these before Google Play launch. Everything else can ship post-launch without hurting core game feel.

**SFX (13):** `tap`, `button_press`, `word_found`, `combo`, `gravity`, `hint_used`, `undo_used`, `booster_combo`, `star_earn`, `puzzle_complete`, `last_word`, `flawless_badge`, `flawless_milestone`.

**BGM (5):** `bgm_menu`, `bgm_gameplay`, `bgm_tense`, `bgm_relax`, `bgm_victory`.

Budget: **~$1,500–$4,000 mid-tier; ~$200–$500 royalty-free curated.**

## P1 checklist (the 32 strong-polish additions)

Add in the first post-launch update (or commission in round 2 with P0). These move the game from "indie polish" to "top-tier F2P perceived quality."

`word_found_rare`, `board_shuffle`, `board_stuck`, `booster_wildcard`, `booster_spotlight`, `booster_shuffle`, `booster_combo_mega`, `puzzle_complete_perfect`, `bonus_countdown_tick`, `bonus_countdown_end`, `puzzle_fail_stuck`, `puzzle_fail_time`, `puzzle_fail_instant`, `timer_warning_30s`, `timer_warning_10s`, `fanfare_minor`, `fanfare_medium`, `fanfare_major`, `fanfare_epic`, `fanfare_legendary`, `fanfare_jackpot`, `coin_large`, `gem_earned`, `purchase_success`, `high_value_unlock`, `piggy_break`, `wheel_spin`, `wheel_tick`, `wheel_stop`, `tier_unlock`, `chapter_complete`, `ftue_first_win`.

Note: 6 of these are the fanfare tiers, which are close cousins and commissioning them as a set is the usual approach.

Budget: **~$2,500–$7,000 additional.**

## P2 checklist (32 optional polish)

Ship opportunistically during live-ops (monthly drops, seasonal content rotations). Each one adds a small increment of polish; none of them individually moves a retention or monetization KPI.

See the per-domain tables above for the full list of P2 slots.

Budget: **~$3,000–$8,000 over 6–12 months post-launch.**

---

## Do NOT commission these

Older drafts referenced these filenames, but **they have no slot in the code and the runtime ignores them:**

- `chain-bonus.mp3` / `chain_bonus.mp3` — mechanic ripped Apr 2026
- Any hyphenated filenames — the code uses underscores exclusively
- `wheel-spin.mp3`, `wheel-result.mp3`, `level-up.mp3`, `collection-complete.mp3`, `achievement-unlock.mp3`, `feature-unlock.mp3`, `streak-milestone.mp3`, `ceremony-fanfare.mp3`, `booster-used.mp3` — use the underscored equivalents from the tables above instead

---

## Format requirements

- **Format:** MP3, 192 kbps CBR
- **Sample rate:** 44.1 kHz
- **Channels:** mono (no stereo — mobile speakers don't benefit)
- **Loudness:** -14 LUFS short-term, peak -1 dBTP
- **Loop points:** pre-baked seamless for the 8 looping BGM tracks (all except victory + defeat)
- **Filenames:** exactly as specified above, case-sensitive, underscores not hyphens
- **Size budgets:** SFX under 100 KB each; BGM under 2 MB each
- **Total payload target:** ~18–25 MB for all 82 files combined

---

## Budget reference (April 2026 rates)

- **P0 only (18 files):** $1,500–$4,000 mid-tier; $200–$500 curated royalty-free for soft launch
- **P0 + P1 (44 files):** $4,000–$11,000 mid-tier — matches top-tier F2P polish
- **Full coverage (82 files):** $6,600–$18,800 mid-tier; $14,000–$36,000 premium named composer
