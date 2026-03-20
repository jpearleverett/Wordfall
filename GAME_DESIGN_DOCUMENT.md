# Wordfall — Game Design Document

This document describes the **current intended design** of Wordfall as represented by the codebase today. It is not a pitch deck, changelog, or speculative roadmap.

---

## 1. Game Identity

**Wordfall** is a gravity-based word puzzle game where the player clears target words from a letter grid and must manage how the board collapses after every successful word.

### Core promise
The game's signature idea is:

> **The right word in the wrong order can lose the puzzle.**

That makes Wordfall different from a standard word search, swipe game, or crossword. The challenge is not only recognition; it is sequencing.

### Experience goals
Wordfall should feel:
- **Strategic** rather than twitchy
- **Readable** even when visually rich
- **Atmospheric** and premium, with a magical-library tone
- **Rewarding over long play**, thanks to progression, collections, and restoration systems
- **Supportive without being trivial**, through hints, undo, and boosters

---

## 2. Audience and Positioning

### Primary audience
- Mobile puzzle players who enjoy word games and light strategy
- Players who like progression systems, collection loops, and calm-but-smart gameplay
- People looking for a more tactical alternative to static word searches

### Positioning
Wordfall sits between:
- a **word search** in readability,
- a **match / collapse puzzler** in visible board transformation,
- and a **strategy puzzle** in move-order consequences.

---

## 3. Core Gameplay Loop

### Moment-to-moment loop
1. The player sees a board and the target word list.
2. They scan for a target word and select letters by tapping or dragging.
3. If the selection is valid, the word is removed.
4. Gravity collapses the board.
5. The player reassesses the new layout and chooses the next word.
6. The puzzle ends when all target words are cleared or the player fails the current mode rule.

### Why it works
Each move changes the decision space. That gives every successful word a visible consequence and makes the board itself part of the puzzle.

---

## 4. Board and Selection Rules

### Board structure
Boards are generated from curated dictionary content and difficulty configs. A board consists of:
- a rectangular letter grid
- a set of target words embedded in the grid
- per-word path data used for validation/solver behavior

### Word path rules
Target words use **8-directional adjacency**:
- horizontal
- vertical
- diagonal
- freeform zigzag paths made from adjacent cells

The player is allowed to select using the same adjacency rule. The game is **not limited to straight-line words**.

### Selection behavior
- The player can tap or drag through adjacent letters.
- Re-selecting an earlier chosen cell trims the active selection back to that point.
- Invalid selections are rejected and clear the sequence.
- In stricter modes, invalid play can also break perfect status or fail the puzzle outright.

---

## 5. Gravity and Strategy

### Gravity rule
When a valid word is removed, letters above empty spaces fall downward within their columns.

### Why gravity matters
Gravity is the central strategic layer because it can:
- reveal future words
- move letters out of useful positions
- create chains
- create dead ends if the player chooses a poor order

### Frozen-column exception
The game currently supports a **Freeze Column** booster. When active, the selected column is exempt from collapse for one move, enabling advanced planning and alternate board states.

---

## 6. Puzzle Generation and Solver Principles

### Generation goals
Generated puzzles should be:
- solvable
- readable
- difficulty-appropriate
- strategically interesting under gravity

### Current generation principles
- Use seeded generation for reproducibility when needed.
- Place words through adjacent-cell paths rather than only straight lines.
- Fill remaining spaces with filler letters.
- Validate puzzles through solver logic before use.
- Use fallback generation paths if an initial generation attempt fails.

### Solver responsibilities
The solver system supports:
- word discovery in the current grid
- hint generation
- dead-end detection
- solvability validation during board generation and gameplay assistance

---

## 7. Game Modes

Wordfall currently models ten modes:

| Mode | Purpose |
|------|---------|
| `classic` | Standard core experience |
| `limitedMoves` | Solves must fit within a move cap |
| `timePressure` | Countdown-driven variant |
| `perfectSolve` | Zero-mistake challenge |
| `cascade` | Multiplier-driven score mode |
| `daily` | Shared date-seeded challenge |
| `weekly` | Harder periodic challenge |
| `endless` | Replayable procedural puzzle flow |
| `expert` | Stricter, higher-difficulty play |
| `relax` | Low-pressure accessible mode |

### Mode philosophy
These modes should feel like meaningful expressions of the same core mechanic, not separate mini-games. They are all built on the same board / gravity / selection foundation.

---

## 8. Scoring and Performance

### Scoring goals
Scoring should reward:
- finding words
- longer words
- sustained momentum
- mode mastery
- clean and efficient completion

### Current scoring signals
The current design includes:
- base word score
- per-letter bonus
- combo/momentum reward
- cascade-mode multiplier behavior
- bonus value in stricter or more skillful clears

### Performance feedback
Players should clearly understand when they are doing well through:
- score popups
- combo messaging
- completion stars
- perfect clear recognition
- reward reveals at puzzle end

---

## 9. Supports, Assists, and Recovery Tools

Wordfall is intentionally strategic, but not meant to feel punishing.

