# Wordfall - Current Product Plan

This file is **not** a changelog or historical roadmap. It is the current planning snapshot for agents making changes today.

## 1. Product Direction

Wordfall is a polished, progression-driven word puzzle game built around one core promise:

> **Finding words is only half the challenge; choosing the right order is the real puzzle.**

Every meaningful change should reinforce at least one of these pillars:
- **Strategic gravity gameplay**
- **Premium-feel presentation**
- **Long-term progression and collection goals**
- **Low-friction repeat play with daily/weekly return hooks**

## 2. Current State Summary

The app already contains:
- A complete navigation shell with Home / Play / Collections / Library / Profile tabs.
- A working puzzle flow with generator, solver, gravity, hints, undo, score, combos, boosters, and completion states.
- Ten modeled game modes with unlock progression.
- A persistent meta layer covering chapters, stars, library restoration, collections, cosmetics, missions, streaks, comeback rewards, and currencies.
- Polished UI systems including ambient backdrops, upgraded headers/cards, animated puzzle completion, and stronger cell/board feedback.
- Procedurally generated sound effects and music with runtime volume/mute controls.

## 3. What Must Stay True

### Core gameplay truths
- Word paths are **8-directional and freeform adjacent**.
- Gravity is the main source of strategy.
- Boards should feel curated/solvable, not random noise.
- Hints and boosters should support learning/clarity, not erase the puzzle identity.

### Product truths
- The game is not just “a board screen.” It is a **meta-progression puzzle product**.
- The **library restoration fantasy** is a core framing device.
- The app should feel **atmospheric, modern, and tactile**, not plain.
- Persistent systems matter: a UI change often has progression/economy implications.

## 4. Current System Priorities

### Priority A — Protect gameplay correctness
When changing puzzle logic, prioritize:
1. Board solvability
2. Correct gravity outcomes
3. Correct mode rules
4. Clear player feedback for success/failure states

### Priority B — Keep the presentation cohesive
When changing UI, preserve:
- dark background / glowing accent palette
- ambient layered visuals
- high readability on the board
- celebratory motion and feedback on puzzle completion

### Priority C — Respect progression wiring
When changing rewards or completion flows, remember they may touch:
- `PlayerContext`
- `EconomyContext`
- mode stats
- daily completion/streaks
- atlas collection
- rare tile drops
- chapter/library restoration

## 5. Recommended Next-Step Focus Areas

These are the best current targets for future work if the user asks for planning or improvements:

### 5.1 Tooling and validation
- Add stable project scripts for typecheck/lint/test.
- Improve confidence around gameplay regressions.
- Make Expo/TypeScript validation more reliable in clean environments.

### 5.2 Screen-to-system consistency
- Keep Home, Library, Collections, Profile, and Settings aligned with the newer visual language.
- Make sure new UI additions reuse the existing design system rather than inventing parallel patterns.

### 5.3 Meta-system depth
- Continue tightening how chapters, collections, cosmetics, events, and missions surface in the UI.
- Prefer surfacing already-modeled systems over inventing entirely new ones.

### 5.4 Economy clarity
- Keep rewards understandable.
- Avoid opaque reward logic in the UI.
- Preserve a generous feel; do not turn core play into a frustration economy.

### 5.5 Accessibility and readability
- Strong contrast and board legibility matter.
- Touch targets should remain forgiving.
- Animations should clarify gameplay, not obscure it.

## 6. Non-Goals Unless Explicitly Requested

Do **not** do these by default:
- Strip out ambient or illustrative UI systems to make screens more “minimal.”
- Revert procedural audio back to tracked binary assets.
- Collapse the app back into a single-screen puzzle demo.
- Replace progression systems with placeholder text just because some systems are locally persisted.
- Add monetization pressure or energy-gate mechanics without a direct request.

## 7. Agent Guidance

If asked to update or extend the game:
- Start from the **existing game fantasy and UX quality bar**.
- Prefer integrating with current contexts, data, and services.
- Update docs when the real game shape changes.
- Document the current truth, not speculative future plans.
