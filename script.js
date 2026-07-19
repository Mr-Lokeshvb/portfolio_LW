const root = document.documentElement;
const header = document.querySelector("[data-elevate]");
const menuToggle = document.querySelector(".menu-toggle");
const navLinks = [...document.querySelectorAll(".site-nav a")];
const themeToggle = document.querySelector("[data-theme-toggle]");
const filterButtons = [...document.querySelectorAll("[data-filter]")];
const projectCards = [...document.querySelectorAll(".project-card")];
const revealTargets = [...document.querySelectorAll(".section, .project-card, .skill-meter")];
const canvas = document.querySelector("#signalCanvas");

function applyFilter(selected) {
  filterButtons.forEach((item) => item.classList.toggle("active", item.dataset.filter === selected));
  projectCards.forEach((card) => {
    const shouldShow = selected === "all" || card.dataset.category === selected;
    card.classList.toggle("is-hidden", !shouldShow);
  });
  buildRoad();
}
const ctx = canvas.getContext("2d");
const roadLayer = document.querySelector(".scroll-road");
const roadSvg = document.querySelector(".road-svg");
const roadTrack = document.querySelector("[data-road-track]");
const roadDash = document.querySelector("[data-road-dash]");
const roadShadow = document.querySelector("[data-road-shadow]");
const roadCar = document.querySelector("[data-road-car]");
const roadSigns = [...document.querySelectorAll("[data-road-sign]")];
const turnSigns = [...document.querySelectorAll("[data-turn-sign]")];
const biomeScenes = [...document.querySelectorAll("[data-biome-scene]")];
const biomes = [
  { name: "city", start: 0, end: 0.18 },
  { name: "rainforest", start: 0.15, end: 0.38 },
  { name: "desert", start: 0.35, end: 0.56 },
  { name: "tech", start: 0.53, end: 0.78 },
  { name: "finish", start: 0.75, end: 1 },
];

let points = [];
let width = 0;
let height = 0;
let roadLength = 0;
let ticking = false;

const savedTheme = localStorage.getItem("portfolio-theme");
if (savedTheme) {
  root.classList.toggle("light", savedTheme === "light");
} else {
  // Default to light mode on first visit
  root.classList.add("light");
}

revealTargets.forEach((target) => target.setAttribute("data-reveal", ""));

function setHeaderState() {
  header.classList.toggle("is-elevated", window.scrollY > 12);
}

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const count = Math.max(42, Math.floor((width * height) / 28000));
  points = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.28,
    vy: (Math.random() - 0.5) * 0.28,
    r: Math.random() * 1.7 + 0.6,
  }));
}

function buildRoad() {
  const documentHeight = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight,
    window.innerHeight
  );
  const roadWidth = roadLayer.clientWidth;
  const top = Math.min(180, window.innerHeight * 0.22);
  const bottom = documentHeight - Math.min(180, window.innerHeight * 0.18);
  const left = roadWidth * 0.22;
  const right = roadWidth * 0.78;
  const center = roadWidth * 0.5;
  const segmentCount = Math.max(7, Math.round(documentHeight / 620));
  const step = (bottom - top) / segmentCount;
  let path = `M ${center} ${top}`;

  for (let index = 1; index <= segmentCount; index += 1) {
    const y = top + step * index;
    const targetX = index % 2 === 0 ? left : right;
    const controlX = index % 2 === 0 ? right : left;
    const controlY = y - step * 0.46;
    path += ` Q ${controlX} ${controlY} ${targetX} ${y}`;
  }

  [roadTrack, roadDash, roadShadow].forEach((roadPath) => roadPath.setAttribute("d", path));
  roadLayer.style.height = `${documentHeight}px`;
  roadSvg.setAttribute("viewBox", `0 0 ${roadWidth} ${documentHeight}`);
  roadSvg.setAttribute("width", roadWidth);
  roadSvg.setAttribute("height", documentHeight);
  roadLength = roadTrack.getTotalLength();
  roadDash.style.strokeDasharray = "3 24";

  positionBiomes(documentHeight);
  positionRoadSigns();
  positionTurnSigns();
  updateRoadProgress();
}

function positionBiomes(documentHeight) {
  biomeScenes.forEach((scene) => {
    const biome = biomes.find((item) => item.name === scene.dataset.biomeScene);
    if (!biome) return;

    const top = documentHeight * biome.start;
    const height = Math.max(620, documentHeight * (biome.end - biome.start));
    scene.style.top = `${top}px`;
    scene.style.height = `${height}px`;
  });
}

