import React, { createContext, useContext, useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('comatch_token') || null);
  const [theme, setTheme] = useState(() => localStorage.getItem('comatch_theme') || 'dark');
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('comatch_theme', theme);
  }, [theme]);

  // Session verification on mount and token change
  useEffect(() => {
    if (token) {
      localStorage.setItem('comatch_token', token);
      setSessionLoading(true);
      fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && data.user) {
            setUser(data.user);
          } else {
            clearSessionLocally();
          }
          setSessionLoading(false);
        })
        .catch(() => {
          clearSessionLocally();
          setSessionLoading(false);
        });
    } else {
      setUser(null);
      localStorage.removeItem('comatch_token');
      setSessionLoading(false);
    }
  }, [token]);

  const login = (jwtToken, userData) => {
    setToken(jwtToken);
    setUser(userData);
  };

  const clearSessionLocally = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('comatch_token');
  };

  const logout = async () => {
    if (token) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {}
    }
    clearSessionLocally();
  };

  const updateUser = (updatedUserData) => {
    setUser(updatedUserData);
  };

  const fetchActiveSessions = async () => {
    if (!token) return [];
    try {
      const res = await fetch(`${API_BASE}/auth/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      return data.sessions || [];
    } catch (e) {
      return [];
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      theme,
      sessionLoading,
      sessionActive: !!user,
      toggleTheme,
      login,
      logout,
      updateUser,
      fetchActiveSessions
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
