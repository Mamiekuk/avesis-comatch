import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('comatch_token') || null);
  const [theme, setTheme] = useState(() => localStorage.getItem('comatch_theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('comatch_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('comatch_token', token);
      fetch('http://localhost:5000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && data.user) {
            setUser(data.user);
          } else {
            logout();
          }
        })
        .catch(() => logout());
    } else {
      setUser(null);
      localStorage.removeItem('comatch_token');
    }
  }, [token]);

  const login = (jwtToken, userData) => {
    setToken(jwtToken);
    setUser(userData);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('comatch_token');
  };

  const updateUser = (updatedUserData) => {
    setUser(updatedUserData);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <AuthContext.Provider value={{ user, token, theme, toggleTheme, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
