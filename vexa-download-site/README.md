# VEXA Download Site

Premium static download experience for VEXA Android releases.

This site automatically fetches the latest GitHub release, detects the APK asset, and presents a branded install flow with animated visuals.

## Highlights

- Live release sync from GitHub API.
- APK name, size, tag, and publish metadata display.
- Release notes panel for instant changelog visibility.
- Interactive UI effects: flow-field background, reveal animations, tilt cards, cursor glow.
- Mobile-friendly responsive layout.

## Folder Contents

- [index.html](index.html): page structure and content regions.
- [styles.css](styles.css): visual theme, animation system, responsive rules.
- [app.js](app.js): release fetch logic and interactive effects.
- [assets/icon.png](assets/icon.png): VEXA brand icon used on page.
- [vercel.json](vercel.json): hosting headers and URL behavior.

## Local Preview

Quick open:

```bash
cd vexa-download-site
open index.html
```

Or serve with a local static server:

```bash
cd vexa-download-site
npx serve .
```

## Deployment

### Vercel (Production)

```bash
cd vexa-download-site
vercel --prod --yes
```

Public alias (current):

- https://vexa-download-site.vercel.app

### GitHub Pages

Published from the `gh-pages` branch.

Live URL:

- https://mohammadshafishaik.github.io/vexa-mobile-app/

## Data Source

Release endpoint:

- https://api.github.com/repos/mohammadshafishaik/vexa-mobile-app/releases/latest

Expected assets:

- One `.apk` asset for install button target.
- Optional `.sha256` checksum asset (displayed in metadata panel).

## Customization Notes

- Update colors and visual identity in [styles.css](styles.css).
- Update interaction behavior in [app.js](app.js).
- Replace logo by updating [assets/icon.png](assets/icon.png).

## Troubleshooting

- If APK button is disabled: verify latest release contains `.apk` file.
- If release notes do not load: check GitHub API rate limits or network restrictions.
- If Vercel URL shows auth screen: use the project alias URL instead of protected deployment URL.
