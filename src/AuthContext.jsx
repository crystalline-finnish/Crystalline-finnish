import { createContext, useContext, useEffect, useState } from 'react';
import { getAuthStatus, login as apiLogin, logout as apiLogout } from './client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authenticated, setAuthenticated] = useState(null); // null = "still checking"
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    getAuthStatus()
      .then((data) => setAuthenticated(data.authenticated))
      .finally(() => setChecking(false));
  }, []);

  async function login(password) {
    await apiLogin(password);
    setAuthenticated(true);
  }

  async function logout() {
    await apiLogout();
    setAuthenticated(false);
  }

  return (
    <AuthContext.Provider value={{ authenticated, checking, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
