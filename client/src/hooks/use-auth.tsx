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
  loginMutation: any;
  registerMutation: any;
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
  const [showMobileWarning, setShowMobileWarning] = useState<boolean>(false);
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);
  
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
      
      // Show mobile warning if on a mobile device and warning hasn't been shown
      // We check sessionStorage to ensure it only shows once per session
      const mobileWarningShown = sessionStorage.getItem('mobileWarningShown');
      if (isMobileDevice && !mobileWarningShown) {
        setShowMobileWarning(true);
        sessionStorage.setItem('mobileWarningShown', 'true');
      }
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
      
      // Show mobile warning if on a mobile device and warning hasn't been shown
      // We check sessionStorage to ensure it only shows once per session
      const mobileWarningShown = sessionStorage.getItem('mobileWarningShown');
      if (isMobileDevice && !mobileWarningShown) {
        setShowMobileWarning(true);
        sessionStorage.setItem('mobileWarningShown', 'true');
      }
    }
  });
  
  const value = {
    user,
    loginMutation,
    registerMutation,
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