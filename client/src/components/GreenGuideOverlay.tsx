import React, { useEffect, useRef } from 'react';
import { detectPoses } from '@/lib/poseDetection';

interface GreenGuideOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isTestMode: boolean;
  confidenceThreshold: number;
}

const GreenGuideOverlay: React.FC<GreenGuideOverlayProps> = ({ 
  videoRef, 
  isTestMode,
  confidenceThreshold 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // This effect handles rendering the green guide overlay
  useEffect(() => {
    if (!isTestMode || !canvasRef.current) {
      return;
    }
    
    // Get the video element reference - it might be null initially but will be available after the video loads
    // This safety check will retry until the video is available
    let video = videoRef.current;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Get the camera container dimensions to match the camera view exactly
    const cameraContainer = document.querySelector('.camera-container');
    
    if (cameraContainer) {
      canvas.width = cameraContainer.clientWidth;
      canvas.height = cameraContainer.clientHeight;
    } else if (videoRef.current) {
      // Fallback to video dimensions if we have a video element
      // Use optional chaining to safely access properties
      canvas.width = videoRef.current?.clientWidth || 640;
      canvas.height = videoRef.current?.clientHeight || 480;
    } else {
      // Default fallback
      canvas.width = 640;
      canvas.height = 480;
    }
    
    let animationFrameId: number | null = null;
    
    const renderGuide = async () => {
      // If test mode is turned off during execution, stop
      if (!isTestMode || !ctx) return;
      
      // If video ref is not available yet, keep checking
      if (!videoRef.current) {
        animationFrameId = requestAnimationFrame(renderGuide);
        return;
      }
      
      const video = videoRef.current;
      
      // Only draw if video is ready
      if (video.readyState < 2) {
        animationFrameId = requestAnimationFrame(renderGuide);
        return;
      }
      
      // Clear previous frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      try {
        // Detect poses in reference video
        const poses = await detectPoses(video, 1, confidenceThreshold);
        
        if (poses && poses.length > 0) {
          
          // Define connections between joints for skeleton lines
          const connections = [
            // Torso
            ['left_shoulder', 'right_shoulder'],
            ['left_shoulder', 'left_hip'],
            ['right_shoulder', 'right_hip'],
            ['left_hip', 'right_hip'],
            // Arms
            ['left_shoulder', 'left_elbow'],
            ['left_elbow', 'left_wrist'],
            ['right_shoulder', 'right_elbow'],
            ['right_elbow', 'right_wrist'],
            // Legs
            ['left_hip', 'left_knee'],
            ['left_knee', 'left_ankle'],
            ['right_hip', 'right_knee'],
            ['right_knee', 'right_ankle'],
            // Face
            ['nose', 'left_eye'],
            ['nose', 'right_eye'],
            ['left_eye', 'left_ear'],
            ['right_eye', 'right_ear'],
          ];
          
          const keypoints = poses[0].keypoints;
          
          // Add overlay text with instruction to follow green guide
          ctx.font = "bold 24px system-ui";
          ctx.textAlign = "center";
          ctx.strokeStyle = 'black';
          ctx.lineWidth = 3;
          ctx.strokeText("FOLLOW THE GREEN GUIDE", canvas.width / 2, 40);
          ctx.fillStyle = '#10B981'; // Emerald-500 (green)
          ctx.fillText("FOLLOW THE GREEN GUIDE", canvas.width / 2, 40);
          
          // Use a bright green color for guide skeleton with very high visibility
          ctx.strokeStyle = '#4ADE80'; // Emerald-400 (brighter green)
          ctx.lineWidth = 8; // Extra thick lines for better visibility
          ctx.globalAlpha = 0.9; // Nearly fully opaque
          
          // Create stronger glow effect in green
          ctx.shadowColor = 'rgba(16, 185, 129, 1.0)';
          ctx.shadowBlur = 20;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          
          // Draw the reference skeleton lines
          connections.forEach((connection) => {
            const fromName = connection[0];
            const toName = connection[1];
            const from = keypoints.find((kp: any) => kp.name === fromName);
            const to = keypoints.find((kp: any) => kp.name === toName);
            
            if (from && to && 
                typeof from.score === 'number' && 
                typeof to.score === 'number' && 
                from.score > confidenceThreshold && 
                to.score > confidenceThreshold) {
              
              // Calculate scaling factors to match the canvas size to the video
              const videoWidth = video.videoWidth || 1;
              const videoHeight = video.videoHeight || 1;
              const scaleX = canvas.width / videoWidth;
              const scaleY = canvas.height / videoHeight;
              
              // Apply scaling to coordinates
              const scaledFromX = from.x * scaleX;
              const scaledFromY = from.y * scaleY;
              const scaledToX = to.x * scaleX;
              const scaledToY = to.y * scaleY;
              
              // Draw guide line with scaled coordinates
              ctx.beginPath();
              ctx.moveTo(scaledFromX, scaledFromY);
              ctx.lineTo(scaledToX, scaledToY);
              ctx.stroke();
            }
          });
          
          // Draw joint points for reference pose
          const videoWidth = video.videoWidth || 1;
          const videoHeight = video.videoHeight || 1;
          const scaleX = canvas.width / videoWidth;
          const scaleY = canvas.height / videoHeight;
          
          keypoints.forEach((point: any) => {
            if (typeof point.score === 'number' && point.score > confidenceThreshold) {
              // Apply same scaling to joint points
              const scaledX = point.x * scaleX;
              const scaledY = point.y * scaleY;
              
              // Draw a larger filled circle with brighter green
              ctx.fillStyle = '#4ADE80'; // Emerald-300 (brighter)
              
              // Add glow effect to joints
              ctx.shadowColor = 'rgba(16, 185, 129, 1.0)';
              ctx.shadowBlur = 25;
              
              // Scale joint size based on video dimensions
              const jointSize = Math.min(canvas.width, canvas.height) / 40; // Dynamic sizing
              
              ctx.beginPath();
              ctx.arc(scaledX, scaledY, jointSize, 0, 2 * Math.PI);
              ctx.fill();
            }
          });
          
          // Reset shadow and opacity
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1.0;
        }
      } catch (error) {
        console.error("Error rendering green guide:", error);
      }
      
      // Continue animation loop while in test mode
      if (isTestMode) {
        animationFrameId = requestAnimationFrame(renderGuide);
      }
    };
    
    // Start the rendering loop
    renderGuide();
    
    // Cleanup function
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      // Clear canvas on unmount
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
  }, [isTestMode, videoRef, confidenceThreshold]);
  
  if (!isTestMode) {
    return null;
  }
  
  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full z-50 pointer-events-none"
      style={{ 
        mixBlendMode: 'screen',
        backgroundColor: 'transparent',
        filter: 'contrast(1.2) brightness(1.1)'
      }}
    />
  );
};

export default GreenGuideOverlay;