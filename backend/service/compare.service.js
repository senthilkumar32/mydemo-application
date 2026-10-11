import { SKILLS } from "./skills.js";
import { HttpError, escapeRegExp } from "../utils.js";
import { config } from "../config/index.js";
import { cohereCompare } from "./cohere.service.js";

// Two engines, same return shape ({ score, present, missing, engine }):
// - Cohere AI, used when COHERE_API_KEY is set.
// - Keyword matching against skills.js, used without a key or when Cohere fails,
//   so an outage or a used-up allowance never blocks a user.
export const KEYWORD_ENGINE = "keyword-v1";

export async function compare(resumeText, jobDescription) {
  if (config.cohereApiKey) {
    try {
      const result = await cohereCompare(resumeText, jobDescription);
      return { ...result, engine: `cohere:${config.cohereModel}` };
    } catch (err) {
      console.warn(`Cohere comparison failed (${err.message}); falling back to keyword matching.`);
    }
  }
  return keywordCompare(resumeText, jobDescription);
}

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

function keywordCompare(resumeText, jobDescription) {
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

  return { score, present, missing, engine: KEYWORD_ENGINE };
}
