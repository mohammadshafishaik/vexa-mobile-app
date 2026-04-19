const REPO = "mohammadshafishaik/vexa-mobile-app";
const LATEST_RELEASE_API = `https://api.github.com/repos/${REPO}/releases/latest`;

const el = {
  downloadBtn: document.getElementById("downloadBtn"),
  statusLine: document.getElementById("statusLine"),
  releaseTag: document.getElementById("releaseTag"),
  releaseDate: document.getElementById("releaseDate"),
  assetName: document.getElementById("assetName"),
  assetSize: document.getElementById("assetSize"),
  assetSha: document.getElementById("assetSha"),
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
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
    const checksum = assets.find((asset) => String(asset.name || "").toLowerCase().endsWith(".sha256"));

    el.releaseTag.textContent = release.tag_name || "-";
    el.releaseDate.textContent = formatDate(release.published_at);
    el.releaseNotes.textContent = release.body || "No release notes provided.";
    el.assetSha.textContent = checksum ? checksum.name : "Available in release assets";

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
    el.statusLine.style.color = "#47d4ad";
  } catch (error) {
    console.error(error);
    el.statusLine.textContent = "Failed to load release data. Use 'View All Releases' as fallback.";
    el.statusLine.style.color = "#ff7b8f";
    el.releaseNotes.textContent = "Could not fetch release notes from GitHub API.";
    el.assetSha.textContent = "Unavailable";
  }
}

function setupRevealAnimation() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  items.forEach((item, index) => {
    item.style.transitionDelay = `${Math.min(index * 80, 360)}ms`;
    observer.observe(item);
  });
}

function setupCursorAndGlow() {
  const dot = document.getElementById("cursorDot");
  const ring = document.getElementById("cursorRing");
  if (!dot || !ring || window.matchMedia("(max-width: 980px)").matches) return;

  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let ringX = x;
  let ringY = y;

  const update = () => {
    ringX += (x - ringX) * 0.18;
    ringY += (y - ringY) * 0.18;
    dot.style.transform = `translate(${x}px, ${y}px)`;
    ring.style.transform = `translate(${ringX}px, ${ringY}px)`;
    requestAnimationFrame(update);
  };

  window.addEventListener("mousemove", (event) => {
    x = event.clientX;
    y = event.clientY;
    document.body.style.setProperty("--mx", `${event.clientX}px`);
    document.body.style.setProperty("--my", `${event.clientY}px`);
  });

  const magneticItems = document.querySelectorAll(".magnetic");
  magneticItems.forEach((item) => {
    item.addEventListener("mouseenter", () => {
      ring.style.width = "56px";
      ring.style.height = "56px";
      ring.style.borderColor = "rgba(99, 214, 255, 0.95)";
    });

    item.addEventListener("mouseleave", () => {
      ring.style.width = "34px";
      ring.style.height = "34px";
      ring.style.borderColor = "rgba(123, 211, 255, 0.55)";
    });
  });

  requestAnimationFrame(update);
}

function setupTiltCards() {
  const cards = document.querySelectorAll(".tilt");
  cards.forEach((card) => {
    card.addEventListener("mousemove", (event) => {
      const rect = card.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      const rotateY = (px - 0.5) * 7;
      const rotateX = (0.5 - py) * 7;
      card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
    });
  });
}

function setupFlowField() {
  const canvas = document.getElementById("flowField");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  let width = window.innerWidth;
  let height = window.innerHeight;
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  const pointer = { x: width * 0.5, y: height * 0.3 };

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  resize();

  const count = Math.min(Math.floor((width * height) / 21000), 82);
  const particles = Array.from({ length: Math.max(34, count) }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.48,
    vy: (Math.random() - 0.5) * 0.48,
    r: 1 + Math.random() * 1.7,
  }));

  const draw = () => {
    ctx.clearRect(0, 0, width, height);

    particles.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x <= 0 || p.x >= width) p.vx *= -1;
      if (p.y <= 0 || p.y >= height) p.vy *= -1;

      const dx = pointer.x - p.x;
      const dy = pointer.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 160) {
        p.vx -= dx * 0.000013;
        p.vy -= dy * 0.000013;
      }

      ctx.beginPath();
      ctx.fillStyle = "rgba(109, 199, 255, 0.85)";
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();

      for (let j = i + 1; j < particles.length; j += 1) {
        const p2 = particles[j];
        const ndx = p.x - p2.x;
        const ndy = p.y - p2.y;
        const nd = Math.hypot(ndx, ndy);
        if (nd < 108) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(99, 214, 255, ${0.22 - nd / 500})`;
          ctx.lineWidth = 1;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    });

    requestAnimationFrame(draw);
  };

  window.addEventListener("mousemove", (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  });

  window.addEventListener("resize", resize);
  requestAnimationFrame(draw);
}

setupRevealAnimation();
setupCursorAndGlow();
setupTiltCards();
setupFlowField();
loadRelease();
