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

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

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
  const { dialog: mode, openAuth, closeAuth, signIn, signUp, signInWithGoogle } = useAuth();
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

        <button type="button" className="btn-google" onClick={signInWithGoogle}>
          <GoogleLogo />
          Continue with Google
        </button>
        <p className="auth-note">Demo: Google sign-in is simulated.</p>

        <div className="auth-divider"><span>or use your email</span></div>

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

          <button type="submit" className="btn auth-submit" disabled={busy}>{busy ? copy.busy : copy.submit}</button>
        </form>

        <p className="auth-switch">
          {copy.switchText}{" "}
          <button type="button" className="link-button" onClick={() => openAuth(copy.switchTo)}>{copy.switchAction}</button>
        </p>
        {mode === "signup" && <p className="auth-note">Your account is saved in this browser only.</p>}
      </div>
    </dialog>
  );
}
