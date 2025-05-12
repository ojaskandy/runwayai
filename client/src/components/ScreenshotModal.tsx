import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ScreenshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  screenshotData: string | null;
}

export default function ScreenshotModal({ isOpen, onClose, screenshotData }: ScreenshotModalProps) {
  const handleDownload = () => {
    if (!screenshotData) return;
    
    const link = document.createElement('a');
    link.href = screenshotData;
    link.download = `taekwondo-form-${new Date().toISOString().slice(0, 10)}.png`;
    link.click();
  };
  
  const handleShare = async () => {
    if (!screenshotData || !navigator.share) return;
    
    try {
      const blob = await fetch(screenshotData).then(r => r.blob());
      const file = new File([blob], 'taekwondo-form-analysis.png', { type: 'image/png' });
      
      await navigator.share({
        title: 'My Taekwondo Form AI Analysis',
        text: 'Check out my martial arts form analysis!',
        files: [file]
      });
    } catch (error) {
      console.error('Error sharing screenshot:', error);
      alert('Could not share the image. Your browser may not support this feature.');
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border border-red-900/30 text-foreground sm:max-w-3xl shadow-lg">
        <DialogHeader className="border-b border-red-900/30 bg-black">
          <div className="flex items-center">
            <span className="material-icons text-red-500 mr-2">photo_camera</span>
            <DialogTitle className="font-serif text-red-500">Form Captured</DialogTitle>
          </div>
          <DialogClose className="text-gray-400 hover:text-white rounded-full h-8 w-8 flex items-center justify-center hover:bg-gray-800 absolute right-4 top-4" />
        </DialogHeader>
        
        <div className="p-4">
          <div className="bg-black rounded-lg overflow-hidden mb-6 border border-red-900/30 shadow-md">
            {screenshotData && (
              <img 
                src={screenshotData} 
                alt="Taekwondo form analysis" 
                className="w-full h-full object-contain"
              />
            )}
          </div>
          
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <div className="text-sm text-gray-300 italic">
              Perfect form analysis with CoachT
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={handleDownload}
                className="border-red-900 hover:bg-red-950 text-gray-300"
              >
                <span className="material-icons mr-2 text-sm">file_download</span>
                Download
              </Button>
              
              <Button 
                onClick={handleShare}
                disabled={!navigator.share}
                className="bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700"
              >
                <span className="material-icons mr-2 text-sm">share</span>
                Share
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
