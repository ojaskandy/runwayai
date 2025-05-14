import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export type SessionTimerProps = {
  className?: string;
};

export default function SessionTimer({ className = '' }: SessionTimerProps) {
  const [seconds, setSeconds] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isTabActive, setIsTabActive] = useState<boolean>(true);

  useEffect(() => {
    // Start the timer when component mounts
    setIsActive(true);
    
    // Check if timer is already in localStorage (page refresh case)
    const storedStartTime = localStorage.getItem('sessionStartTime');
    if (storedStartTime) {
      const startTime = parseInt(storedStartTime, 10);
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      setSeconds(elapsedSeconds);
    } else {
      // Store start time for the session
      localStorage.setItem('sessionStartTime', Date.now().toString());
    }

    // Set up event listeners for tab visibility
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Handle tab visibility change
  const handleVisibilityChange = () => {
    setIsTabActive(!document.hidden);
  };

  // Handle window focus
  const handleFocus = () => {
    setIsTabActive(true);
  };

  // Handle window blur
  const handleBlur = () => {
    setIsTabActive(false);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    // Only increment the timer when tab is active and timer is active
    if (isActive && isTabActive) {
      interval = setInterval(() => {
        setSeconds(seconds => seconds + 1);
      }, 1000);
    } else if (interval) {
      clearInterval(interval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, isTabActive]);

  // Format the time in HH:MM:SS
  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const paddedHours = hours.toString().padStart(2, '0');
    const paddedMinutes = minutes.toString().padStart(2, '0');
    const paddedSeconds = seconds.toString().padStart(2, '0');
    
    return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
  };

  return (
    <div className={`flex items-center ${className}`}>
      <Clock className="w-5 h-5 mr-2 text-white" />
      <div className="text-white font-mono text-lg">{formatTime(seconds)}</div>
    </div>
  );
} 