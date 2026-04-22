# Screens, Navigation & Design System

Navigation tree, screen prop pattern, colors, visual design language, grid
layout, animation conventions. Read this when touching navigation, screen
structure, or visual polish.

## Navigation Structure

```
App.tsx (RootStack)
├── MainTabs (Bottom Tab Navigator) — tabs progressively unlocked
│   ├── Home 🏠 (HomeStack) → HomeMain, Shop, CosmeticStore, Settings, Game  [always visible]
│   ├── Play 🎮 (PlayStack) → Modes, Game, Event, Leaderboard       [always visible]
│   ├── Collections 💎 (CollectionsStack) → CollectionsMain          [unlocks at level 5]
│   ├── Library 📚 (LibraryStack) → LibraryMain                     [unlocks at level 8]
│   └── Profile 👤 (ProfileStack) → ProfileMain, Settings, Club     [always visible]
└── Onboarding (shown once — interactive tutorial with guided puzzle)
```

Tab visibility is controlled by `player.featuresUnlocked` array checked against `FEATURE_UNLOCK_SCHEDULE` in constants. When a tab unlocks, a `FeatureUnlockCeremony` modal fires.

## Screen Props Pattern

All screens are registered as navigation components and receive no custom props. They use **optional props with context-based defaults**:

```typescript
interface SomeScreenProps {
  data?: SomeType;  // Optional - falls back to context
}
const SomeScreen: React.FC<SomeScreenProps> = ({ data: dataProp }) => {
  const player = usePlayer();
  const data = dataProp ?? player.someData;  // Context fallback
};
```

## Design System

### Colors (dark theme only)
- Background: `#0a0e27` / Surface: `#1a1f45` / BgLight: `#111638`
- Accent (cyan): `#00d4ff` / Gold: `#ffd700`
- Green (success): `#4caf50` / Coral (danger): `#ff6b6b`
- Purple: `#a855f7` / Orange: `#ff9f43` / Teal: `#2ed8a3`
- Glow variants: `accentGlow`, `greenGlow`, `coralGlow` for text shadows
- Rarity colors: common, rare, epic, legendary
- All colors defined in `COLORS` object in `src/constants.ts`

### Visual Design Language
The UI uses a premium mobile game aesthetic with these patterns applied consistently across all screens:
- **Gradient surfaces**: All cards and panels use `LinearGradient` with `GRADIENTS.surfaceCard` instead of flat `backgroundColor`. Import from `expo-linear-gradient`
- **Shadow presets**: Use `SHADOWS.soft`, `SHADOWS.medium`, `SHADOWS.strong` from constants. `SHADOWS.glow(color)` for colored glow effects
- **Glassmorphism cards**: Cards use gradient backgrounds + subtle border + shadow for depth
- **Letter tiles**: Clean architecture — opaque base gradient (`GRADIENTS.tile.default/selected/valid/hint/frozen`) + bottom shadow gradient for 3D depth. No inner glow, specular highlight, or shimmer overlays. Tile gradients must be **fully opaque** hex colors (not rgba) to prevent background bleed-through artifacts
- **Ambient backdrops**: Most screens use `<AmbientBackdrop variant="library|game|..." />` for floating animated orb backgrounds (12 twinkling stars + 3 nebula orbs via Reanimated UI-thread loops). HomeScreen uses `<SynthwaveHomeBackdrop>` with BandedSun + FlowingPerspectiveGrid + stars. `SynthwaveBackdrop` (game screen) uses NeonSun + PerspectiveGridFloor + stars
- **Home screen image assets**: HomeScreen hero card uses image-based UI — `playbutton.png`, `statscard.png` (×3), `shopbutton.png` — each with text overlaid via absolute-positioned Views. Hero card container is a plain `View` (no LinearGradient, no border, no glow orbs)
- **Hero illustrations**: Library screen has decorative `<LibraryHeroIllustration />` component built from Views + gradients (no image assets)
- **Screen top padding**: All screens use `paddingTop: 60` in their `content` style to clear the status bar / safe area consistently
- **Section layout**: Screens follow a pattern of hero card → section panels, each with `borderRadius: 20-28`, gradient fill, and `SHADOWS.medium`
- **Accent borders**: Highlighted/active items use thin accent-colored borders with matching glow shadow via `SHADOWS.glow(COLORS.accent)`

