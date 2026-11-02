// Helpers every job provider uses.
//
// A provider is { name, cacheTtlMs?, isConfigured(), search(profile) → Promise<Job[]> }
// where each Job is
// { source, externalId, title, company, location, remote, salary?, url, description, postedAt? }.
// The agent caches each provider's results per query for cacheTtlMs.

const TIMEOUT_MS = 10000;
const MAX_DESCRIPTION_CHARS = 8000;

export class ProviderError extends Error {
  constructor(source, message) {
    super(message);
    this.source = source;
  }
}

export async function fetchJson(source, url, { headers } = {}) {
  let res;
  try {
    res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    throw new ProviderError(source, err.name === "TimeoutError" ? "request timed out" : `network error: ${err.message}`);
  }
  if (!res.ok) throw new ProviderError(source, `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  try {
    return await res.json();
  } catch {
    throw new ProviderError(source, "reply was not valid JSON");
  }
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'", nbsp: " " };

// Job text from other sites is untrusted HTML: keep only plain text, cut to length.
export const cleanText = (text, max = MAX_DESCRIPTION_CHARS) =>
  String(text ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(amp|lt|gt|quot|apos|#39|nbsp);/g, (_, name) => ENTITIES[name])
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
