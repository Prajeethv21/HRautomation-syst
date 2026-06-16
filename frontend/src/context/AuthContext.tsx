import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'HR';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISABLED';
  expiryDate?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; message: string }>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('ats_token'));
  const [loading, setLoading] = useState(true);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('ats_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    const activeToken = localStorage.getItem('ats_token');
    if (activeToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${activeToken}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (e) {
        console.error('Logout request failed:', e);
      }
    }
    localStorage.removeItem('ats_token');
    setToken(null);
    setUser(null);
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password }),
    });
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }
    return data;
  };

  const checkAuth = async () => {
    const activeToken = localStorage.getItem('ats_token');
    if (!activeToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${activeToken}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
      } else {
        localStorage.removeItem('ats_token');
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      localStorage.removeItem('ats_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    
    // Periodically verify session is valid or handle token expiry
    const interval = setInterval(() => {
      if (localStorage.getItem('ats_token')) {
        checkAuth();
      }
    }, 60000); // Check validity every minute
    
    return () => clearInterval(interval);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, token, login, logout, register, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
