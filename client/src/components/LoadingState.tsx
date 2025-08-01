import { Progress } from "@/components/ui/progress";

interface LoadingStateProps {
  progress: number;
  message?: string;
}

export default function LoadingState({ progress, message }: LoadingStateProps) {
  return (
    <div className="mb-6 p-6 card-highlight rounded-xl flex flex-col items-center text-center relative overflow-hidden">
      {/* Background animation effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-pink-400/20 to-pink-300/10 backdrop-blur-sm z-0"></div>
      
      {/* Loading spinner */}
      <div className="loader mb-5 z-10"></div>
      
      {/* Heading with gradient text */}
      <h2 className="text-2xl font-serif font-medium mb-2 bg-gradient-to-r from-pink-300 to-white bg-clip-text text-transparent z-10">
        Preparing Runway AI
      </h2>
      
      {/* Status message */}
      <p className="text-pink-100 mb-4 z-10">
        {message ? message : 
          progress < 30 ? "Initializing AI modules..." :
          progress < 60 ? "Loading pose detection models..." :
          progress < 90 ? "Calibrating runway algorithms..." :
          "Almost ready..."
        }
      </p>
      
      {/* Progress bar */}
      <div className="w-full max-w-xs z-10">
        <Progress 
          value={progress} 
          className="h-2 bg-gray-900" 
        />
        <p className="text-xs text-right mt-1 text-pink-300">{progress}% complete</p>
      </div>
      
      {/* Little extra message */}
      <p className="text-xs text-pink-200/70 mt-4 italic max-w-sm z-10">
        AI-powered pose tracking helps you perfect your posture and pageant technique
      </p>
    </div>
  );
}
