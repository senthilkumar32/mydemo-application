import { SKILLS } from "./skills.js";
import { HttpError, escapeRegExp } from "../utils.js";

// Keyword engine: finds the skills the JD asks for, then checks which ones the
// resume mentions. This is the seam where the AI comparison will plug in later —
// keep the return shape ({ score, present, missing, engine }) the same.
export const ENGINE = "keyword-v1";


// A term only counts as a whole word, so "Go" doesn't match "good" and
// "Java" doesn't match "JavaScript". Symbols like + # . are part of a word
// so "C" never matches "C++" or "C#".
const wordPattern = (terms, flags) =>
  new RegExp(`(?<![\\w+#.])(?:${terms.map(escapeRegExp).join("|")})(?![\\w+#])`, flags);

const matchers = SKILLS.map(({ name, aliases, exactName }) => {
  const anyCase = exactName ? aliases : [name, ...aliases];
  const patterns = [];
  if (anyCase.length) patterns.push(wordPattern(anyCase, "i"));
  if (exactName) patterns.push(wordPattern([name], ""));
  return { name, patterns };
});

const skillsIn = (text) => matchers.filter((m) => m.patterns.some((p) => p.test(text))).map((m) => m.name);

export function compare(resumeText, jobDescription) {
  const wanted = skillsIn(jobDescription);
  if (wanted.length === 0) {
    throw new HttpError(
      422,
      "We couldn't spot any skills in that job description. Paste the full posting, including the requirements section.",
      "jobDescription"
    );
  }

  const found = new Set(skillsIn(resumeText));
  const present = wanted.filter((s) => found.has(s));
  const missing = wanted.filter((s) => !found.has(s));
  const score = Math.round((present.length / wanted.length) * 100);

  return { score, present, missing, engine: ENGINE };
}
