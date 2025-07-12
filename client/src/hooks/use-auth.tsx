import { useState, createContext, useContext, ReactNode, useEffect } from 'react';
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
  isLoading: boolean;
  loginMutation: any;
  registerMutation: any;
  logoutMutation: any;
  showMobileWarning: boolean;
  setShowMobileWarning: (show: boolean) => void;
  isMobileDevice: boolean;
};

// Create auth context
const AuthContext = createContext<AuthContextType | null>(null);

// Provider component
type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showMobileWarning, setShowMobileWarning] = useState<boolean>(false);
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);
  
  // Initialize loading state and check for existing session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/user', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.log('No existing session found');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSession();
  }, []);

  // Check if device is mobile
  useEffect(() => {
    const checkMobileDevice = () => {
      // Check screen size
      const isMobileBySize = window.innerWidth < 768;
      
      // Check user agent for mobile devices
      const isMobileByAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      
      // We treat iPads as tablets (acceptable), so exclude them from warning
      const isIPad = /iPad/i.test(navigator.userAgent);
      
      setIsMobileDevice(isMobileBySize && (isMobileByAgent && !isIPad));
    };
    
    checkMobileDevice();
    
    // Add resize listener
    window.addEventListener("resize", checkMobileDevice);
    return () => window.removeEventListener("resize", checkMobileDevice);
  }, []);
  
  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }
      
      return response.json();
    },
    onSuccess: (data: User) => {
      setUser(data);
      console.log('Login successful:', data);
      
      // Show mobile warning if on a mobile device and warning hasn't been shown
      // We check sessionStorage to ensure it only shows once per session
      const mobileWarningShown = sessionStorage.getItem('mobileWarningShown');
      if (isMobileDevice && !mobileWarningShown) {
        setShowMobileWarning(true);
        sessionStorage.setItem('mobileWarningShown', 'true');
      }
      
      // Force navigation to app after successful login
      window.location.href = '/app';
    }
  });
  
  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterCredentials) => {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }
      
      return response.json();
    },
    onSuccess: (data: User) => {
      setUser(data);
      console.log('Registration successful:', data);
      
      // Show mobile warning if on a mobile device and warning hasn't been shown
      // We check sessionStorage to ensure it only shows once per session
      const mobileWarningShown = sessionStorage.getItem('mobileWarningShown');
      if (isMobileDevice && !mobileWarningShown) {
        setShowMobileWarning(true);
        sessionStorage.setItem('mobileWarningShown', 'true');
      }
    }
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Logout failed');
      }
      
      return true;
    },
    onSuccess: () => {
      setUser(null);
      console.log('Logout successful');
    }
  });
  
  const value = {
    user,
    isLoading,
    loginMutation,
    registerMutation,
    logoutMutation,
    showMobileWarning,
    setShowMobileWarning,
    isMobileDevice
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