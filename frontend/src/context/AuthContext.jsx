import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => ({
    token: localStorage.getItem("token") || null,
    username: localStorage.getItem("username") || null,
    role: localStorage.getItem("role") || null,
    tenantId: localStorage.getItem("tenantId") || null,
    libraryName: localStorage.getItem("libraryName") || null,
    onboarded: localStorage.getItem("onboarded") === "true",
  }));

  useEffect(() => {
    if (auth.token) localStorage.setItem("token", auth.token); else localStorage.removeItem("token");
    if (auth.username) localStorage.setItem("username", auth.username); else localStorage.removeItem("username");
    if (auth.role) localStorage.setItem("role", auth.role); else localStorage.removeItem("role");
    if (auth.tenantId) localStorage.setItem("tenantId", auth.tenantId); else localStorage.removeItem("tenantId");
    if (auth.libraryName) localStorage.setItem("libraryName", auth.libraryName); else localStorage.removeItem("libraryName");
    localStorage.setItem("onboarded", auth.onboarded ? "true" : "false");
  }, [auth]);

  const login = (token, payload) => {
    setAuth({
      token,
      username: payload.username,
      role: payload.role,
      tenantId: payload.tenantId,
      libraryName: payload.libraryName || null,
      onboarded: !!payload.onboarded,
    });
  };

  const setOnboarded = (val) => setAuth((a) => ({ ...a, onboarded: !!val }));
  const setLibraryName = (val) => setAuth((a) => ({ ...a, libraryName: val }));

  const logout = () => {
    setAuth({ token: null, username: null, role: null, tenantId: null, libraryName: null, onboarded: false });
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
