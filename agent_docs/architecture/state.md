# State Management & Performance Architecture

Zustand + redux-middleware reducer, selector pattern, render isolation, and
persistence debouncing. Read this when touching game state, selectors, or
render-performance questions.

## State Management

- **Game state:** `useGame` hook creates a **zustand store** via `createGameStore()` (in `src/stores/gameStore.ts`) which wraps the existing `gameReducer` using zustand's `redux` middleware. The reducer is unchanged and battle-tested (37 tests). `useGame` returns `{ store, ...actionDispatchers, isStuck, stars, foundWords, totalWords, remainingWords }` — **it does NOT return `state`**. Consumers read state via `useStore(store, selector)` for narrow subscriptions. Actions: SELECT_CELL, SELECT_CELLS (batched), CLEAR_SELECTION, SUBMIT_WORD, USE_HINT, UNDO_MOVE, NEW_GAME, RESET_COMBO, TICK_TIMER, USE_BOOSTER, GRANT_HINT, GRANT_UNDO, GRANT_BOOSTER, USE_PREMIUM_HINT, ACTIVATE_SCORE_DOUBLER, ACTIVATE_BOARD_FREEZE. GameScreen subscribes to ~20 coarse selectors (status, score, combo, etc.) that change per-word, NOT per-tap. PlayField subscribes to `selectedCells` (per-tap). This separation is the primary latency optimization.
- **Store context:** `GameStoreContext` in `src/stores/gameStore.ts` passes the store down the tree. `useGameStore(selector)` is the convenience hook for child components. `useGameDispatch()` returns the stable dispatch function. Pre-built selectors (`selectStatus`, `selectScore`, etc.) are exported for reuse.
- **Stable callbacks:** `useStableCallback` (from `src/utils/hooks.ts`) wraps callbacks whose deps churn frequently (e.g. `handleHint` depends on `economy`). It returns a function with stable identity that always calls the latest closure. Used for all props passed to memoized children (Grid, BoosterBarMemo, GameBanners, GameFlashes).
- **Player data:** `PlayerContext` - progress, collections (atlas/tiles/stamps), missions, streaks, cosmetics, library wings, mode stats, achievements, comebacks, **plus**: `featuresUnlocked`, `weeklyGoals`, `pendingCeremonies`, `tooltipsShown`, `failCountByLevel`, `consecutiveFailures`, `mysteryWheel`, `winStreak`, `puzzleEnergy`, `performanceMetrics`, `segments`, `eventProgress`, `friendChallenges`, `modeLevels`, `seasonalQuest`, `prestige`. Methods include `useEnergy`, `refillEnergy`, `recomputeSegments`, `updateEventProgress`, `sendChallenge`, `respondToChallenge`, `recordPerformanceMetrics`, `advanceModeLevel`, `getModeLevel`, `updateSeasonalQuest`. **Persisted to AsyncStorage with 300ms debounce** + AppState flush + Firestore sync when configured.
- **Economy:** `EconomyContext` - coins, gems, hintTokens, undoTokens, `boosterTokens` (`{ wildcardTile, spotlight, smartShuffle }`), eventStars, libraryPoints, `isAdFree`, `isPremiumPass`, `isVip`, `starterPackAvailable`, `dailyValuePackExpiry`, `vipExpiresAt`, `vipStreakWeeks`, `vipStreakBonusClaimed`. Methods: add/spend/check + `addLives(count)` + `addBoosterToken(type)`/`spendBoosterToken(type)` + `processPurchase(productId)` + `processAdReward(rewardType)` + `claimVipDailyRewards()`. VIP subscribers get: ad-free, 50 daily gems, 3 daily hints, exclusive frame, streak bonuses at 2/4/8/12/26 weeks. **Persisted to AsyncStorage with 1s debounce** + AppState flush.
- **Settings:** `SettingsContext` - volume (SFX + music), haptics, notifications, theme (5 themes), **plus**: parental controls (`spendingLimitEnabled`, `monthlySpendingLimit`, `requirePurchasePin`, `purchasePin`, `monthlySpent`). Persisted to AsyncStorage.
- **Auth:** `AuthContext` - Firebase anonymous auth with loading state.

## Performance Architecture

