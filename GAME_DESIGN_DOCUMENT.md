# Wordfall — Game Design Document

---

## 1. Executive Summary

Wordfall is a gravity-based strategic word puzzle game for mobile. Unlike traditional word searches or swipe-letter games, Wordfall's core mechanic introduces a physics layer — when a word is cleared, its letters vanish and all letters above collapse downward, reshaping the board. This makes *the order of word selection* the central strategic element, transforming a simple find-the-word exercise into a multi-step planning puzzle with cascading consequences.

**Product vision:** A premium-feel F2P puzzle game that rewards intelligence over speed, planning over reflexes, and mastery over luck. The game targets the large, proven casual-puzzle audience (ages 25–55, skewing female) while offering enough strategic depth to retain core puzzle enthusiasts.

**Key differentiators:**
- Order-of-operations strategy creates a unique "chess-meets-Tetris" decision space
- Every move visibly transforms the board, creating satisfying chain reactions
- Difficulty scales naturally through gravity-dependency depth, not through obscure vocabulary
- The mechanic is immediately understandable but takes real mastery to optimize

**Commercial strategy:** Ethical F2P with hint/undo consumables, a premium pass for engaged players, and cosmetic personalization. No frustration traps, no impossible boards, no artificial energy walls on core play.

---

## 2. Why This Core Mechanic Is Strong

### Psychological Strengths

**Strategic ordering creates genuine problem-solving.** In a standard word search, finding a word is the whole challenge. In Wordfall, finding is only step one — the player must then decide *when* to remove it. This elevates the game from pattern recognition to strategic planning, engaging higher-order cognition and producing deeper satisfaction upon success.

**Gravity creates visible consequences.** When letters fall, the player sees the direct result of their decision. This tight action-to-consequence loop is one of the strongest engagement drivers in game design (the same principle that makes Tetris, 2048, and Candy Crush compelling). The board physically transforms in response to player choices, creating a sense of agency and impact.

**Recoverable vs. irreversible mistakes generate productive tension.** Some moves are safe — they don't affect other words. Other moves are risky — they might break a word that was available. This creates a natural difficulty gradient within each puzzle: early moves feel exploratory, late moves feel consequential. The player oscillates between confidence ("I can take that word safely") and uncertainty ("if I clear this row, will the word below break?").

**Chain reactions create "aha" moments.** When removing one word causes letters to fall and reveal or enable another word, the player experiences a planning payoff. These chain moments are emotionally equivalent to a "combo" in action games — bursts of dopamine from successful multi-step thinking.

**The board tells a visual story.** Before and after states are dramatically different. The player can visually compare the grid pre- and post-move, reinforcing the sense that their decision mattered. This visible transformation is absent in crosswords, static word searches, or anagram games.

### Comparison to Other Word Games

| Feature | Word Search | Crossword | Swipe Game | **Wordfall** |
|---------|------------|-----------|------------|-------------|
| Planning depth | None | Low (per-clue) | None | **High (multi-move)** |
| Board changes | No | No | Partial refill | **Full gravity cascade** |
| Order matters | No | Slightly | No | **Central mechanic** |
| Visible consequences | None | None | Minimal | **Dramatic** |
| Replayability | Low | Low | Medium | **High** |
| Skill ceiling | Low | Medium | Low | **High** |

### Core Emotional Beats

1. **Discovery** — "Oh, I see CRANE in row 3!" — the initial scan-and-find satisfaction
2. **Anticipation** — "If I remove CRANE first, those letters will fall and... yes, BOLD will appear" — forward-planning excitement
3. **Calculation** — "I need to remove the top-right word before the bottom-left, or the O drops out of position" — focused strategic thinking
4. **Risk** — "I'm not sure this is the right order, but I'll commit" — productive uncertainty
5. **Relief** — "It worked! The letters fell exactly where I needed them" — tension release
6. **Mastery** — "I solved it in the minimum moves with no hints" — skill validation
7. **Completion** — "Board cleared!" — clean-slate satisfaction, the puzzle equivalent of inbox zero

---

## 3. Core Loop Redesign

### The Three Loops

**10-Second Understanding Loop:**
See grid → scan for a target word → tap letters to select → word highlights green → letters vanish → gravity drops → board transforms. The player immediately grasps: "I find words, they disappear, things fall."

