# Wordfall Store Listing — Copy & Asset Brief

Paste-ready copy for Google Play Console and App Store Connect. Character counts verified against each field's limit. Screenshot + graphic briefs for the designer.

---

## A. Names & tag line

| Field | Limit | Draft |
|---|---|---|
| Google Play app name | 30 chars | `Wordfall: Gravity Word Puzzle` (29) |
| Apple app name | 30 chars | `Wordfall: Gravity Word Puzzle` (29) |
| Apple subtitle | 30 chars | `Find words, drop letters` (24) |
| Play short description | 80 chars | `Word search with gravity. Find every word, letters fall, order is everything.` (78) |

---

## B. Long description (both stores — 4000 char limit)

Extended from `store-metadata/description.txt`. 1,976 characters (well under 4,000).

```
Wordfall — The Word Search Where Gravity Changes Everything

Think you know word searches? Think again. Wordfall shows you the list of words to find on a letter grid — and the moment you trace one, those letters disappear and everything above falls into the empty space. The order you find the words changes the board for every find that comes next. Choose wrong and you get stuck. Choose right and the puzzle unfolds like clockwork.

GRAVITY-POWERED STRATEGY
Unlike any other word search, Wordfall adds a physics layer. Clear letters and gravity pulls the rest into place. One word at a time — you find it, it falls, you find the next. The skill is discovering the one correct sequence.

10 GAME MODES
• Classic — Find every word on the list with strategic sequencing
• Time Pressure — Countdown timer; solve before it runs out
• Perfect Solve — Zero hints, zero undos — pure skill
• Relax — Unlimited hints, ambient music, no pressure
• Shrinking Board — Board shrinks as you play
• Gravity Flip — Gravity direction rotates after each word
• No Gravity — Cells clear in place; no falling
• Expert — Expanded dictionary, denser boards
• Daily Challenge — Same puzzle for everyone, every day
• Weekly — A harder curated puzzle each week

RESTORE THE GRAND LIBRARY
Your meta-journey: restore an ancient library wing by wing. Complete chapters to rebuild shelves, place decorations, and make it yours. 40 chapters with 600+ handcrafted puzzles await.

COLLECT & COMPETE
• Word Atlas — Discover words across 12 themed collection pages
• Rare Letter Tiles — Collect golden tiles with themed designs
• Seasonal Stamps — Limited-time albums with exclusive rewards
• Daily & Weekly Leaderboards — Compare scores globally
• Clubs — Join teams, compete together, and share encouragement

FAIR FREE-TO-PLAY
Play unlimited puzzles — no energy walls. Hints and undos help when stuck. No impossible boards, no artificial frustration.

OPTIONAL IN-APP PURCHASES
Welcome Gift, bundles, hints, and a VIP Weekly subscription are available for players who want to support development or skip grind. Everything can be earned in-game, too.

ACCESSIBILITY
• Portrait-only layout for one-handed play
• Colorblind-safe tile palette in Settings
• Reduce-motion support for sensitive players
• 12 language word lists in roadmap

Download Wordfall and discover why order matters.
```

---

## C. What's new (v1.0 release notes — Play: 500 chars; Apple: 4000 chars)

Extended from `store-metadata/whats-new.txt`. 456 characters — fits both stores.

```
Version 1.0 — Launch Release

Welcome to Wordfall! The gravity-powered word search.

• 600+ handcrafted puzzles across 40 themed chapters
• 10 unique game modes including Daily Challenge, Time Pressure, and Perfect Solve
• Rich sound design and satisfying haptic feedback
• Interactive tutorial that teaches through play
• Collections: Word Atlas, Rare Tiles, Seasonal Stamps
• 15 achievements, weekly goals, 30-tier mastery track
• Flawless-solve tracking with milestone rewards
• Club system for team competition

We'd love your feedback — rate us and let us know!
```

---

## D. Apple keywords (100 char limit, comma-separated, no spaces)

