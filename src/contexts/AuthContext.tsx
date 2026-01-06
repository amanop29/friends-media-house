"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AdminUser {
  id?: string;
  email: string;
  name?: string;
  role?: string;
  loginTime: number;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AdminUser | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session expiry time: 24 hours
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

// Admin credentials storage key
const AUTH_STORAGE_KEY = 'admin_session';

// Default admin credentials (fallback when database is not configured)
const DEFAULT_ADMIN_EMAIL = 'admin@friendsmediahouse.com';
const DEFAULT_ADMIN_PASSWORD = 'FMH@2024Admin';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = () => {
      try {
        const storedSession = localStorage.getItem(AUTH_STORAGE_KEY);
        if (storedSession) {
          const session = JSON.parse(storedSession) as AdminUser;
          
          // Check if session has expired
          if (Date.now() - session.loginTime < SESSION_EXPIRY_MS) {
            setUser(session);
          } else {
            // Session expired, clear it
            localStorage.removeItem(AUTH_STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
      setIsLoading(false);
    };

    checkSession();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Trim inputs
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedPassword = password.trim();

      // Validate inputs
      if (!trimmedEmail || !trimmedPassword) {
        return { success: false, error: 'Please enter both email and password' };
      }

      // Try database authentication first via API
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword }),
        });

        const data = await response.json();

        if (data.success && data.admin) {
          // Database authentication successful
          const adminUser: AdminUser = {
            id: data.admin.id,
            email: data.admin.email,
            name: data.admin.name || 'Admin',
            role: data.admin.role,
            loginTime: Date.now(),
          };

          // Save session
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(adminUser));
          // Save admin email separately for activity logging
          localStorage.setItem('adminEmail', data.admin.email);
          setUser(adminUser);
          
          return { success: true };
        }

        // If API returns specific error (not 503), use that error
        if (response.status !== 503 && data.error) {
          return { success: false, error: data.error };
        }

        // Fall through to localStorage auth if database is not configured
      } catch (apiError) {
        console.warn('API auth failed, falling back to local auth:', apiError);
      }

      // Fallback: Local authentication (for development or when database is not configured)
      const savedAdminEmail = localStorage.getItem('adminEmail') || DEFAULT_ADMIN_EMAIL;
      const savedAdminPassword = localStorage.getItem('adminPassword') || DEFAULT_ADMIN_PASSWORD;

      // Check credentials
      if (trimmedEmail === savedAdminEmail.toLowerCase() && trimmedPassword === savedAdminPassword) {
        const adminUser: AdminUser = {
          email: trimmedEmail,
          name: 'Admin',
          role: 'admin',
          loginTime: Date.now(),
        };

        // Save session
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(adminUser));
        // Save admin email separately for activity logging
        localStorage.setItem('adminEmail', trimmedEmail);
        setUser(adminUser);
        
        return { success: true };
      }

      // Invalid credentials
      return { success: false, error: 'Invalid email or password' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An error occurred during login' };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem('adminEmail');
    setUser(null);
  }, []);

  const value: AuthContextType = {
    isAuthenticated: !!user,
    isLoading,
    user,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Default values for when context is not available
const defaultAuthValue: AuthContextType = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  login: async () => ({ success: false, error: 'Auth not initialized' }),
  logout: () => {},
};

export function useAuth() {
  const context = useContext(AuthContext);
  // Return default value instead of throwing if context is undefined
  if (context === undefined) {
    return defaultAuthValue;
  }
  return context;
}

// Strict version that throws - use in places where auth is required
export function useAuthStrict() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthStrict must be used within an AuthProvider');
  }
  return context;
}
