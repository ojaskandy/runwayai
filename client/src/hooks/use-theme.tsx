import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

// Define theme type and context type
type Theme = "dark" | "light";

type ThemeContextType = {
  theme: Theme;
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
};

// Create the context
export const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Get system preference for dark mode
  const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Force light mode for white background
  const [theme, setThemeState] = useState<Theme>('light');
  
  // Helper for setting theme in state and storage - force light mode
  const setTheme = (newTheme: Theme) => {
    setThemeState('light');
    localStorage.setItem('theme', 'light');
  };
  
  // Toggle between dark and light - but force light mode
  const toggleTheme = () => {
    setTheme('light');
  };
  
  // Apply theme to document when it changes
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove the old theme class and add the new theme class
    root.classList.remove(theme === 'dark' ? 'light' : 'dark');
    root.classList.add(theme);
    
    // Update the theme-color meta tag for mobile browsers
    const themeColor = theme === 'dark' ? '#000000' : '#ffffff';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor);
    
  }, [theme]);
  
  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      if (localStorage.getItem('theme') === null) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDarkMode: theme === 'dark',
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}