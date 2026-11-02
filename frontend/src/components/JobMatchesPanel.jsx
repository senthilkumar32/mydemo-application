import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { FINISHED, useJobRun } from "../hooks/useJobRun";
import { startJobRun } from "../lib/api";
import JobCard, { SOURCE_NAMES } from "./JobCard";
import JobFilters, { DEFAULT_FILTERS, applyFilters } from "./JobFilters";

const STEP_TEXT = {
  queued: "Getting started",
  profiling: "Reading your resume for job titles and skills",
  searching: "Searching job boards",
  scoring: "Scoring jobs against your resume",
};

function progressText(run, matchCount) {
  if (!run) return null;
  const { status, progress } = run;
  if (status === "scoring" && progress.target) return `Scored ${progress.scored} of ${progress.target}`;
  if (!FINISHED.has(status)) return `${STEP_TEXT[status] ?? "Working"}…`;
  if (status === "cancelled") return `Stopped. ${matchCount} found before that.`;
  if (status === "failed") return null;
  return matchCount === 1 ? "1 job found" : `${matchCount} jobs found`;
}

// The live list of openings that fit the resume, filled in by a background
// search. `jobRun` is the run to follow; without one, `jobRunError` says why.
export default function JobMatchesPanel({ jobRun, jobRunError, analysisId, heading = "Jobs that fit your resume" }) {
  const { user, setJobAlerts } = useAuth();
  const [active, setActive] = useState(jobRun);
  const [startError, setStartError] = useState(jobRunError ?? null);
  const [starting, setStarting] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [location, setLocation] = useState("");
  const [alertsError, setAlertsError] = useState(null);
  const { run, matches, error, cancel } = useJobRun(active);

  const working = run && !FINISHED.has(run.status);
  const finished = run && FINISHED.has(run.status);
  const shown = applyFilters(matches, filters);
  const skeletons = working ? Math.min(3, run.progress.target ? run.progress.target - run.progress.scored : 3) : 0;
  const failedSources = (run?.failedSources ?? []).map((s) => SOURCE_NAMES[s] ?? s);

  // A new run for the same analysis: a retry, or a search near a chosen place.
  const searchAgain = async (extra = {}) => {
    setStarting(true);
    setStartError(null);
    try {
      const { jobRun: next } = await startJobRun({ analysisId: analysisId ?? active?.analysisId, ...extra }, active?.token);
      setActive(next);
    } catch (err) {
      setStartError(err.message);
    } finally {
      setStarting(false);
    }
  };

  const toggleAlerts = async (e) => {
    setAlertsError(null);
    try {
      await setJobAlerts(e.target.checked);
    } catch (err) {
      setAlertsError(err.message);
    }
  };

  const retryButton = (label) => (
    <button type="button" className="btn btn-small" onClick={() => searchAgain()} disabled={starting}>
      {starting ? "Starting…" : label}
    </button>
  );

  return (
    <section className="sheet jobs" aria-labelledby="jobs-heading">
      <div className="jobs-head">
        <h3 id="jobs-heading">{heading}</h3>
        {working && (
          <button type="button" className="link-button" onClick={cancel}>Stop</button>
        )}
        <p className="jobs-progress" aria-live="polite">{progressText(run, matches.length)}</p>
      </div>

      {!run && (
        <div className="jobs-state">
          <p>{startError ?? "We didn't start a job search for this resume."}</p>
          {(analysisId || active?.analysisId) && <div className="jobs-actions">{retryButton("Search for jobs")}</div>}
        </div>
      )}

      {matches.length > 0 && <JobFilters filters={filters} onChange={setFilters} />}

      {(shown.length > 0 || skeletons > 0) && (
        <ul className="job-list">
          {shown.map((m) => (
            <JobCard key={m.id} match={m} />
          ))}
          {Array.from({ length: skeletons }, (_, i) => (
            <li key={`skeleton-${i}`} className="job-skeleton" aria-hidden="true" />
          ))}
        </ul>
      )}

      {matches.length > 0 && shown.length === 0 && !working && (
        <p className="jobs-note">No jobs match these filters. Loosen them to see all {matches.length}.</p>
      )}

      {finished && matches.length === 0 && run.status !== "failed" && run.status !== "cancelled" && (
        <div className="jobs-state">
          <p>No openings matched, even after widening the search. Try a location, or add more of your tools and languages to your resume's skills section.</p>
          <form
            className="jobs-actions"
            onSubmit={(e) => {
              e.preventDefault();
              searchAgain({ location: location.trim() || undefined });
            }}
          >
            <label className="visually-hidden" htmlFor="jobs-location">City or country</label>
            <input
              id="jobs-location"
              className="jobs-location"
              placeholder="City or country"
              maxLength={100}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <button type="submit" className="btn btn-small" disabled={starting}>{starting ? "Starting…" : "Search again"}</button>
          </form>
        </div>
      )}

      {run?.status === "partial" && (
        <div className="jobs-state">
          <p className="jobs-note">We couldn't reach {failedSources.join(" and ")}, so this list may be missing some jobs.</p>
          <div className="jobs-actions">{retryButton("Try again")}</div>
        </div>
      )}
      {run?.status === "failed" && (
        <div className="jobs-state">
          <p className="error" role="alert">We couldn't finish this job search{matches.length ? "; here's what we found first" : ""}.</p>
          <div className="jobs-actions">{retryButton("Try again")}</div>
        </div>
      )}
      {run?.status === "cancelled" && <div className="jobs-actions">{retryButton("Search again")}</div>}

      {run && (startError || error) && <p className="error" role="alert">{startError || error}</p>}

      {user && (
        <div className="jobs-alerts">
          <label className="check-inline">
            <input type="checkbox" checked={Boolean(user.jobAlerts)} onChange={toggleAlerts} />
            Look for new matches every day
          </label>
          <p className="field-hint">New openings get a "New" badge here next time you visit.</p>
          {alertsError && <p className="error" role="alert">{alertsError}</p>}
        </div>
      )}
    </section>
  );
}
