import { config } from "../../config/index.js";
import { ProviderError, cleanText, fetchJson } from "./shared.js";

// Adzuna job search API: https://developer.adzuna.com/docs/search
// Note: Adzuna returns a short snippet of each description, not the full posting.
const SOURCE = "adzuna";
const RESULTS_PER_TITLE = 25;
const MAX_TITLES = 2;
// Words added to the search for each level; "mid" and "unknown" add none.
const SENIORITY_WORDS = { intern: "intern", junior: "junior", senior: "senior", lead: "lead" };

export default {
  name: SOURCE,
  // Saves API quota when the same search runs again soon (retries, refreshes).
  cacheTtlMs: 60 * 60 * 1000,
  isConfigured: () => Boolean(config.adzunaAppId && config.adzunaAppKey),
  async search(profile) {
    if (!this.isConfigured()) throw new ProviderError(SOURCE, "ADZUNA_APP_ID and ADZUNA_APP_KEY are not set");
    const pages = await Promise.all(profile.titles.slice(0, MAX_TITLES).map((title) => fetchJson(SOURCE, searchUrl(title, profile))));
    return pages.flatMap((page) => (page.results ?? []).map(normalize)).filter(Boolean);
  },
};

function searchUrl(title, profile) {
  const url = new URL(`https://api.adzuna.com/v1/api/jobs/${config.adzunaCountry}/search/1`);
  url.search = new URLSearchParams({
    app_id: config.adzunaAppId,
    app_key: config.adzunaAppKey,
    results_per_page: String(RESULTS_PER_TITLE),
    what: [SENIORITY_WORDS[profile.seniority], title, profile.remoteOnly && "remote"].filter(Boolean).join(" "),
    "content-type": "application/json",
  });
  if (profile.location) url.searchParams.set("where", profile.location);
  return url;
}

// One Adzuna result → our Job shape, or null when it lacks what we need.
export function normalize(result) {
  if (!result?.id || !result.title || !result.redirect_url) return null;
  // Titles come with <strong> highlighting around the search words.
  const title = cleanText(result.title, 300);
  const description = cleanText(result.description);
  return {
    source: SOURCE,
    externalId: String(result.id),
    title,
    company: cleanText(result.company?.display_name, 200),
    location: cleanText(result.location?.display_name, 200),
    remote: /\bremote\b/i.test(`${title} ${description}`),
    salary: result.salary_min || result.salary_max ? { min: result.salary_min, max: result.salary_max } : undefined,
    url: result.redirect_url,
    description,
    postedAt: result.created ? new Date(result.created) : undefined,
  };
}
