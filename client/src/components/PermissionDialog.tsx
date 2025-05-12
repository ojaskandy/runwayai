import { Button } from "@/components/ui/button";

interface PermissionDialogProps {
  onRequestPermission: () => void;
}

export default function PermissionDialog({ onRequestPermission }: PermissionDialogProps) {
  return (
    <div className="p-6 rounded-xl text-center relative overflow-hidden bg-gray-900 border border-red-900/30 shadow-lg">
      {/* Camera icon */}
      <div className="mb-5 text-center z-10 relative">
        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-red-700 to-red-600 flex items-center justify-center mx-auto animate-pulse">
          <span className="material-icons text-white text-3xl">camera_alt</span>
        </div>
      </div>
      
      {/* Heading with gradient text */}
      <h2 className="text-xl font-medium mb-3 text-red-500">
        Camera Access
      </h2>
      
      <div className="max-w-md mx-auto z-10 relative">
        <p className="text-sm text-gray-400 mb-5">
          Process happens locally in your browser.
        </p>
        
        <Button 
          onClick={onRequestPermission}
          className="bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 px-6 py-4 w-full"
          size="lg"
        >
          <span className="material-icons mr-2">videocam</span>
          Enable Camera
        </Button>
      </div>
    </div>
  );
}
