'use client';

import { createContext, useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiService from '@/services/api';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated on client side
    const checkAuth = async () => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
          try {
            // Verify token with backend
            const response = await apiService.verifyToken();
            if (response.data.success) {
              setUser(response.data.user);
            } else {
              // Token invalid, clear it
              localStorage.removeItem('token');
            }
          } catch (err) {
            // Token verification failed, clear it
            console.error('Token verification failed:', err);
            localStorage.removeItem('token');
          }
        }
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const login = async (token) => {
    localStorage.setItem('token', token);
    try {
      // Get user data after setting token
      const response = await apiService.verifyToken();
      if (response.data.success) {
        setUser(response.data.user);
        // Redirect to routes page after login
        router.push('/routes');
      }
    } catch (err) {
      console.error('Error getting user data after login:', err);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
