import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface MobileWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MobileWarningDialog({ open, onOpenChange }: MobileWarningDialogProps) {
  // Ensure proper animation timing
  const [showIcon, setShowIcon] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      // Add a small delay for the icon animation
      const timer = setTimeout(() => {
        setShowIcon(true);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setShowIcon(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 text-white border-red-900/30 sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 relative">
            <div className={`bg-red-600/20 rounded-full p-4 transition-all duration-500 ${showIcon ? 'scale-100' : 'scale-0'}`}>
              <span className="material-icons text-red-500 text-5xl">devices</span>
            </div>
          </div>
          <DialogTitle className="text-xl text-center text-red-500">
            Mobile Device Detected
          </DialogTitle>
          <DialogDescription className="text-gray-300 text-center">
            For the best experience with CoachT, we recommend using a laptop or tablet instead. 
            The pose detection and detailed analysis features work optimally on larger screens.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 mb-3">
          <div className="bg-gray-800 rounded-lg p-3 text-sm">
            <h4 className="font-semibold text-white mb-1 flex items-center">
              <span className="material-icons text-red-500 mr-1 text-base">warning</span>
              Limited Functionality
            </h4>
            <p className="text-gray-300">
              Some advanced features may be limited or unavailable on mobile devices due to 
              camera constraints and processing requirements.
            </p>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-center">
          <Button 
            onClick={() => onOpenChange(false)}
            className="w-full bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white"
          >
            Continue Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 