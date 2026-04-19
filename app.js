const REPO = "mohammadshafishaik/vexa-mobile-app";
const LATEST_RELEASE_API = `https://api.github.com/repos/${REPO}/releases/latest`;

const el = {
  downloadBtn: document.getElementById("downloadBtn"),
  statusLine: document.getElementById("statusLine"),
  releaseTag: document.getElementById("releaseTag"),
  releaseDate: document.getElementById("releaseDate"),
  assetName: document.getElementById("assetName"),
  assetSize: document.getElementById("assetSize"),
  releaseNotes: document.getElementById("releaseNotes"),
};

const formatBytes = (bytes) => {
  if (!bytes || Number.isNaN(bytes)) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let idx = 0;
  while (size >= 1024 && idx < units.length - 1) {
    size /= 1024;
    idx += 1;
  }
  return `${size.toFixed(2)} ${units[idx]}`;
};

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  return d.toLocaleString();
};

async function loadRelease() {
  try {
    const response = await fetch(LATEST_RELEASE_API, {
      headers: {
        Accept: "application/vnd.github+json",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API responded ${response.status}`);
    }

    const release = await response.json();
    const assets = Array.isArray(release.assets) ? release.assets : [];
    const apk = assets.find((asset) => String(asset.name || "").toLowerCase().endsWith(".apk"));

    el.releaseTag.textContent = release.tag_name || "-";
    el.releaseDate.textContent = formatDate(release.published_at);
    el.releaseNotes.textContent = release.body || "No release notes provided.";

    if (!apk) {
      el.assetName.textContent = "No APK found";
      el.assetSize.textContent = "-";
      el.statusLine.textContent = "Latest release found, but no APK asset was attached.";
      el.statusLine.style.color = "#ffb257";
      el.downloadBtn.textContent = "APK not available";
      el.downloadBtn.setAttribute("aria-disabled", "true");
      return;
    }

    el.assetName.textContent = apk.name;
    el.assetSize.textContent = formatBytes(apk.size);

    el.downloadBtn.href = apk.browser_download_url;
    el.downloadBtn.textContent = `Download ${apk.name}`;
    el.downloadBtn.setAttribute("aria-disabled", "false");

    el.statusLine.textContent = "Latest APK is ready to download.";
    el.statusLine.style.color = "#28c38a";
  } catch (error) {
    console.error(error);
    el.statusLine.textContent = "Failed to load release data. Use 'View All Releases' as fallback.";
    el.statusLine.style.color = "#ff6f7f";
    el.releaseNotes.textContent = "Could not fetch release notes from GitHub API.";
  }
}

loadRelease();
