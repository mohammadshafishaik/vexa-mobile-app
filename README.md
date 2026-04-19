# VEXA Download Site

Static website that shows latest GitHub Release metadata and APK download button.

## Local Preview

Open `index.html` directly or serve this folder with any static server.

## Deploy (Vercel CLI)

```bash
cd vexa-download-site
vercel --prod --yes
```

## Data Source

This site reads the latest release from:

`https://api.github.com/repos/mohammadshafishaik/vexa-mobile-app/releases/latest`

It expects at least one `.apk` file in release assets.
