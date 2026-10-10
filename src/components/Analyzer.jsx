import { useEffect, useState } from "react";
import { LOADING_STEPS, SKILLS, STEP_MS, mockParse, validateFile } from "../lib/mockParse";
import Dropzone from "./Dropzone";
import Results from "./Results";

// Check section: empty (dropzone) -> checking -> results.
export default function Analyzer() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null);

  // Walk through the fake checking steps, then produce the mock result.
  useEffect(() => {
    if (!file) return;
    setStep(0);
    let current = 0;
    const timer = setInterval(() => {
      current++;
      if (current < LOADING_STEPS.length) {
        setStep(current);
      } else {
        clearInterval(timer);
        setResult(mockParse(file));
      }
    }, STEP_MS);
    return () => clearInterval(timer);
  }, [file]);

  const handleFile = (picked) => {
    setError(null);
    if (!picked) return;
    const message = validateFile(picked);
    if (message) return setError(message);
    setResult(null);
    setFile(picked);
  };

  const reset = () => {
    setFile(null);
    setResult(null);
  };

  return (
    <section id="check" className="check">
      <div className="container">
        <div className="check-body">
          <h2>Check your resume</h2>
          <p className="section-intro">We look for {SKILLS.length} skills that show up most in developer job posts, then mark what we find.</p>

          {!file && (
            <>
              <Dropzone onFile={handleFile} />
              {error && <p className="error" role="alert">{error}</p>}
            </>
          )}

          {file && !result && (
            <div className="sheet checking" aria-live="polite">
              <p className="checking-file">Checking {file.name}</p>
              <ol className="checklist">
                {LOADING_STEPS.map((label, i) => (
                  <li key={label} className={i < step ? "is-done" : i === step ? "is-current" : ""}>{label}</li>
                ))}
              </ol>
            </div>
          )}

          {file && result && <Results fileName={file.name} result={result} onReset={reset} />}
        </div>
      </div>
    </section>
  );
}
