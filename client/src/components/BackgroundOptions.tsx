import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface BackgroundOptionsProps {
  showBackground: boolean;
  setShowBackground: (show: boolean) => void;
  backgroundOpacity: number;
  setBackgroundOpacity: (value: number) => void;
  backgroundBlur: number;
  setBackgroundBlur: (value: number) => void;
}

export default function BackgroundOptions({
  showBackground,
  setShowBackground,
  backgroundOpacity,
  setBackgroundOpacity,
  backgroundBlur,
  setBackgroundBlur
}: BackgroundOptionsProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="h-6 px-1 border-0 bg-gray-800 hover:bg-gray-700"
        >
          <span className="material-icons text-xs">filter</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 bg-black/90 border border-red-900/30 shadow-md p-1">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Switch 
              id="showBackground" 
              checked={showBackground}
              onCheckedChange={setShowBackground}
              className="data-[state=checked]:bg-red-600 h-3 w-6"
            />
            <Label htmlFor="showBackground" className="text-[10px] text-gray-300">Show Background</Label>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-4 px-1 hover:bg-gray-800 text-[9px] text-gray-300"
              onClick={() => {
                setShowBackground(true);
                setBackgroundOpacity(0.8);
                setBackgroundBlur(0);
              }}
            >
              Reset
            </Button>
          </div>
          
          <div className="space-y-0.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="backgroundOpacity" className="text-[8px] text-gray-300">Opacity</Label>
              <span className="text-[8px] text-red-400">{Math.round(backgroundOpacity * 100)}%</span>
            </div>
            <Slider
              id="backgroundOpacity"
              disabled={!showBackground}
              min={0}
              max={1}
              step={0.05}
              value={[backgroundOpacity]}
              onValueChange={([value]) => setBackgroundOpacity(value)}
              className="w-full [&>[role=slider]]:bg-red-600 h-2"
            />
          </div>
          
          <div className="space-y-0.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="backgroundBlur" className="text-[8px] text-gray-300">Blur</Label>
              <span className="text-[8px] text-red-400">{backgroundBlur}px</span>
            </div>
            <Slider
              id="backgroundBlur"
              disabled={!showBackground}
              min={0}
              max={10}
              step={1}
              value={[backgroundBlur]}
              onValueChange={([value]) => setBackgroundBlur(value)}
              className="w-full [&>[role=slider]]:bg-red-600 h-2"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}