import { useState, createContext, useContext, ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';

// Define types for auth
type User = {
  id: number;
  username: string;
};

type LoginCredentials = {
  username: string;
  password: string;
};

type RegisterCredentials = {
  username: string;
  password: string;
};

type AuthContextType = {
  user: User | null;
  loginMutation: any;
  registerMutation: any;
};

// Create auth context
const AuthContext = createContext<AuthContextType | null>(null);

// Provider component
type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  
  // Simulated login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      console.log('Login attempt:', credentials);
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Simple mock validation
      if (credentials.username.length >= 3 && credentials.password.length >= 6) {
        return { id: 1, username: credentials.username };
      }
      throw new Error('Invalid credentials');
    },
    onSuccess: (data: User) => {
      setUser(data);
      console.log('Login successful:', data);
    }
  });
  
  // Simulated register mutation
  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterCredentials) => {
      console.log('Register attempt:', credentials);
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { id: 1, username: credentials.username };
    },
    onSuccess: (data: User) => {
      setUser(data);
      console.log('Registration successful:', data);
    }
  });
  
  const value = {
    user,
    loginMutation,
    registerMutation
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook for using the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}