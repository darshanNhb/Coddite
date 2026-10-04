import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/client.js';

const AuthContext = createContext(null);

import { getSocket } from '../api/socket.js';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Attempt to fetch current user on mount
    authApi.getMe()
      .then(res => {
        setUser(res.data.profile);
      })
      .catch(err => {
        if (err.status !== 401) {
          console.error('Auth check failed:', err);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Handle Socket connection
  useEffect(() => {
    const socket = getSocket();
    if (user) {
      socket.connect();
    } else {
      socket.disconnect();
    }
    return () => {
      socket.disconnect();
    };
  }, [user]);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    setUser(res.data.profile);
    return res.data.profile;
  };

  const signupVerify = async (email, otp) => {
    const res = await authApi.signupVerify({ email, otp });
    setUser(res.data.profile);
    return res.data.profile;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      getSocket().disconnect();
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signupVerify, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
