# Wordfall LiveOps — Remote Config Authoring

Two Remote Config keys drive live-ops changes without a new build:

- `eventCalendarOverride` — main/mini events on top of the built-in calendar
- `dailyDealOverride` — replaces today's flash-sale deal

Both default to empty string. When empty, the app falls back to the built-in
calendar (`src/data/events.ts`, `src/data/eventLayers.ts`) and the hashed
default flash sale (`src/data/dynamicPricing.ts`).

Changes take effect on the next app cold start (Remote Config fetch on
`App.tsx` boot). Authors do not need a rebuild.

---

## `eventCalendarOverride` — event calendar

### Schema

```json
{
  "events": [
    {
      "id": "rc_spring_splash",
      "type": "main",
      "name": "Spring Splash",
      "description": "Double coins on every chain!",
      "icon": "🌸",
      "endTime": 1717200000000,
      "multipliers": {
        "coins": 2,
        "xp": 1.5,
        "rareTileChance": 1.25
      }
    },
    {
      "id": "rc_hint_happy_hour",
      "type": "mini",
      "name": "Hint Happy Hour",
      "description": "Free hint every 5 minutes for 24h",
      "icon": "💡",
      "endTime": 1717286400000
    }
  ]
}
```

### Rules

- `id` — unique; prefix `rc_` to avoid collisions with built-ins.
- `type` — `"main"` or `"mini"`. Mini events stack on top of main events.
- `endTime` — epoch ms. Events with `endTime < now` are skipped.
- `multipliers` (optional) — any of `coins`, `xp`, `rareTileChance`. Default to
  1 when omitted. Remote multipliers compose with built-in multipliers.
- If the JSON is empty or malformed, the built-in calendar is used.

### Verification after publishing

1. Force-close and reopen the app.
2. Home screen "Events" banner should reflect the new entry.
3. Completing a puzzle should show the new multiplier applied to the reward.

---

## `dailyDealOverride` — today's flash sale

### Schema

```json
{
  "productId": "starter_pack",
  "name": "Launch Week Deal",
  "icon": "🎁",
  "description": "500 Coins + 50 Gems + 10 Hints",
  "originalPrice": "$4.99",
  "originalPriceAmount": 4.99,
  "discountPercent": 50,
  "endTime": 1717286400000,
  "disabled": false
}
```

### Rules

- `productId`, `name`, `icon`, `description`, `originalPriceAmount`,
  `discountPercent` — all required.
- `originalPrice` — optional display string; auto-formatted from
  `originalPriceAmount` when omitted.
- `discountPercent` — 0 to 90 inclusive. Values outside the range fall
  back to the built-in hashed deal.
- `endTime` — optional epoch ms. If set, the shop countdown shows hours
  until that time; if omitted, the countdown ends at local midnight.
- `disabled: true` — force "no deal today" regardless of the date hash.
  All other fields ignored in this mode.
- Malformed JSON falls through to the built-in hashed deal (no crash).

### Verification after publishing

1. Open the Shop screen. The "Flash Sale" card should match the override.
2. Countdown hours should reflect `endTime` (or midnight).
3. Tapping the card should initiate IAP for the `productId` (Play Console
   catalog must have a matching SKU).

---

## Troubleshooting

- **Override not showing up** — confirm `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
  matches the Firebase project you edited. Remote Config has per-project
  isolation.
- **Multipliers look wrong** — `eventCalendarOverride` multipliers compose
  multiplicatively with built-in multipliers. Halve the remote value to
  offset a default that's already 2×.
- **Deal still showing after disable** — the client caches the last fetch
  for 12h. Force-close and reopen, or push a new empty override
  (`{"disabled": true}`) and wait for cache expiry.
- **JSON validation** — the app accepts empty string as "no override", so
  an invalid JSON payload is safer than an empty key (no behavior change
  vs. the malformed path).

---

## Files

- `src/services/remoteConfig.ts` — defaults + `getRemoteString` accessor.
- `src/services/eventManager.ts` — `parseRemoteEvents` + apply-on-mount.
- `src/data/dynamicPricing.ts` — `parseRemoteDailyDeal` + `getFlashSale`.
- Tests: `src/data/__tests__/dynamicPricing.override.test.ts`,
  `src/services/__tests__/eventManager.remote.test.ts` (when added).
