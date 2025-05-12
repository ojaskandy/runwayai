import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ControlPanelProps {
  isTracking: boolean;
  toggleTracking: () => void;
  switchCamera: () => void;
  takeScreenshot: () => void;
  showSkeleton: boolean;
  setShowSkeleton: (show: boolean) => void;
  showPoints: boolean;
  setShowPoints: (show: boolean) => void;
  confidenceThreshold: number;
  setConfidenceThreshold: (value: number) => void;
  modelSelection: string;
  setModelSelection: (model: string) => void;
  maxPoses: number;
  setMaxPoses: (count: number) => void;
  skeletonColor: string;
  setSkeletonColor: (color: string) => void;
  showAdvancedSettings: boolean;
  setShowAdvancedSettings: (show: boolean) => void;
}

export default function ControlPanel({
  isTracking,
  toggleTracking,
  switchCamera,
  takeScreenshot,
  showSkeleton,
  setShowSkeleton,
  showPoints,
  setShowPoints,
  confidenceThreshold,
  setConfidenceThreshold,
  modelSelection,
  setModelSelection,
  maxPoses,
  setMaxPoses,
  skeletonColor,
  setSkeletonColor,
  showAdvancedSettings,
  setShowAdvancedSettings
}: ControlPanelProps) {
  return (
    <div className="bg-gray-900/80 p-2 rounded-md border border-red-900/30">
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-1 items-center">
          <Button 
            onClick={toggleTracking}
            className={`bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white h-9 px-3 ${isTracking ? 'opacity-80' : ''}`}
            size="sm"
          >
            <span className="material-icons text-sm">{isTracking ? "stop" : "play_arrow"}</span>
            {isTracking ? "Stop" : "Start"}
          </Button>
          
          <Button 
            onClick={takeScreenshot}
            variant="outline"
            className="h-9 px-2 border-red-900/50 bg-gray-900 text-red-500 hover:bg-gray-800"
            size="sm"
          >
            <span className="material-icons text-sm">photo_camera</span>
          </Button>
          
          <Button 
            onClick={switchCamera}
            variant="outline"
            className="h-9 px-2 border-red-900/50 bg-gray-900 text-red-500 hover:bg-gray-800"
            size="sm"
          >
            <span className="material-icons text-sm">flip_camera_ios</span>
          </Button>
        </div>
        
        <Button 
          variant="ghost"
          className="h-9 px-2 text-red-500 hover:bg-gray-800"
          size="sm"
          onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
        >
          <span className="material-icons text-sm">settings</span>
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center">
          <Switch 
            id="showSkeleton" 
            checked={showSkeleton}
            onCheckedChange={setShowSkeleton}
            className="data-[state=checked]:bg-red-600 h-4 w-7"
          />
          <Label htmlFor="showSkeleton" className="ml-2 text-xs text-gray-300">Skeleton</Label>
        </div>
        
        <div className="flex items-center">
          <Switch 
            id="showPoints" 
            checked={showPoints}
            onCheckedChange={setShowPoints}
            className="data-[state=checked]:bg-red-600 h-4 w-7"
          />
          <Label htmlFor="showPoints" className="ml-2 text-xs text-gray-300">Points</Label>
        </div>
      </div>
      
      <div className="flex items-center gap-2 mt-2">
        <div 
          className="w-4 h-4 rounded-full border border-red-700/50" 
          style={{backgroundColor: skeletonColor}}
        ></div>
        <input
          type="color"
          id="skeletonColor"
          value={skeletonColor}
          onChange={(e) => setSkeletonColor(e.target.value)}
          className="w-full h-6 rounded"
        />
      </div>
      
      {showAdvancedSettings && (
        <div className="mt-2 border-t border-red-900/30 pt-2 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <Label htmlFor="confidenceThreshold" className="text-gray-300">Sensitivity</Label>
            <span className="font-bold text-white bg-red-600 px-1 rounded text-[10px]">{(confidenceThreshold * 100).toFixed(0)}%</span>
          </div>
          <Slider
            id="confidenceThreshold"
            min={0}
            max={1}
            step={0.05}
            value={[confidenceThreshold]}
            onValueChange={([value]) => setConfidenceThreshold(value)}
            className="w-full [&>[role=slider]]:bg-red-600 h-3"
          />
          
          <div className="grid grid-cols-2 gap-2">
            <Select 
              value={modelSelection} 
              onValueChange={setModelSelection}
            >
              <SelectTrigger 
                id="modelSelection" 
                className="bg-gray-900 border-red-900/30 text-gray-300 h-7 text-xs"
              >
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-red-900/30 text-gray-300 text-xs">
                <SelectItem value="lightning">Lightning</SelectItem>
                <SelectItem value="thunder">Thunder</SelectItem>
                <SelectItem value="heavy">Heavy</SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={maxPoses.toString()} 
              onValueChange={(value) => setMaxPoses(parseInt(value))}
            >
              <SelectTrigger 
                id="maxPoses" 
                className="bg-gray-900 border-red-900/30 text-gray-300 h-7 text-xs"
              >
                <SelectValue placeholder="People" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-red-900/30 text-gray-300 text-xs">
                <SelectItem value="1">1 Person</SelectItem>
                <SelectItem value="2">2 People</SelectItem>
                <SelectItem value="3">3 People</SelectItem>
                <SelectItem value="4">4 People</SelectItem>
                <SelectItem value="5">5 People</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