**Render isolation (zustand):**
- **GameScreen does NOT subscribe to `selectedCells`** — it reads ~20 coarse zustand selectors (status, score, combo, moves, etc.) that change per-word, not per-tap. When a cell is tapped, only PlayField + ConnectedWordBank re-render (~15-30ms), not the full 2500-line GameScreen.
- **PlayField** (`src/screens/game/PlayField.tsx`) subscribes to per-tap state (`selectedCells`, `board.grid`, `board.words`, `wildcardCells`, `gravityDirection`) and renders Grid. ~50 lines, re-renders on every tap — that's correct and expected.
- **ConnectedWordBank** (exported from PlayField.tsx) subscribes to `selectedCells`, `board.grid`, `board.words` and renders WordBank above the grid area. Re-renders per-tap for the forming-word display.
- **GameFlashes** (`src/screens/game/GameFlashes.tsx`) — 7 overlay blocks (chain popup, neon pulse, VHS glitch, valid/invalid flash, score popup, big-word label) extracted as `React.memo`. Receives Animated.Values by stable ref + primitive props. Memo bails out on every tap.
- **GameBanners** (`src/screens/game/GameBanners.tsx`) — 7 conditional banners extracted as `React.memo`. All callbacks via `useStableCallback`.
- **`useStableCallback`** (`src/utils/hooks.ts`) — stable-identity callback wrapper (useEvent RFC polyfill). Used for ALL props passed to memoized children so their memo compare succeeds.

**React Compiler:**
- Enabled via `babel-preset-expo` `'react-compiler'` option in `babel.config.js`, scoped to `src/`. Auto-memoizes all components and hooks, reducing manual `React.memo`/`useMemo`/`useCallback` burden. Works alongside explicit memoization — they're complementary.

**Persistence debounce:**
- **PlayerContext** debounces AsyncStorage writes with a 300ms coalesce window. `useRewardWiring` fires 15+ setter calls on puzzle complete — without debounce, each would trigger a synchronous `JSON.stringify` + `AsyncStorage.setItem` of the full PlayerData blob. AppState listener flushes pending writes on background/inactive.
- **EconomyContext** debounces at 1s (same pattern).

**Grid gesture & hit-test:**
- **O(1) column-indexed hit test** — precomputed per-column sorted bounds arrays, stride-based row slot lookup. Was O(49) linear scan per pointer sample.
- **`.shouldCancelWhenOutside(true)`** on the pan gesture — stops pointer events when finger leaves grid.
- **Gesture built once on mount** — `useMemo(() => ..., [])` with callback refs so changing the grid doesn't tear down the native handler.
- **`.runOnJS(true)` required** on gestures whose callbacks call JS (refs, dispatch). Without it: crash on first interaction.

**Ceremony animations:**
- All 8 ceremony components use **Reanimated 4 springs with high damping** (damping 14-15, stiffness 180-220) for crisp pop, not wobbly settle. Cascade delays at 200ms.
- **PuzzleComplete** entrance is a parallel staggered sequence (card spring friction 12 + ribbon/stats/actions with timing fades at 150/220/300ms delays). Settles in ~500ms total.
- **Decoration infinite loops capped** — sparkle `Animated.loop({ iterations: 3 })`, glow `withRepeat(n, 3-6)`, star pulse `withRepeat(n, 6)`. No truly infinite animation drivers.
- **Deferred decoration mounting** — all ceremonies use `useDeferredMount(280)` so the card commits first, decorations (sparkles, confetti, burst particles) mount 280ms later.

**Remaining architecture:**
- **Reanimated 4 animations run on UI thread by default** — `useSharedValue` + `useAnimatedStyle` don't need `useNativeDriver`
- **No continuous animation loops on idle tiles** — only selected/moved tiles run short one-shot animations
- **`isDeadEnd` solver is deferred** — debounced 500ms via `setTimeout` in `useEffect`, never in render
- **`findWordInGrid` supports a `limit` parameter** — pass `limit=1` when only existence matters
- **Gesture objects memoized** — `useMemo` with callback refs
- **Computed game values cached** — `currentWord`, `remainingWords`, `isValidWord` use `useMemo` in PlayField (selection-derived) and `useGame` (word-derived)
- **Timer interval stable** — depends on `mode` and `status`, not `timeRemaining`
- **Grid sizing is dual-dimension** — `cellSize` uses `Math.min(widthBased, heightBased)` via `maxHeight` prop
- **Stable layout architecture** — absolute-positioned overlays for banners, fixed-height WordArea, reserved boosterBar space
- **Board generation uses heuristic-first validation**
- **Audio synthesis is cached and pre-warmed**
- **FlatLists** use `removeClippedSubviews`, `initialNumToRender`, etc.
- **When adding new animations**: use Reanimated, prefer `withSpring`/`withTiming` over `withRepeat`, use **high damping (14+)** for ceremonies
- **When modifying tiles**: do NOT add semi-transparent overlay Views
