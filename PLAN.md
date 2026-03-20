# Wordfall GDD Implementation Plan

## Current State
- Core gameplay works: board generation, gravity, word selection, solver, hints, undos
- Basic UI: HomeScreen, GameScreen, Grid, LetterCell, WordBank, GameHeader, PuzzleComplete
- Persistence via AsyncStorage
- ~2,000 curated words
- Only Classic mode + Daily Challenge implemented
- No sound, no haptics, no collections, no social, no economy, no monetization, no events, no modes beyond classic

## Architecture Decisions
- **Backend:** Firebase (Auth, Firestore, Cloud Functions, Analytics)
- **Navigation:** React Navigation with bottom tabs + stack navigators
- **State:** React Context + reducers (already pattern used) + Firebase listeners
- **IAP:** expo-in-app-purchases
- **Ads:** expo-ads-admob (rewarded + interstitial)
- **Sound:** expo-av
- **Notifications:** expo-notifications

---

## Phase 1: Foundation & Polish (Core Feel)

### 1.1 Install dependencies & project setup
- Add: react-navigation (native, stack, bottom-tabs), firebase SDK, expo-av, expo-notifications, expo-in-app-purchases, expo-ads-admob, expo-linear-gradient, lottie-react-native
- Set up Firebase project config (firebase.ts)
- Set up navigation structure (TabNavigator with Home, Modes, Collections, Library, Profile)

