import React, { createContext, useState, useEffect, useCallback } from 'react';

export const AuthContext = createContext(null);

const STORAGE_KEY = 'fg_auth';

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          token: parsed.token || null,
          user: parsed.user || null,
        };
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    return { token: null, user: null };
  });

  const login = useCallback((token, user) => {
    const data = { token, user };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
    setAuthState(data);
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setAuthState({ token: null, user: null });
  }, []);

  const isAuthenticated = useCallback(() => {
    return Boolean(authState.token && authState.user);
  }, [authState]);

  const isAnalyst = useCallback(() => {
    return authState.user?.role === 'ROLE_ANALYST';
  }, [authState]);

  const isCustomer = useCallback(() => {
    return authState.user?.role === 'ROLE_CUSTOMER';
  }, [authState]);

  return (
    <AuthContext.Provider
      value={{
        token: authState.token,
        user: authState.user,
        login,
        logout,
        isAuthenticated,
        isAnalyst,
        isCustomer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
