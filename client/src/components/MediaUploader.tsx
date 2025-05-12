import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MediaUploaderProps {
  onImageUpload: (image: HTMLImageElement, url: string) => void;
  onVideoUpload: (video: HTMLVideoElement, url: string) => void;
  onCancel: () => void;
}

export default function MediaUploader({ onImageUpload, onVideoUpload, onCancel }: MediaUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File types we accept
  const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const acceptedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    setError(null);
    setLoading(true);
    
    const fileType = file.type;
    const fileURL = URL.createObjectURL(file);
    
    // Check if file is an accepted image
    if (acceptedImageTypes.includes(fileType)) {
      const img = new Image();
      img.onload = () => {
        setLoading(false);
        onImageUpload(img, fileURL);
      };
      img.onerror = () => {
        setLoading(false);
        setError('Failed to load image. Please try another file.');
        URL.revokeObjectURL(fileURL);
      };
      img.src = fileURL;
    } 
    // Check if file is an accepted video
    else if (acceptedVideoTypes.includes(fileType)) {
      const video = document.createElement('video');
      video.onloadeddata = () => {
        setLoading(false);
        onVideoUpload(video, fileURL);
      };
      video.onerror = () => {
        setLoading(false);
        setError('Failed to load video. Please try another file.');
        URL.revokeObjectURL(fileURL);
      };
      video.src = fileURL;
      video.load();
    } 
    // File type not accepted
    else {
      setLoading(false);
      setError('Please upload an image (JPG, PNG, WEBP) or video (MP4, WEBM).');
    }
  };

  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="p-6 bg-gray-900 rounded-lg max-w-md w-full border border-red-900/30 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-serif bg-gradient-to-r from-red-500 to-red-600 text-transparent bg-clip-text">
          Upload Media
        </h3>
        <button 
          onClick={onCancel}
          className="text-gray-400 hover:text-white"
        >
          <span className="material-icons">close</span>
        </button>
      </div>
      
      <div 
        className={`upload-zone p-8 mb-4 flex flex-col items-center justify-center bg-gray-800/50 border border-dashed border-red-900/50 rounded-lg ${isDragging ? 'bg-red-900/20 border-red-600' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <span className="material-icons text-4xl text-red-500 mb-3">
          {loading ? "hourglass_top" : "cloud_upload"}
        </span>
        
        <p className="text-center text-gray-300 mb-3">
          {loading 
            ? "Processing your file..." 
            : "Drag & drop your image or video here"}
        </p>
        
        <p className="text-xs text-gray-500 mb-4 text-center">
          Supported formats: JPG, PNG, WEBP, MP4, WEBM
        </p>
        
        {!loading && (
          <Button 
            onClick={handleBrowseClick}
            className="bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700"
          >
            Browse Files
          </Button>
        )}
        
        {loading && <div className="loader mt-2"></div>}
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.mov"
          className="hidden"
        />
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-4 bg-red-950 border border-red-700 text-red-300">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-2 gap-3">
        <Button 
          variant="outline" 
          onClick={onCancel}
          className="border-red-900/30 bg-gray-900 text-gray-300 hover:bg-gray-800"
        >
          Cancel
        </Button>
        
        <Button
          className="bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700"
          onClick={handleBrowseClick}
          disabled={loading}
        >
          {loading ? "Processing..." : "Select File"}
        </Button>
      </div>
    </div>
  );
}