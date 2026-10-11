import { createContext, useContext, useEffect, useState } from "react";
import { api, token } from "../lib/api";

// Accounts live on the server; the browser only keeps the session token.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Which auth dialog is open: null, "signin" or "signup".
  const [dialog, setDialog] = useState(null);

  // Restore the session from a saved token, dropping it if the server rejects it.
  useEffect(() => {
    if (!token.get()) return;
    api("/auth/me")
      .then(({ user }) => setUser(user))
      .catch((err) => {
        if (err.status === 401) token.set(null);
      });
  }, []);

  const startSession = ({ token: value, user }) => {
    token.set(value);
    setUser(user);
    setDialog(null);
  };

  // Each action returns null on success, or { field, message } describing what to fix.
  const submit = async (path, body) => {
    try {
      startSession(await api(path, { method: "POST", json: body }));
      return null;
    } catch (err) {
      return { field: err.field ?? "form", message: err.message };
    }
  };

  const signUp = ({ name, email, password }) => submit("/auth/signup", { name, email, password });
  const signIn = ({ email, password }) => submit("/auth/signin", { email, password });

  const signOut = () => {
    token.set(null);
    setUser(null);
  };

  const value = {
    user,
    dialog,
    openAuth: setDialog,
    closeAuth: () => setDialog(null),
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
