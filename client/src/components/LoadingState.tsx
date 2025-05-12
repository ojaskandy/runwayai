import { Progress } from "@/components/ui/progress";

interface LoadingStateProps {
  progress: number;
}

export default function LoadingState({ progress }: LoadingStateProps) {
  return (
    <div className="mb-6 p-6 card-highlight rounded-xl flex flex-col items-center text-center relative overflow-hidden">
      {/* Background animation effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-red-900/20 to-red-700/10 backdrop-blur-sm z-0"></div>
      
      {/* Loading spinner */}
      <div className="loader mb-5 z-10"></div>
      
      {/* Heading with gradient text */}
      <h2 className="text-2xl font-serif font-medium mb-2 bg-gradient-to-r from-red-400 to-red-300 bg-clip-text text-transparent z-10">
        Preparing Taekwondo Form AI
      </h2>
      
      {/* Status message */}
      <p className="text-gray-300 mb-4 z-10">
        {progress < 30 && "Initializing AI modules..."}
        {progress >= 30 && progress < 60 && "Loading pose detection models..."}
        {progress >= 60 && progress < 90 && "Calibrating detection algorithms..."}
        {progress >= 90 && "Almost ready..."}
      </p>
      
      {/* Progress bar */}
      <div className="w-full max-w-xs z-10">
        <Progress 
          value={progress} 
          className="h-2 bg-gray-900" 
        />
        <p className="text-xs text-right mt-1 text-red-400">{progress}% complete</p>
      </div>
      
      {/* Little extra message */}
      <p className="text-xs text-gray-400 mt-4 italic max-w-sm z-10">
        AI-powered pose tracking helps you perfect your Taekwondo form and martial arts technique
      </p>
    </div>
  );
}