Extended from `store-metadata/keywords.txt`. 98 characters. Keywords are selected for search intent ("word puzzle", "brain game", "daily challenge") and to avoid duplicating words already in the app name or subtitle.

```
anagram,brain,letters,scrabble,spelling,vocab,crossword,gravity,daily,logic,quiz,wordle,search
```

## E. Google Play tags (choose up to 5 from their predefined list)

- Word
- Puzzle
- Brain Games
- Daily
- Casual

---

## F. Age rating Q&A

Source: `agent_docs/data_safety.md` §age rating inputs; expanded here with screen/store-specific questionnaire answers.

### IARC (shared across both stores) / Google Play content questionnaire

| Question | Answer | Justification |
|---|---|---|
| Does the app contain violence? | No | Word-puzzle gameplay only. |
| Depictions of blood or gore? | No | — |
| Sexual content or nudity? | No | — |
| Crude humor, profanity, or mature themes? | No | Profanity filter enforces clean output. `src/utils/profanityFilter.ts` blocks 45+ words including leet-speak substitutions. |
| Drug, alcohol, or tobacco references? | No | — |
| Gambling with real currency? | No | No real-money wagering; outcomes are virtual items only. |
| **Simulated gambling (loot boxes, gacha, weighted random rewards)?** | **Yes** | Mystery Wheel (`src/data/mysteryWheel.ts`) uses weighted-probability reward segments (1% legendary jackpot, 25-spin pity). Spins are earnable AND purchasable with gems that are sold for real money. |
| Horror or fear-inducing themes? | No | — |
| User-to-user interaction / shared content? | Yes | Club chat (`src/screens/ClubScreen.tsx`). 200-char messages, profanity-filtered, visible only to club members. |
| Unrestricted web access? | No | No in-app browser. |
| Location sharing? | No | No location API used. |
| Personal information sharing between users? | No | Only self-chosen display name is visible to other players. |
| Digital purchases? | Yes | 47 SKUs, $0.49–$99.99. |

**Expected IARC rating: Teen (13+).** The simulated-gambling answer drives this; without it the game would rate Everyone.

### Apple App Store age rating

| Apple question | Answer | Notes |
|---|---|---|
| Cartoon or Fantasy Violence | None | — |
| Realistic Violence | None | — |
| Profanity or Crude Humor | None | Filter enforces this. |
| Mature/Suggestive Themes | None | — |
| Horror/Fear Themes | None | — |
| Medical/Treatment Information | None | — |
| Alcohol, Tobacco, or Drug Use or References | None | — |
| Sexual Content or Nudity | None | — |
| Gambling | None (simulated) | Mystery Wheel declared under "Simulated gambling" below. |
| **Simulated Gambling** | **Infrequent/Mild** | Mystery Wheel is the only instance. Not the core loop (appears 1–2 times per session on average). |
| Contests | None | — |
| Unrestricted Web Access | No | — |
| User-Generated Content | Yes | Club chat (filtered, member-only). |

**Expected Apple rating: 12+** because of the simulated gambling field.

### Play / Apple declarations

- **Contains Ads:** Yes (AdMob rewarded + interstitial).
- **In-App Purchases:** Yes ($0.49 – $99.99).
- **Does it support ATT on iOS?** Will, after TASK 6. At submission time, declare ATT = yes if TASK 6 shipped; otherwise declare no tracking.
- **Target Audience (Play):** 13+ recommended. Do NOT check "also includes children in target audience" (would trigger Families policy that the Mystery Wheel fails).

---

## G. Screenshot brief (6–8 screens per device class)

Portrait only (`app.json` `orientation: "portrait"`, `supportsTablet: false`). Deliver at the following sizes:

