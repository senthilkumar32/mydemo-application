export const DEFAULT_FILTERS = { remoteOnly: false, minScore: 0, sort: "score" };

// Narrows and orders the matches already loaded; nothing is fetched again.
export function applyFilters(matches, { remoteOnly, minScore, sort }) {
  const shown = matches.filter((m) => (!remoteOnly || m.job.remote) && m.score >= minScore);
  if (sort === "date") shown.sort((a, b) => new Date(b.job.postedAt ?? 0) - new Date(a.job.postedAt ?? 0));
  return shown;
}

export default function JobFilters({ filters, onChange }) {
  return (
    <div className="job-filters">
      <label className="check-inline">
        <input type="checkbox" checked={filters.remoteOnly} onChange={(e) => onChange({ ...filters, remoteOnly: e.target.checked })} />
        Remote only
      </label>
      <label>
        Score
        <select value={filters.minScore} onChange={(e) => onChange({ ...filters, minScore: Number(e.target.value) })}>
          <option value={0}>Any</option>
          <option value={50}>50+</option>
          <option value={70}>70+</option>
        </select>
      </label>
      <label>
        Sort
        <select value={filters.sort} onChange={(e) => onChange({ ...filters, sort: e.target.value })}>
          <option value="score">Best match</option>
          <option value="date">Newest</option>
        </select>
      </label>
    </div>
  );
}
