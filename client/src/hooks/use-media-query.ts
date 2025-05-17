import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    const media = window.matchMedia(query);
    
    // Set initial value
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    
    // Create listener function to update state
    const listener = () => {
      setMatches(media.matches);
    };
    
    // Add listener
    media.addEventListener('change', listener);
    
    // Remove listener on cleanup
    return () => {
      media.removeEventListener('change', listener);
    };
  }, [matches, query]);
  
  return matches;
}