function positionRoadSigns() {
  if (!roadLength) return;
  const roadWidth = roadLayer.clientWidth;

  roadSigns.forEach((sign, index) => {
    const progress = Number(sign.dataset.roadSign);
    const point = roadTrack.getPointAtLength(roadLength * progress);
    const side = index % 2 === 0 ? -1 : 1;
    const offset = roadWidth < 320 ? 48 : 64;
    const x = Math.min(roadWidth - 42, Math.max(42, point.x + side * offset));

    sign.style.left = `${x}px`;
    sign.style.top = `${point.y}px`;
  });
}

function positionTurnSigns() {
  if (!roadLength) return;

  turnSigns.forEach((sign, index) => {
    const progress = Number(sign.dataset.turnSign);
    const point = roadTrack.getPointAtLength(roadLength * progress);
    const next = roadTrack.getPointAtLength(Math.min(roadLength, roadLength * progress + 32));
    const side = next.x > point.x ? -1 : 1;
    const roadWidth = roadLayer.clientWidth;
    const offset = roadWidth < 320 ? 46 : 62;
    const x = Math.min(roadWidth - 38, Math.max(38, point.x + side * offset));
    const y = point.y - (index % 2 === 0 ? 26 : -18);

    sign.style.left = `${x}px`;
    sign.style.top = `${y}px`;
  });
}

function updateRoadProgress() {
  if (!roadLength) return;

  const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
  const currentLength = roadLength * progress;
  const point = roadTrack.getPointAtLength(currentLength);
  const lookAhead = roadTrack.getPointAtLength(Math.min(roadLength, currentLength + 18));
  const lookBehind = roadTrack.getPointAtLength(Math.max(0, currentLength - 18));
  const angle = Math.atan2(lookAhead.y - point.y, lookAhead.x - point.x) * (180 / Math.PI);
  const turnDelta = lookAhead.x - lookBehind.x;
  const activeBiome = [...biomes]
    .reverse()
    .find((biome) => progress >= biome.start && progress <= biome.end);

  roadLayer.dataset.biome = activeBiome ? activeBiome.name : "city";
  roadCar.style.left = `${point.x}px`;
  roadCar.style.top = `${point.y}px`;
  roadCar.style.transform = `translate(-50%, -50%) rotate(${angle + 90}deg)`;
  roadCar.style.setProperty("--steer", `${Math.max(-4, Math.min(4, turnDelta * 0.08))}deg`);
}

function requestRoadUpdate() {
  if (ticking) return;

  ticking = true;
  requestAnimationFrame(() => {
    updateRoadProgress();
    ticking = false;
  });
}

function drawSignal() {
  ctx.clearRect(0, 0, width, height);
  const isLight = root.classList.contains("light");
  const dot = isLight ? "rgba(8, 126, 111, 0.42)" : "rgba(94, 224, 184, 0.5)";
  const line = isLight ? "rgba(8, 126, 111, 0.13)" : "rgba(94, 224, 184, 0.16)";

  for (const point of points) {
    point.x += point.vx;
    point.y += point.vy;

    if (point.x < 0 || point.x > width) point.vx *= -1;
    if (point.y < 0 || point.y > height) point.vy *= -1;

    ctx.beginPath();
    ctx.arc(point.x, point.y, point.r, 0, Math.PI * 2);
    ctx.fillStyle = dot;
    ctx.fill();
  }

  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const a = points[i];
      const b = points[j];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);

      if (distance < 128) {
        ctx.globalAlpha = 1 - distance / 128;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = line;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  ctx.globalAlpha = 1;
  requestAnimationFrame(drawSignal);
}

function setActiveLink() {
  const scrollPosition = window.scrollY + 120;
  let activeId = "home";

  document.querySelectorAll("main section[id]").forEach((section) => {
    if (section.offsetTop <= scrollPosition) {
      activeId = section.id;
    }
  });

  navLinks.forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("href") === `#${activeId}`);
  });
}

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.18 }
);

revealTargets.forEach((target) => revealObserver.observe(target));

themeToggle.addEventListener("click", () => {
  root.classList.toggle("light");
  localStorage.setItem("portfolio-theme", root.classList.contains("light") ? "light" : "dark");
});

menuToggle.addEventListener("click", () => {
  const isOpen = header.classList.toggle("nav-open");
  document.body.classList.toggle("nav-open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    header.classList.remove("nav-open");
    document.body.classList.remove("nav-open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyFilter(button.dataset.filter);
  });
});

applyFilter("web");

window.addEventListener("scroll", () => {
  setHeaderState();
  setActiveLink();
  requestRoadUpdate();
});

window.addEventListener("resize", () => {
  resizeCanvas();
  buildRoad();
});
window.addEventListener("load", buildRoad);

resizeCanvas();
buildRoad();
drawSignal();
setHeaderState();
setActiveLink();
updateRoadProgress();
