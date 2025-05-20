'use client';

import { createContext, useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext({});

// Hardcoded user for MVP
const hardcodedUser = {
  id: '1',
  username: 'admin',
  email: 'admin@example.com',
  role: 'admin',
  name: 'Admin User'
};

// Hardcoded token for MVP
const hardcodedToken = 'mvp-hardcoded-token';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Auto login with hardcoded user for MVP
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', hardcodedToken);
      setUser(hardcodedUser);
      setIsLoading(false);
    }
  }, []);

  const login = async () => {
    // Set hardcoded token and user without API call
    localStorage.setItem('token', hardcodedToken);
    setUser(hardcodedUser);
    router.push('/routes');
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    router.push('/');
    
    // For MVP, we auto-login again after logout
    setTimeout(() => {
      login();
    }, 1000);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
