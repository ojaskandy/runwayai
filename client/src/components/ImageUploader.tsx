import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ImageUploaderProps {
  onImageUploaded: (imageUrl: string) => void;
  currentImage?: string;
  title: string;
  section: string;
  developerMode?: boolean;
}

export default function ImageUploader({ 
  onImageUploaded, 
  currentImage, 
  title, 
  section, 
  developerMode = false 
}: ImageUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [directEditMode, setDirectEditMode] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAreaRef = useRef<HTMLDivElement>(null);

  // Handle success message timeout
  useEffect(() => {
    if (showSavedMessage) {
      const timer = setTimeout(() => {
        setShowSavedMessage(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSavedMessage]);

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Handle file drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Handle file input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // Process the file
  const handleFile = (file: File) => {
    setError(null);

    // Validate file type
    if (!file.type.match('image.*')) {
      setError('Please upload an image file (JPEG, PNG, etc.)');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size should be less than 10MB');
      return;
    }

    // Create preview and prepare for upload
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle save button (used in both dialog and direct edit mode)
  const handleSave = async () => {
    if (!previewImage) return;

    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch('/api/landing-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          section,
          imageUrl: previewImage
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      onImageUploaded(data.imageUrl);

      // Show saved message if in direct edit mode
      if (directEditMode) {
        setShowSavedMessage(true);
        // Exit direct edit mode after successful save
        setTimeout(() => setDirectEditMode(false), 1500);
      }

    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // If developer mode is not enabled, just show the image without editing capabilities
  if (!developerMode) {
    return (
      <div className="relative overflow-hidden rounded-lg">
        {currentImage ? (
          <div className="aspect-[16/9] w-full overflow-hidden bg-black">
            <div className="w-full h-full flex items-center justify-center">
              <img 
                src={currentImage} 
                alt={`${section} image`} 
                className="w-full h-full object-contain"
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            </div>
          </div>
        ) : (
          <div className="aspect-video w-full bg-black/30 border border-red-900/30 flex items-center justify-center">
            <div className="text-center px-4 py-2">
              <span className="material-icons text-red-500/50 text-3xl mb-2">image</span>
              <p className="text-gray-500">{section} Image</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Direct edit mode with drag-and-drop capability
  if (directEditMode) {
    return (
      <div className="relative">
        {/* Drag and drop area */}
        <div
          ref={uploadAreaRef}
          className={`aspect-video w-full overflow-hidden rounded-lg border-2 border-dashed ${
            dragActive ? 'border-red-500 bg-red-500/10' : 'border-red-900/50'
          } transition-colors relative`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {/* Background image */}
          {previewImage ? (
            <div className="w-full h-full bg-black flex items-center justify-center">
              <img 
                src={previewImage} 
                alt="Preview" 
                className="w-full h-full object-contain"
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            </div>
          ) : currentImage ? (
            <div className="w-full h-full bg-black flex items-center justify-center">
              <img 
                src={currentImage} 
                alt={`${section} image`} 
                className="w-full h-full object-contain opacity-75 max-h-[300px]"
              />
            </div>
          ) : (
            <div className="w-full h-full bg-black/30"></div>
          )}

          {/* Overlay with instructions */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="bg-black/70 p-4 rounded-lg text-center max-w-xs mx-auto">
              <span className="material-icons text-red-500 text-3xl mb-2">cloud_upload</span>
              <p className="text-white text-sm mb-2">
                {previewImage ? 'Image selected! Click Save to update.' : 'Drop an image here or click to select'}
              </p>
              {!previewImage && (
                <label className="px-4 py-2 bg-red-900/80 hover:bg-red-800 text-white rounded-md cursor-pointer transition-colors inline-block text-sm">
                  Choose File
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleChange}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Transparent file input covering the entire area for clicking anywhere */}
          {!previewImage && (
            <input
              type="file"
              className="absolute inset-0 opacity-0 cursor-pointer"
              accept="image/*"
              onChange={handleChange}
            />
          )}

          {/* Action buttons */}
          <div className="absolute bottom-4 right-4 flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setDirectEditMode(false)}
              className="bg-black/80 border-red-900/50 text-gray-200 hover:bg-black/90"
            >
              Cancel
            </Button>
            {previewImage && (
              <Button
                className="bg-gradient-to-r from-green-700 to-green-600 hover:from-green-800 hover:to-green-700 text-white"
                onClick={handleSave}
                disabled={isUploading}
              >
                {isUploading ? (
                  <span className="flex items-center">
                    <span className="material-icons animate-spin mr-2 text-sm">refresh</span>
                    Saving...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <span className="material-icons mr-2 text-sm">save</span>
                    Save
                  </span>
                )}
              </Button>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="absolute top-4 left-4 right-4 text-red-500 text-sm p-2 bg-black/80 rounded border border-red-900/50">
              {error}
            </div>
          )}

          {/* Success message */}
          {showSavedMessage && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="bg-green-900/90 text-white p-4 rounded-md flex items-center">
                <span className="material-icons text-green-400 mr-2">check_circle</span>
                Image saved successfully!
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Edit button for direct editing
  return (
    <div className="relative">
      {/* Image with edit overlay */}
      <div 
        className="relative group cursor-pointer overflow-hidden rounded-lg"
        onClick={() => setDirectEditMode(true)}
      >
        {currentImage ? (
          <div className="aspect-video w-full overflow-hidden relative bg-black">
            <div className="w-full h-full flex items-center justify-center">
              <img 
                src={currentImage} 
                alt={`${section} image`} 
                className="w-full h-full object-contain max-h-[300px]"
              />
            </div>
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white font-medium px-4 py-2 rounded-md bg-red-600/80 flex items-center">
                <span className="material-icons mr-2">edit</span>
                Edit Image
              </span>
            </div>
          </div>
        ) : (
          <div className="aspect-video w-full bg-black/30 border border-red-900/30 flex items-center justify-center">
            <div className="text-center px-4 py-2">
              <span className="material-icons text-red-500 text-3xl mb-2">add_photo_alternate</span>
              <p className="text-gray-300">Upload {section} Image</p>
            </div>
          </div>
        )}
      </div>

      {/* Success message */}
      {showSavedMessage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-green-900/90 text-white px-4 py-2 rounded-md flex items-center">
            <span className="material-icons text-green-400 mr-2">check_circle</span>
            Image saved successfully!
          </div>
        </div>
      )}
    </div>
  );
}