import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import MediaUploader from "./MediaUploader";

interface SourceSelectorProps {
  sourceType: 'camera' | 'image' | 'video';
  setSourceType: (type: 'camera' | 'image' | 'video') => void;
  onImageUpload: (image: HTMLImageElement, url: string) => void;
  onVideoUpload: (video: HTMLVideoElement, url: string) => void;
  hasCameraPermission: boolean;
  requestCameraPermission: () => void;
}

export default function SourceSelector({
  sourceType,
  setSourceType, 
  onImageUpload,
  onVideoUpload,
  hasCameraPermission,
  requestCameraPermission
}: SourceSelectorProps) {
  const [showUploader, setShowUploader] = useState(false);

  const handleSourceChange = (newSourceType: 'camera' | 'image' | 'video') => {
    if (newSourceType === 'camera') {
      if (hasCameraPermission) {
        setSourceType('camera');
      } else {
        requestCameraPermission();
      }
    } else {
      setShowUploader(true);
      setSourceType(newSourceType);
    }
  };

  return (
    <>
      <div className="mb-0">
        <Tabs 
          value={sourceType} 
          onValueChange={(value) => handleSourceChange(value as 'camera' | 'image' | 'video')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 bg-black/50 h-9">
            <TabsTrigger 
              value="camera"
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white px-1"
            >
              <span className="material-icons text-sm">videocam</span>
            </TabsTrigger>
            <TabsTrigger 
              value="image"
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white px-1"
            >
              <span className="material-icons text-sm">image</span>
            </TabsTrigger>
            <TabsTrigger 
              value="video"
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white px-1"
            >
              <span className="material-icons text-sm">movie</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="camera" className="mt-0">
            {!hasCameraPermission && (
              <div className="p-1 bg-black/50 rounded-b border border-t-0 border-red-900/30">
                <Button onClick={requestCameraPermission} className="w-full bg-red-600 hover:bg-red-700 h-6 text-xs">
                  <span className="material-icons text-xs mr-1">camera_alt</span>
                  Enable
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="image" className="mt-0">
            <div className="p-1 bg-black/50 rounded-b border border-t-0 border-red-900/30">
              <Button 
                onClick={() => setShowUploader(true)}
                className="w-full bg-red-600 hover:bg-red-700 h-6 text-xs"
              >
                <span className="material-icons text-xs mr-1">file_upload</span>
                Upload
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="video" className="mt-0">
            <div className="p-1 bg-black/50 rounded-b border border-t-0 border-red-900/30">
              <Button 
                onClick={() => setShowUploader(true)}
                className="w-full bg-red-600 hover:bg-red-700 h-6 text-xs"
              >
                <span className="material-icons text-xs mr-1">file_upload</span>
                Upload
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {showUploader && (sourceType === 'image' || sourceType === 'video') && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <MediaUploader
            onImageUpload={(image, url) => {
              onImageUpload(image, url);
              setShowUploader(false);
            }}
            onVideoUpload={(video, url) => {
              onVideoUpload(video, url);
              setShowUploader(false);
            }}
            onCancel={() => {
              setShowUploader(false);
              // Revert to camera if user cancels without selecting media
              if (!hasCameraPermission) {
                requestCameraPermission();
              } else {
                setSourceType('camera');
              }
            }}
          />
        </div>
      )}
    </>
  );
}