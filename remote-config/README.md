# Remote Config payloads

Pre-staged Remote Config values, versioned in-repo so Ops can publish them
without hand-authoring JSON in the Firebase console.

## chapter-overrides-41-48.json

The first seasonal chapter drop: chapters 41–48 across two new wings
(`seasons`, `wonders`). Publishing it extends the world map past the 40
authored chapters with curated names, themes, 12-word theme lists,
generation profiles, and per-chapter palettes.

**To publish:**

1. Minify the file (only the object matters — the `version`/`notes` wrapper
   fields are ignored by the client parser):
   `node -e "console.log(JSON.stringify(require('./remote-config/chapter-overrides-41-48.json')))"`
2. Firebase console → Remote Config → key `chapterOverrideJson` → paste the
   minified JSON string as the value → Publish.
3. Clients pick it up on their next RC fetch; no rebuild needed.

**Guarantees:**

- Validated on the client by `src/utils/chapterSchema.ts` (`parseRemoteChapters`)
  — malformed entries are dropped individually, a malformed payload falls back
  to the static 40-chapter catalog. Never crashes.
- Pinned by `src/__tests__/proceduralCurve.test.ts`, which runs the real
  parser against this file — schema drift fails CI before it can ship.
- Overlay chapters append after id 40; they can never replace authored
  chapters. Board configs for levels 601+ still come from
  `getLevelConfigExtended` — the overlay changes chapter identity (name,
  theme, words, profile, palette), not the difficulty curve.
