# wordfallgamesite

Static site for **wordfallgame.app** — landing page, Privacy Policy, Terms of Service, support page, and Android App Links assetlinks.

## Files

```
.
├── index.html              # Landing page
├── privacy/index.html      # → https://wordfallgame.app/privacy
├── terms/index.html        # → https://wordfallgame.app/terms
├── support/index.html      # → https://wordfallgame.app/support
├── .well-known/
│   └── assetlinks.json     # Android App Links verification (NEEDS sha256 fingerprint)
├── _headers                # Cloudflare Pages headers (MIME, CSP, HSTS)
├── 404.html                # Custom 404 page
└── README.md               # This file
```

## Connect to Cloudflare Pages

1. Push this repo to GitHub.
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Select the `wordfallgamesite` repo.
4. Build settings:
   - **Framework preset**: None
   - **Build command**: *(leave empty)*
   - **Build output directory**: `/`  (root — there's nothing to build)
5. Click **Save and Deploy**. First deploy takes ~30 seconds.
6. Cloudflare gives you a `*.pages.dev` preview URL — verify all pages load.

## Connect your domain

1. In the Pages project → **Custom domains** → **Set up a custom domain**.
2. Enter `wordfallgame.app`.
3. Cloudflare auto-creates the DNS records if `wordfallgame.app` is on Cloudflare DNS. If it's not, follow the manual CNAME instructions Cloudflare shows.
4. Wait for HTTPS to provision (~5 minutes).
5. Verify:
   - https://wordfallgame.app → landing page
   - https://wordfallgame.app/privacy → Privacy Policy
   - https://wordfallgame.app/terms → Terms of Service
   - https://wordfallgame.app/support → Support
   - https://wordfallgame.app/.well-known/assetlinks.json → JSON (still has placeholder)

## Before you ship

- [x] ~~Replace `[Entity name]`~~ — set to **Iridescent Games** in both legal pages.
- [ ] **Replace `[Effective date]`** in both `privacy/index.html` and `terms/index.html` with the publish date (YYYY-MM-DD).
- [ ] **Replace `[Jurisdiction — e.g. "the State of Delaware, USA"]`** in `terms/index.html` Section 13 with your governing law.
- [ ] **Replace `[City, State]`** in `terms/index.html` Section 13 with your arbitration venue (usually where Iridescent Games is legally registered).
- [ ] **Have a lawyer skim the Terms of Service.** The template covers the standard ground but isn't legal advice.
- [ ] **Get the SHA-256 cert fingerprint** from Play Console (App integrity → App signing) once you've uploaded your first AAB, then **edit `.well-known/assetlinks.json`** to replace `REPLACE_WITH_YOUR_PLAY_APP_SIGNING_SHA256` with the real value.
- [ ] **Verify assetlinks** at https://developers.google.com/digital-asset-links/tools/generator — paste `wordfallgame.app` as the website and confirm "Statement list is valid".

## Optional polish

- Add a `favicon.png` (32×32 or 64×64) and `apple-touch-icon.png` (180×180) to the repo root.
- Add an Open Graph image at `/og.png` (1200×630) and reference it in `index.html`'s `<meta property="og:image">`.
- Add a Google Play badge image to the landing page once the app is live.

## License

The HTML/CSS in this repo is yours to do whatever you want with.
