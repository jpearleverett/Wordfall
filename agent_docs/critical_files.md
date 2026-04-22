# Critical Files (extended)

Hot-path files beyond the 6 listed in CLAUDE.md. Read this when touching
grid gestures, game sub-components, contexts, engine, or utility hooks.

| File | Role |
|------|------|
| `src/screens/game/ConnectedWordBank` | (exported from PlayField.tsx) WordBank with store-driven `currentWord`/`isValidWord`. Rendered above grid area. |
| `src/screens/game/GameFlashes.tsx` | Memoized subtree: valid/invalid flash, score popup, big-word label. Chain popup / neon pulse / VHS glitch were ripped in Apr 2026 (Option A refactor). Animated.Values passed by stable ref. |
| `src/screens/game/GameBanners.tsx` | Memoized subtree: 7 conditional banners (gravity, shrink, wildcard, idle hint, ad hint, stuck ×2). |
| `src/hooks/useRewardWiring.ts` | All post-puzzle rewards: coins/gems, rare tiles, ceremonies, mastery, quests |
| `src/contexts/PlayerContext.tsx` | Master player data. **Persistence is debounced** (300ms coalesce + AppState flush). |
| `src/contexts/EconomyContext.tsx` | Currency, VIP, IAP fulfillment. **Persistence is debounced** (1s coalesce + AppState flush). |
| `src/engine/boardGenerator.ts` | Seeded PRNG, 5s timeout, 4-tier fallback, mode-aware validation |
| `src/engine/solver.ts` | 8-dir DFS with step budget + wall-clock timeout |
| `src/components/Grid.tsx` | Pan + tap gesture handler. O(1) column-indexed hit test. `.shouldCancelWhenOutside(true)`. **Uses `.runOnJS(true)` — see gotchas.** |
| `src/utils/hooks.ts` | `useStableCallback` — stable-identity callback wrapper (useEvent RFC polyfill). Used for all props passed to memoized children. |
| `src/constants.ts` | COLORS, GRADIENTS, MODE_CONFIGS, ECONOMY, STREAK, FEATURE_UNLOCK_SCHEDULE |

17 screens live in `src/screens/`. Game sub-components live in `src/screens/game/` (PlayField, GameFlashes, GameBanners). Ceremonies are routed through `src/App/CeremonyRouter.tsx` (20 render cases). Backdrops, effects, and ceremony components live in `src/components/{,common,home,victory,effects,game,modes,events,navigation,economy,social}/`.

**Cloud Functions live in one codebase**: `functions/src/index.ts` (commerce: `validateReceipt`, `onSubscriptionRenew`, `clubGoalProgress`, `autoKickInactiveMembers`, `requestAccountDeletion`) re-exports `./social` which holds all social callables (`onPuzzleComplete`, `updateClubLeaderboard`, `sendPushNotification`, `processStreakReminders`, `rotateClubGoals`, `moderateClubMessage`, `sendGift`, `claimGift`, `onReferralSuccess`, `distributeWeeklyRewards`). 15 functions total. Consolidated Apr 2026 (used to be split across `functions/` + `cloud-functions/`).
