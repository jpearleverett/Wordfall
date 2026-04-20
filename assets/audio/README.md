# Wordfall Audio Assets — Full Drop-In Manifest

**72 SFX + 10 BGM = 82 files.** Every slot is wired in `src/services/sound.ts` with a synth fallback, so the game is fully playable today on pure synth. Drop real MP3s in progressively — each one starts playing on the next reload.

Two possible states per slot:
- **Live** — trigger site exists in code; dropping the file in makes it play immediately.
- **Dormant** — slot is ready to load, but no trigger site calls it yet. The file will bundle cleanly and the runtime will cache it; wiring the trigger is a small follow-up PR per slot.

See `agent_docs/audio_brief.md` for the composer-facing brief (tone, length, inspiration per sound).

---

## How to drop files in

1. Drop the MP3 into this directory using the canonical filename from the tables below.
2. Open `src/services/sound.ts`. In `REAL_SOUND_FILES` or `REAL_MUSIC_FILES`, change `tap: null` (or whichever slot) to `tap: require('../../assets/audio/tap.mp3')`.
3. Press `r` in Metro to reload. No APK rebuild required — JS-only change.

**Partial delivery is fully supported.** Every `null` slot keeps playing the synth fallback, so the game never breaks while you wait for more files.

---

## SFX — 72 files (underscores, case-sensitive)

### Core taps & selection (6)

| File | Slot | Trigger | Status |
|------|------|---------|--------|
| `tap.mp3` | `tap` | Every letter cell tap | **Live** |
| `tap_rare.mp3` | `tapRare` | Tap lands on a rare / wildcard tile | Dormant |
| `button_press.mp3` | `buttonPress` | Any UI button | **Live** |
| `back_button.mp3` | `backButton` | Back / close button | Dormant |
| `toggle_on.mp3` | `toggleOn` | Settings toggle on | Dormant |
| `toggle_off.mp3` | `toggleOff` | Settings toggle off | Dormant |

### Word events (4)

| File | Slot | Trigger | Status |
|------|------|---------|--------|
| `word_found.mp3` | `wordFound` | Traced path matches a list word (<7 letters) | **Live** |
| `combo.mp3` | `combo` | 7+ letter "big word" sting | **Live** |
| `word_found_rare.mp3` | `wordFoundRare` | Word contained a rare/wildcard tile | Dormant |
| `word_invalid.mp3` | `wordInvalid` | Rare edge case; mostly synth fallback covers | **Live** (rarely fires) |

### Physics / board (3)

| File | Slot | Trigger | Status |
|------|------|---------|--------|
| `gravity.mp3` | `gravity` | Letters falling into cleared spaces | **Live** |
| `board_shuffle.mp3` | `boardShuffle` | Smart Shuffle booster activation | Dormant |
| `board_stuck.mp3` | `boardStuck` | Dead-end detection banner | Dormant |

### Boosters (7)

| File | Slot | Trigger | Status |
|------|------|---------|--------|
| `booster_wildcard.mp3` | `boosterWildcard` | Wildcard booster activated | Dormant |
| `booster_spotlight.mp3` | `boosterSpotlight` | Spotlight booster activated | Dormant |
| `booster_shuffle.mp3` | `boosterShuffle` | Smart Shuffle booster activated | Dormant |
| `hint_used.mp3` | `hintUsed` | Hint activated | **Live** |
| `undo_used.mp3` | `undoUsed` | Undo activated | **Live** |
| `booster_combo.mp3` | `boosterCombo` | Eagle Eye / Lucky Roll / Power Surge activation | **Live** |
| `booster_combo_mega.mp3` | `boosterComboMega` | Combo still active after 3rd word | Dormant |

### Puzzle completion & stars (5)

| File | Slot | Trigger | Status |
|------|------|---------|--------|
| `puzzle_complete.mp3` | `puzzleComplete` | Victory screen entrance | **Live** |
| `puzzle_complete_perfect.mp3` | `puzzleCompletePerfect` | Flawless completion (dedicated variant) | Dormant |
| `star_earn.mp3` | `starEarn` | Per-star reveal (staggered 140/340/560 ms) | **Live** |
| `bonus_countdown_tick.mp3` | `bonusCountdownTick` | Coin-tally tick during post-puzzle bonus | Dormant |
| `bonus_countdown_end.mp3` | `bonusCountdownEnd` | Final total reveal after tally | Dormant |

### Failure states (3)

| File | Slot | Trigger | Status |
|------|------|---------|--------|
| `puzzle_fail_stuck.mp3` | `puzzleFailStuck` | Unwinnable board state | Dormant |
| `puzzle_fail_time.mp3` | `puzzleFailTime` | Time Pressure timeout | Dormant |
| `puzzle_fail_instant.mp3` | `puzzleFailInstant` | Perfect-Solve mode violation | Dormant |