**60-Second Puzzle Engagement Loop:**
Scan available words → assess which are safe to remove → choose one → execute and observe gravity → reassess the board → repeat. Each word removal takes ~10-15 seconds (scan + decide + tap), so a 4-5 word puzzle fills ~60 seconds of engaged play.

**5-Minute "One More Puzzle" Loop:**
Complete puzzle → see star rating → see score and combo stats → see progress toward next chapter/collection milestone → "Next Level" button is prominent → new puzzle loads in <1 second → player is already scanning. The friction between puzzles must be near zero.

### Mechanic Feel Recommendations

**Grid readability:** High-contrast dark background with clean white/light letters. Each cell has generous padding. Cells are at least 44pt touch targets. No overlapping decorations that reduce letter legibility.

**Word selection feedback:**
- First tap: cell pulses with cyan highlight, subtle haptic
- Subsequent taps: cells light up sequentially with a numbered badge showing order
- Invalid direction tap: brief red flash, selection resets
- Valid word match: all selected cells turn green simultaneously, the word text above the grid glows

**Gravity animation timing:** 300ms ease-out drop. Letters should feel like they have weight — not instant, not floaty. A slight bounce at landing (50ms overshoot) adds physicality. Stagger column animations by 30ms so it feels like a cascade, not a simultaneous jump.

**Board collapse clarity:** After gravity, briefly (200ms) highlight any cells that moved with a subtle trail or glow, so the player can see exactly what shifted. This is critical for the player to learn how gravity works.

