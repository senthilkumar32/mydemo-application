// Mock resume parser — no backend. Results are generated deterministically
// from the file name + size so the same PDF always gets the same score.

export const SKILLS = [
  "JavaScript", "TypeScript", "React", "Node.js", "Python", "SQL",
  "Git", "Docker", "AWS", "REST APIs", "HTML/CSS", "Testing",
  "CI/CD", "Kubernetes", "GraphQL", "System Design", "Agile", "Communication",
];

export const LOADING_STEPS = ["Reading the text", "Finding your sections", `Matching ${SKILLS.length} skills`, "Adding up your score"];
export const STEP_MS = 600;
const MAX_SIZE = 5 * 1024 * 1024;

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

export function mockParse(file) {
  const rand = seededRandom(file.name + file.size);
  const shuffled = [...SKILLS].sort(() => rand() - 0.5);
  const presentCount = 6 + Math.floor(rand() * 9); // 6–14 skills found
  const present = shuffled.slice(0, presentCount);
  const missing = shuffled.slice(presentCount);
  const score = Math.min(98, Math.round((present.length / SKILLS.length) * 85 + rand() * 15));
  return { score, present, missing };
}

// Returns an error message, or null if the file is acceptable.
export function validateFile(file) {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return `${file.name} isn't a PDF. Export your resume as a PDF and drop it in again.`;
  }
  if (file.size > MAX_SIZE) {
    return `${file.name} is over 5 MB. Remove large images or compress the PDF, then try again.`;
  }
  return null;
}

export function scoreBand(score) {
  if (score >= 80) return { label: "Ready to send", summary: "You cover most of what hiring managers look for. Tighten the wording and apply." };
  if (score >= 60) return { label: "Almost there", summary: "A solid base. Adding two or three of the skills below would lift your score." };
  return { label: "Needs work", summary: "Several common skills are missing. Start with the first few in the list below." };
}