### Timer warnings (2)

| File | Slot | Trigger | Status |
|------|------|---------|--------|
| `timer_warning_30s.mp3` | `timerWarning30s` | 30s remaining in Time Pressure | Dormant |
| `timer_warning_10s.mp3` | `timerWarning10s` | 10s remaining — more urgent | Dormant |

### Ceremony fanfares — tiered (6)

These tiered slots map to ~19 distinct ceremony types via weight/importance. See the ceremony-to-fanfare mapping in `agent_docs/audio_brief.md`.

| File | Slot | Weight / example ceremonies | Status |
|------|------|-----------------------------|--------|
| `fanfare_minor.mp3` | `fanfareMinor` | quest_step_complete, first_rare_tile | Dormant |
| `fanfare_medium.mp3` | `fanfareMedium` | level_up, streak_milestone | Dormant |
| `fanfare_major.mp3` | `fanfareMajor` | mode_unlock, first_win, first_booster | Dormant |
| `fanfare_epic.mp3` | `fanfareEpic` | feature_unlock, wing_complete, collection_complete | Dormant |
| `fanfare_legendary.mp3` | `fanfareLegendary` | prestige, perfect_milestone | Dormant |
| `fanfare_jackpot.mp3` | `fanfareJackpot` | mystery_wheel_jackpot | Dormant |

### Option A dopamine layer (3)

| File | Slot | Trigger | Status |
|------|------|---------|--------|
| `last_word.mp3` | `lastWord` | `remainingWords` transitions 2 → 1 | **Live** |
| `flawless_badge.mp3` | `flawlessBadge` | Inline FLAWLESS pill reveals on victory screen | **Live** |
| `flawless_milestone.mp3` | `flawlessMilestone` | Full-screen streak ceremony at 3/5/7/10/15/20 | **Live** |

### Economy pings (7)

| File | Slot | Trigger | Status |
|------|------|---------|--------|
| `coin_small.mp3` | `coinSmall` | < 100 coins earned | Dormant |
| `coin_medium.mp3` | `coinMedium` | 100–500 coins | Dormant |
| `coin_large.mp3` | `coinLarge` | 500+ coins | Dormant |
| `gem_earned.mp3` | `gemEarned` | Any gem earned | Dormant |
| `hint_token_earned.mp3` | `hintTokenEarned` | Hint added to inventory | Dormant |
| `booster_token_earned.mp3` | `boosterTokenEarned` | Booster added to inventory | Dormant |
| `life_refilled.mp3` | `lifeRefilled` | Life restored | Dormant |

### Shop & IAP (4)

| File | Slot | Trigger | Status |
|------|------|---------|--------|
| `shop_open.mp3` | `shopOpen` | Shop screen entered | Dormant |
| `purchase_success.mp3` | `purchaseSuccess` | IAP transaction success | Dormant |
| `purchase_fail.mp3` | `purchaseFail` | IAP failed / cancelled | Dormant |
| `high_value_unlock.mp3` | `highValueUnlock` | $9.99+ purchase reveal | Dormant |

### Piggy bank (3)

| File | Slot | Trigger | Status |
|------|------|---------|--------|
| `piggy_fill.mp3` | `piggyFill` | Coin added to piggy on puzzle complete | Dormant |
| `piggy_ready.mp3` | `piggyReady` | Piggy full / ready-to-break notification | Dormant |
| `piggy_break.mp3` | `piggyBreak` | Smash ceremony | Dormant |

### Mystery wheel (3)

| File | Slot | Trigger | Status |
|------|------|---------|--------|
| `wheel_spin.mp3` | `wheelSpin` | Wheel starts spinning | Dormant |
| `wheel_tick.mp3` | `wheelTick` | Each segment passing pointer (loopable) | Dormant |
| `wheel_stop.mp3` | `wheelStop` | Final stop on segment | Dormant |

### Progression pings (4)

| File | Slot | Trigger | Status |
|------|------|---------|--------|
| `xp_gain.mp3` | `xpGain` | Season-pass XP added (subtle) | Dormant |
| `tier_unlock.mp3` | `tierUnlock` | Season-pass tier crossed | Dormant |
| `login_claim.mp3` | `loginClaim` | Login-calendar daily reward claimed | Dormant |
| `chapter_complete.mp3` | `chapterComplete` | Last puzzle in chapter cleared | Dormant |

### Social & club (6)

