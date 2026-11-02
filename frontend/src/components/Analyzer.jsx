import { useEffect, useRef, useState } from "react";
import { LOADING_STEPS, MAX_JD_LENGTH, STEP_MS, validateFile, validateJobDescription } from "../lib/analysis";
import { api, getLatestJobRun } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import Dropzone from "./Dropzone";
import Results from "./Results";
import JobMatchesPanel from "./JobMatchesPanel";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Check section: form (resume + JD) -> checking -> results.
export default function Analyzer() {
  const { user, openAuth } = useAuth();
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [errors, setErrors] = useState({});
  const [checking, setChecking] = useState(false);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null);
  // The background job search started with the analysis, or why it didn't start.
  const [jobSearch, setJobSearch] = useState({ jobRun: null, jobRunError: null });
  // A signed-in user's most recent job search, shown when they come back.
  const [latestRun, setLatestRun] = useState(null);
  // Who the page is showing results for. Bumped when that person signs out,
  // so a check still in flight for them never lands on the next person's page.
  const shownFor = useRef({ userId: user?.id, session: 0 });

  // Signing out (or switching accounts) clears the last check: the resume,
  // its score and its job matches belonged to the previous user. Signing in
  // keeps a check made while signed out, since it was made by the same person.
  useEffect(() => {
    const previous = shownFor.current.userId;
    shownFor.current.userId = user?.id;
    if (!previous || previous === user?.id) return;
    shownFor.current.session += 1;
    setFile(null);
    setJobDescription("");
    setErrors({});
    setChecking(false);
    setResult(null);
    setJobSearch({ jobRun: null, jobRunError: null });
  }, [user?.id]);

  useEffect(() => {
    setLatestRun(null);
    if (!user) return undefined;
    let live = true;
    getLatestJobRun()
      .then(({ jobRun }) => live && setLatestRun(jobRun))
      .catch(() => {}); // Optional extra: the form works without it.
    return () => {
      live = false;
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Walk through the checking steps while the server works; stop on the last one.
  useEffect(() => {
    if (!checking) return;
    setStep(0);
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), STEP_MS);
    return () => clearInterval(timer);
  }, [checking]);

  const handleFile = (picked) => {
    if (!picked) return;
    const message = validateFile(picked);
    setErrors((e) => ({ ...e, resume: message }));
    if (!message) setFile(picked);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const found = {
      resume: file ? null : "Add your resume as a PDF.",
      jobDescription: validateJobDescription(jobDescription),
    };
    setErrors(found);
    if (found.resume || found.jobDescription) return;

    const form = new FormData();
    form.append("resume", file);
    form.append("jobDescription", jobDescription);

    const session = shownFor.current.session;
    const stillShown = () => shownFor.current.session === session;
    setChecking(true);
    try {
      // Let the steps play through even when the server answers instantly.
      const [{ analysis, jobRun, jobRunError }] = await Promise.all([
        api("/analyses", { method: "POST", form }),
        wait(STEP_MS * LOADING_STEPS.length),
      ]);
      if (!stillShown()) return;
      setJobSearch({ jobRun, jobRunError });
      setResult(analysis);
    } catch (err) {
      if (stillShown()) setErrors({ [err.field ?? "form"]: err.message });
    } finally {
      if (stillShown()) setChecking(false);
    }
  };

  // Keep the JD so the next resume can be checked against the same job.
  // The job search keeps running on the server; this page just stops following it.
  const reset = () => {
    setFile(null);
    setResult(null);
    setJobSearch({ jobRun: null, jobRunError: null });
  };

  return (
    <section id="check" className="check">
      <div className="container">
        <div className={`check-body${result ? " is-wide" : ""}`}>
          <h2>Check your resume against a job</h2>
          <p className="section-intro">Add your resume and paste the job description. We pick out the skills the job asks for and mark which ones your resume covers.</p>

          {!checking && !result && (
            <form className="check-form" onSubmit={onSubmit} noValidate>
              <div className="check-step">
                <p className="check-label">1. Your resume</p>
                <Dropzone file={file} onFile={handleFile} invalid={errors.resume} />
                {errors.resume && <p className="error" role="alert">{errors.resume}</p>}
              </div>

              <div className="check-step">
                <label className="check-label" htmlFor="jd">2. The job description</label>
                <textarea
                  id="jd"
                  className="jd-input"
                  rows={9}
                  maxLength={MAX_JD_LENGTH}
                  placeholder="Paste the full posting, including the requirements section."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  aria-invalid={Boolean(errors.jobDescription)}
                  aria-describedby={errors.jobDescription ? "jd-error" : undefined}
                />
                {errors.jobDescription && <p className="error" id="jd-error" role="alert">{errors.jobDescription}</p>}
              </div>

              {errors.form && <p className="error" role="alert">{errors.form}</p>}
              <div className="check-actions">
                <button type="submit" className="btn">Compare</button>
                {!user && (
                  <p className="check-note">
                    <button type="button" className="link-button" onClick={() => openAuth("signin")}>Sign in</button> to keep a history of your checks.
                  </p>
                )}
              </div>
            </form>
          )}

          {checking && (
            <div className="sheet checking" aria-live="polite">
              <p className="checking-file">Checking {file.name}</p>
              <ol className="checklist">
                {LOADING_STEPS.map((label, i) => (
                  <li key={label} className={i < step ? "is-done" : i === step ? "is-current" : ""}>{label}</li>
                ))}
              </ol>
            </div>
          )}

          {result && (
            <div className="results-layout">
              <Results result={result} onReset={reset} />
              <JobMatchesPanel
                key={result.id}
                jobRun={jobSearch.jobRun}
                jobRunError={jobSearch.jobRunError}
                analysisId={result.id}
              />
            </div>
          )}

          {!checking && !result && latestRun && (
            <div className="latest-jobs">
              <JobMatchesPanel key={latestRun.id} jobRun={latestRun} heading="Your latest job matches" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