### Current support tools
- **Hints** for surfacing a valid path/next move
- **Undo** for recovering from order mistakes
- **Freeze Column** booster
- **Board Preview** booster
- **Shuffle Filler** booster
- mode-specific generous settings in easier variants like `relax`

### Design rule
Support tools should preserve the feeling that the player is still solving the puzzle. They should reduce frustration and increase learning, not fully automate success.

---

## 10. UX Feedback Principles

Wordfall relies heavily on feedback clarity.

### Board-level feedback
The current UX direction includes:
- strong selection highlighting
- success/failure color states
- moved-cell highlighting after gravity
- clear board readability even with visual polish
- tactile feel through haptics and press states

### Session-level feedback
The game also surfaces:
- mode intro messaging
- idle hint prompting
- chain celebration
- score celebration
- polished completion flow with stars, rewards, and animation

### Visual tone
The product should stay within a:
- dark, high-contrast palette
- magical library / archive fantasy
- premium mobile polish direction
- readable, not cluttered, presentation style

---

## 11. Audio and Haptics

### Audio direction
Wordfall currently uses a **procedural audio engine** rather than bundled sound assets.

It synthesizes:
- short sound effects for core interactions
- simple looping music tracks for menu/gameplay states
- runtime-controlled volume/mute behavior

### Haptic direction
Haptics reinforce:
- taps
- valid word confirmations
- invalid interactions
- combo / success moments
- other notable actions where tactile confirmation improves clarity

### Design intent
Audio and haptics should make the game feel alive and tactile without becoming noisy or exhausting.

---

## 12. Progression Structure

Wordfall is not just a sequence of isolated puzzles. It has a persistent progression layer.

### Current progression pillars
- level progression
- puzzle stars
- chapter advancement
- mode unlocks
- perfect solve tracking
- long-term score accumulation

### Chapter structure
The game contains a chapter-based structure tied to a **library restoration** fantasy. Chapters represent themed content progression and feed the sense of rebuilding a larger world.

### Library fantasy
Solving puzzles contributes to restoring parts of a grand library. This framing is central to the game's identity and should remain the narrative/metaphorical wrapper for progression systems.

---

## 13. Economy and Rewards

### Current reward categories
The current product model includes persistent rewards such as:
- coins
- gems
- hint-related resources
- event stars
- library points

### Completion reward philosophy
Puzzle completion should feel rewarding immediately and over time. Rewards should:
- reflect difficulty and performance
- reinforce replay and daily return
- connect clearly to progression systems
- avoid punishing scarcity in the core loop

### Premium-feel principle
Even as a progression/economy game, Wordfall should feel generous and fair. The design goal is long-term engagement through mastery and collection, not frustration pressure.

---

## 14. Collections and Meta Systems

The game already includes a broad set of persistent meta systems.

### Collections currently represented
- **Atlas pages** for collected words
- **Rare tiles** and tile-related progression
- **Seasonal stamps / albums**
- **Cosmetics** such as themes, frames, titles, and decorations

### Why they matter
These systems provide:
- long-term goals beyond finishing one puzzle
- identity and personalization
- reasons to revisit multiple modes/content types
- emotional payoff for continued play

---

## 15. Daily / Weekly / Return Loops

Wordfall supports repeat-play habits through structured return systems.

### Current return-loop categories
- daily completion
- daily missions
- login tracking
- streaks
- weekly challenge structure
- comeback rewards after inactivity

### Design purpose
These systems should support healthy return motivation by giving the player:
- a reason to check in
- a sense of continuity
- catch-up friendliness after time away
- medium-term goals outside a single puzzle

---

## 16. Screen and Feature Map

### Primary screens
- Home
- Modes / Play
- Game
- Collections
- Library
- Profile
- Settings
- Shop
- Club
- Leaderboard
- Event
- Onboarding

### Design expectation
Each screen should feel like part of the same product ecosystem. The game should not visually fragment into “old utilitarian screens” and “new polished screens.” New work should push toward consistency with the richer current UI language.

---

## 17. Technical Design Constraints

### Architectural expectations
- Core puzzle rules belong in reducer/engine code, not ad hoc screen logic.
- Persistent meta systems belong in shared contexts.
- New feature work should integrate with existing static data where appropriate.
- Documentation should reflect the implemented product state, not speculative features with no code support.

### Build/tooling reality
The app has broad product scope, but tooling is lighter than a fully mature production game. Agents should expect to do focused verification and be careful when making systemic changes.

---

## 18. Design Guardrails for Future Changes

When evolving Wordfall, preserve these truths:
- The game is fundamentally about **gravity-driven word ordering**.
- The UI should feel **premium, atmospheric, and readable**.
- Progression should reinforce the **library restoration fantasy**.
- Assists should reduce frustration without removing strategic thought.
- Audio/haptics should reinforce tactility.
- Meta systems should complement the puzzle game, not distract from it.

If a change weakens the gravity strategy, reduces readability, or strips away the premium presentation without a clear reason, it is probably moving the game in the wrong direction.
