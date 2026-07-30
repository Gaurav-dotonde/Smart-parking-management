import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Keep authentication only for the current browser session. The previous
    // localStorage implementation opened the dashboard after restarting.
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    const stored = sessionStorage.getItem('user');
    if (!stored) return null;

    try {
      return JSON.parse(stored);
    } catch {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      return null;
    }
  });

  const loginUser = (authResponse) => {
    const { token, id, name, email, role, accountStatus, profilePhoto } = authResponse;
    const userData = {
      id,
      name,
      email,
      role,
      accountStatus,
      profilePhoto: profilePhoto || null,
      profilePhotoUrl: profilePhoto || null,
    };
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const updateUser = (updates) => {
    setUser((current) => {
      if (!current) return current;
      const nextUser = { ...current, ...updates };
      sessionStorage.setItem('user', JSON.stringify(nextUser));
      return nextUser;
    });
  };

  const logoutUser = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    // Also clear authentication saved by older versions of the app.
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loginUser, logoutUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
