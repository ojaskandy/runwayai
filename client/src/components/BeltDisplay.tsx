import { Trophy } from 'lucide-react';

type BeltDisplayProps = {
  beltColor: string;
  beltName: string;
  beltLevel?: number;
  showLevel?: boolean;
  size?: 'small' | 'medium' | 'large';
  stretched?: boolean;
  username?: string;
};

const beltColorMap: Record<string, { bg: string; text: string; border: string }> = {
  white: { bg: 'bg-white', text: 'text-black', border: 'border-gray-300' },
  yellow: { bg: 'bg-yellow-400', text: 'text-black', border: 'border-yellow-500' },
  green: { bg: 'bg-green-500', text: 'text-white', border: 'border-green-600' },
  blue: { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-700' },
  red: { bg: 'bg-red-600', text: 'text-white', border: 'border-red-700' },
  black: { bg: 'bg-black', text: 'text-white', border: 'border-white' },
};

export default function BeltDisplay({ 
  beltColor, 
  beltName, 
  beltLevel = 1,
  showLevel = false,
  size = 'medium',
  stretched = false,
  username
}: BeltDisplayProps) {
  const colors = beltColorMap[beltColor] || beltColorMap.white;
  
  // Get classes based on size prop
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return {
          container: 'h-8 text-xs',
          belt: 'w-16',
          level: 'h-4 w-4 text-[9px]'
        };
      case 'large':
        return {
          container: 'h-14 text-lg',
          belt: 'w-40',
          level: 'h-7 w-7 text-sm'
        };
      case 'medium':
      default:
        return {
          container: 'h-10 text-sm',
          belt: 'w-28',
          level: 'h-5 w-5 text-xs'
        };
    }
  };
  
  const sizeClasses = getSizeClasses();

  // If stretched is true, render the stretched belt version
  if (stretched) {
    return (
      <div className="w-full my-6">
        <div className={`relative w-full h-24 ${colors.bg} rounded-lg shadow-lg overflow-hidden border-2 ${colors.border}`}>
          {/* Left belt end */}
          <div className="absolute left-0 inset-y-0 w-32 border-r-2 border-dashed border-white/30 flex items-center justify-center">
            <div className={`w-6 h-[90%] ${colors.border} bg-gradient-to-r from-transparent to-${beltColor === 'white' ? 'gray' : beltColor}-500/30`}></div>
          </div>
          
          {/* Right belt end */}
          <div className="absolute right-0 inset-y-0 w-32 border-l-2 border-dashed border-white/30 flex items-center justify-center">
            <div className={`w-6 h-[90%] ${colors.border} bg-gradient-to-l from-transparent to-${beltColor === 'white' ? 'gray' : beltColor}-500/30`}></div>
          </div>
          
          {/* Username engraving */}
          {username && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <h3 className={`text-3xl font-bold tracking-widest uppercase ${colors.text} opacity-80 engraved-text`}>{username}</h3>
                <div className="mt-1 flex items-center justify-center">
                  {[...Array(beltLevel)].map((_, i) => (
                    <div key={i} className="mx-0.5 h-2 w-2 bg-white/70 rounded-full"></div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Belt rank text */}
          <div className="absolute bottom-2 right-2">
            <span className={`text-sm font-semibold ${colors.text} opacity-70`}>{beltName}</span>
            {showLevel && beltLevel > 1 && (
              <span className={`ml-1 text-sm font-bold ${colors.text}`}>Level {beltLevel}</span>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // Original non-stretched design
  return (
    <div className="flex flex-col items-center">
      <div className={`relative flex items-center justify-center ${sizeClasses.container} px-3 rounded-sm ${colors.bg} ${colors.text} shadow-md ${beltColor === 'black' ? 'border border-white/50' : ''}`}>
        <div className={`absolute left-0 inset-y-0 ${sizeClasses.belt} border-t-2 border-b-2 ${colors.border} flex items-center justify-start px-2`}>
          {showLevel && beltLevel > 1 && (
            <div className="flex">
              {[...Array(beltLevel)].map((_, i) => (
                <div key={i} className="mr-0.5 h-1.5 w-1.5 bg-white/70 rounded-full"></div>
              ))}
            </div>
          )}
        </div>
        
        <span className="font-semibold">{beltName}</span>
        
        {showLevel && beltLevel > 1 && (
          <div className={`absolute -top-2 -right-2 ${sizeClasses.level} rounded-full bg-white flex items-center justify-center shadow-md`}>
            <span className="font-bold text-black">{beltLevel}</span>
          </div>
        )}
      </div>
    </div>
  );
} 