| File | Slot | Trigger | Status |
|------|------|---------|--------|
| `gift_received.mp3` | `giftReceived` | Gift appears in inbox | Dormant |
| `gift_sent.mp3` | `giftSent` | Send-gift success | Dormant |
| `club_goal_progress.mp3` | `clubGoalProgress` | Player contribution to club goal | Dormant |
| `club_goal_complete.mp3` | `clubGoalComplete` | Club goal reached | Dormant |
| `friend_beat_score.mp3` | `friendBeatScore` | Push — friend overtook your score | Dormant |
| `referral_success.mp3` | `referralSuccess` | Referred friend completed first puzzle | Dormant |

### Offers & urgency (3)

| File | Slot | Trigger | Status |
|------|------|---------|--------|
| `offer_appear.mp3` | `offerAppear` | Contextual offer banner slides in | Dormant |
| `offer_tick.mp3` | `offerTick` | Offer countdown final 10s | Dormant |
| `notification_banner.mp3` | `notificationBanner` | In-app toast / push | Dormant |

### Tutorial / FTUE (3)

| File | Slot | Trigger | Status |
|------|------|---------|--------|
| `tutorial_appear.mp3` | `tutorialAppear` | Tutorial overlay fades in | Dormant |
| `tutorial_advance.mp3` | `tutorialAdvance` | Tutorial step advance | Dormant |
| `ftue_first_win.mp3` | `ftueFirstWin` | First-ever puzzle solved | Dormant |

---

## BGM — 10 tracks

| File | Slot | Usage | Status |
|------|------|-------|--------|
| `bgm_menu.mp3` | `menu` | Home, menus | **Live** |
| `bgm_gameplay.mp3` | `gameplay` | Standard gameplay | **Live** |
| `bgm_gameplay_alt.mp3` | `gameplayAlt` | Alternate gameplay (rotation for fatigue) | Dormant |
| `bgm_tense.mp3` | `tense` | Time Pressure + last-word crossfade | **Live** |
| `bgm_relax.mp3` | `relax` | Relax mode | **Live** |
| `bgm_victory.mp3` | `victory` | Post-puzzle win (NOT looped) | **Live** |
| `bgm_defeat.mp3` | `defeat` | Post-puzzle loss / stuck | Dormant |
| `bgm_shop.mp3` | `shop` | Shop, Piggy-bank, IAP flows | Dormant |
| `bgm_social.mp3` | `social` | Club / Friends / Leaderboard | Dormant |
| `bgm_event.mp3` | `event` | Season pass, limited-time events | Dormant |

---

## Priority shipping plan

Commission in waves if budget requires staging:

- **Wave 1 (must-ship for launch, ~22 files):** all **Live** slots above — tap, buttonPress, wordFound, combo, gravity, hintUsed, undoUsed, boosterCombo, starEarn, puzzleComplete, lastWord, flawlessBadge, flawlessMilestone, wordInvalid, plus all 5 Live BGM tracks (menu, gameplay, tense, relax, victory).
- **Wave 2 (high polish, ~20 files):** the 6 ceremony fanfare tiers, failure states (3), timer warnings (2), per-booster variants (3), puzzle_complete_perfect, piggy_break, purchase_success, high_value_unlock, and gameplay_alt BGM.
- **Wave 3 (completeness, ~23 files):** everything else — tutorial, toggles, economy pings, wheel, social, offers, defeat/shop/social/event BGM.

Ship Wave 1 before Google Play launch. Waves 2–3 can land in post-launch updates.

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

## Do NOT commission these

Older drafts referenced these filenames, but **they have no slot in the code and the runtime ignores them:**

- `chain-bonus.mp3` / `chain_bonus.mp3` — mechanic ripped Apr 2026
- Any hyphenated filenames — the code uses underscores exclusively
- `wheel-spin.mp3`, `wheel-result.mp3`, `level-up.mp3`, `collection-complete.mp3`, `achievement-unlock.mp3`, `feature-unlock.mp3`, `streak-milestone.mp3`, `ceremony-fanfare.mp3`, `booster-used.mp3` — use the underscored equivalents from the tables above instead

---

## Budget reference (April 2026 rates)

- **SFX:** $50–$150 × 72 = $3,600–$10,800
- **BGM short loop:** $300–$800 × 10 = $3,000–$8,000
- **Realistic mid-tier total:** $6,600–$18,800 for full 82-file coverage
- **Wave-1-only (launch essentials, ~22 files):** ~$2,000–$5,000
- **Budget-tier alternative:** royalty-free libraries (Pixabay, Freesound, Kenney.nl) + light editing for Wave 1 at <$500, a weekend of curation. Good enough for soft launch; re-commission if KPIs justify it.