### Grid Layout
- Gravity-direction-aware columns: `flex-end` for down (default), `flex-start` for up (with spacer below cells), `noGravityLayout` prop renders cells at their actual row positions with empty placeholders for null cells (noGravity/shrinkingBoard modes). Left/right gravity directions show an arrow indicator but use the same column layout
- Cell touch targets: 44pt minimum
- Grid padding: 12px, cell gap: 4px
- Cell size computed dynamically based on column count, screen width, and available height (`Math.min(widthBased, heightBased)` when `maxHeight` prop is provided via `onLayout` measurement)
- Grid has gradient background (`GRADIENTS.grid`), 16px border radius, accent gradient border

### Animations & Visual Feedback

**System:** Migrated to **react-native-reanimated 4.2.1** + **react-native-worklets 0.7.2** for UI-thread animations. 30 components use `useSharedValue` + `useAnimatedStyle` + `withTiming`/`withSpring`/`withRepeat`/`withSequence`/`withDelay`/`interpolate`. The 4 exceptions below still use the legacy `Animated` API from `react-native` (imperative particle systems that don't map cleanly to hooks):

- `src/components/effects/ParticleSystem.tsx`
- `src/components/WordBank.tsx`
- `src/components/victory/GridDissolveEffect.tsx`
- `src/components/game/GravityTrailEffect.tsx`

**Gesture rule:** In Reanimated 4, `Gesture.Pan/.Tap()` callbacks auto-run as worklets on the UI thread. `Grid.tsx` uses `.runOnJS(true)` on both `panGesture` and `tapGesture` so callbacks can mutate refs and dispatch to the `useGame` reducer. Without this the app crashes with `Tried to synchronously call a non-worklet function` on the first tile tap.

No continuous animation loops run on idle tiles.

- **Cell selection**: Scale down 0.86 → spring to 1.08 with animated glow border (60ms down, spring up)
- **Valid word detection**: Cells turn green with checkmarks, green flash overlay (200ms)
- **Post-gravity cells**: Cyan border overlay fading via opacity over 400ms
- **Score popup**: Springs in, holds 600ms, floats up and fades out (no combo multiplier suffix — ripped Apr 2026; 7+ letter words get a larger popup scale via `scorePopupBig`)
- **Last-word tension**: when `remainingWords === 1`, final chip gets gold border + 1.08× loop pulse, BGM swaps to `tense`
- **FLAWLESS badge**: gold pill on victory screen when `perfectRun === true` (between stars and score panel)
- **WordBank chips**: Found words scale up 1.22x with spring then settle; `WordChip` wrapped in `React.memo`. No shimmer loop on found chips
- **Puzzle complete**: 16 confetti particles (8 colors), 12 sparkles, 10 celebration burst particles. Stars pop in with staggered springs. Score counts up from 0 over 800ms. Card anchored to bottom with `maxHeight: 85%` + `ScrollView` for overflow
- **AmbientBackdrop / SynthwaveHomeBackdrop**: 10-12 twinkling stars + nebula orbs or banded sun + flowing perspective grid, all migrated to Reanimated `withRepeat`/`withSequence` loops running on UI thread
- **Ceremonies** (Achievement, LevelUp, Milestone, Streak, FeatureUnlock, ModeUnlock, DifficultyTransition, CollectionComplete, PrestigeReset): all migrated to Reanimated — fade overlays + crisp spring card entrances (damping 14-15, stiffness 180-220) + icon scale pops with `withDelay(200)` for fast stagger. Decoration infinite loops capped to finite repeats (3-6 iterations). `useDeferredMount(280)` defers sparkles/particles until after card commits. Routed through `src/App/CeremonyRouter.tsx` (20 explicit render cases covering the 30-variant `CeremonyItem.type` union).
- **Button press**: All Pressable buttons scale to 0.92-0.97x on press with opacity change (native Pressable `pressed` state, not Reanimated)
- **Screen transitions**: Title springs in, buttons slide up with spring physics
