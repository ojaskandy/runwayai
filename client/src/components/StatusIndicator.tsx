import { type TrackingStatus } from '@/pages/Home';

interface StatusIndicatorProps {
  status: TrackingStatus;
}

export default function StatusIndicator({ status }: StatusIndicatorProps) {
  // Default classes
  let containerClasses = "rounded-full flex items-center px-3 py-1.5 gap-2";
  let dotClasses = "h-2.5 w-2.5 rounded-full";
  let statusText = "";
  let icon = "";
  
  // Determine the classes and text based on status
  switch(status) {
    case 'inactive':
      containerClasses += " bg-white/90 border border-gray-300 text-gray-500";
      dotClasses += " bg-gray-400";
      statusText = "Ready to Start";
      icon = "radio_button_unchecked";
      break;
      
    case 'loading':
      containerClasses += " bg-blue-50 border border-blue-300 text-blue-700";
      dotClasses += " bg-blue-500 animate-pulse";
      statusText = "Loading AI Models...";
      icon = "downloading";
      break;
      
    case 'ready':
      containerClasses += " bg-green-50 border border-green-300 text-green-700";
      dotClasses += " bg-green-500";
      statusText = "Ready";
      icon = "check_circle_outline";
      break;
      
    case 'active':
      containerClasses += " bg-gradient-to-r from-red-700 to-red-600 border border-red-500 text-white";
      dotClasses += " bg-white animate-pulse";
      statusText = "Tracking Active";
      icon = "motion_photos_on";
      break;
      
    case 'error':
      containerClasses += " bg-red-50 border border-red-300 text-red-700";
      dotClasses += " bg-red-500";
      statusText = "Error";
      icon = "error_outline";
      break;
  }
  
  return (
    <div className={containerClasses}>
      <span className="material-icons text-sm">{icon}</span>
      <span className="text-xs font-medium">{statusText}</span>
      <span className={dotClasses}></span>
    </div>
  );
}
