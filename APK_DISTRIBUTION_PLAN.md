# APK Distribution Plan and Execution

## Goal

Distribute the Android app without Play Store by using:

1. A dedicated download website.
2. GitHub Releases as the trusted APK source.
3. Vercel deployment for the download website.
4. GitHub Actions automation for future releases.

## What Was Implemented

1. `vexa-download-site/` static website:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `vercel.json`
   - `assets/icon.png`
2. GitHub Actions release workflow:
   - `.github/workflows/android-release.yml`
3. This runbook file.

## Distribution Architecture

1. APK binary is attached to each GitHub Release.
2. Download site reads latest release using GitHub API.
3. Download button always points to latest APK asset.
4. Users install APK directly from browser.

## Immediate One-Time Setup

### 1. Deploy Download Website

```bash
cd vexa-download-site
vercel --prod --yes
```

Save the generated website URL.

### 2. Publish First Release (manual local)

```bash
cd /path/to/repo-root
gh release create v1.0.0 VEXA-final.apk \
  --repo mohammadshafishaik/vexa-mobile-app \
  --title "VEXA v1.0.0" \
  --notes "Initial public APK release."
```

### 3. Verify Website Download

1. Open deployed website URL.
2. Confirm latest tag and APK name load.
3. Click download button and verify APK file downloads.

## Ongoing Release Process

### Option A: Automated (recommended)

Push a tag and let GitHub Actions build + publish APK:

```bash
git tag v1.0.1
git push origin v1.0.1
```

Workflow will:

1. Build release APK.
2. Generate SHA-256 checksum.
3. Publish release with APK + checksum.

### Option B: Manual Dispatch from GitHub Actions UI

1. Open workflow `Android Release`.
2. Run workflow with:
   - `release_tag` (example `v1.0.2`)
   - optional `release_name`

## Security and Trust Notes

1. Always download from your own release links.
2. Keep checksum file (`.sha256`) in every release.
3. Do not share debug APK builds publicly.
4. Rotate signing credentials only with migration plan.

## User Installation Instructions

1. Open your download website.
2. Tap Download Latest APK.
3. Allow install from unknown apps when prompted.
4. Install and open VEXA.

## Recommended Future Enhancements

1. Add changelog rendering with markdown formatting.
2. Add API fallback to a pinned release URL.
3. Add telemetry for download counts (privacy-safe).
4. Add custom domain for the download site.
