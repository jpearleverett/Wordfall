# Wordfall — Maestro E2E

Five smoke flows covering the golden paths a player walks through in
the first minute of installing Wordfall: launch, daily puzzle entry,
shop browse, settings toggle, and mode picker. The flows are
intentionally shallow — they verify navigation and rendering, not
deep gameplay correctness (that's what the 791-test Jest suite is
for).

## Install Maestro CLI

Maestro is a YAML-driven UI-test runner. It talks to the device via
`adb` (Android) or `idb` (iOS) and doesn't require any library to be
linked into the app.

### macOS / Linux

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
# Restart your shell or:
export PATH="$PATH":"$HOME/.maestro/bin"
maestro --version
```

### Windows

Use WSL2 and follow the Linux instructions above. Native Windows is
unsupported by Maestro.

### Termux

Not supported — Termux can't run `adb` against the device it's hosted
on. Run Maestro from a laptop/desktop connected to the same ADB server
your phone is paired to.

## Prerequisites per platform

**Android**
- USB debugging enabled on the phone (Settings → About → tap Build
  number 7×, then Settings → System → Developer options → USB
  debugging).
- Phone plugged in and authorized. Check with `adb devices` — the
  phone should appear as a single device with status `device` (not
  `unauthorized`).
- The Wordfall dev client APK installed on the phone (`com.wordfall.app`).
  Build with:
  ```bash
  EAS_SKIP_AUTO_FINGERPRINT=1 eas build --profile development --platform android
  ```
  and install the downloaded APK.
- Metro running so the dev client can load the JS bundle:
  ```bash
  npx expo start --dev-client
  ```

**iOS**
- Xcode + `idb` installed (`brew tap facebook/fb && brew install idb-companion`,
  then `pipx install fb-idb`).
- A simulator or paired device with Wordfall installed.

## Run the flows

From the repo root:

```bash
npm run e2e              # runs every .yaml in .maestro/ in sequence
maestro test .maestro/01_app_launch.yaml    # single flow
maestro test .maestro/                      # same as npm run e2e
```

### Interactive authoring

```bash
maestro studio           # opens a live UI inspector — useful for
                         # discovering how to address a new element
```

### Continuous mode during development

```bash
maestro test --continuous .maestro/02_daily_puzzle.yaml
```

Re-runs the flow whenever the YAML changes, so you can iterate on
selectors without redeploying.

## Interpreting results

Each flow prints step-by-step progress, then a final summary:

- **`✓ Flow Passed`** — every step succeeded.
- **`✗ Flow Failed`** — a step threw. Maestro dumps the last
  screenshot to `~/.maestro/tests/<timestamp>/` so you can diff the
  expected vs actual UI. The CLI prints the exact step that failed
  (look for `Error:` before the stack trace).
- **`Flow completed with warnings`** — typically means an assertion
  was wrapped in `optional: true` or a soft-asserted subflow ran.
  Check the log but these aren't failures.

Useful flags while debugging:

```bash
maestro test --debug-output /tmp/maestro-debug .maestro/01_app_launch.yaml
```

Writes a full screen recording + per-step screenshots to the
specified directory — essential when a flow fails on CI but passes
locally.

## How the flows select elements

The flows address UI elements by, in order of preference:

1. **Visible text** — e.g. `tapOn: "Today's challenge"`. Matches the
   first visible `<Text>` containing that string.
2. **`accessibilityLabel`** — e.g. `tapOn: "Open shop"`. Maps to
   `contentDescription` on Android / `accessibilityLabel` on iOS.
   Used for icon-only buttons (gear, shop glyph).
3. **`testID`** — not used anywhere yet. If a future flow needs one
   because text is too ambiguous (e.g. multiple "Claim" buttons on
   the same screen), add the `testID` prop and reference it with
   `tapOn: { id: "my-button" }`.

## Coverage boundaries — what these flows do NOT cover

- **Completing a daily puzzle.** `02_daily_puzzle.yaml` only verifies
  that tapping the daily card opens the GameScreen. Running a real
  solve requires knowing which cells to drag to form valid words, and
  the board is seeded by date. Two paths forward when we want the
  victory-screen assertion in CI:
  1. Wire a dev-only `__DEV__`-gated "simulate win" debug button into
     GameHeader, then `tapOn: "Simulate win"` inside the flow.
  2. Pin the device clock via `adb shell date` before launch and
     hardcode the word list for that day's seed in the flow. Brittle.
- **IAP purchases.** Mock and real AdMob / IAP flows both show native
  UI that Maestro can't introspect. Run the full purchase path manually
  with Play Console internal-test sandbox accounts.
- **Animation correctness.** Maestro asserts on rendered DOM; it
  doesn't measure motion.
- **Network failure states.** For example, no flow asserts the
  ClubScreen empty state when Firestore is unreachable. Could be added
  with `adb shell svc wifi disable` before `launchApp`.
- **Onboarding tutorial phase.** The welcome → tutorial → celebrate
  path has an interactive guided-puzzle phase that depends on specific
  cell taps. The flows use "Skip tutorial" to bypass it. A dedicated
  onboarding flow that walks each guided step would need the cell
  coordinates per tutorial board — doable but out of scope for the
  v1.0 smoke suite.

## Branching on state

Several flows use Maestro's `runFlow: when: visible:` pattern to
handle both first-run and subsequent-run states (e.g. onboarding
shown vs. already-completed, daily puzzle available vs. already
done). This keeps the flows deterministic across test runs without
requiring a full app data wipe.

If you want a known-clean state:

```bash
adb shell pm clear com.wordfall.app    # Android — wipes app data
# iOS: delete + reinstall the app
```

## Adding a new flow

1. Copy one of the existing flows and rename. Keep the `NN_` prefix
   so flows run in order.
2. Use `maestro studio` to discover selectors interactively.
3. Prefer visible text > accessibilityLabel > testID in that order.
   Only add `testID` to JSX if text matching is genuinely ambiguous.
4. Add a leading comment block explaining what the flow covers and
   any known gaps.
5. Run `maestro test .maestro/<your-flow>.yaml` locally before
   committing.

## CI

No CI wiring yet. A future pass could add a GitHub Actions job that
boots an Android emulator, installs the built APK, and runs
`npm run e2e`. Maestro publishes a maintained action at
`mobile-dev-inc/action-maestro-cloud@v1` for the hosted option.
