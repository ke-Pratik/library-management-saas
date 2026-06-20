import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

// ── Helper: write all auth fields to localStorage in one go ──
const persistAuth = (auth) => {
  if (auth.token)       localStorage.setItem("token", auth.token);
  else                  localStorage.removeItem("token");
  if (auth.username)    localStorage.setItem("username", auth.username);
  else                  localStorage.removeItem("username");
  if (auth.role)        localStorage.setItem("role", auth.role);
  else                  localStorage.removeItem("role");
  if (auth.tenantId)    localStorage.setItem("tenantId", auth.tenantId);
  else                  localStorage.removeItem("tenantId");
  if (auth.libraryName) localStorage.setItem("libraryName", auth.libraryName);
  else                  localStorage.removeItem("libraryName");
  localStorage.setItem("onboarded", auth.onboarded ? "true" : "false");
};

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => ({
    token: localStorage.getItem("token") || null,
    username: localStorage.getItem("username") || null,
    role: localStorage.getItem("role") || null,
    tenantId: localStorage.getItem("tenantId") || null,
    libraryName: localStorage.getItem("libraryName") || null,
    onboarded: localStorage.getItem("onboarded") === "true",
  }));

  // ── FIX: login() writes to localStorage SYNCHRONOUSLY before setAuth ──
  const login = (token, payload) => {
    const next = {
      token,
      username: payload.username,
      role: payload.role,
      tenantId: payload.tenantId,
      libraryName: payload.libraryName || null,
      onboarded: !!payload.onboarded,
    };
    persistAuth(next);   // ← SYNCHRONOUS write — fixes race condition
    setAuth(next);
  };

  const setOnboarded = (val) => {
    setAuth((a) => {
      const next = { ...a, onboarded: !!val };
      persistAuth(next);
      return next;
    });
  };

  const setLibraryName = (val) => {
    setAuth((a) => {
      const next = { ...a, libraryName: val };
      persistAuth(next);
      return next;
    });
  };

  // ── FIX: logout() clears localStorage SYNCHRONOUSLY ──
  const logout = () => {
    const next = {
      token: null, username: null, role: null,
      tenantId: null, libraryName: null, onboarded: false,
    };
    persistAuth(next);   // ← clears localStorage immediately
    setAuth(next);
  };

  return (
    <AuthContext.Provider value={{ ...auth, login, logout, setOnboarded, setLibraryName }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
