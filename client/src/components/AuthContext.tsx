import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '../../../server/src/schema';

// Firebase auth implementation would go here in a real app
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Demo users for testing purposes
const DEMO_USERS = [
  { id: 'user_1', email: 'demo@nopifin.com', created_at: new Date(), updated_at: new Date() },
  { id: 'user_2', email: 'test@example.com', created_at: new Date(), updated_at: new Date() }
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('nopifin_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    // Firebase auth would be implemented here
    const demoUser = DEMO_USERS.find(u => u.email === email);
    if (demoUser && password === 'demo123') {
      setUser(demoUser);
      localStorage.setItem('nopifin_user', JSON.stringify(demoUser));
    } else {
      throw new Error('Invalid credentials');
    }
    setLoading(false);
  };

  const signup = async (email: string) => {
    setLoading(true);
    // Firebase auth would be implemented here
    const newUser: User = {
      id: `user_${Date.now()}`,
      email,
      created_at: new Date(),
      updated_at: new Date()
    };
    setUser(newUser);
    localStorage.setItem('nopifin_user', JSON.stringify(newUser));
    setLoading(false);
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('nopifin_user');
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    signup
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}