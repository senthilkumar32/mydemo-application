import { useEffect, useState } from "react";
import { LOADING_STEPS, MAX_JD_LENGTH, STEP_MS, validateFile, validateJobDescription } from "../lib/analysis";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import Dropzone from "./Dropzone";
import Results from "./Results";

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

    setChecking(true);
    try {
      // Let the steps play through even when the server answers instantly.
      const [{ analysis }] = await Promise.all([
        api("/analyses", { method: "POST", form }),
        wait(STEP_MS * LOADING_STEPS.length),
      ]);
      setResult(analysis);
    } catch (err) {
      setErrors({ [err.field ?? "form"]: err.message });
    } finally {
      setChecking(false);
    }
  };

  // Keep the JD so the next resume can be checked against the same job.
  const reset = () => {
    setFile(null);
    setResult(null);
  };

  return (
    <section id="check" className="check">
      <div className="container">
        <div className="check-body">
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

          {result && <Results result={result} onReset={reset} />}
        </div>
      </div>
    </section>
  );
}
