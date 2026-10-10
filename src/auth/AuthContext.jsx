import { createContext, useContext, useState } from "react";

// Mock auth for the demo: accounts live in this browser's localStorage, no backend.
// Passwords are stored as SHA-256 hashes, never as plain text.
const ACCOUNTS_KEY = "pa.accounts";
const SESSION_KEY = "pa.session";

const AuthContext = createContext(null);

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked (private mode etc.): the session just won't persist.
  }
}

async function hash(text) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => read(SESSION_KEY, null));
  // Which auth dialog is open: null, "signin" or "signup".
  const [dialog, setDialog] = useState(null);

  const startSession = ({ name, email, provider }) => {
    const session = { name, email, provider };
    write(SESSION_KEY, session);
    setUser(session);
    setDialog(null);
  };

  // Each action returns null on success, or { field, message } describing what to fix.
  const signUp = async ({ name, email, password }) => {
    const accounts = read(ACCOUNTS_KEY, []);
    const key = email.trim().toLowerCase();
    if (accounts.some((a) => a.email === key)) {
      return { field: "email", message: "An account with this email already exists. Sign in instead." };
    }
    const account = { name: name.trim(), email: key, passwordHash: await hash(password), provider: "email" };
    write(ACCOUNTS_KEY, [...accounts, account]);
    startSession(account);
    return null;
  };

  const signIn = async ({ email, password }) => {
    const key = email.trim().toLowerCase();
    const account = read(ACCOUNTS_KEY, []).find((a) => a.email === key);
    if (!account) {
      return { field: "email", message: "No account uses this email. Check the spelling or create an account." };
    }
    if (account.passwordHash !== (await hash(password))) {
      return { field: "password", message: "That password doesn't match this email." };
    }
    startSession(account);
    return null;
  };

  // Demo stand-in for Google sign-in. A real build would use Google Identity Services.
  const signInWithGoogle = () => {
    startSession({ name: "Demo User", email: "demo.user@gmail.com", provider: "google" });
  };

  const signOut = () => {
    write(SESSION_KEY, null);
    setUser(null);
  };

  const value = {
    user,
    dialog,
    openAuth: setDialog,
    closeAuth: () => setDialog(null),
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