**Chain celebration:** When removing a word causes another target word to become newly available (it wasn't present before but now it is due to gravity), show a brief "CHAIN!" indicator and pulse the newly available word in the word bank.

### Design Decisions

**Word patterns:** Straight lines only (horizontal and vertical). Diagonal and free-form selection would dilute the gravity mechanic — gravity only affects vertical position, so horizontal words are stable and vertical words shift. This creates a natural asymmetry that rewards understanding the physics.

**Show full word list upfront:** Yes. The strategic element is about ordering, not about guessing what words exist. Hiding the list would make the game feel like a standard word search. Showing all targets lets the player plan.

**Certainty vs. experimentation:** Easy puzzles should feel like confident execution — the player can see the right order. Hard puzzles should require experimentation and risk-taking — the player must try an order and see if it works, potentially needing to undo.

**Preview consequences:** Do NOT show automatic previews. Gravity prediction should be a skill the player develops. However, a premium "Board Preview" booster (see Section 6) can show the post-gravity state as an assist tool.

---

## 4. Board Generation and Solvability Framework

### Board Configurations by Difficulty

| Parameter | Easy | Medium | Hard | Expert |
|-----------|------|--------|------|--------|
| Grid size | 5×6 (cols×rows) | 6×7 | 7×8 | 7×9 |
| Word count | 3 | 5 | 6 | 8 |
| Word length | 3–4 letters | 3–5 | 3–6 | 4–6 |
| Valid orderings | Many (>10) | Several (4–10) | Few (2–5) | Minimal (1–3) |
| Gravity dependency | Low | Medium | High | Very high |
| Foresight required | 1 move | 1–2 moves | 2–3 moves | 3+ moves |
| Recoverable errors | Most | Several | Few | Almost none |
| First move clarity | Obvious | Clear | Ambiguous | Requires analysis |

### Generation Algorithm

1. **Word selection:** Choose N words from the curated dictionary, favoring variety in starting letters and avoiding substring relationships.
2. **Placement:** Place words in the grid one at a time, trying random positions and directions (horizontal/vertical). Overlapping positions must have matching letters.
3. **Fill:** Populate remaining cells with random letters, biased toward consonants (65%) to reduce accidental word formation.
4. **Validation:** Run the recursive backtracking solver to confirm at least one valid ordering exists.
5. **Difficulty rating:** Count valid orderings and measure gravity dependency depth. If the puzzle doesn't match the target difficulty, retry.
6. **Fallback:** After 50 failed attempts, reduce word count by 1 and retry. This ensures generation never stalls.

### Difficulty Knobs

- **Gravity dependency depth:** How many words' positions change due to gravity from earlier removals. Higher = harder.
- **Branching factor:** How many words are available to remove at each step. Lower = more constrained = harder.
- **Hidden setup:** Words that only become visible/available after specific earlier words are removed. More hidden words = harder.
- **Tolerance for dead-ends:** Easy puzzles have many valid orderings (most orders work). Expert puzzles have few (wrong order = stuck).
- **Ambiguity in first move:** Easy puzzles have an obvious safe first word. Expert puzzles require analysis before the first move.

### Solvability Validation

Every puzzle shipped must pass:

1. **Solvable:** The solver finds at least one valid ordering where all words can be found and removed.
2. **No misleading boards:** If a word appears in multiple locations, at least one location leads to a solvable state.
3. **Difficulty-appropriate:** The solution count matches the target difficulty band.
4. **No trivial puzzles:** At least one word's availability is affected by gravity from another word's removal.
5. **Quality score:** Computed from (gravity_interactions × word_variety × solution_count_fit). Puzzles below threshold are rejected.

---

## 5. Puzzle Modes

### Classic Mode
- **Description:** Solve all listed words. The core experience.
- **Target audience:** All players. Entry point.
- **Retention role:** Primary engagement driver. Every session starts here.
- **Monetization:** Hints/undos consumed here drive purchases.
- **Psychology:** Completion motivation, steady progress, mastery development.
- **KPIs:** Session length, puzzles per session, level completion rate.

### Limited Moves Mode
- **Description:** Complete the puzzle in N moves (exactly the word count — no mistakes allowed).
- **Target audience:** Skilled players seeking challenge.
- **Retention role:** Provides aspiration goal. "Can I do it perfectly?"
- **Monetization:** Extra moves purchasable (1 per puzzle).
- **Psychology:** Precision pressure, planning validation.
- **KPIs:** Attempt rate, success rate, retry rate.

### Time Pressure Mode
- **Description:** Standard puzzle with a countdown timer. Bonus points for time remaining.
- **Target audience:** Players who enjoy urgency. Shorter sessions.
- **Retention role:** Quick-hit engagement for time-limited play sessions.
- **Monetization:** Time extensions purchasable.
- **Psychology:** Urgency, speed-vs-accuracy tension, adrenaline.
- **KPIs:** Average completion time, speed improvement over time.

### Perfect Solve Mode
- **Description:** Complete with zero wasted taps, no hints, no undos. Earns a special badge.
- **Target audience:** Completionists and mastery seekers.
- **Retention role:** Replay motivation for already-completed levels.
- **Monetization:** None (pure skill reward).
- **Psychology:** Self-challenge, perfectionism satisfaction.
- **KPIs:** Replay rate, perfect-solve percentage.

### Cascade Mode
- **Description:** Score multiplier increases with each consecutive word found without error. Focus on building combos.
- **Target audience:** Score-chasers.
- **Retention role:** Leaderboard competition driver.
- **Monetization:** Entry tickets for competitive cascade events.
- **Psychology:** Flow state, momentum, "don't break the chain."
- **KPIs:** Average combo, max combo, score distribution.

### Daily Challenge
- **Description:** One puzzle per day, same for all players. Seed-based generation from date.
- **Target audience:** All players. Habit anchor.
- **Retention role:** Primary D1/D7 retention driver. Streak system attached.
- **Monetization:** Streak protection items.
- **Psychology:** Routine, social comparison, FOMO (mild, ethical).
- **KPIs:** Daily participation rate, streak length, streak recovery rate.

### Weekly Special
- **Description:** A curated hard puzzle available for 7 days. Themed words. Leaderboard.
- **Target audience:** Engaged mid-core players.
- **Retention role:** Weekly return anchor.
- **Monetization:** Event booster bundles.
- **Psychology:** Special occasion, community event feeling.
- **KPIs:** Weekly participation rate, completion rate.

### Endless Mode
- **Description:** Procedurally generated puzzles at chosen difficulty. No level gating. Play as many as you want.
- **Target audience:** Players who want to relax without progression pressure.
- **Retention role:** Session extender for high-engagement players.
- **Monetization:** Minimal — this is a retention tool, not a revenue driver.
- **Psychology:** Low-pressure flow, no fear of "running out of content."
- **KPIs:** Session length, puzzles per session.

### Expert Mode
- **Description:** Minimal hints available, harder boards, no undo. For skilled players.
- **Target audience:** Top 10% by skill.
- **Retention role:** Aspirational goal, status symbol.
- **Monetization:** None directly — serves retention for high-value engaged users.
- **Psychology:** Mastery validation, elite identity.
- **KPIs:** Completion rate (target: 30–50%), retry rate.

### Relax Mode
- **Description:** No timer, no move limit, unlimited undos, gentle puzzles. Soothing music and visual theme.
- **Target audience:** Casual players, stress relief seekers.
- **Retention role:** Low-friction entry for returning players.
- **Monetization:** Premium relaxation themes (cosmetic).
- **Psychology:** Calm, flow, decompression.
- **KPIs:** Session length, return rate after 3+ day absence.

---

## 6. Hint / Assist / Booster Systems

### Design Philosophy

Hints should help the player *think better*, not *skip thinking*. Every assist should leave the player feeling smarter, not dependent. The best hint is one that teaches strategy for future puzzles.

### Assist Tools

**1. Reveal Word**
- **Function:** Highlights one target word's letters in the grid (shows where it is, not whether to remove it now).
- **When it appears:** Available anytime via the hint button.
- **Earned/Purchased:** 3 free per puzzle. Additional via ads or purchase.
- **Strategy preservation:** High — the player still decides WHEN to remove it.
- **Risk of trivializing:** Low — finding the word was never the core challenge.
- **Monetization role:** Primary hint consumable. Soft conversion driver.

**2. Strategic Hint ("Remove This First")**
- **Function:** The solver runs and identifies a word that, if removed next, keeps the puzzle solvable. Shows the word name with a "safe to remove" indicator.
- **When it appears:** When the player has been idle for 20+ seconds or taps the hint button.
- **Earned/Purchased:** Rarer than Reveal Word. 1 free per puzzle. Additional purchased.
- **Strategy preservation:** Medium — tells the player the optimal next move, but they still must find and select it.
- **Risk of trivializing:** Medium — frequent use removes the planning challenge.
- **Monetization role:** Premium hint tier. Higher-value consumable.

**3. Undo Move**
- **Function:** Reverses the last word removal, restoring the board to its previous state.
- **When it appears:** After any word removal. Button always visible.
- **Earned/Purchased:** 3 free per puzzle. Additional via ads or purchase.
- **Strategy preservation:** High — undo is fundamentally a learning tool. It lets players experiment and recover.
- **Risk of trivializing:** Low — players still must figure out the right order.
- **Best use case:** When a player realizes they've created a dead-end state.
- **Monetization role:** Key consumable, especially for harder puzzles.

**4. Board Preview**
- **Function:** Shows a ghost overlay of what the board will look like after removing the currently selected word (before confirming).
- **When it appears:** As a toggle-able power-up. Active for one puzzle when used.
- **Earned/Purchased:** Purchasable or earned from events.
- **Strategy preservation:** Medium — makes planning easier but doesn't solve the puzzle.
- **Risk of trivializing:** Medium on easy puzzles, low on hard puzzles (still need multi-step planning).
- **Monetization role:** Premium booster. Good for event bundles.

**5. Shuffle Unused Letters**
- **Function:** Randomizes only the non-target filler letters while keeping all target words intact and the puzzle solvable. Useful when the board looks confusing.
- **When it appears:** Optional power-up.
- **Earned/Purchased:** Rare — event rewards or purchased.
- **Strategy preservation:** High — doesn't change the puzzle solution, just the visual noise.
- **Risk of trivializing:** Very low.
- **Monetization role:** Niche — valuable for visual-clarity seekers.

**6. Freeze Column**
- **Function:** Prevents one column from gravity-dropping for one move. Letters in that column stay in place.
- **When it appears:** Activatable before making a move.
- **Earned/Purchased:** Rare — event rewards or purchased.
- **Strategy preservation:** High — creates new strategic possibilities rather than removing decisions.
- **Risk of trivializing:** Low — requires understanding gravity to use effectively.
- **Monetization role:** Advanced booster. Appeals to strategic players.

### Hint Economy Design

- **Free hints regenerate:** 3 Reveal + 3 Undo per puzzle (reset each puzzle). This ensures every puzzle is approachable without spending.
- **Earned hints:** Watching a rewarded ad grants 1 additional hint of either type.
- **Purchased hints:** Bundles of 10/25/50 available. Priced at $0.99/$1.99/$2.99.
- **Progression rewards:** Completing chapters and daily streaks awards hint tokens.
- **Never forced:** The game never requires hints. All puzzles are solvable through skill alone.

---

## 7. Progression and Meta Layer

### Meta Fantasy: "The Word Architect"

The player is restoring a grand library — a vast, beautiful building whose shelves, rooms, and wings have been emptied. Each puzzle solved recovers lost words and restores a section of the library. Chapters are themed wings (Nature Wing, Science Wing, Mythology Wing, etc.), and completing a chapter visually restores that section with bookshelves, reading nooks, and decorative elements.

This fantasy works because:
- It thematically connects to words and language
- It provides visible, accumulating progress (empty shelves → full shelves)
- It creates a home-base the player feels ownership over
- It supports cosmetic customization (furniture styles, lighting, decorations)

### Level Structure

- **Chapters:** Groups of 15–20 puzzles. Each chapter has a theme (word categories lean toward the theme). ~40 chapters at launch.
- **Difficulty ramp:** Within each chapter, difficulty increases gradually. Chapters themselves get harder as the player progresses.
- **Star system:** Each puzzle awards 1–3 stars based on performance (hints used, move efficiency). Stars unlock bonus content.
- **Chapter gates:** To enter a new chapter, the player needs a minimum star count from previous chapters (not 100% — ~60% of maximum). This prevents frustration walls while encouraging replaying for more stars.

### Short / Mid / Long-Term Goals

| Timeframe | Goal | Emotional Driver |
|-----------|------|-----------------|
| Short (1 min) | Solve this puzzle | Completion, mastery |
| Mid (1 week) | Finish this chapter, complete the Nature collection | Progress, theme completion |
| Long (1+ month) | Restore all library wings, reach Level 100, complete seasonal album | Status, completion, identity |

### Milestone Unlocks

- **Every 5 levels:** New library decoration unlock
- **Chapter completion:** New library wing restored + chapter badge + bonus puzzle
- **Star milestones (50/100/250/500):** Special cosmetic frames, titles, and hint packs
- **Perfect solve milestones (10/25/50):** Gold-tier profile badges

### Side Objectives

- **Par challenges:** Solve in N moves or fewer for a bonus star
- **No-hint challenges:** Complete 5 puzzles in a row without hints
- **Theme master:** Find all words in a themed vocabulary set across multiple puzzles
- **Speed runs:** Complete a chapter under a cumulative time target

---

## 8. Collection Systems

### Collection 1: Word Atlas Pages

Players collect illustrated "atlas pages" — each represents a word category (Animals, Weather, Food, Space, Music, etc.). Each page has 8–12 word slots. When a player finds a word during any puzzle that matches a slot, it fills in.

- **How earned:** Organically during gameplay. Any puzzle can contribute to any collection.
- **Set completion:** Completing a page (all words found) awards a decorative item for the library + hint tokens + a special animated page illustration.
- **Duplicates:** Finding a word you already have adds to a "mastery counter" for that word, contributing to a per-word XP bar. Max mastery unlocks a gold border.
- **Why it works:** Creates ambient goals during regular play. Players notice "oh, EAGLE — that's in my Animals page!" and feel bonus satisfaction.

### Collection 2: Rare Letter Tiles

Special golden letter tiles randomly drop when completing puzzles (higher chance on harder difficulties and perfect solves). Each tile is a letter A–Z with a themed design. Collecting full sets (e.g., WORDFALL = W+O+R+D+F+A+L+L) unlocks exclusive cosmetic themes.

- **How earned:** Random drops with pity timer (guaranteed within 10 puzzles).
- **Set completion:** Spelling specific words with collected tiles (PUZZLE, GRAVITY, CASCADE, etc.) unlocks rewards.
- **Duplicates:** Extra tiles can be "recycled" into a wildcard tile (5 duplicates = 1 wildcard).
- **Social exchange:** Club members can gift duplicate tiles to each other (limit: 3 gifts per day).
- **Why it works:** Creates collection excitement, trading social bonds, and a reason to keep playing even after level content is completed.

### Collection 3: Seasonal Stamps

Each season (quarterly) introduces a themed stamp album with 20 stamps. Stamps are earned through seasonal activities: events, daily challenges, special puzzles. The album is available for 90 days.

- **How earned:** Seasonal events, daily challenges, milestone rewards during the season.
- **Set completion:** Completing the album awards an exclusive seasonal badge + premium cosmetic.
- **Partial completion:** Every 5 stamps awards a smaller reward. No penalty for incomplete albums.
- **Why it works:** Creates time-bounded motivation and fresh content cadence.

---

## 9. Daily / Weekly / Seasonal Retention Systems

### Design Principle

Every return system should feel like "I want to come back" not "I'm punished if I miss a day." Rewards escalate for consistency but never punish absence. Comeback mechanics welcome returning players warmly.

### Daily Systems

**Daily Puzzle:** One puzzle per day, same for all players (seed = date). Medium difficulty. Completion awards daily currency + stamp progress. Always available for 24 hours — if missed, it's gone (but no penalty).

**Daily Missions (3 per day):**
- Find 10 words across any mode
- Complete 2 puzzles without hints
- Achieve a 3x combo
Completing all 3 awards a bonus chest with random rewards (hints, tiles, currency).

**Daily Login Gift:** A small reward for opening the app. Escalates over a 7-day cycle (Day 1: 50 coins, Day 7: rare tile + 200 coins). Cycle resets after Day 7 regardless of streaks.

### Streak System (with Forgiveness)

- **Streak counter:** Increments each day the player completes the daily puzzle.
- **Streak rewards:** Every 7 days, a bonus reward tier unlocks. At 30 days, a special cosmetic.
- **Forgiveness:** Missing one day doesn't break the streak — the player gets a "grace day" (1 per streak). Missing 2 consecutive days resets the streak.
- **Streak recovery:** After a streak breaks, the player can purchase a "streak shield" (soft currency, not premium) to restore it. Limited to once per 30 days.

### Weekly Systems

**Weekly Challenge Ladder:** 5 escalating puzzles released on Monday. Each harder than the last. Completing all 5 awards a weekly chest. Leaderboard based on cumulative score.

**Weekend Blitz:** Saturday–Sunday special event with double XP and increased rare tile drop rates.

### Monthly / Seasonal

**Monthly Mastery Track:** 30-tier reward track. Free tier and premium tier (premium pass required). Each daily puzzle completed advances 1 tier. Even without the pass, the free tier provides meaningful rewards.

**Seasonal Album:** See Collection System 3. 90-day collection event with exclusive rewards.

### Comeback Mechanics

- **3-day absence:** Welcome-back gift (hint pack + bonus coins).
- **7-day absence:** "We missed you" screen with a specially curated easy puzzle + welcome-back rewards.
- **30-day absence:** Full reactivation package: free premium hints, a guided re-onboarding puzzle, and double rewards for 3 days.

---

## 10. Social Systems

### Clubs (Teams)

- **Size:** 10–30 members.
- **Weekly club score:** Sum of all members' puzzle scores. Club leaderboard with tier rewards.
- **Club puzzle:** One shared puzzle per day. All members contribute attempts. Best score counts.
- **Chat:** Simple emoji-reaction chat (low-moderation approach). No free-text to minimize toxicity.
- **Why players care:** Belonging, friendly competition, shared identity, reason to play daily even when personal motivation is low.
- **Retention impact:** Club members retain 2–3x better than solo players (industry standard).
- **Moderation:** Auto-kick inactive members after 14 days (configurable by club leaders).

### Async Competition

- **Friend challenges:** Send a puzzle to a friend. They try to beat your score. Turn-based, no time pressure.
- **Weekly rival:** Auto-matched with a player of similar skill. Both play the same 5 puzzles. Higher total score wins.
- **Why it works:** Competition without synchronous play. Fits casual lifestyles.

### Sharing & Creator Systems

- **Smart Solve Replay:** After completing a puzzle, a "share replay" button generates a short animated GIF/video of the solve sequence. Shareable to social media.
- **Daily Streak Card:** Shareable image showing current streak, stars earned, and level reached.
- **Collection Completion Card:** When a collection is completed, a shareable card celebrates it.
- **Leaderboard Snapshots:** Weekly ranking shareable with club name and personal stats.

### Gifting

- **Hint gifts:** Send 1 hint token per day to a friend.
- **Tile exchange:** Trade duplicate rare tiles with club members (3 per day max).
- **Why it works:** Creates reciprocity bonds. Players feel both generous and grateful.

---

## 11. Economy Design

### Currency Overview

| Currency | Source | Sink | Scarcity | Emotional Meaning |
|----------|--------|------|----------|-------------------|
| **Coins** (soft) | Puzzle completion, daily rewards, missions | Hint refills, cosmetic decorations, streak shields | Low — flows freely | "Steady progress" |
| **Gems** (premium) | Purchase, rare achievements, season pass | Premium boosters, exclusive cosmetics, event entries | High — scarce and valuable | "Special occasions" |
| **Hint Tokens** | Free per puzzle, ads, coin purchase, gifts | Reveal Word, Strategic Hint, Undo | Medium — replenish each puzzle but run out on hard content | "Safety net" |
| **Event Stars** | Event participation | Event reward tiers | Time-limited | "Seasonal excitement" |
| **Library Points** | Puzzle completion, star milestones | Library decorations and upgrades | Medium | "Building my space" |

### Pacing Model: Unlimited Play with Soft Gating

**No energy/lives system.** Players can play unlimited puzzles. This is critical for a strategy game — artificial play limits would frustrate planning-oriented players and conflict with the "outsmart the board" fantasy.

**Soft gating via chapter star requirements.** Players need ~60% of maximum stars to unlock the next chapter. This encourages replaying for better scores without hard-blocking.

**Hint scarcity as monetization lever.** Hints are free each puzzle but limited. Hard puzzles may require more hints than the free allotment. This creates natural, non-manipulative purchase motivation.

### Why No Energy System

Energy systems work for games where the core loop is simple and fast (match-3). Wordfall's core loop involves strategic planning — players need time to think. Interrupting this with "you've run out of energy" would destroy the flow state and feel hostile. Instead, monetize through assists (hints/undos) and cosmetics.

---

## 12. Monetization Design

### Offer Catalog

**Starter Pack ($1.99)** — Available first 72 hours after install.
- 500 coins + 50 gems + 10 hint tokens + 1 exclusive decoration
- **Trigger:** After completing level 3 (player understands the game)
- **Why it's fair:** Extreme value for the price. No pressure. Time limit is real but generous.
- **Anti-predatory:** One-time purchase, no recurring pressure.

**Hint Bundle ($0.99–$2.99)** — Always available in the shop.
- 10/25/50 hint tokens at escalating discounts
- **Trigger:** When player runs out of hints on a hard puzzle
- **Why it's fair:** Hints help but don't solve. Player still needs to think.

**Undo Bundle ($0.99–$2.99)** — Always available.
- 10/25/50 undo charges
- **Trigger:** After a dead-end state is detected
- **Why it's fair:** Undo is fundamentally a learning tool. It recovers from mistakes.

**Daily Value Pack ($0.99/day, auto-ends)** — Available after Day 3.
- Daily drip of 100 coins + 5 gems + 3 hint tokens for 7 days
- **Trigger:** At daily login
- **Why it's fair:** Excellent value. Auto-expires — no forgotten subscriptions.

**Chapter Completion Bundle ($2.99)** — Offered when entering a new chapter.
- Theme-specific decoration + 20 gems + 10 hints + 1 Board Preview booster
- **Trigger:** On chapter unlock screen
- **Why it's fair:** Celebrates progress, provides tools for harder content ahead.

**Premium Pass ($4.99/season)** — Available at season start.
- Unlocks premium tier of the monthly mastery track (cosmetics, gems, exclusive decorations)
- **Trigger:** Season start event screen
- **Why it's fair:** All gameplay content is free. Pass only accelerates cosmetic/collectible progress.
- **Anti-predatory:** Free tier is still rewarding. Pass is never required.

**Ad Removal ($4.99, one-time)** — Available in settings.
- Removes all interstitial and banner ads permanently
- Rewarded ads (watch for hints) remain opt-in
- **Why it's fair:** Respects player choice. Rewarded ads are voluntary.

### Anti-Predatory Safeguards

- **No impossible boards.** Every puzzle is verified solvable. Difficulty comes from strategy, not RNG.
- **No forced frustration.** Difficulty ramp is gradual. Players are never artificially stuck.
- **No opaque odds.** All random rewards show exact probabilities.
- **No deceptive countdowns.** Timer-based offers show real end times. No fake urgency.
- **Spending caps:** Optional parental controls and spending limit settings.
- **No gacha mechanics.** Collections are earned through gameplay, not random purchases.
