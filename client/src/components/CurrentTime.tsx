import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export type CurrentTimeProps = {
  className?: string;
  showSeconds?: boolean;
  showIcon?: boolean;
};

export default function CurrentTime({ 
  className = '', 
  showSeconds = true,
  showIcon = true
}: CurrentTimeProps) {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    // Update time every second
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Format the time as HH:MM or HH:MM:SS
  const formatTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    
    // Convert to 12-hour format
    const displayHours = hours % 12 || 12;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    const paddedHours = displayHours.toString().padStart(2, '0');
    const paddedMinutes = minutes.toString().padStart(2, '0');
    
    if (showSeconds) {
      const paddedSeconds = seconds.toString().padStart(2, '0');
      return `${paddedHours}:${paddedMinutes}:${paddedSeconds} ${ampm}`;
    }
    
    return `${paddedHours}:${paddedMinutes} ${ampm}`;
  };

  return (
    <div className={`flex items-center ${className}`}>
      {showIcon && <Clock className="w-5 h-5 mr-2 text-white" />}
      <div className="text-white font-mono">{formatTime(currentTime)}</div>
    </div>
  );
} 