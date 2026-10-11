import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COPY = {
  signin: {
    title: "Sign in",
    intro: "Welcome back. Sign in to check another resume.",
    submit: "Sign in",
    busy: "Signing in…",
    switchText: "New to Profile Analyzer?",
    switchAction: "Create an account",
    switchTo: "signup",
  },
  signup: {
    title: "Create your account",
    intro: "One account for all your resume checks.",
    submit: "Create account",
    busy: "Creating account…",
    switchText: "Already have an account?",
    switchAction: "Sign in",
    switchTo: "signin",
  },
};

function validate(mode, { name, email, password }) {
  const errors = {};
  if (mode === "signup" && !name.trim()) errors.name = "Enter your name.";
  if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Enter an email like you@example.com.";
  if (mode === "signup" && password.length < 8) errors.password = "Use at least 8 characters.";
  if (mode === "signin" && !password) errors.password = "Enter your password.";
  return errors;
}

function Field({ id, label, error, hint, children }) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
      {error ? (
        <p className="field-error" id={`${id}-error`}>{error}</p>
      ) : hint ? (
        <p className="field-hint" id={`${id}-hint`}>{hint}</p>
      ) : null}
    </div>
  );
}

export default function AuthDialog() {
  const { dialog: mode, openAuth, closeAuth, signIn, signUp } = useAuth();
  const ref = useRef(null);
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  // Keep the native <dialog> in sync with state.
  useEffect(() => {
    const el = ref.current;
    if (mode && !el.open) el.showModal();
    if (!mode && el.open) el.close();
    // Put the cursor in the first field rather than on the close button.
    if (mode) el.querySelector("input")?.focus();
  }, [mode]);

  // Start each mode with a clean form error state.
  useEffect(() => {
    setErrors({});
    setShowPassword(false);
  }, [mode]);

  const copy = COPY[mode ?? "signin"];
  const update = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    const found = validate(mode, values);
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    const problem = mode === "signup" ? await signUp(values) : await signIn(values);
    setBusy(false);
    if (problem) setErrors({ [problem.field]: problem.message });
    else setValues({ name: "", email: "", password: "" });
  };

  return (
    <dialog
      ref={ref}
      className="auth-dialog"
      aria-labelledby="auth-title"
      onClose={closeAuth}
      onClick={(e) => e.target === ref.current && closeAuth()}
    >
      <div className="auth-sheet">
        <button type="button" className="auth-close" onClick={closeAuth} aria-label="Close">×</button>
        <h2 id="auth-title">{copy.title}</h2>
        <p className="auth-intro">{copy.intro}</p>

        <form onSubmit={onSubmit} noValidate>
          {mode === "signup" && (
            <Field id="auth-name" label="Name" error={errors.name}>
              {(props) => <input {...props} type="text" autoComplete="name" value={values.name} onChange={update("name")} />}
            </Field>
          )}
          <Field id="auth-email" label="Email" error={errors.email}>
            {(props) => <input {...props} type="email" autoComplete="email" value={values.email} onChange={update("email")} />}
          </Field>
          <Field id="auth-password" label="Password" error={errors.password} hint={mode === "signup" ? "At least 8 characters." : undefined}>
            {(props) => (
              <div className="password-row">
                <input
                  {...props}
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={values.password}
                  onChange={update("password")}
                />
                <button type="button" className="password-toggle" onClick={() => setShowPassword((s) => !s)} aria-pressed={showPassword}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            )}
          </Field>

          {errors.form && <p className="error" role="alert">{errors.form}</p>}
          <button type="submit" className="btn auth-submit" disabled={busy}>{busy ? copy.busy : copy.submit}</button>
        </form>

        <p className="auth-switch">
          {copy.switchText}{" "}
          <button type="button" className="link-button" onClick={() => openAuth(copy.switchTo)}>{copy.switchAction}</button>
        </p>
      </div>
    </dialog>
  );
}
