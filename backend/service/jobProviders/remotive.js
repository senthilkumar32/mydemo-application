import { cleanText, fetchJson } from "./shared.js";

// Remotive remote-jobs API: https://remotive.com/api/remote-jobs
// No key needed. Remotive asks API users to request rarely and to credit and
// link back to them: results are cached for hours, and every card links to
// the Remotive posting and names the source.
// Every Remotive job is remote, so the search ignores location and seniority.
const SOURCE = "remotive";
const RESULTS_PER_TITLE = 50;
const MAX_TITLES = 2;

export default {
  name: SOURCE,
  cacheTtlMs: 6 * 60 * 60 * 1000,
  isConfigured: () => true,
  async search(profile) {
    const pages = await Promise.all(profile.titles.slice(0, MAX_TITLES).map((title) => fetchJson(SOURCE, searchUrl(title))));
    return pages.flatMap((page) => (page.jobs ?? []).map(normalize)).filter(Boolean);
  },
};

function searchUrl(title) {
  const url = new URL("https://remotive.com/api/remote-jobs");
  url.search = new URLSearchParams({ search: title, limit: String(RESULTS_PER_TITLE) });
  return url;
}

// One Remotive job → our Job shape, or null when it lacks what we need.
export function normalize(job) {
  if (!job?.id || !job.title || !job.url) return null;
  return {
    source: SOURCE,
    externalId: String(job.id),
    title: cleanText(job.title, 300),
    company: cleanText(job.company_name, 200),
    // Where candidates may live, e.g. "USA Only" or "Worldwide".
    location: cleanText(job.candidate_required_location, 200) || "Remote",
    remote: true,
    url: job.url,
    description: cleanText(job.description),
    postedAt: job.publication_date ? new Date(job.publication_date) : undefined,
  };
}
