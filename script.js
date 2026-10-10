// Mock resume parser — no backend. Results are generated deterministically
// from the file name + size so the same PDF always gets the same score.

const SKILLS = [
  "JavaScript", "TypeScript", "React", "Node.js", "Python", "SQL",
  "Git", "Docker", "AWS", "REST APIs", "HTML/CSS", "Testing",
  "CI/CD", "Kubernetes", "GraphQL", "System Design", "Agile", "Communication",
];

const LOADING_STEPS = ["Extracting text…", "Detecting sections…", "Matching skills…", "Calculating score…"];
const MAX_SIZE = 5 * 1024 * 1024;
const RING_LENGTH = 326.73; // 2 * PI * r (r = 52)

const $ = (id) => document.getElementById(id);
const dropzone = $("dropzone");
const fileInput = $("file-input");
const errorEl = $("error");
const loadingEl = $("loading");
const resultsEl = $("results");

// Simple string hash -> seeded pseudo-random generator
function seededRandom(seedStr) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function mockParse(file) {
  const rand = seededRandom(file.name + file.size);
  const shuffled = [...SKILLS].sort(() => rand() - 0.5);
  const presentCount = 6 + Math.floor(rand() * 9); // 6–14 skills found
  const present = shuffled.slice(0, presentCount);
  const missing = shuffled.slice(presentCount);
  const score = Math.min(98, Math.round((present.length / SKILLS.length) * 85 + rand() * 15));
  return { score, present, missing };
}

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.hidden = false;
}

function handleFile(file) {
  errorEl.hidden = true;
  if (!file) return;
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return showError("Please upload a PDF file.");
  }
  if (file.size > MAX_SIZE) {
    return showError("File is too large. Max size is 5 MB.");
  }

  dropzone.hidden = true;
  resultsEl.hidden = true;
  loadingEl.hidden = false;
  $("loading-file").textContent = file.name;

  let step = 0;
  $("loading-step").textContent = LOADING_STEPS[0];
  const timer = setInterval(() => {
    step++;
    if (step < LOADING_STEPS.length) {
      $("loading-step").textContent = LOADING_STEPS[step];
    } else {
      clearInterval(timer);
      renderResults(file.name, mockParse(file));
    }
  }, 600);
}

function scoreBand(score) {
  if (score >= 80) return { label: "Excellent", color: "var(--green)", summary: "Your resume is ship-ready. Strong skill coverage across the board." };
  if (score >= 60) return { label: "Good", color: "var(--amber)", summary: "Solid foundation. Add a few missing skills to stand out." };
  return { label: "Needs work", color: "var(--red)", summary: "Several in-demand skills are missing. Focus on the gaps below." };
}

function renderChips(listEl, items) {
  listEl.innerHTML = "";
  items.forEach((skill) => {
    const li = document.createElement("li");
    li.textContent = skill;
    listEl.appendChild(li);
  });
}

function renderResults(fileName, { score, present, missing }) {
  loadingEl.hidden = true;
  resultsEl.hidden = false;

  const band = scoreBand(score);
  $("result-file").textContent = fileName;
  $("score-label").textContent = band.label;
  $("score-label").style.color = band.color;
  $("score-summary").textContent = band.summary;

  renderChips($("present-list"), present);
  renderChips($("missing-list"), missing);
  $("present-count").textContent = present.length;
  $("missing-count").textContent = missing.length;

  // Animate ring + number
  const ring = $("ring-fg");
  ring.style.setProperty("--ring-color", band.color);
  ring.style.strokeDashoffset = RING_LENGTH;
  requestAnimationFrame(() => {
    ring.style.strokeDashoffset = RING_LENGTH * (1 - score / 100);
  });

  const valueEl = $("score-value");
  const start = performance.now();
  const duration = 1200;
  (function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    valueEl.textContent = Math.round(score * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(tick);
  })(start);
}

function reset() {
  resultsEl.hidden = true;
  dropzone.hidden = false;
  fileInput.value = "";
}

// Events
fileInput.addEventListener("change", (e) => handleFile(e.target.files[0]));

["dragenter", "dragover"].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  })
);
["dragleave", "drop"].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
  })
);
dropzone.addEventListener("drop", (e) => handleFile(e.dataTransfer.files[0]));
$("reset").addEventListener("click", reset);