### 1.2 Sound system
- Create `src/audio/SoundManager.ts` singleton
- Sound effects: letter_tap, gravity_drop, word_found, word_invalid, combo_chain, puzzle_complete, star_earn, button_press, hint_used, undo_used
- Background music: main_menu, gameplay_calm, gameplay_tense (timer modes)
- Volume controls, mute toggle in settings
- Generate placeholder sound files or use free SFX (we'll create synthetic sounds with expo-av)

### 1.3 Haptic feedback
- Wire up expo-haptics to: cell selection (light), word found (medium), combo (heavy), puzzle complete (heavy), invalid selection (notification error)

### 1.4 Animation polish
- Gravity: 300ms ease-out with 50ms bounce, 30ms column stagger
- Chain celebration: "CHAIN!" text popup with pulse animation
- Word found: Green glow expanding outward from cells
- Cell removal: Fade + scale down before gravity
- Board collapse: Subtle trail on moving cells
- Star animations on puzzle complete (already partially done, enhance)

### 1.5 Navigation overhaul
- Bottom tab navigator: Home, Play, Collections, Library, Profile
- Stack navigators within each tab
- Screens: HomeScreen, GameScreen, ModesScreen, CollectionsScreen, LibraryScreen, ProfileScreen, SettingsScreen, ShopScreen, ClubScreen, LeaderboardScreen, DailyChallengeScreen, EventScreen, OnboardingScreen

---

## Phase 2: Game Modes

### 2.1 Mode selection screen
- Grid of mode cards with icons, lock states, and descriptions
- Progressive unlocking (modes unlock as player advances)

### 2.2 Classic Mode (exists - enhance)
- Add chapter system: 40 chapters × 15-20 puzzles with themes
- Chapter gates (60% stars to advance)
- Chapter completion celebrations

### 2.3 Limited Moves Mode
- Move counter UI, exact N moves allowed
- "Extra moves" purchasable booster
- Fail state when moves exhausted

### 2.4 Time Pressure Mode
- Countdown timer with time bonus scoring
- Timer UI with color transitions (green → yellow → red)
- "Time extension" purchasable booster

### 2.5 Perfect Solve Mode
- Zero taps wasted, no hints/undos
- Special gold badge on completion
- Tracking perfect solve count

### 2.6 Cascade Mode
- Score multiplier increases with consecutive finds
- Multiplier UI with animations
- "Don't break the chain" tension mechanic

### 2.7 Daily Challenge (exists - enhance)
- Same puzzle for all players (date-seeded - exists)
- Add leaderboard integration
- Streak system with forgiveness (1 grace day)
- Streak recovery via soft currency

### 2.8 Weekly Special
- Curated hard puzzle, themed words
- 7-day availability window
- Leaderboard

### 2.9 Endless Mode
- Procedurally generated at chosen difficulty
- No level gating, session stats
- Relaxation-focused

### 2.10 Expert Mode
- No hints, no undo, harder boards
- Minimal valid orderings (1-3)
- Elite badge system

### 2.11 Relax Mode
- Unlimited undos, gentle puzzles
- No timer, no pressure
- Soothing theme/colors

---

## Phase 3: Economy & Currency System

### 3.1 Currency types
- **Coins** (soft): earned from puzzles, daily rewards, missions
- **Gems** (premium): purchased or rare achievements
- **Hint Tokens**: free per puzzle + purchasable
- **Event Stars**: event participation
- **Library Points**: puzzle completion → library decoration

### 3.2 Economy context & UI
- CurrencyContext provider with Firestore sync
- Currency display in header (coins, gems)
- Animated currency gain/spend effects
- Transaction history

### 3.3 Reward calculations
- Puzzle completion rewards (coins based on difficulty, stars, combos)
- Streak bonus multipliers
- First-time completion bonuses

---

## Phase 4: Hint/Assist/Booster System

### 4.1 Enhanced hint system
- Reveal Word (exists - polish)
- Strategic Hint "Remove This First" (uses solver - exists, enhance UI)
- Undo Move (exists - polish)

### 4.2 New boosters
- **Board Preview**: Ghost overlay showing post-removal board state
- **Shuffle Unused Letters**: Randomize filler cells, keep words intact
- **Freeze Column**: Prevent one column from gravity for one move

### 4.3 Booster economy
- 3 free Reveal + 3 free Undo per puzzle (exists)
- Rewarded ad for +1 hint
- Purchase bundles (10/25/50 at $0.99/$1.99/$2.99)
- Progression rewards grant hint tokens

---

## Phase 5: Progression & Meta Layer

### 5.1 Chapter system
- 40 chapters with themed word pools (Nature, Science, Mythology, etc.)
- 15-20 puzzles per chapter
- Difficulty ramp within and across chapters
- Star gates (60% to advance)

### 5.2 Library meta-game ("The Word Architect")
- Visual library with wings (empty → restored as chapters complete)
- LibraryScreen with interactive building
- Decorations earned from milestones
- Cosmetic customization (furniture, lighting)

### 5.3 Milestone system
- Every 5 levels: decoration unlock
- Chapter completion: wing restored + badge + bonus puzzle
- Star milestones (50/100/250/500): cosmetic frames, titles, hint packs
- Perfect solve milestones (10/25/50): gold badges

### 5.4 Side objectives
- Par challenges (solve in N moves)
- No-hint challenges (5 consecutive)
- Theme master (all words in themed set)
- Speed runs (chapter under time target)

---

## Phase 6: Collection Systems

### 6.1 Word Atlas Pages
- Categories: Animals, Weather, Food, Space, Music, etc.
- 8-12 word slots per page
- Auto-fill when matching words found during play
- Set completion rewards
- Per-word mastery counter with XP bar

### 6.2 Rare Letter Tiles
- Golden tiles A-Z drop randomly on puzzle completion
- Higher chance on harder difficulty / perfect solves
- Pity timer (guaranteed within 10 puzzles)
- Spell words (PUZZLE, GRAVITY, CASCADE) for rewards
- 5 duplicates → 1 wildcard tile

### 6.3 Seasonal Stamps
- Quarterly themed albums with 20 stamps
- 90-day availability
- Stamps earned via events, daily challenges, milestones
- Every 5 stamps: smaller reward
- Full set: exclusive badge + premium cosmetic

---

## Phase 7: Daily/Weekly/Seasonal Systems

### 7.1 Daily missions (3 per day)
- Examples: "Find 10 words," "Complete 2 puzzles without hints," "Achieve 3x combo"
- Mission generation from templates
- Bonus chest for completing all 3

### 7.2 Daily login gifts
- 7-day escalating cycle
- Day 1: 50 coins → Day 7: rare tile + 200 coins
- Resets after Day 7

### 7.3 Streak system with forgiveness
- Daily puzzle streak counter
- 1 free grace day per streak
- 7-day milestone rewards
- 30-day special cosmetic
- Streak shield purchasable (once per 30 days)

### 7.4 Weekly challenge ladder
- 5 escalating puzzles released Monday
- Cumulative score leaderboard
- Weekly chest for all 5

### 7.5 Weekend blitz
- Saturday-Sunday: 2x XP + increased rare tile drops

### 7.6 Monthly mastery track
- 30-tier reward track (free + premium)
- Each daily puzzle advances 1 tier
- Premium pass unlocks premium tier rewards

### 7.7 Comeback mechanics
- 3-day absence: welcome-back gift
- 7-day: curated easy puzzle + rewards
- 30-day: reactivation package (free premium hints, guided re-onboarding, double rewards 3 days)

---

## Phase 8: Backend & Firebase

### 8.1 Firebase setup
- Firebase project configuration
- Authentication (anonymous → optional email/social)
- Firestore data models:
  - users/{uid}: profile, progress, currencies, settings
  - puzzles/daily/{date}: daily puzzle data + leaderboard
  - puzzles/weekly/{weekId}: weekly challenge
  - clubs/{clubId}: members, scores, chat
  - leaderboards/{type}/{period}: global/friend/club rankings
  - events/{eventId}: event data, participation
  - collections/{uid}: atlas pages, rare tiles, stamps

### 8.2 Cloud Functions
- Daily puzzle generation (scheduled)
- Weekly challenge generation (scheduled)
- Leaderboard computation
- Club score aggregation
- Event management
- IAP receipt validation
- Streak management
- Comeback detection & rewards

### 8.3 Real-time listeners
- Leaderboard updates
- Club chat/scores
- Event progress
- Friend challenges

---

## Phase 9: Social Systems

### 9.1 Clubs
- Create/join clubs (10-30 members)
- Weekly club score (sum of members)
- Club puzzle (one per day, best score counts)
- Emoji-reaction chat
- Auto-kick inactive after 14 days
- Club settings for leaders

### 9.2 Friend challenges (async)
- Send puzzle to friend
- Turn-based score comparison
- No time pressure

### 9.3 Weekly rival
- Auto-matched by skill
- Both play same 5 puzzles
- Higher total wins

### 9.4 Leaderboards
- Daily/weekly/all-time
- Friends/club/global
- Skill-tier based matchmaking

### 9.5 Sharing
- Solve replay (animated GIF generation)
- Streak card (shareable image)
- Collection completion card
- Leaderboard snapshots

### 9.6 Gifting
- Hint gifts (1 per day to friend)
- Tile exchange with club members (3 per day)

---

## Phase 10: Monetization

### 10.1 IAP integration
- Starter Pack ($1.99): 500 coins + 50 gems + 10 hints + exclusive decoration
- Hint Bundles ($0.99-$2.99): 10/25/50 tokens
- Undo Bundles ($0.99-$2.99): 10/25/50 charges
- Daily Value Pack ($0.99/day, 7-day auto-end)
- Chapter Completion Bundle ($2.99)
- Premium Pass ($4.99/season)
- Ad Removal ($4.99 one-time)

### 10.2 Rewarded ads
- Watch ad for +1 hint token
- Opt-in only (never forced)

### 10.3 Interstitial ads
- Between puzzles (every 3rd puzzle)
- Removed with Ad Removal purchase

### 10.4 Shop screen
- Currency packs, bundles, boosters
- Featured offers with timers
- Purchase history

### 10.5 Offer triggers
- Starter pack: after Level 3, first 72 hours
- Hint bundle: when running out on hard puzzle
- Chapter bundle: entering new chapter
- Premium pass: season start

---

## Phase 11: Events System

### 11.1 Event framework
- Event configuration (type, duration, rules, rewards)
- Event UI (banner, tab, progress, leaderboard)
- Event shop with event currency

### 11.2 Event types (per 12-week calendar)
- Week 1: Launch Celebration (2x coins, free hints)
- Week 2: Speed Solve Sprint (timed leaderboard)
- Week 3: Nature Words Collection (themed puzzles)
- Week 4: Perfect Clear Challenge (no-hint badges)
- Week 5: Club Rally (club competition)
- Week 6: Cascade Championship (combo tournament)
- Week 7: Mystery Words (hidden word discovery via gravity)
- Week 8: Retro Rewind (replay classics)
- Week 9: Ocean Theme Week
- Week 10: Expert Gauntlet
- Week 11: Community Milestone (global goal)
- Week 12: Season Finale Festival

---

## Phase 12: Onboarding (Day 0-7)

### 12.1 Tutorial puzzles
- Puzzle 1: 4×4, 2 words, no gravity needed → teaches tap mechanics
- Puzzle 2: 4×5, 2 words, gravity visible → slowed animation + tooltip
- Puzzle 3: 5×5, 3 words, order matters → gentle undo prompt on wrong order

### 12.2 Progressive feature unlocks
- Day 0: Core gameplay (puzzles 1-6)
- Day 1: Daily puzzle + streak
- Day 2: Collections (Word Atlas) + Library teaser
- Day 3: First real challenge + undo highlight + Daily Value Pack offer
- Day 4: Clubs + friend challenges
- Day 5: Cascade mode + medium difficulty
- Day 6: Events preview + collection progress
- Day 7: Weekly reward + weekly challenge + Chapter 1 near completion

### 12.3 Tooltip & coaching system
- Contextual tooltips for new features
- Coach marks highlighting UI elements
- Non-intrusive, dismissible

---

## Phase 13: Analytics

### 13.1 Firebase Analytics events
- Core: puzzle_start, puzzle_complete, puzzle_fail, puzzle_abandon
- Retention: daily_login, streak_count, session_start, session_end
- Monetization: iap_purchase, ad_watched, hint_used, undo_used
- Social: club_join, friend_challenge_sent, gift_sent
- Game-specific: gravity_interaction, dead_end_hit, wrong_order_attempt, chain_count
- Collection: atlas_word_found, rare_tile_earned, stamp_collected

### 13.2 Diagnostic metrics
- Gravity understanding by Level 5
- Wrong-order failure rate per level
- Dead-end detection rate
- Hint usage before quitting
- Time between word selections
- Board abandonment rate

---

## Phase 14: Settings & Profile

### 14.1 Profile screen
- Player avatar, name, level
- Stats dashboard (puzzles solved, stars, streaks, perfect solves)
- Achievement badges
- Collection progress overview

### 14.2 Settings screen
- Sound volume (SFX, music)
- Haptics toggle
- Notifications toggle
- Color theme selection
- Account management (sign in, link accounts)
- Ad removal status
- Privacy policy, terms
- App version

---

## Implementation Order (Sequential)

Given the massive scope, I'll implement in this order to maximize value at each step:

1. **Project setup & dependencies** (navigation, Firebase config)
2. **Navigation overhaul** (tab navigator, all screen shells)
3. **Sound & haptics** (immediate feel improvement)
4. **Animation polish** (gravity bounce, chain celebration, etc.)
5. **Economy system** (currencies, context, Firestore sync)
6. **Enhanced boosters** (Board Preview, Shuffle, Freeze Column)
7. **Chapter system** (40 chapters, themes, star gates)
8. **All game modes** (10 modes with mode selection screen)
9. **Daily/weekly systems** (missions, streaks, login gifts, weekly challenges)
10. **Collection systems** (Word Atlas, Rare Tiles, Seasonal Stamps)
11. **Library meta-game** (visual building restoration)
12. **Firebase backend** (Auth, Firestore models, Cloud Functions)
13. **Social systems** (Clubs, challenges, leaderboards, gifting)
14. **Monetization** (IAP, ads, shop, offers)
15. **Events system** (framework + 12-week calendar)
16. **Onboarding/tutorial** (Day 0-7 flow)
17. **Analytics** (Firebase Analytics events)
18. **Profile & settings** (screens, preferences)
19. **Cosmetics** (themes, decorations, frames)
20. **Final polish** (edge cases, performance, testing)