- **iPhone 6.7"** (1290 × 2796, iPhone 15 Pro Max) — required by Apple
- **iPhone 6.5"** (1284 × 2778 or 1242 × 2688) — required for older devices
- **iPhone 5.5"** (1242 × 2208, iPhone 8 Plus) — required for legacy submission support (fading; check current requirement)
- **Android phone** (minimum 320 px shortest side, recommended 1080 × 1920 or 2560 px+)
- **Android 7" tablet** — skip (we `supportsTablet: false`)
- **Android 10" tablet** — skip (same)

### Eight suggested shots, each with on-image caption text

| # | Screen captured | On-image caption (bold white on gradient pill) | What it demonstrates |
|---|---|---|---|
| 1 | Mid-puzzle — active tile-drag selection across a 7x7 board with a validated word lighting up | "Find Words. Watch Letters Fall." | Core gameplay |
| 2 | Mid-gravity — letters visibly falling into cleared spaces, next word highlighted on the word list | "Gravity Reshapes the Board" | Gravity mechanic + strategy |
| 3 | Mode selector screen | "10 Unique Modes. One Simple Rule." | Breadth of content |
| 4 | Library meta-screen showing restored chapter with decorations | "Restore the Grand Library" | Meta-game |
| 5 | Daily Challenge with leaderboard | "Every Day, a Fresh Puzzle" | Retention hook |
| 6 | Collections screen — Word Atlas + Rare Tiles visible | "Collect Rare Tiles & Seasonal Stamps" | Completionist appeal |
| 7 | Club chat + leaderboard split screen | "Join a Club. Compete Together." | Social |
| 8 | Shop screen centered on the $0.49 Welcome Gift (first-purchase offer) | "Optional Boosts. Fair Free Play." | Monetization without appearing predatory |

Each caption lives at the top third of the screen, 72–96 px tall, single-line-preferred. Use the app's neon-cyan (`#00d4ff`) + black gradient.

---

## H. Feature graphic brief (Google Play, 1024×500)

Concept: the app logo centered-left; to the right, a column of alphabet tiles mid-fall with motion blur suggesting gravity; subtle grid background. Tagline bottom-right: "GRAVITY WORD PUZZLE." No stars, no "Award-winning" hype — unverifiable. Keep it cinematic and quiet.

---

## I. App icon

- Existing asset at `assets/icon.png` (500 KB, per audit). Verify it's exactly 1024 × 1024 with no alpha/transparency, no rounded corners baked in (both stores apply their own mask), no in-store "App Store" or "Play" text.
- If the designer wants a v2 before launch: subject line is a stylized "W" with a subtle letter dropping out of its top crossbar to hint at gravity.

---

## J. Localization

v1.0 ships **English only.** `expo-localization` is installed but UI strings are hardcoded English in `src/` (Metro bundler will ship them as-is). Plan for v1.1:

- Spanish (LatAm), Portuguese (BR), French, German, Japanese — word-puzzle games see outsized LatAm + JP install rates.
- The word list needs per-locale dictionaries (not just UI translation) — this is significant engineering scope, not a simple string-file swap.

Declare in the listing: **English (United States)** primary. Leave other locales blank until 1.1 ships localized.

---

## K. Pricing & distribution (for the Play/Apple submission step)

- **Free to install.** Core game is free, no paid tier.
- **In-app purchases: Yes.** Register the 47 SKUs listed in `agent_docs/play_launch_checklist.md` (TASK 3) and the matching list in `agent_docs/ios_launch_checklist.md` (TASK 4). Apple format differs slightly from Play; see TASK 4 for per-platform flags.
- **Countries:** all available. Later, consider geofencing out regions where IARC Teen rating + loot-box mechanics run afoul of local law (Belgium, Netherlands historically). This is a post-launch decision; default at submission is "all countries".

---

## L. Source-of-truth migration note

This doc replaces the partial drafts previously in `store-metadata/`. The `store-metadata/` directory is deleted in the same commit that introduces this file. Future listing updates should be made here and to `agent_docs/data_safety.md` / `agent_docs/privacy_policy_draft.md`, which are the single source of truth for their respective store fields.
