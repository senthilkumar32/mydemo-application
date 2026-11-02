export const SOURCE_NAMES = { adzuna: "Adzuna", remotive: "Remotive" };

const DAY_MS = 24 * 60 * 60 * 1000;
const compact = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 0 });

function posted(date) {
  if (!date) return null;
  const days = Math.floor((Date.now() - new Date(date)) / DAY_MS);
  if (days <= 0) return "Posted today";
  if (days === 1) return "Posted yesterday";
  if (days < 30) return `Posted ${days} days ago`;
  return `Posted ${new Date(date).toLocaleDateString()}`;
}

function salary({ min, max } = {}) {
  if (!min && !max) return null;
  if (min && max && min !== max) return `${compact.format(min)}–${compact.format(max)}`;
  return compact.format(min || max);
}

function where(job) {
  if (!job.remote) return job.location;
  return job.location && job.location !== "Remote" ? `Remote · ${job.location}` : "Remote";
}

const scoreClass = (score) => (score >= 70 ? "is-high" : score < 40 ? "is-low" : "");

export default function JobCard({ match }) {
  const { job, score, present, missing, isNew } = match;
  const meta = [job.company, where(job), salary(job.salary)].filter(Boolean).join(" · ");
  const source = [posted(job.postedAt), `via ${SOURCE_NAMES[job.source] ?? job.source}`].filter(Boolean).join(" ");

  return (
    <li className="job-card">
      <div className="job-top">
        <div className="job-main">
          <h4 className="job-title">
            {job.title}
            {isNew && <span className="badge-new">New</span>}
          </h4>
          {meta && <p className="job-meta">{meta}</p>}
          <p className="job-meta">{source}</p>
        </div>
        <span className={`job-score ${scoreClass(score)}`} aria-label={`Match score ${score} out of 100`}>{score}</span>
      </div>

      {present.length > 0 && (
        <ul className="chips" aria-label="Skills you have">
          {present.slice(0, 6).map((skill) => (
            <li key={skill} className="chip">{skill}</li>
          ))}
        </ul>
      )}
      {missing.length > 0 && (
        <p className="job-missing">
          Missing: {missing.slice(0, 4).join(", ")}
          {missing.length > 4 && ` and ${missing.length - 4} more`}
        </p>
      )}

      <a className="btn btn-small btn-quiet" href={job.url} target="_blank" rel="noopener noreferrer">
        View and apply<span className="visually-hidden"> for {job.title} (opens in a new tab)</span>
      </a>
    </li>
  );
}
