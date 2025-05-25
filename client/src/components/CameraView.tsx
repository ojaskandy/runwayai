import { useRef, useEffect, useState } from 'react';
import { detectPoses, initPoseDetection, getJointConnections } from '@/lib/poseDetection';
import { compareAnglesWithDTW } from '@/lib/dtw';
import GreenGuideOverlay from './GreenGuideOverlay';
import RecordingControls from './camera/RecordingControls';
import ResultsModal from './camera/ResultsModal';
import NotesEditor from './camera/NotesEditor';
import { calculateJointAngles, type JointScore, angleJoints } from './camera/JointScoringEngine';
import { detectSignificantMovements, detectMovementGaps, type TimingIssues } from './camera/TimingAnalyzer';
import { isVideoUrl } from './camera/utils';
import StopTestIntermediatePopup from './camera/StopTestIntermediatePopup';
import TestResultsPopup from './camera/TestResultsPopup';

interface CameraViewProps {
  stream: MediaStream | null;
  isTracking: boolean;
  confidenceThreshold: number;
  modelSelection: string;
  maxPoses: number;
  skeletonColor: string;
  showSkeleton: boolean;
  showPoints: boolean;
  showBackground: boolean;
  backgroundOpacity: number;
  backgroundBlur: number;
  sourceType: 'camera' | 'image' | 'video';
  imageElement?: HTMLImageElement | null;
  videoElement?: HTMLVideoElement | null;
  mediaUrl?: string;
  showReferenceOverlay?: boolean;
  isFullscreenMode?: boolean;
  onScreenshot: (dataUrl: string) => void;
  toggleTracking?: () => void;
  toggleReferenceOverlay?: () => void;
  
  // Additional props
  cameraFacing?: 'user' | 'environment';
  setCameraFacing?: (facing: 'user' | 'environment') => void;
  externalIsRecording?: boolean;
  onRecordClick?: () => void;
  routineNotes?: string;
  setRoutineNotes?: (notes: string) => void;
  customBackground?: string | null;
}

// Update the TestResults type (add this where other interfaces/types are defined)
interface TestResults {
  isRunning: boolean;
  processing: boolean;
  scores: JointScore[];
  overallScore: number;
  feedback: string;
  timing?: TimingIssues;
  dtwScores?: Record<string, number>;
  angleData?: {
    timestamps: string[];
    userAngles: { [joint: string]: number[] };
    expectedAngles: { [joint: string]: number[] };
  };
  userAngleTable?: {
    timestamps: string[];
    angles: { [joint: string]: number[] };
  };
  instructorAngleTable?: {
    timestamps: string[];
    angles: { [joint: string]: number[] };
  };
  dtwResults?: Record<string, any>;
}

export default function CameraView({
  stream,
  isTracking,
  confidenceThreshold,
  modelSelection,
  maxPoses,
  skeletonColor,
  showSkeleton,
  showPoints,
  showBackground,
  backgroundOpacity,
  backgroundBlur,
  sourceType,
  imageElement,
  videoElement: externalVideoElement,
  mediaUrl,
  showReferenceOverlay = false,
  isFullscreenMode = false,
  onScreenshot,
  toggleTracking: externalToggleTracking,
  toggleReferenceOverlay: externalToggleReferenceOverlay,
  
  // Additional props
  cameraFacing,
  setCameraFacing,
  externalIsRecording,
  onRecordClick,
  routineNotes = '',
  setRoutineNotes,
  customBackground
}: CameraViewProps) {
  const toggleTracking = externalToggleTracking || (() => {
    console.log("Toggle tracking clicked, but no handler was provided");
  });

  const toggleReferenceOverlay = externalToggleReferenceOverlay || (() => {
    console.log("Toggle reference overlay clicked, but no handler was provided");
  });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recordingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const recordingStream = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const referenceVideoRef = useRef<HTMLVideoElement | null>(null);
  const [mediaLoaded, setMediaLoaded] = useState<boolean>(false);
  const [isSplitView, setIsSplitView] = useState<boolean>(false);
  const [isVideoPaused, setIsVideoPaused] = useState<boolean>(false);
  const [showMediaSelector, setShowMediaSelector] = useState<boolean>(false);
  const [localRoutineNotes, setLocalRoutineNotes] = useState<string>('');
  const [testResults, setTestResults] = useState<TestResults>({
    isRunning: false,
    processing: false,
    scores: [],
    overallScore: 0,
    feedback: '',
    dtwScores: {},
    dtwResults: {}
  });
  // State variables for UI control
  const [showResultsModal, setShowResultsModal] = useState<boolean>(false);
  const [showCopyToast, setShowCopyToast] = useState<boolean>(false);
  const [showRecordingPopup, setShowRecordingPopup] = useState<boolean>(false);
  // State for the "Screen recording complete" pop-up after a test
  const [showTestVideoPopup, setShowTestVideoPopup] = useState<boolean>(false);
  const [testVideoUrlForPopup, setTestVideoUrlForPopup] = useState<string | undefined>(undefined);
  const [wasTestActiveWhenRoutineStopped, setWasTestActiveWhenRoutineStopped] = useState<boolean>(false);
  // State for popups
  const [showStopTestIntermediatePopup, setShowStopTestIntermediatePopup] = useState<boolean>(false);
  const [showTestResultsPopup, setShowTestResultsPopup] = useState<boolean>(false);
  
  // State variables for media recording
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordedVideo, setRecordedVideo] = useState<string | undefined>(undefined);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  
  // Sync with external recording state if provided
  useEffect(() => {
    if (externalIsRecording !== undefined && externalIsRecording !== isRecording) {
      setIsRecording(externalIsRecording);
    }
  }, [externalIsRecording]);
  
  // State variables for pose detection
  const [userPose, setUserPose] = useState<any>(null);
  const [referencePose, setReferencePose] = useState<any>(null);
  const [userPoseHistory, setUserPoseHistory] = useState<Array<{pose: any, timestamp: number}>>([]);
  const [referencePoseHistory, setReferencePoseHistory] = useState<Array<{pose: any, timestamp: number}>>([]);
  const [referenceMovementSequence, setReferenceMovementSequence] = useState<string[]>([]);
  const [userMovementSequence, setUserMovementSequence] = useState<string[]>([]);
  const [priorityJoints, setPriorityJoints] = useState<string[]>([]);
  
  // Performance optimization variables
  const frameCountRef = useRef(0);
  const frameSkipRate = 3; // Skip frames to improve performance
  
  // State variables for distance measurement
  const [distanceInfo, setDistanceInfo] = useState<{
    scale: number,
    isCorrect: boolean,
    message: string,
    showMeter: boolean
  }>({
    scale: 1,
    isCorrect: false,
    message: '',
    showMeter: false
  });
  
  // State variables for test mode
  const [referenceFrames, setReferenceFrames] = useState<any[]>([]);
  const [isRecordingReference, setIsRecordingReference] = useState<boolean>(false);
  const [testStartTime, setTestStartTime] = useState<number>(0);
  const [graceTimeRemaining, setGraceTimeRemaining] = useState<number>(3);
  const [timingOffsets, setTimingOffsets] = useState<number[]>([]);
  
  // State variables for angle detection
  const [jointAngles, setJointAngles] = useState<Record<string, number>>({});
  const [userAngleSequences, setUserAngleSequences] = useState<Record<string, number[]>>({});
  const [referenceAngleSequences, setReferenceAngleSequences] = useState<Record<string, number[]>>({});

  // At the state variables section, add a new state for tracking if a test has been completed
  const [hasCompletedTest, setHasCompletedTest] = useState<boolean>(false);

  // Add state for storing regular angle measurements
  const [angleRecordingInterval, setAngleRecordingInterval] = useState<NodeJS.Timeout | null>(null);
  const [userAngleHistory, setUserAngleHistory] = useState<{
    [joint: string]: Array<{angle: number, timestamp: number}>
  }>({});
  const [referenceAngleHistory, setReferenceAngleHistory] = useState<{
    [joint: string]: Array<{angle: number, timestamp: number}>
  }>({});

  // Add a ref for immediate stop signal
  const isAngleRecordingStoppedRef = useRef<boolean>(false);

  // Add a state for preloaded background image
  const [preloadedBackground, setPreloadedBackground] = useState<HTMLImageElement | null>(null);
  
  // Preload custom background image
  useEffect(() => {
    if (customBackground) {
      const img = new Image();
      img.onload = () => setPreloadedBackground(img);
      img.src = customBackground;
    } else {
      setPreloadedBackground(null);
    }
  }, [customBackground]);
  
  useEffect(() => {
    const savedNotes = localStorage.getItem('routineNotes');
    if (savedNotes && setRoutineNotes) {
      setLocalRoutineNotes(savedNotes);
      setRoutineNotes(savedNotes);
    }
  }, [setRoutineNotes]);

  useEffect(() => {
    if (routineNotes) {
      localStorage.setItem('routineNotes', routineNotes);
      setLocalRoutineNotes(routineNotes);
    }
  }, [routineNotes]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleMetadataLoaded = () => {
      console.log("Camera metadata loaded, video dimensions:", videoElement.videoWidth, "x", videoElement.videoHeight);
      if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
        setMediaLoaded(true);
      }
    };

    if ((isSplitView || sourceType === 'camera') && stream) {
      videoElement.srcObject = stream;
      videoElement.addEventListener('loadedmetadata', handleMetadataLoaded);
      videoElement.play().catch(err => {
        console.error("Error playing camera stream:", err);
      });
      // setMediaLoaded(true); // Removed: will be set by onloadedmetadata
    } else if (!isSplitView && sourceType === 'video' && externalVideoElement && mediaUrl) {
      videoElement.srcObject = null;
      videoElement.src = mediaUrl;
      videoElement.loop = true;
      videoElement.muted = true;

      videoElement.addEventListener('loadedmetadata', handleMetadataLoaded); // Also for video files

      if (!isVideoPaused) {
        videoElement.play().catch(err => {
          console.error("Error playing video file:", err);
        });
      } else {
        videoElement.pause();
      }
      // setMediaLoaded(true); // Removed: will be set by onloadedmetadata for consistency
    } else {
      // If no stream or mediaUrl, media is not loaded
      setMediaLoaded(false);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      videoElement.removeEventListener('loadedmetadata', handleMetadataLoaded);
      if (videoElement && !videoElement.srcObject) {
        videoElement.pause();
        videoElement.src = '';
        videoElement.load();
      }
    };
  }, [stream, sourceType, mediaUrl, externalVideoElement, isVideoPaused, isSplitView]);


  useEffect(() => {
    console.log("Running pose detection with parameters:", {
      sourceType,
      modelSelection,
      confidenceThreshold,
      showSkeleton,
      maxPoses,
      isFullscreenMode
    });

    let sourceElement: HTMLImageElement | HTMLVideoElement | null = null;

    if (sourceType === 'image' && imageElement) {
      sourceElement = imageElement;
      console.log(`Using image source: ${imageElement.naturalWidth}x${imageElement.naturalHeight}, loaded: ${imageElement.complete}`);
      // setMediaLoaded(imageElement.complete && imageElement.naturalWidth > 0); // Handled by the other useEffect with event listener
      if (!imageElement.complete || imageElement.naturalWidth === 0) {
        console.log("Image not fully loaded, waiting...");
        if (mediaLoaded) setMediaLoaded(false); // Ensure loading shows
        return;
      }
    } else if (sourceType === 'camera' && videoRef.current) {
      sourceElement = videoRef.current;
      const hasValidDimensions = sourceElement.videoWidth > 0 && sourceElement.videoHeight > 0;
      const isReadyStateSufficient = sourceElement.readyState >= HTMLMediaElement.HAVE_METADATA; // HAVE_METADATA is 1
      // setMediaLoaded(isReadyStateSufficient && hasValidDimensions); // Handled by other useEffect with event listener
      
      if (!isReadyStateSufficient || !hasValidDimensions) {
        console.log("Camera not ready yet (readyState < 1 or dimensions are zero). Waiting...");
        if (mediaLoaded) setMediaLoaded(false); // Ensure loading shows if it was true
        return; // Wait for the camera to be fully ready.
      }
      // console.log("Camera is ready. mediaLoaded should be true."); // mediaLoaded is set by event listener now
    } else if ((sourceType === 'video' || isSplitView) && videoRef.current) {
      sourceElement = videoRef.current;
      const hasValidDimensions = sourceElement.videoWidth > 0 && sourceElement.videoHeight > 0;
      const isReadyStateSufficient = sourceElement.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA; // HAVE_ENOUGH_DATA is 4 (or 2 for HAVE_CURRENT_DATA)
      // setMediaLoaded(isReadyStateSufficient && hasValidDimensions); // Handled by other useEffect
      if (!isReadyStateSufficient || !hasValidDimensions) {
        console.log("Video not ready yet, waiting for more data");
        if (mediaLoaded) setMediaLoaded(false); // Ensure loading shows
        return;
      }
    } else {
      console.log("No valid source element found for pose detection useEffect.");
      if (mediaLoaded) setMediaLoaded(false); // Explicitly set to false
      return;
    }

    const canvasElement = canvasRef.current;
    if (!sourceElement || !canvasElement) {
      console.log("Source or canvas element not available");
      return;
    }

    if (isFullscreenMode) {
      const container = document.getElementById('cameraContainer');
      if (container) {
        console.log("Adjusting canvas for fullscreen mode");
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        canvasElement.style.width = '100%';
        canvasElement.style.height = '100%';
        canvasElement.style.objectFit = 'contain';
        const cameraContainer = document.querySelector('.camera-container');
        if (cameraContainer) {
          (cameraContainer as HTMLElement).style.display = 'flex';
          (cameraContainer as HTMLElement).style.justifyContent = 'center';
          (cameraContainer as HTMLElement).style.alignItems = 'center';
        }
      }
    }

    let animationFrameId: number | null = null;

    // Define the getRgbForColor helper function
  const getRgbForColor = (color: string) => {
    return color === 'blue' ? { r: 59, g: 130, b: 246 } :
           color === 'green' ? { r: 16, g: 185, b: 129 } :
           color === 'purple' ? { r: 139, g: 92, b: 246 } :
           color === 'orange' ? { r: 249, g: 115, b: 22 } :
           { r: 239, g: 68, b: 68 }; // default red
  };

  const detect = async () => {
      try {
        frameCountRef.current = (frameCountRef.current + 1) % frameSkipRate;
        if (!isTracking || frameCountRef.current !== 0) {
          animationRef.current = requestAnimationFrame(detect);
          return;
        }
        
        const ctx = canvasRef.current?.getContext('2d');
        const video = videoRef.current;
        
        if (!ctx || !video) {
          animationRef.current = requestAnimationFrame(detect);
          return;
        }
        
        const videoWidth = video.videoWidth || video.width || ctx.canvas.width;
        const videoHeight = video.videoHeight || video.height || ctx.canvas.height;
        
        ctx.canvas.width = videoWidth;
        ctx.canvas.height = videoHeight;
        
        // Clear canvas
        ctx.clearRect(0, 0, videoWidth, videoHeight);
        
        // Draw background (video/image source)
        if (showBackground) {
          if (customBackground && preloadedBackground) {
            // If a custom background is provided, use the preloaded image
            ctx.globalAlpha = backgroundOpacity;
            
            // Apply a blur effect if requested
            if (backgroundBlur > 0) {
              ctx.filter = `blur(${backgroundBlur}px)`;
            }
            
            // Draw the custom background, scaling to fit
            ctx.drawImage(preloadedBackground, 0, 0, videoWidth, videoHeight);
            
            // Reset filters
            ctx.filter = 'none';
            ctx.globalAlpha = 1.0;
          } else {
            // Otherwise draw the default video/camera feed
            ctx.globalAlpha = backgroundOpacity;
            
            // Apply a blur effect if requested
            if (backgroundBlur > 0) {
              ctx.filter = `blur(${backgroundBlur}px)`;
            }
            
            ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
            
            // Reset filters
            ctx.filter = 'none';
            ctx.globalAlpha = 1.0;
          }
        }

        if (isTracking && mediaLoaded) {
          try {
            // PERFORMANCE OPTIMIZATION: Skip frames to reduce CPU load
            // Only run detection every n frames based on device performance
            const shouldSkipFrame = frameCountRef.current % frameSkipRate !== 0;
            frameCountRef.current = (frameCountRef.current + 1) % (frameSkipRate * 10); // Reset counter periodically
            
            // Run actual pose detection
            const poses = await detectPoses(
              sourceElement,
              maxPoses,
              confidenceThreshold
            );

            if (sourceElement === videoRef.current && poses && poses.length > 0) {
              setUserPose(poses[0]);

              if (isSplitView && referenceVideoRef.current &&
                  referenceVideoRef.current.readyState >= 2) {
                if (!testResults.isRunning) {
                  try {
                    // Process reference video every frame
                    const refPoses = await detectPoses(
                      referenceVideoRef.current,
                      1,
                      confidenceThreshold
                    );

                    if (refPoses && refPoses.length > 0) {
                      setReferencePose(refPoses[0]);
                      if (isSplitView && referenceVideoRef.current) {
                        updateDistanceMeter(poses[0], refPoses[0]);
                      }
                    }
                  } catch (error) {
                    console.error("Error detecting pose on reference video:", error);
                  }
                }
              }

              if (testResults.isRunning && referenceVideoRef.current &&
                  referenceVideoRef.current.readyState >= 2) {
                try {
                  const refPoses = await detectPoses(
                    referenceVideoRef.current,
                    1,
                    confidenceThreshold
                  );

                  if (refPoses && refPoses.length > 0) {
                    console.log("Setting reference pose with keypoints:", refPoses[0].keypoints.length);
                    setReferencePose(refPoses[0]);

                    if (isRecordingReference) {
                      setReferenceFrames(prev => [...prev, refPoses[0]]);
                    }

                    const timestamp = Date.now();
                    const inGracePeriod = testStartTime > 0 && (timestamp - testStartTime < 1000);

                    if (!inGracePeriod) {
                      let bestRefPose = refPoses[0];

                      if (referencePoseHistory.length > 0) {
                        const bestMatchingPose = findBestMatchingPose(timestamp, referencePoseHistory);
                        if (bestMatchingPose) {
                          bestRefPose = bestMatchingPose;
                        }
                      }

                      const comparison = comparePoses(poses[0], bestRefPose);

                      setTestResults(prev => ({
                        ...prev,
                        scores: comparison.jointScores,
                        overallScore: comparison.overallScore
                      }));
                    } else {
                      console.log(`In grace period: ${Math.round((timestamp - testStartTime) / 100) / 10}s elapsed, pausing comparisons`);
                    }
                  }
                } catch (err) {
                  console.error("Error detecting poses on reference video:", err);
                }
              }

              poses.forEach(pose => {
                const keypoints = pose.keypoints;
                const connections = [
                  ['left_shoulder', 'right_shoulder'],
                  ['left_shoulder', 'left_hip'],
                  ['right_shoulder', 'right_hip'],
                  ['left_hip', 'right_hip'],
                  ['left_shoulder', 'left_elbow'],
                  ['left_elbow', 'left_wrist'],
                  ['right_shoulder', 'right_elbow'],
                  ['right_elbow', 'right_wrist'],
                  ['left_hip', 'left_knee'],
                  ['left_knee', 'left_ankle'],
                  ['right_hip', 'right_knee'],
                  ['right_knee', 'right_ankle'],
                  ['nose', 'left_eye'],
                  ['nose', 'right_eye'],
                  ['left_eye', 'left_ear'],
                  ['right_eye', 'right_ear'],
                ];

                if (testResults.isRunning && sourceType === 'camera') {
                  console.log("TEST MODE ACTIVE - Should draw green skeleton");

                  if (referenceVideoRef.current && referenceVideoRef.current.readyState >= 2) {
                    console.log("Using reference video for overlay - video is ready");
                  } else if (referencePose) {
                    console.log("Using cached reference pose with keypoints:", referencePose.keypoints.length);
                  } else {
                    console.log("NO REFERENCE POSE AVAILABLE YET");
                  }

                  ctx.font = "bold 24px system-ui";
                  ctx.textAlign = "center";
                  ctx.strokeStyle = 'black';
                  ctx.lineWidth = 3;
                  ctx.strokeText("FOLLOW THE GREEN GUIDE", canvasElement.width / 2, 40);
                  ctx.fillStyle = '#10B981';
                  ctx.fillText("FOLLOW THE GREEN GUIDE", canvasElement.width / 2, 40);

                  if (referencePose && referencePose.keypoints) {
                    const refKeypoints = referencePose.keypoints;
                    if (refKeypoints && refKeypoints.length > 0) {
                      console.log("Reference keypoints found:", refKeypoints.length);
                      
                      // Process and store reference angles continuously
                      const refTimestamp = new Date().toISOString().substr(11, 8); // HH:MM:SS format
                      const refAngles = calculateJointAngles(referencePose);
                      
                      // Store each angle with timestamp in referencePoseHistory - BUT ONLY IF NOT STOPPED
                      if (!isAngleRecordingStoppedRef.current) {
                        const currentTime = Date.now();
                        Object.entries(refAngles).forEach(([jointName, angle]) => {
                          setReferenceAngleHistory(prev => ({
                            ...prev,
                            [jointName]: [...(prev[jointName] || []), {angle, timestamp: currentTime}]
                          }));
                        });
                        
                        // Also update the instructor angle table for immediate display
                        setTestResults(prev => {
                          const instructorTable = prev.instructorAngleTable || { timestamps: [], angles: {} };
                          const newAngles = { ...instructorTable.angles };
                          
                          // For each detected angle, add it to the array
                          Object.entries(refAngles).forEach(([joint, angle]) => {
                            if (!newAngles[joint]) {
                              newAngles[joint] = [];
                            }
                            newAngles[joint].push(angle);
                          });
                          
                          return {
                            ...prev,
                            instructorAngleTable: {
                              timestamps: [...instructorTable.timestamps, refTimestamp],
                              angles: newAngles
                            }
                          };
                        });
                      }
                      
                      const cleanRefPose = {
                        keypoints: JSON.parse(JSON.stringify(refKeypoints))
                      };
                      ctx.strokeStyle = '#10B981';
                      ctx.lineWidth = 6;
                      ctx.globalAlpha = 0.85;
                      ctx.shadowColor = 'rgba(16, 185, 129, 0.9)';
                      ctx.shadowBlur = 15;

                      connections.forEach((connection) => {
                        const fromName = connection[0];
                        const toName = connection[1];
                        const fromRef = cleanRefPose.keypoints.find((kp: any) => kp.name === fromName);
                        const toRef = cleanRefPose.keypoints.find((kp: any) => kp.name === toName);

                        if (fromRef && toRef &&
                            typeof fromRef.score === 'number' &&
                            typeof toRef.score === 'number' &&
                            fromRef.score > confidenceThreshold &&
                            toRef.score > confidenceThreshold) {
                          ctx.beginPath();
                          ctx.moveTo(fromRef.x, fromRef.y);
                          ctx.lineTo(toRef.x, toRef.y);
                          ctx.stroke();
                        }
                      });

                      cleanRefPose.keypoints.forEach((refPoint: any) => {
                        if (typeof refPoint.score === 'number' && refPoint.score > confidenceThreshold) {
                          ctx.fillStyle = '#4ADE80';
                          ctx.beginPath();
                          ctx.arc(refPoint.x, refPoint.y, 10, 0, 2 * Math.PI);
                          ctx.fill();
                        }
                      });

                      ctx.shadowColor = 'transparent';
                      ctx.shadowBlur = 0;
                      ctx.globalAlpha = 1.0;
                      
                      // Always show angles for reference pose (instructor)
                      Object.entries(calculateJointAngles(referencePose)).forEach(([jointName, angle]) => {
                        if (['nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear'].includes(jointName)) {
                          return;
                        }

                        const joint = referencePose.keypoints.find((kp: any) => kp.name === jointName);
                        if (joint && typeof joint.score === 'number' && joint.score > 0.3) {
                          const offsetX = (joint.x > canvasElement.width / 2) ? -30 : 30;
                          const offsetY = (joint.y > canvasElement.height / 2) ? -30 : 30;

                          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                          ctx.beginPath();
                          ctx.arc(joint.x + offsetX/2, joint.y + offsetY/2, 22, 0, 2 * Math.PI);
                          ctx.fill();

                          ctx.strokeStyle = '#10B981';
                          ctx.lineWidth = 2;
                          ctx.shadowColor = '#10B981';
                          ctx.shadowBlur = 5;
                          ctx.beginPath();
                          ctx.arc(joint.x + offsetX/2, joint.y + offsetY/2, 22, 0, 2 * Math.PI);
                          ctx.stroke();

                          ctx.shadowBlur = 0;
                          ctx.shadowColor = 'transparent';

                          ctx.fillStyle = 'white';
                          ctx.fillText(`${angle}°`, joint.x + offsetX/2, joint.y + offsetY/2);

                          ctx.strokeStyle = '#10B981';
                          ctx.lineWidth = 1.5;
                          ctx.beginPath();
                          ctx.moveTo(joint.x, joint.y);
                          ctx.lineTo(joint.x + offsetX/2, joint.y + offsetY/2);
                          ctx.stroke();
                        }
                      });

                      ctx.font = 'bold 16px Arial';
                      ctx.textAlign = 'center';
                      ctx.textBaseline = 'middle';
                      ctx.lineWidth = 2;

                      Object.entries(calculateJointAngles(referencePose)).forEach(([jointName, angle]) => {
                        if (['nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear'].includes(jointName)) {
                          return;
                        }

                        const joint = referencePose.keypoints.find((kp: any) => kp.name === jointName);
                        if (joint && typeof joint.score === 'number' && joint.score > 0.3) {
                          const offsetX = (joint.x > canvasElement.width / 2) ? -30 : 30;
                          const offsetY = (joint.y > canvasElement.height / 2) ? -30 : 30;

                          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                          ctx.beginPath();
                          ctx.arc(joint.x + offsetX/2, joint.y + offsetY/2, 22, 0, 2 * Math.PI);
                          ctx.fill();

                          ctx.strokeStyle = '#10B981';
                          ctx.lineWidth = 2;
                          ctx.shadowColor = '#10B981';
                          ctx.shadowBlur = 5;
                          ctx.beginPath();
                          ctx.arc(joint.x + offsetX/2, joint.y + offsetY/2, 22, 0, 2 * Math.PI);
                          ctx.stroke();

                          ctx.shadowBlur = 0;
                          ctx.shadowColor = 'transparent';

                          ctx.fillStyle = 'white';
                          ctx.fillText(`${angle}°`, joint.x + offsetX/2, joint.y + offsetY/2);

                          ctx.strokeStyle = '#10B981';
                          ctx.lineWidth = 1.5;
                          ctx.beginPath();
                          ctx.moveTo(joint.x, joint.y);
                          ctx.lineTo(joint.x + offsetX/2, joint.y + offsetY/2);
                          ctx.stroke();
                        }
                      });
                    }
                  }
                }

                if (showSkeleton) {
                            // Define the getRgbForColor helper function
          const getRgbForColor = (color: string) => {
            return color === 'blue' ? { r: 59, g: 130, b: 246 } :
                  color === 'green' ? { r: 16, g: 185, b: 129 } :
                  color === 'purple' ? { r: 139, g: 92, b: 246 } :
                  color === 'orange' ? { r: 249, g: 115, b: 22 } :
                  { r: 239, g: 68, b: 68 }; // default red
          };
          
          // Get RGB values for the current skeleton color
          const skeletonRGB = getRgbForColor(skeletonColor);
                  
                  ctx.strokeStyle = skeletonColor === 'blue' ? '#3b82f6' :
                                   skeletonColor === 'green' ? '#10b981' :
                                   skeletonColor === 'purple' ? '#8b5cf6' :
                                   skeletonColor === 'orange' ? '#f97316' :
                                   '#ef4444'; // default red
                  ctx.lineWidth = 3;

                  connections.forEach((connection) => {
                    const fromName = connection[0];
                    const toName = connection[1];
                    const from = keypoints.find(kp => kp.name === fromName);
                    const to = keypoints.find(kp => kp.name === toName);

                    if (from && to &&
                        typeof from.score === 'number' &&
                        typeof to.score === 'number' &&
                        from.score > confidenceThreshold &&
                        to.score > confidenceThreshold) {
                      const rgb = getRgbForColor(skeletonColor);
                      ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`;
                      ctx.shadowBlur = 10;

                      ctx.beginPath();
                      ctx.moveTo(from.x, from.y);
                      ctx.lineTo(to.x, to.y);
                      ctx.stroke();

                      ctx.shadowColor = 'transparent';
                      ctx.shadowBlur = 0;
                    }
                  });
                }

                if (showPoints) {
                  // Define point color here so it can be used later
                  const pointColor = skeletonColor === 'blue' ? '#3b82f6' :
                                  skeletonColor === 'green' ? '#10b981' :
                                  skeletonColor === 'purple' ? '#8b5cf6' :
                                  skeletonColor === 'orange' ? '#f97316' :
                                  '#ef4444'; // default red

                  keypoints.forEach(keypoint => {
                    if (typeof keypoint.score === 'number' && keypoint.score > confidenceThreshold) {
                      const { x, y } = keypoint;

                      const rgb = getRgbForColor(skeletonColor);
                      ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`;
                      ctx.shadowBlur = 15;

                      ctx.fillStyle = pointColor;
                      ctx.beginPath();
                      ctx.arc(x, y, 6, 0, 2 * Math.PI);
                      ctx.fill();

                      ctx.shadowColor = 'transparent';
                      ctx.shadowBlur = 0;
                    }
                  });
                }

                if (showSkeleton && isTracking) {
                  ctx.font = 'bold 16px Arial';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.lineWidth = 2;

                  const currentAngles = calculateJointAngles(poses[0]);
                  setJointAngles(currentAngles);
                  
                  // Record angles for the routine data table
                  if (isTracking) {
                    recordRoutineAngle(currentAngles);
                  }

                  Object.entries(currentAngles).forEach(([jointName, angle]) => {
                    if (['nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear'].includes(jointName)) {
                      return;
                    }

                    const joint = keypoints.find(kp => kp.name === jointName);
                    if (joint && typeof joint.score === 'number' && joint.score > 0.3) {
                      const startJointName = getConnectedJoint(jointName, 'start');
                      const endJointName = getConnectedJoint(jointName, 'end');

                      const startJoint = keypoints.find(kp => kp.name === startJointName);
                      const endJoint = keypoints.find(kp => kp.name === endJointName);

                      if (startJoint && endJoint) {
                        const offsetX = (joint.x > canvasElement.width / 2) ? -30 : 30;
                        const offsetY = (joint.y > canvasElement.height / 2) ? -30 : 30;

                        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                        ctx.beginPath();
                        ctx.arc(joint.x + offsetX/2, joint.y + offsetY/2, 22, 0, 2 * Math.PI);
                        ctx.fill();

                        ctx.strokeStyle = '#ef4444';
                        ctx.lineWidth = 2;
                        ctx.shadowColor = '#ef4444';
                        ctx.shadowBlur = 5;
                        ctx.beginPath();
                        ctx.arc(joint.x + offsetX/2, joint.y + offsetY/2, 22, 0, 2 * Math.PI);
                        ctx.stroke();

                        ctx.shadowBlur = 0;
                        ctx.shadowColor = 'transparent';

                        ctx.fillStyle = 'white';
                        ctx.fillText(`${angle}°`, joint.x + offsetX/2, joint.y + offsetY/2);

                        ctx.strokeStyle = '#ef4444';
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        ctx.moveTo(joint.x, joint.y);
                        ctx.lineTo(joint.x + offsetX/2, joint.y + offsetY/2);
                        ctx.stroke();
                      }
                    }
                  });
                }
              });
            }
          } catch (error) {
            console.error('Error during pose detection:', error);
          }
        } else if (isTracking && !mediaLoaded) {
          // Optional: Log or clear canvas if tracking but media not ready
          console.log("detect(): Tracking active, but media not loaded. Skipping pose drawing.");
          // ctx.clearRect(0, 0, videoWidth, videoHeight); // Example: clear if needed
        } else if (!isTracking && showBackground && mediaLoaded) { // Ensure media is loaded to draw background
          ctx.drawImage(
            sourceElement,
            0,
            0,
            canvasElement.width,
            canvasElement.height
          );
        } else if (!isTracking && showBackground && !mediaLoaded) {
          // If not tracking, background is on, but media isn't loaded, clear the canvas
          // This prevents stale frames from showing under the "Loading media..." overlay
          if (ctx) {
             ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          }
        }

        animationFrameId = requestAnimationFrame(detect);
      } catch (error) {
        console.error('Error during pose detection:', error);
        animationFrameId = requestAnimationFrame(detect);
      }
    };

    detect();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [
    stream,
    isTracking,
    confidenceThreshold,
    maxPoses,
    skeletonColor,
    showSkeleton,
    showPoints,
    sourceType,
    imageElement,
    showBackground,
    backgroundOpacity,
    backgroundBlur,
    isFullscreenMode,
    modelSelection,
    testResults.isRunning,
    mediaLoaded // Added mediaLoaded to dependency array
  ]);

  useEffect(() => { // Reference overlay useEffect
    if (!showReferenceOverlay || !isTracking || !mediaUrl || !mediaLoaded) return; // Added !mediaLoaded check

    let refElement: HTMLImageElement | HTMLVideoElement | null = null;

    if (isVideoUrl(mediaUrl)) {
      refElement = document.querySelector('.reference-video') as HTMLVideoElement;
    } else {
      const refImages = document.querySelectorAll('img[alt="Reference image"]');
      if (refImages.length > 0) {
        refElement = refImages[0] as HTMLImageElement;
      }
    }

    if (!refElement) {
      console.error('Could not find reference media element for skeleton overlay');
      return;
    }

    let overlayCanvas = document.querySelector('.reference-skeleton-canvas') as HTMLCanvasElement;
    if (!overlayCanvas) {
      overlayCanvas = document.createElement('canvas');
      overlayCanvas.className = 'reference-skeleton-canvas absolute top-0 left-0 w-full h-full z-10';
      const referencePanel = refElement.parentElement;
      if (referencePanel) {
        referencePanel.appendChild(overlayCanvas);
      } else {
        console.error('Could not find reference panel to append skeleton canvas');
        return;
      }
    }

    let animationFrameId: number | null = null;

    const detectReferencePose = async () => {
      if (!refElement || !overlayCanvas) return;

      if (refElement instanceof HTMLImageElement && !refElement.complete) {
        animationFrameId = requestAnimationFrame(detectReferencePose);
        return;
      }

      if (refElement instanceof HTMLVideoElement &&
          (refElement.readyState < 2 || refElement.videoWidth === 0)) {
        animationFrameId = requestAnimationFrame(detectReferencePose);
        return;
      }

      const width = refElement instanceof HTMLImageElement
        ? refElement.naturalWidth
        : refElement.videoWidth;

      const height = refElement instanceof HTMLImageElement
        ? refElement.naturalHeight
        : refElement.videoHeight;

      const container = overlayCanvas.parentElement;
      if (container) {
        overlayCanvas.width = container.clientWidth;
        overlayCanvas.height = container.clientHeight;
      } else {
        overlayCanvas.width = width;
        overlayCanvas.height = height;
      }

      const ctx = overlayCanvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

      try {
        // Use detectPoses from lib/poseDetection instead of direct poseDetector access
        const poses = await detectPoses(
          refElement,
          1,
          confidenceThreshold
        );
        console.log("Reference pose detection complete, found poses:", poses?.length);

        // Check if we have at least one pose
        if (poses && poses.length > 0) {
          // Calculate scale factors
          const scaleX = overlayCanvas.width / width;
          const scaleY = overlayCanvas.height / height;

          // Get the pose with the highest score
          const pose = poses[0];
          const keypoints = pose.keypoints;
          
          // Calculate and log joint angles for the reference pose
          const refAngles = calculateJointAngles(pose);
          console.log("Reference pose angles:", refAngles);
          
          // Store reference angles in history with current timestamp - BUT ONLY IF NOT STOPPED
          if (!isAngleRecordingStoppedRef.current) {
            const timestamp = Date.now();
            
            // For each detected angle, record it consistently regardless of test state
            Object.entries(refAngles).forEach(([jointName, angle]) => {
              if (refAngles[jointName]) {
                setReferenceAngleHistory(prev => ({
                  ...prev,
                  [jointName]: [...(prev[jointName] || []), {angle, timestamp}]
                }));
              }
            });
            
            // Add to routineAngleData for immediate display (similar to user angles)
            const refTimestamp = new Date().toISOString().substr(11, 8); // HH:MM:SS format
            
            // Store pose angles in instructorAngleTable immediately when found
            setTestResults(prev => {
              const instructorTable = prev.instructorAngleTable || { timestamps: [], angles: {} };
              
              // Create new angles object from current data
              const newAngles = { ...instructorTable.angles };
              
              // Add each angle to its array
              Object.entries(refAngles).forEach(([joint, angle]) => {
                if (!newAngles[joint]) {
                  newAngles[joint] = [];
                }
                newAngles[joint].push(angle);
              });
              
              // Return updated test results with new instructor angle data
              return {
                ...prev,
                instructorAngleTable: {
                  timestamps: [...instructorTable.timestamps, refTimestamp],
                  angles: newAngles
                }
              };
            });
            
            console.log("Stored reference angles in history with timestamp:", timestamp);
          }
          
          // Define the actual color based on skeletonColor prop
          const getRgbForColor = (color: string) => {
            return color === 'blue' ? { r: 59, g: 130, b: 246 } :
                 color === 'green' ? { r: 16, g: 185, b: 129 } :
                 color === 'purple' ? { r: 139, g: 92, b: 246 } :
                 color === 'orange' ? { r: 249, g: 115, b: 22 } :
                 { r: 239, g: 68, b: 68 }; // default red
          };
          
          const skeletonRGB = getRgbForColor(skeletonColor);

          // Draw skeleton lines
          ctx.strokeStyle = skeletonColor === 'blue' ? '#3b82f6' :
                          skeletonColor === 'green' ? '#10b981' :
                          skeletonColor === 'purple' ? '#8b5cf6' :
                          skeletonColor === 'orange' ? '#f97316' :
                          '#ef4444'; // default red
          ctx.lineWidth = 3;

          getJointConnections().forEach((connection: [string, string]) => {
            const fromName = connection[0];
            const toName = connection[1];
            const from = keypoints.find(kp => kp.name === fromName);
            const to = keypoints.find(kp => kp.name === toName);

            if (from && to &&
                typeof from.score === 'number' &&
                typeof to.score === 'number' &&
                from.score > confidenceThreshold &&
                to.score > confidenceThreshold) {
              const rgb = getRgbForColor(skeletonColor);
              ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`;
              ctx.shadowBlur = 10;

              ctx.beginPath();
              ctx.moveTo(from.x * scaleX, from.y * scaleY);
              ctx.lineTo(to.x * scaleX, to.y * scaleY);
              ctx.stroke();

              ctx.shadowColor = 'transparent';
              ctx.shadowBlur = 0;
            }
          });

          // Define point color here so it can be used later
          const pointColor = skeletonColor === 'blue' ? '#3b82f6' :
                          skeletonColor === 'green' ? '#10b981' :
                          skeletonColor === 'purple' ? '#8b5cf6' :
                          skeletonColor === 'orange' ? '#f97316' :
                          '#ef4444'; // default red

          if (showPoints) {
            keypoints.forEach(keypoint => {
              if (typeof keypoint.score === 'number' && keypoint.score > confidenceThreshold) {
                const { x, y } = keypoint;

                const rgb = getRgbForColor(skeletonColor);
                ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`;
                ctx.shadowBlur = 15;

                ctx.fillStyle = pointColor;
                ctx.beginPath();
                ctx.arc(x * scaleX, y * scaleY, 6, 0, 2 * Math.PI);
                ctx.fill();

                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
              }
            });
          }
          
                      // Always display joint angles on reference skeleton
            // Use the point color for angles
            const anglePointColor = skeletonColor === 'blue' ? '#3b82f6' :
                              skeletonColor === 'green' ? '#10b981' :
                              skeletonColor === 'purple' ? '#8b5cf6' :
                              skeletonColor === 'orange' ? '#f97316' :
                              '#ef4444'; // default red
            
            // Set up text display properties
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Display angles for each joint
            Object.entries(refAngles).forEach(([jointName, angle]) => {
              // Skip face joints that don't have meaningful angles
              if (['nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear'].includes(jointName)) {
                return;
              }
              
              const joint = keypoints.find(kp => kp.name === jointName);
              if (joint && typeof joint.score === 'number' && joint.score > 0.3) {
                const offsetX = (joint.x * scaleX > overlayCanvas.width / 2) ? -30 : 30;
                const offsetY = (joint.y * scaleY > overlayCanvas.height / 2) ? -30 : 30;
                
                // Draw angle background circle
                ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.beginPath();
                ctx.arc(joint.x * scaleX + offsetX/2, joint.y * scaleY + offsetY/2, 22, 0, 2 * Math.PI);
                ctx.fill();
                
                // Draw circle border
                ctx.strokeStyle = anglePointColor;
                ctx.lineWidth = 2;
                ctx.shadowColor = anglePointColor;
                ctx.shadowBlur = 5;
                ctx.beginPath();
                ctx.arc(joint.x * scaleX + offsetX/2, joint.y * scaleY + offsetY/2, 22, 0, 2 * Math.PI);
                ctx.stroke();
                
                // Reset shadow effect
                ctx.shadowBlur = 0;
                ctx.shadowColor = 'transparent';
                
                // Display angle text
                ctx.fillStyle = 'white';
                ctx.fillText(`${angle}°`, joint.x * scaleX + offsetX/2, joint.y * scaleY + offsetY/2);
                
                // Draw connecting line from joint to angle display
                ctx.strokeStyle = anglePointColor;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(joint.x * scaleX, joint.y * scaleY);
                ctx.lineTo(joint.x * scaleX + offsetX/2, joint.y * scaleY + offsetY/2);
                ctx.stroke();
              }
            });
        }
      } catch (error) {
        console.error('Error during reference pose detection:', error);
      }

      // Always process the next frame as quickly as possible to capture maximum data
      if (refElement instanceof HTMLVideoElement && !isVideoPaused) {
        // Use a smaller timeout to process frames more frequently
        setTimeout(() => {
          if (animationFrameId) cancelAnimationFrame(animationFrameId);
          animationFrameId = requestAnimationFrame(detectReferencePose);
        }, 33); // ~30fps
      } else if (refElement instanceof HTMLImageElement) {
        setTimeout(() => {
          if (animationFrameId) cancelAnimationFrame(animationFrameId);
          animationFrameId = requestAnimationFrame(detectReferencePose);
        }, 100); // More frequent updates for images too
      }
    };

    detectReferencePose();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      const canvas = document.querySelector('.reference-skeleton-canvas');
      if (canvas) {
        canvas.remove();
      }
    };
  }, [
    isSplitView,
    showReferenceOverlay,
    isTracking,
    mediaUrl,
    isVideoPaused,
    confidenceThreshold,
    maxPoses,
    skeletonColor,
    showPoints,
    isFullscreenMode,
    modelSelection,
    testResults.isRunning,
    mediaLoaded // Added mediaLoaded to dependency array
  ]);

  const togglePlayPause = () => {
    if (mediaUrl && isVideoUrl(mediaUrl) && referenceVideoRef.current) {
      const refVideoElement = referenceVideoRef.current;

      console.log("Toggling reference video playback", isVideoPaused ? "playing" : "pausing");

      if (isVideoPaused) {
        refVideoElement.play().catch(e => console.error("Error playing reference video:", e));
      } else {
        refVideoElement.pause();
      }

      setIsVideoPaused(!isVideoPaused);
      return;
    }

    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (isVideoPaused) {
      videoElement.play().catch(e => console.error("Error playing main video:", e));
    } else {
      videoElement.pause();
    }

    setIsVideoPaused(!isVideoPaused);
  };

  const [timingIssues, setTimingIssues] = useState<TimingIssues>({
    delays: false,
    gaps: false,
    speed: 'good'
  });


  const analyzeSequenceMatch = () => {
    if (userPoseHistory.length > 10 && referencePoseHistory.length > 10) {
      const userMovementTimes = detectSignificantMovements(userPoseHistory);
      const refMovementTimes = detectSignificantMovements(referencePoseHistory);

      let delaySum = 0;
      let matchedMovements = 0;
      const matchedDelays: number[] = [];
      const matchingWindow = 300;

      for (let i = 0; i < userMovementTimes.length; i++) {
        let closestRefIdx = -1;
        let minTimeDiff = Number.MAX_VALUE;

        for (let j = 0; j < refMovementTimes.length; j++) {
          const timeDiff = Math.abs(userMovementTimes[i] - refMovementTimes[j]);

          if (timeDiff < minTimeDiff) {
            minTimeDiff = timeDiff;
            closestRefIdx = j;
          }
        }

        if (closestRefIdx >= 0 && minTimeDiff <= matchingWindow) {
          const delay = userMovementTimes[i] - refMovementTimes[closestRefIdx];
          matchedDelays.push(delay);
          delaySum += delay;
          matchedMovements++;

          setTimingOffsets(prev => [...prev, delay]);
        }
      }

      const avgDelay = matchedMovements > 0 ? delaySum / matchedMovements : 0;
      const significantDelay = Math.abs(avgDelay) > 300;

      let positiveDelayCount = 0;
      let negativeDelayCount = 0;

      matchedDelays.forEach(delay => {
        if (delay > 0) positiveDelayCount++;
        else if (delay < 0) negativeDelayCount++;
      });

      const delayPercentage = matchedDelays.length > 0 ?
        Math.max(positiveDelayCount, negativeDelayCount) / matchedDelays.length : 0;

      const hasConsistentDirection = delayPercentage >= 0.7;
      const hasDelays = significantDelay && hasConsistentDirection;

      const userGaps = detectMovementGaps(userPoseHistory);
      const refGaps = detectMovementGaps(referencePoseHistory);
      const hasExtraGaps = userGaps.length > refGaps.length + 1;

      const userDuration = userPoseHistory.length > 1 ?
        userPoseHistory[userPoseHistory.length - 1].timestamp - userPoseHistory[0].timestamp : 0;
      const refDuration = referencePoseHistory.length > 1 ?
        referencePoseHistory[referencePoseHistory.length - 1].timestamp - referencePoseHistory[0].timestamp : 0;

      let speedAssessment: 'good' | 'slow' | 'fast' = 'good';
      if (refDuration > 0) {
        const speedRatio = userDuration / refDuration;
        if (speedRatio > 1.25) {
          speedAssessment = 'slow';
        } else if (speedRatio < 0.75) {
          speedAssessment = 'fast';
        }
      }

      setTimingIssues({
        delays: hasDelays,
        gaps: hasExtraGaps,
        speed: speedAssessment
      });

      // For analysis display purpose, create an object with detailed analysis
      const detailedAnalysis = {
        delayDirection: hasDelays ? (avgDelay > 0 ? 'behind' : 'ahead') : undefined,
        delayMs: Math.round(avgDelay),
        gaps: hasExtraGaps,
        speed: speedAssessment,
        matchQuality: matchedMovements / Math.max(userMovementTimes.length, refMovementTimes.length, 1) 
      };
      
      // This is what we return for the UI display
      return detailedAnalysis;
    }

    return null;
  };

  const updateDistanceMeter = (userPose: any, refPose: any) => {
    if (!userPose || !refPose) return;

    try {
      const userLeftShoulder = userPose.keypoints.find((kp: any) => kp.name === 'left_shoulder');
      const userRightShoulder = userPose.keypoints.find((kp: any) => kp.name === 'right_shoulder');

      const refLeftShoulder = refPose.keypoints.find((kp: any) => kp.name === 'left_shoulder');
      const refRightShoulder = refPose.keypoints.find((kp: any) => kp.name === 'right_shoulder');

      if (!userLeftShoulder?.score || !userRightShoulder?.score ||
          !refLeftShoulder?.score || !refRightShoulder?.score ||
          userLeftShoulder.score < 0.5 || userRightShoulder.score < 0.5 ||
          refLeftShoulder.score < 0.5 || refRightShoulder.score < 0.5) {

        setDistanceInfo({
          scale: 1,
          isCorrect: false,
          message: "Position yourself clearly in view",
          showMeter: isSplitView && !testResults.isRunning
        });
        return;
      }

      const userShoulderWidth = Math.abs(userLeftShoulder.x - userRightShoulder.x);
      const refShoulderWidth = Math.abs(refLeftShoulder.x - refRightShoulder.x);

      const scale = userShoulderWidth / refShoulderWidth;

      const tooClose = scale > 1.3;
      const tooFar = scale < 0.7;
      const perfectRange = scale > 0.9 && scale < 1.1;

      let message = '';
      let isCorrect = false;

      if (tooClose) {
        message = "Step back";
        isCorrect = false;
      } else if (tooFar) {
        message = "Step closer";
        isCorrect = false;
      } else if (perfectRange) {
        message = "Perfect distance";
        isCorrect = true;
      } else {
        message = "Good distance";
        isCorrect = true;
      }

      setDistanceInfo({
        scale,
        isCorrect,
        message,
        showMeter: isSplitView && !testResults.isRunning
      });

    } catch (error) {
      console.error("Error updating distance meter:", error);
    }
  };

  const findBestMatchingPose = (
    timestamp: number,
    referencePoseHistory: Array<{pose: any, timestamp: number}>,
    windowSize: number = 300
  ): any | null => {
    if (!referencePoseHistory.length) return null;

    const startTime = timestamp - windowSize;
    const endTime = timestamp + windowSize;

    const candidatePoses = referencePoseHistory.filter(item =>
      item.timestamp >= startTime && item.timestamp <= endTime
    );

    if (!candidatePoses.length) {
      let closestPose = referencePoseHistory[0];
      let minTimeDiff = Math.abs(referencePoseHistory[0].timestamp - timestamp);

      for (let i = 1; i < referencePoseHistory.length; i++) {
        const timeDiff = Math.abs(referencePoseHistory[i].timestamp - timestamp);
        if (timeDiff < minTimeDiff) {
          minTimeDiff = timeDiff;
          closestPose = referencePoseHistory[i];
        }
      }

      const offset = closestPose.timestamp - timestamp;
      setTimingOffsets(prev => [...prev, offset]);

      return closestPose.pose;
    }

    let closestPose = candidatePoses[0];
    let minTimeDiff = Math.abs(candidatePoses[0].timestamp - timestamp);

    for (let i = 1; i < candidatePoses.length; i++) {
      const timeDiff = Math.abs(candidatePoses[i].timestamp - timestamp);
      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        closestPose = candidatePoses[i];
      }
    }

    const offset = closestPose.timestamp - timestamp;
    setTimingOffsets(prev => [...prev, offset]);

    return closestPose.pose;
  };

  const comparePoses = (userPose: any, referencePose: any): {
    jointScores: JointScore[],
    overallScore: number
  } => {
    console.log('=== Starting Pose Comparison ===');
    console.log('User Pose:', userPose?.keypoints?.length, 'keypoints');
    console.log('Reference Pose:', referencePose?.keypoints?.length, 'keypoints');

    if (!userPose || !referencePose) {
      return { jointScores: [], overallScore: 0 };
    }

    const timestamp = Date.now();
    if (testStartTime > 0 && timestamp < testStartTime + 1000) {
      return { jointScores: [], overallScore: 0 };
    }

    setUserPoseHistory(prev => [...prev.slice(-50), { pose: userPose, timestamp }]);
    setReferencePoseHistory(prev => [...prev.slice(-50), { pose: referencePose, timestamp }]);

    const userAngles = calculateJointAngles(userPose);
    const referenceAngles = calculateJointAngles(referencePose);

    angleJoints.forEach(joint => {
      if (userAngles[joint] !== undefined) {
        setUserAngleSequences(prev => ({
          ...prev,
          [joint]: [...(prev[joint] || []).slice(-100), userAngles[joint]]
        }));
      }

      if (referenceAngles[joint] !== undefined) {
        setReferenceAngleSequences(prev => ({
          ...prev,
          [joint]: [...(prev[joint] || []).slice(-100), referenceAngles[joint]]
        }));
      }
    });

    const userKeypoints = userPose.keypoints || [];
    const referenceKeypoints = referencePose.keypoints || [];

    const userKeypointMap = new Map();
    const referenceKeypointMap = new Map();

    userKeypoints.forEach((kp: any) => {
      if (kp.score > 0.3) {
        userKeypointMap.set(kp.name, kp);
      }
    });

    referenceKeypoints.forEach((kp: any) => {
      if (kp.score > 0.3) {
        referenceKeypointMap.set(kp.name, kp);
      }
    });

    const taekwondoJoints = [
      'left_knee', 'right_knee', 'left_ankle', 'right_ankle',
      'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
      'left_wrist', 'right_wrist', 'left_hip', 'right_hip'
    ];

    const jointScores: JointScore[] = [];
    let totalScore = 0;
    let validJoints = 0;

    console.log('=== Joint Angle Comparisons ===');
    taekwondoJoints.forEach(jointName => {
      const userJoint = userKeypointMap.get(jointName);
      const referenceJoint = referenceKeypointMap.get(jointName);

      const startJointName = getConnectedJoint(jointName, 'start');
      const endJointName = getConnectedJoint(jointName, 'end');

      const userStartJoint = userKeypointMap.get(startJointName);
      const userEndJoint = userKeypointMap.get(endJointName);

      const refStartJoint = referenceKeypointMap.get(startJointName);
      const refEndJoint = referenceKeypointMap.get(endJointName);

      if (userJoint && referenceJoint &&
          userStartJoint && userEndJoint &&
          refStartJoint && refEndJoint) {

        console.log(`\nComparing angles for ${jointName}:`);

        const userAngle = calculateAngle(
          { x: userStartJoint.x, y: userStartJoint.y },
          { x: userJoint.x, y: userJoint.y },
          { x: userEndJoint.x, y: userEndJoint.y }
        );

        const refAngle = calculateAngle(
          { x: refStartJoint.x, y: refStartJoint.y },
          { x: referenceJoint.x, y: referenceJoint.y },
          { x: refEndJoint.x, y: refEndJoint.y }
        );

        console.log(`${jointName} angles: User=${userAngle}°, Reference=${refAngle}°`);

        let angleDiff = Math.abs(refAngle - userAngle);
        if (angleDiff > 180) angleDiff = 360 - angleDiff;

        console.log(`${jointName} angle difference: ${angleDiff}°`);

        const score = Math.round(100 * Math.exp(-angleDiff / 10));

        console.log(`${jointName} score (from angle diff): ${score}`);

        const severity =
          score >= 85 ? 'good' :
            score >= 70 ? 'fair' :
              score >= 50 ? 'poor' : 'bad';

        const isClockwise = ((userAngle - refAngle + 360) % 360) < 180;
        const directionX = isClockwise ? 'left' : 'right';
        const directionY = Math.abs(angleDiff) > 45 ? 'major' : 'minor';

        const magnitude = Math.min(3, Math.floor(angleDiff / 30));

        jointScores.push({
          joint: jointName,
          score: score,
          severity,
          direction: {
            x: directionX,
            y: directionY === 'major' ? 'major' : 'minor',
            xMagnitude: magnitude,
            yMagnitude: magnitude
          }
        });

        totalScore += score;
        validJoints++;
      }
    });

    const sequenceData = analyzeSequenceMatch();

    if (sequenceData) {
      console.log('Sequence analysis:', sequenceData);

      if (sequenceData.delayDirection === 'behind') {
        console.log('User is consistently behind the reference');
      } else if (sequenceData.delayDirection === 'ahead') {
        console.log('User is consistently ahead of the reference');
      }

      if (sequenceData.gaps) {
        console.log('User has extra pauses in their movements');
      }

      if (sequenceData.speed !== 'good') {
        console.log(`User is moving ${sequenceData.speed} compared to reference`);
      }
    }

    return {
      jointScores,
      overallScore: totalScore
    };
  };

  const performTimingAnalysis = (jointScores: JointScore[], totalScore: number, validJoints: number) => {
    if (userPoseHistory.length > 10 && referencePoseHistory.length > 10) {
      const userMovementTimes = detectSignificantMovements(userPoseHistory);
      const refMovementTimes = detectSignificantMovements(referencePoseHistory);

      let delaySum = 0;
      let matchedMovements = 0;
      const matchedDelays: number[] = [];
      const matchingWindow = 300;

      for (let i = 0; i < userMovementTimes.length; i++) {
        let closestRefIdx = -1;
        let minTimeDiff = Number.MAX_VALUE;

        for (let j = 0; j < refMovementTimes.length; j++) {
          const timeDiff = Math.abs(userMovementTimes[i] - refMovementTimes[j]);

          if (timeDiff < minTimeDiff) {
            minTimeDiff = timeDiff;
            closestRefIdx = j;
          }
        }

        if (closestRefIdx >= 0 && minTimeDiff <= matchingWindow) {
          const delay = userMovementTimes[i] - refMovementTimes[closestRefIdx];
          matchedDelays.push(delay);
          delaySum += delay;
          matchedMovements++;

          setTimingOffsets(prev => [...prev, delay]);
        }
      }

      const avgDelay = matchedMovements > 0 ? delaySum / matchedMovements : 0;
      const significantDelay = Math.abs(avgDelay) > 300;

      let positiveDelayCount = 0;
      let negativeDelayCount = 0;

      matchedDelays.forEach(delay => {
        if (delay > 0) positiveDelayCount++;
        else if (delay < 0) negativeDelayCount++;
      });

      const delayPercentage = matchedDelays.length > 0 ?
        Math.max(positiveDelayCount, negativeDelayCount) / matchedDelays.length : 0;

      const hasConsistentDirection = delayPercentage >= 0.7;
      const hasDelays = significantDelay && hasConsistentDirection;

      const userGaps = detectMovementGaps(userPoseHistory);
      const refGaps = detectMovementGaps(referencePoseHistory);
      const hasExtraGaps = userGaps.length > refGaps.length + 1;

      const userDuration = userPoseHistory.length > 1 ?
        userPoseHistory[userPoseHistory.length - 1].timestamp - userPoseHistory[0].timestamp : 0;
      const refDuration = referencePoseHistory.length > 1 ?
        referencePoseHistory[referencePoseHistory.length - 1].timestamp - referencePoseHistory[0].timestamp : 0;

      let speedAssessment: 'good' | 'slow' | 'fast' = 'good';
      if (refDuration > 0) {
        const speedRatio = userDuration / refDuration;
        if (speedRatio > 1.25) {
          speedAssessment = 'slow';
        } else if (speedRatio < 0.75) {
          speedAssessment = 'fast';
        }
      }

      setTimingIssues({
        delays: hasDelays,
        gaps: hasExtraGaps,
        speed: speedAssessment
      });

      let timingScore = 100;

      if (hasDelays) {
        const severePenalty = Math.abs(avgDelay) > 1500;
        timingScore -= severePenalty ? 25 : 15;
      }

      if (hasExtraGaps) {
        const manyExtraGaps = userGaps.length > refGaps.length + 3;
        timingScore -= manyExtraGaps ? 25 : 15;
      }

      if (speedAssessment !== 'good') {
        const speedRatio = userDuration / Math.max(refDuration, 1);
        const severeSpeedIssue = speedRatio > 1.5 || speedRatio < 0.5;
        timingScore -= severeSpeedIssue ? 20 : 10;
      }

      timingScore = Math.max(40, timingScore);

      const formScore = validJoints > 0 ? totalScore / validJoints : 0;

      const combinedScore = 0.7 * formScore + 0.3 * timingScore;
      
      console.log('Valid joints in frame:', validJoints);

      let calculatedScore = Math.round(validJoints > 0 ? combinedScore / validJoints : 0);

      if (validJoints > 0 && calculatedScore < 30) {
        console.log('Score was too low, applying baseline of 30');
        calculatedScore = 30;
      }

      return {
        jointScores,
        overallScore: calculatedScore
      };
    }

    // If we don't have enough data, return the original scores
    let calculatedScore = Math.round(validJoints > 0 ? totalScore / validJoints : 0);
    
    if (validJoints > 0 && calculatedScore < 30) {
      calculatedScore = 30;
    }

    return {
      jointScores,
      overallScore: calculatedScore
    };
  };

  const detectSignificantMovements2 = (poseHistory: any[]): number[] => {
    if (poseHistory.length < 3) return [];

    const movementTimes: number[] = [];
    const threshold = 0.08;

    const angleHistory: {[joint: string]: number[]} = {};
    const significantAngleChange = 15;

    const calculateAngle = (a: {x: number, y: number}, b: {x: number, y: number}, c: {x: number, y: number}): number => {
      const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
      let angle = Math.abs(radians * 180.0 / Math.PI);
      if (angle > 180.0) angle = 360.0 - angle;
      return angle;
    };

    for (let i = 0; i < poseHistory.length; i++) {
      const pose = poseHistory[i].pose;
      if (!pose?.keypoints) continue;

      const keyJoints = [
        {joint: "right_arm", points: ["right_shoulder", "right_elbow", "right_wrist"]},
        {joint: "left_arm", points: ["left_shoulder", "left_elbow", "left_wrist"]},
        {joint: "right_leg", points: ["right_hip", "right_knee", "right_ankle"]},
        {joint: "left_leg", points: ["left_hip", "left_knee", "left_ankle"]}
      ];

      keyJoints.forEach(jointConfig => {
        const points = jointConfig.points.map(name =>
          pose.keypoints.find((kp: any) => kp.name === name)
        );

        if (points.every(p => p && p.score > 0.4)) {
          const angle = calculateAngle(
            {x: points[0].x, y: points[0].y},
            {x: points[1].x, y: points[1].y},
            {x: points[2].x, y: points[2].y}
          );

          if (!angleHistory[jointConfig.joint]) {
            angleHistory[jointConfig.joint] = [];
          }

          angleHistory[jointConfig.joint][i] = angle;
        }
      });
    }

    for (let i = 2; i < poseHistory.length; i++) {
      const prevPose = poseHistory[i-2].pose;
      const currentPose = poseHistory[i].pose;
      let significantMovement = false;

      if (prevPose?.keypoints && currentPose?.keypoints) {
        let totalMovement = 0;
        let validPoints = 0;

        currentPose.keypoints.forEach((kp: any) => {
          const prevKp = prevPose.keypoints.find((p: any) => p.name === kp.name);
          if (prevKp && kp.score > 0.4 && prevKp.score > 0.4) {
            const xDiff = kp.x - prevKp.x;
            const yDiff = kp.y - prevKp.y;
            totalMovement += Math.sqrt(xDiff * xDiff + yDiff * yDiff);
            validPoints++;
          }
        });

        const avgMovement = validPoints > 0 ? totalMovement / validPoints : 0;

        if (avgMovement > threshold) {
          significantMovement = true;
        }
      }

      if (!significantMovement) {
        for (const jointName in angleHistory) {
          if (i >= 2 && angleHistory[jointName][i] && angleHistory[jointName][i-2]) {
            const currentAngle = angleHistory[jointName][i];
            const prevAngle = angleHistory[jointName][i-2];

            if (Math.abs(currentAngle - prevAngle) > significantAngleChange) {
              significantMovement = true;
              break;
            }
          }
        }
      }

      if (significantMovement) {
        movementTimes.push(poseHistory[i].timestamp);
      }
    }

    return movementTimes;
  };

  const detectMovementGaps2 = (poseHistory: any[]): {start: number, end: number}[] => {
    if (poseHistory.length < 5) return [];

    const gaps: {start: number, end: number}[] = [];
    const stillnessThreshold = 0.05;
    let gapStart = -1;

    for (let i = 2; i < poseHistory.length - 2; i++) {
      const prevPose = poseHistory[i-2].pose;
      const currentPose = poseHistory[i].pose;

      let totalMovement = 0;
      let validPoints = 0;

      if (prevPose.keypoints && currentPose.keypoints) {
        currentPose.keypoints.forEach((kp: any) => {
          const prevKp = prevPose.keypoints.find((p: any) => p.name === kp.name);
          if (prevKp && kp.score > 0.5 && prevKp.score > 0.5) {
            const xDiff = kp.x - prevKp.x;
            const yDiff = kp.y - prevKp.y;
            totalMovement += Math.sqrt(xDiff * xDiff + yDiff * yDiff);
            validPoints++;
          }
        });
      }

      const avgMovement = validPoints > 0 ? totalMovement / validPoints : 0;

      if (avgMovement < stillnessThreshold && gapStart === -1) {
        gapStart = poseHistory[i].timestamp;
      } else if (avgMovement >= stillnessThreshold && gapStart !== -1) {
        gaps.push({
          start: gapStart,
          end: poseHistory[i-1].timestamp
        });
        gapStart = -1;
      }
    }

    if (gapStart !== -1) {
      gaps.push({
        start: gapStart,
        end: poseHistory[poseHistory.length - 1].timestamp
      });
    }

    return gaps.filter(gap => gap.end - gap.start > 500);
  };

  const toggleSplitView = () => {
    if (!isSplitView) {
      setIsSplitView(true);
      setShowMediaSelector(true);
    } else {
      setIsSplitView(false);
      setShowMediaSelector(false);
    }
  };

  const toggleRecording = () => {
    if (onRecordClick) {
      onRecordClick();
    }
    
    if (isRecording) {
      stopRecording();
      
      // If this was a test recording, we need to end the test session
      if (testResults.isRunning) {
        setTestResults(prev => ({
          ...prev,
          isRunning: false
        }));
      }
    } else {
      startRecording();
    }
  };

  const startRecording = () => {
    if (isRecording || !canvasRef.current) {
      console.log("Recording already in progress or canvas not ready.");
      return;
    }
    console.log("Attempting to start recording...");

    const stream = canvasRef.current.captureStream(30); // 30 FPS
    if (!stream) {
      console.error("Failed to capture stream from canvas.");
      return;
    }

    // Check for MediaRecorder browser support and available MIME types
    const MimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4;codecs=h264', // MP4 might need specific server-side processing for some browsers if not directly playable
      'video/mp4',
    ];
    const supportedMimeType = MimeTypes.find(type => MediaRecorder.isTypeSupported(type));

    if (!supportedMimeType) {
      console.error("No supported MIME type found for MediaRecorder.");
      alert("Video recording is not supported by your browser or no suitable codec found.");
      return;
    }
    console.log("Using MIME type:", supportedMimeType);

    try {
      const recorder = new MediaRecorder(stream, { mimeType: supportedMimeType });
      setMediaRecorder(recorder);
      setRecordedChunks([]); // Clear previous chunks

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordedChunks((prev) => [...prev, event.data]);
        }
      };

      recorder.onstop = () => {
        console.log("Recording stopped. Chunks collected:", recordedChunks.length);
        // Check recordedChunks directly in this scope as state update might be async
        setRecordedChunks(currentChunks => {
          if (currentChunks.length === 0) {
            console.warn("No data chunks recorded.");
            // Optionally alert user or handle error
            return []; // Return empty array to prevent error with Blob constructor
          }
          const blob = new Blob(currentChunks, { type: supportedMimeType });
          const url = URL.createObjectURL(blob);
          console.log("Blob created, URL:", url);
          setRecordedVideo(url);
          setShowRecordingPopup(true); // Show the popup
          
          // Stop all tracks on the captured stream
          stream.getTracks().forEach(track => track.stop());
          console.log("Canvas stream tracks stopped.");
          return currentChunks; // Though it's about to be cleared, keep consistency
        });
      };
      
      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        alert("An error occurred during recording.");
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      console.log("Recording started successfully.");
      setIsRecording(true);
    } catch (error) {
      console.error("Error initializing MediaRecorder:", error);
      alert("Failed to initialize video recorder. Your browser might not support the required features.");
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const stopRecording = () => {
    console.log("Attempting to stop recording...");
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop(); // This will trigger onstop, where isRecording is set to false.
      console.log("MediaRecorder.stop() called.");
    } else {
      console.log("MediaRecorder not recording or not available.");
      // If not recording through MediaRecorder but logical state isRecording is true
      // (e.g. reference recording without video output)
      // we might need to manually set isRecording to false here if onstop isn't guaranteed
      // However, current logic seems to tie isRecording to MediaRecorder state primarily.
    }
    
    // If we're stopping a test recording, we need to clean up the test state
    if (isRecordingReference) {
      setIsRecordingReference(false); // Indicate test recording has ended
      
      // Process the angle data for the test results
      // This part will now lead to the intermediate popup
      setTimeout(() => {
        setTestResults(prev => ({ 
          ...prev, 
          isRunning: false, 
          processing: true // Still indicate processing starts
        }));
        
        // Process the test data and update the results after a short delay
        // This data will be used by both intermediate popup and final results modal
        setTimeout(() => {
          // Create user angle table from routine angle data (or userAngleHistory ideally)
          // For now, let's assume routineAngleData is populated correctly during test as per existing logic
          // Or better, ensure userAngleHistory is used.
          const userTable = routineAngleData.timestamps.length > 0 ? 
            { 
              timestamps: routineAngleData.timestamps,
              angles: routineAngleData.angles
            } : userAngleHistory[Object.keys(userAngleHistory)[0]]?.length > 0 ? {
              timestamps: userAngleHistory[Object.keys(userAngleHistory)[0]].map(entry => 
                new Date(entry.timestamp).toISOString().substr(11, 8) // HH:MM:SS
              ),
              angles: Object.fromEntries(
                Object.entries(userAngleHistory).map(([joint, entries]) => 
                  [joint, entries.map(e => e.angle)]
                )
              )
            } : { timestamps: [], angles: {} };

          // For instructor angles, take what we have but limit to a reasonable number of entries
          const maxEntries = 100; // Limit the number of entries to prevent overwhelming the UI
          
          // Get timestamps from the first available joint
          const refJoint = Object.keys(referenceAngleHistory)[0];
          const hasRefAngleData = refJoint && referenceAngleHistory[refJoint]?.length > 0;
          
          const instructorTable = hasRefAngleData ? {
            // Get timestamps from the first joint, but limit to maxEntries
            timestamps: referenceAngleHistory[refJoint]
              .slice(-maxEntries) // Take the most recent entries
              .map(entry => new Date(entry.timestamp).toISOString().substr(11, 8)),
            
            // Get angles from all joints, limited to maxEntries
            angles: Object.fromEntries(
              Object.entries(referenceAngleHistory).map(([joint, entries]) => [
                joint, 
                entries.slice(-maxEntries).map(e => e.angle)
              ])
            )
          } : { timestamps: [], angles: {} };
            
          // Update test results with the user's angle data (and potentially instructor data for intermediate popup)
          setTestResults(prev => ({
            ...prev,
            processing: false, // Processing for this stage is done
            userAngleTable: userTable,
            instructorAngleTable: instructorTable // Make instructor table available too
          }));
          
          setHasCompletedTest(true); // A test has been completed
          
          // Show the new intermediate popup instead of ResultsModal directly
          setShowStopTestIntermediatePopup(true); 
          // setShowResultsModal(true); // Old: Directly show results
        }, 1000); // Simulate processing time
      }, 500); // Delay before processing
    }
    
    // isRecording will be set to false in onstop or onerror to ensure cleanup happens first
    // For immediate UI feedback, you could set it here, but onstop is more robust for state changes.
    // setIsRecording(false); // Consider if UI needs immediate feedback vs. waiting for onstop
  };

  const closeRecordingPopup = () => {
    setShowRecordingPopup(false);
    if (recordedVideo) {
      URL.revokeObjectURL(recordedVideo);
      console.log("Revoked recorded video URL:", recordedVideo);
    }
    setRecordedVideo(undefined);
    setRecordedChunks([]); // Clear chunks after popup is closed
    // Ensure recorder is nullified if it wasn't already
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        // It should be inactive, but as a fallback
        try {
            if(mediaRecorder.stream) mediaRecorder.stream.getTracks().forEach(track => track.stop());
        } catch(e){ console.warn("Error stopping tracks on mediaRecorder cleanup", e);}
    }
    setMediaRecorder(null);
    setIsRecording(false); // Ensure recording state is false
  };

  useEffect(() => {
    if (testStartTime > 0 && testResults.isRunning) {
      const updateGraceTime = () => {
        const elapsed = Date.now() - testStartTime;
        if (elapsed < 1000) {
          const remaining = Math.ceil((1000 - elapsed) / 1000);
          setGraceTimeRemaining(remaining);
          requestAnimationFrame(updateGraceTime);
        } else {
          setGraceTimeRemaining(0);
        }
      };

      const timerId = requestAnimationFrame(updateGraceTime);

      return () => cancelAnimationFrame(timerId);
    }
  }, [testStartTime, testResults.isRunning]);

  // Recording Popup Modal (New)
  useEffect(() => {
    // Cleanup for the recordedVideo URL when component unmounts or URL changes
    return () => {
      if (recordedVideo && showRecordingPopup === false) { // If popup was closed but URL still exists
        URL.revokeObjectURL(recordedVideo);
        console.log("Cleaned up orphaned recorded video URL on effect cleanup:", recordedVideo);
        // setRecordedVideo(undefined); // This would be handled by closeRecordingPopup ideally
      }
    };
  }, [recordedVideo, showRecordingPopup]);
  // End Recording Popup Modal (New)

  // Generate angle data for comparison
  const generateAngleComparisonData = () => {
    // Create timestamps array with regular intervals
    const timestamps: string[] = [];
    const userAngles: { [joint: string]: number[] } = {};
    const expectedAngles: { [joint: string]: number[] } = {};
    
    // Initialize arrays for each joint
    angleJoints.forEach(joint => {
      userAngles[joint] = [];
      expectedAngles[joint] = [];
    });
    
    // Find the earliest and latest timestamps across all joints
    let earliestTimestamp = Infinity;
    let latestTimestamp = 0;
    
    // Determine time range from recorded angle history
    for (const joint of angleJoints) {
      const userHistory = userAngleHistory[joint] || [];
      const refHistory = referenceAngleHistory[joint] || [];
      
      if (userHistory.length > 0) {
        earliestTimestamp = Math.min(earliestTimestamp, userHistory[0].timestamp);
        latestTimestamp = Math.max(latestTimestamp, userHistory[userHistory.length - 1].timestamp);
      }
      
      if (refHistory.length > 0) {
        earliestTimestamp = Math.min(earliestTimestamp, refHistory[0].timestamp);
        latestTimestamp = Math.max(latestTimestamp, refHistory[refHistory.length - 1].timestamp);
      }
    }
    
    if (earliestTimestamp === Infinity) {
      console.error("No angle data available");
      return { timestamps: [], userAngles: {}, expectedAngles: {} };
    }
    
    // Create a timeline with 100ms intervals
    const timeline: number[] = [];
    let currentTime = earliestTimestamp;
    
    while (currentTime <= latestTimestamp) {
      timeline.push(currentTime);
      timestamps.push(new Date(currentTime - earliestTimestamp).toISOString().substr(14, 5)); // Format as MM:SS.sss
      currentTime += 100; // 100ms intervals
    }
    
    // For each joint, interpolate angles at each timestamp
    angleJoints.forEach(jointName => {
      const userHistory = userAngleHistory[jointName] || [];
      const refHistory = referenceAngleHistory[jointName] || [];
      
      // For each timestamp, find the closest angle recording or interpolate
      timeline.forEach(time => {
        // Find user angle at this time
        let userAngle = 0;
        if (userHistory.length > 0) {
          // Find the two closest recordings and interpolate
          const closestIndex = userHistory.findIndex(entry => entry.timestamp >= time);
          
          if (closestIndex === 0) {
            // Before first recording, use first value
            userAngle = userHistory[0].angle;
          } else if (closestIndex === -1) {
            // After last recording, use last value
            userAngle = userHistory[userHistory.length - 1].angle;
          } else {
            // Interpolate between two recordings
            const before = userHistory[closestIndex - 1];
            const after = userHistory[closestIndex];
            const ratio = (time - before.timestamp) / (after.timestamp - before.timestamp);
            userAngle = before.angle * (1 - ratio) + after.angle * ratio;
          }
        }
        
        // Find reference angle at this time
        let refAngle = 0;
        if (refHistory.length > 0) {
          // Find the two closest recordings and interpolate
          const closestIndex = refHistory.findIndex(entry => entry.timestamp >= time);
          
          if (closestIndex === 0) {
            // Before first recording, use first value
            refAngle = refHistory[0].angle;
          } else if (closestIndex === -1) {
            // After last recording, use last value
            refAngle = refHistory[refHistory.length - 1].angle;
          } else {
            // Interpolate between two recordings
            const before = refHistory[closestIndex - 1];
            const after = refHistory[closestIndex];
            const ratio = (time - before.timestamp) / (after.timestamp - before.timestamp);
            refAngle = before.angle * (1 - ratio) + after.angle * ratio;
          }
        }
        
        userAngles[jointName].push(userAngle);
        expectedAngles[jointName].push(refAngle);
      });
    });
    
    return {
      timestamps,
      userAngles,
      expectedAngles
    };
  };

  // Add the startAngleRecording and stopAngleRecording functions right before "const [showStopRoutinePopup, setShowStopRoutinePopup] = useState..."

  // Add this state variable with the other state declarations
  const [isAngleRecordingStopped, setIsAngleRecordingStopped] = useState<boolean>(false);

  // Replace the entire stopAngleRecording function with this more aggressive version
  const stopAngleRecording = () => {
    console.log("FORCE STOPPING ALL ANGLE RECORDING VIA REF AND STATE");
    isAngleRecordingStoppedRef.current = true; // Immediate signal
    setIsAngleRecordingStopped(true); // For React state/UI updates
    
    // Clear the recording interval
    if (angleRecordingInterval) {
      clearInterval(angleRecordingInterval);
      setAngleRecordingInterval(null);
    }
    
    // Explicitly ensure recording reference is stopped
    setIsRecordingReference(false);
    
    // CRITICAL: Ensure both tables are exactly the same length
    setTestResults(prev => {
      if (!prev.userAngleTable || !prev.instructorAngleTable) {
        return prev;
      }
      
      // Use user table length as the definitive source of truth
      const userTableLength = prev.userAngleTable.timestamps.length;
      const userTimestamps = prev.userAngleTable.timestamps;
      const userAngles = prev.userAngleTable.angles;
      
      console.log(`FORCING BOTH TABLES TO EXACT LENGTH: ${userTableLength}`);
      
      // Truncate instructor table to EXACTLY match user table length
      const syncedInstructorTable = {
        timestamps: prev.instructorAngleTable.timestamps.slice(0, userTableLength),
        angles: Object.fromEntries(
          Object.entries(prev.instructorAngleTable.angles || {}).map(([joint, angles]) => 
            [joint, angles.slice(0, userTableLength)]
          )
        )
      };
      
      // Also ensure user table is not longer than expected (defensive)
      const syncedUserTable = {
        timestamps: userTimestamps.slice(0, userTableLength),
        angles: Object.fromEntries(
          Object.entries(userAngles || {}).map(([joint, angles]) => 
            [joint, angles.slice(0, userTableLength)]
          )
        )
      };
      
      console.log(`User table length: ${syncedUserTable.timestamps.length}`);
      console.log(`Instructor table length: ${syncedInstructorTable.timestamps.length}`);
      
      return {
        ...prev,
        userAngleTable: syncedUserTable,
        instructorAngleTable: syncedInstructorTable
      };
    });
  };

  // Modify the startAngleRecording function to reset the stopped flag
  const startAngleRecording = () => {
    console.log("Starting synchronized angle recording for both user and instructor");
    isAngleRecordingStoppedRef.current = false; // Immediate signal
    setIsAngleRecordingStopped(false); // For React state/UI updates
    
    // Reset any existing angle data
    setUserAngleHistory({});
    setReferenceAngleHistory({});
    
    // Initialize tables with empty data
    setTestResults(prev => ({
      ...prev,
      userAngleTable: { timestamps: [], angles: {} },
      instructorAngleTable: { timestamps: [], angles: {} }
    }));
    
    // Clear any existing interval
    if (angleRecordingInterval) {
      clearInterval(angleRecordingInterval);
    }
    
    // Initialize angle history with empty arrays for each joint
    const initialUserHistory: {[joint: string]: Array<{angle: number, timestamp: number}>} = {};
    const initialRefHistory: {[joint: string]: Array<{angle: number, timestamp: number}>} = {};
    
    angleJoints.forEach(joint => {
      initialUserHistory[joint] = [];
      initialRefHistory[joint] = [];
    });
    
    setUserAngleHistory(initialUserHistory);
    setReferenceAngleHistory(initialRefHistory);
    
    // Start a new interval for recording
    const interval = setInterval(() => {
      // Immediately exit if recording has been stopped
      if (isAngleRecordingStoppedRef.current) { // Check ref here
        console.log("Angle recording stopped (via ref) - ignoring interval update");
        return;
      }
      
      const currentTime = Date.now();
      const timeString = new Date(currentTime).toISOString().substr(11, 8); // HH:MM:SS
      
      // Record user angles if user pose is available
      if (userPose?.keypoints) {
        const userAngles = calculateJointAngles(userPose);
        
        // Store in user angle history
        Object.entries(userAngles).forEach(([jointName, angle]) => {
          setUserAngleHistory(prev => ({
            ...prev,
            [jointName]: [...(prev[jointName] || []), {angle, timestamp: currentTime}]
          }));
        });
        
        // Update test results table
        setTestResults(prev => {
          const userTable = prev.userAngleTable || { timestamps: [], angles: {} };
          const newAngles = { ...userTable.angles };
          
          Object.entries(userAngles).forEach(([joint, angle]) => {
            if (!newAngles[joint]) {
              newAngles[joint] = [];
            }
            newAngles[joint].push(angle);
          });
          
          return {
            ...prev,
            userAngleTable: {
              timestamps: [...userTable.timestamps, timeString],
              angles: newAngles
            }
          };
        });
      }
      
      // Record instructor angles if reference pose is available
      if (!isAngleRecordingStoppedRef.current && referencePose?.keypoints) { // Check ref here
        const refAngles = calculateJointAngles(referencePose);
        
        // Store in reference angle history
        Object.entries(refAngles).forEach(([jointName, angle]) => {
          setReferenceAngleHistory(prev => ({
            ...prev,
            [jointName]: [...(prev[jointName] || []), {angle, timestamp: currentTime}]
          }));
        });
        
        // Update test results table
        setTestResults(prev => {
          const instructorTable = prev.instructorAngleTable || { timestamps: [], angles: {} };
          const newAngles = { ...instructorTable.angles };
          
          Object.entries(refAngles).forEach(([joint, angle]) => {
            if (!newAngles[joint]) {
              newAngles[joint] = [];
            }
            newAngles[joint].push(angle);
          });
          
          return {
            ...prev,
            instructorAngleTable: {
              timestamps: [...instructorTable.timestamps, timeString],
              angles: newAngles
            }
          };
        });
      }
    }, 100); // Record every 100ms
    
    setAngleRecordingInterval(interval);
  };

  const [showStopRoutinePopup, setShowStopRoutinePopup] = useState<boolean>(false);
  const [routineAngleData, setRoutineAngleData] = useState<{
    timestamps: string[];
    angles: { [joint: string]: number[] };
  }>({ timestamps: [], angles: {} });
  
  // Function to add the current angles to the routine data (called during tracking)
  const recordRoutineAngle = (currentAngles: Record<string, number>) => {
    if (!isTracking) return;
    
    const timestamp = new Date().toISOString().substr(11, 8); // HH:MM:SS format
    
    setRoutineAngleData(prev => {
      // Initialize angles object if it doesn't exist for each joint
      const newAngles = { ...prev.angles };
      
      // Add each joint angle to its respective array
      Object.entries(currentAngles).forEach(([joint, angle]) => {
        if (!newAngles[joint]) {
          newAngles[joint] = [];
        }
        newAngles[joint].push(angle);
      });
      
      return {
        timestamps: [...prev.timestamps, timestamp],
        angles: newAngles
      };
    });
  };
  
  // Modify the detect function to record angles during tracking
  // We need to find where the angles are calculated and add a call to recordRoutineAngle
  
  // Add a function to handle stopping the routine
  const stopRoutine = () => {
    if (isTracking) {
      toggleTracking();
      
      // If a test was active, prioritize the StopTestIntermediatePopup over the routine popup
      if (isRecordingReference) {
        setWasTestActiveWhenRoutineStopped(true);
        
        // Process the angle data for the test results immediately
        // For user angles, first check if we have better data in userAngleHistory
        const userTable = userAngleHistory[Object.keys(userAngleHistory)[0]]?.length > 0 ? {
            timestamps: userAngleHistory[Object.keys(userAngleHistory)[0]].map(entry => 
              new Date(entry.timestamp).toISOString().substr(11, 8) // HH:MM:SS
            ),
            angles: Object.fromEntries(
              Object.entries(userAngleHistory).map(([joint, entries]) => 
                [joint, entries.map(e => e.angle)]
              )
            )
        } : routineAngleData.timestamps.length > 0 ? 
          { 
            timestamps: routineAngleData.timestamps,
            angles: routineAngleData.angles
          } : { timestamps: [], angles: {} };

        // For instructor angles, ensure we consistently use the reference angle history
        // as this will be populated frame-by-frame by our new recording mechanism
        const instructorTable = referenceAngleHistory[Object.keys(referenceAngleHistory)[0]]?.length > 0 ? {
          timestamps: referenceAngleHistory[Object.keys(referenceAngleHistory)[0]].map(entry =>
            new Date(entry.timestamp).toISOString().substr(11, 8) // HH:MM:SS
          ),
          angles: Object.fromEntries(
            Object.entries(referenceAngleHistory).map(([joint, entries]) =>
              [joint, entries.map(e => e.angle)]
            )
          )
        } : { timestamps: [], angles: {} };
        
        console.log(`User angle data: ${userTable.timestamps.length} frames, ${Object.keys(userTable.angles).length} joints`);
        console.log(`Instructor angle data: ${instructorTable.timestamps.length} frames, ${Object.keys(instructorTable.angles).length} joints`);
          
        // Update test results with the angle data immediately
        setTestResults(prev => ({
          ...prev,
          processing: false, // Set to false since we're showing popup immediately
          userAngleTable: userTable,
          instructorAngleTable: instructorTable
        }));
        
        setHasCompletedTest(true); // Mark test as completed
        
        // Show the intermediate popup immediately
        setShowStopTestIntermediatePopup(true);
        
        // Don't show the routine popup in this case
        return;
      }
      
      // If not in test mode, just show the routine popup as normal
      setShowStopRoutinePopup(true);
    }
  };
  
  const [screenRecordedVideoUrl, setScreenRecordedVideoUrl] = useState<string | undefined>(undefined);
  const [showScreenRecordingPopup, setShowScreenRecordingPopup] = useState<boolean>(false);

  useEffect(() => {
    // ... existing code ...
  }, [
    // ... existing code ...
  ]);

  const handleCloseStopRoutinePopup = () => {
    setShowStopRoutinePopup(false);
    if (wasTestActiveWhenRoutineStopped) {
      setWasTestActiveWhenRoutineStopped(false);
      // STOP ANGLE RECORDING IMMEDIATELY when showing test results
      stopAngleRecording();
      // Instead of showing video popup or results modal, show the new test results popup
      setShowTestResultsPopup(true);
    }
  };

  const proceedToResultsModal = () => {
    console.log("[proceedToResultsModal] Entered function.");
    // Ensure processing is true when this is called, as it might be called from other places
    setTestResults(prev => ({ ...prev, isRunning: false, processing: true }));
  
    // Ensure angles are synced once more
    stopAngleRecording();
  
    // Process both pose sequences and run the test
    setTimeout(() => {
      console.log("[proceedToResultsModal] Starting data processing inside setTimeout.");
      if (userPoseHistory.length < 5 || referencePoseHistory.length < 5) {
        console.log("[proceedToResultsModal] Not enough pose data. Setting error feedback.");
        setTestResults(prev => ({
          ...prev,
          isRunning: false, // Ensure this is explicitly set to false
          processing: false,
          feedback: 'Not enough pose data. Please try again.',
          overallScore: 0
        }));
        setHasCompletedTest(true); 
        console.log("[proceedToResultsModal] Attempting to show ResultsModal (due to insufficient data).");
        setShowResultsModal(true); 
        return;
      }
      
      console.log("[proceedToResultsModal] Processing test results...");
      console.log("User pose history:", userPoseHistory.length, "frames");
      console.log("Reference pose history:", referencePoseHistory.length, "frames");
      
      const userAnglesData: Record<string, number[]> = {};
      const refAnglesData: Record<string, number[]> = {};
      
      angleJoints.forEach(joint => {
        if (userAngleHistory[joint]?.length && referenceAngleHistory[joint]?.length) {
          userAnglesData[joint] = userAngleHistory[joint].map(entry => entry.angle);
          refAnglesData[joint] = referenceAngleHistory[joint].map(entry => entry.angle);
        } else if (userAngleSequences[joint]?.length && referenceAngleSequences[joint]?.length) {
          userAnglesData[joint] = userAngleSequences[joint];
          refAnglesData[joint] = referenceAngleSequences[joint];
        }
      });
      
      const dtwScores: Record<string, number> = {};
      const dtwResultsFromComparison: Record<string, any> = {};
      let totalDtwScore = 0;
      let validJointCount = 0;
      
      Object.keys(userAnglesData).forEach(joint => {
        if (userAnglesData[joint].length >= 5 && refAnglesData[joint].length >= 5) {
          const result = compareAnglesWithDTW(userAnglesData[joint], refAnglesData[joint], joint);
          const score = result.score;
          dtwScores[joint] = score;
          dtwResultsFromComparison[joint] = result;
          totalDtwScore += score;
          validJointCount++;
        }
      });
      
      const avgDtwScore = validJointCount > 0 ? Math.round(totalDtwScore / validJointCount) : 0;
      
      const latestUserPose = userPoseHistory[userPoseHistory.length - 1]?.pose;
      const latestRefPose = referencePoseHistory[referencePoseHistory.length - 1]?.pose;
      
      let frameComparison: { jointScores: JointScore[]; overallScore: number } = { 
        jointScores: [], 
        overallScore: 0 
      };
      
      if (latestUserPose && latestRefPose) {
        const result = comparePoses(latestUserPose, latestRefPose);
        if (result.jointScores && Array.isArray(result.jointScores)) {
          const frameOverallScoreSum = result.overallScore;
          const frameValidJoints = result.jointScores.filter(s => s.score > 0).length;
          const avgFrameScore = frameValidJoints > 0 ? Math.round(frameOverallScoreSum / frameValidJoints) : 0;
          frameComparison = {
            jointScores: result.jointScores as JointScore[],
            overallScore: avgFrameScore
          };
        }
      }
      
      let calculatedFinalScore = Math.round(0.7 * avgDtwScore + 0.3 * frameComparison.overallScore);
      calculatedFinalScore = Math.max(0, Math.min(100, calculatedFinalScore));

      const angleDataForChart = generateAngleComparisonData();
      
      const userTable = routineAngleData.timestamps.length > 0 ? 
        { 
          timestamps: routineAngleData.timestamps,
          angles: routineAngleData.angles
        } : { 
          timestamps: userAngleHistory[Object.keys(userAngleHistory)[0]]?.map(entry => 
            new Date(entry.timestamp).toISOString().substr(11, 8)
          ) || [],
          angles: Object.fromEntries(
            Object.entries(userAngleHistory).map(([joint, entries]) => 
              [joint, entries.map(e => e.angle)]
            )
          )
        };
      
      const instructorTable = {
        timestamps: referenceAngleHistory[Object.keys(referenceAngleHistory)[0]]?.map(entry => 
          new Date(entry.timestamp).toISOString().substr(11, 8)
        ) || [],
        angles: Object.fromEntries(
          Object.entries(referenceAngleHistory).map(([joint, entries]) => 
            [joint, entries.map(e => e.angle)]
          )
        )
      };

      const feedback = `Test completed. Overall Score: ${calculatedFinalScore}%. DTW Score: ${avgDtwScore}%. Frame Score: ${frameComparison.overallScore}%.`;
      
      setTestResults({
        isRunning: false,
        processing: false,
        scores: frameComparison.jointScores,
        overallScore: calculatedFinalScore,
        feedback,
        timing: timingIssues,
        dtwScores,
        angleData: angleDataForChart,
        userAngleTable: userTable,
        instructorAngleTable: instructorTable,
        dtwResults: dtwResultsFromComparison
      });
      
      console.log("Test completed with score:", calculatedFinalScore);
      console.log("Joint scores (last frame):", frameComparison.jointScores);
      console.log("DTW scores:", dtwScores);
      console.log("Timing issues:", timingIssues);
      
      setHasCompletedTest(true);
      console.log("[proceedToResultsModal] Test data processing complete.");
      // This function will now be called AFTER the intermediate popup.
      // The intermediate popup's continue button will trigger showing this.
      setShowResultsModal(true); 
      setShowStopTestIntermediatePopup(false); // Ensure intermediate popup is hidden
    }, 500); // Simulate final processing if any, or just delay for transition
  };

  // Handler for "Continue" from the new intermediate popup
  const handleContinueFromStopTestPopup = () => {
    setShowStopTestIntermediatePopup(false);
    
    // Ensure angles are synced before proceeding
    stopAngleRecording();
    
    // Directly call proceedToResultsModal, which will handle further data processing and show the main ResultsModal
    proceedToResultsModal(); 
  };

  useEffect(() => {
    // ... existing code ...
  }, [
    // ... existing code ...
  ]);

  {/* New Intermediate Stop Test Popup */}
  {showStopTestIntermediatePopup && (
    <StopTestIntermediatePopup
      isOpen={showStopTestIntermediatePopup}
      onContinue={handleContinueFromStopTestPopup}
      onClose={() => {
        setShowStopTestIntermediatePopup(false);
        // Optionally, reset test state or offer to save progress if closing here means abandoning
        console.log("Intermediate Stop Test Popup closed without continuing.");
      }}
      userAngleData={testResults.userAngleTable || { timestamps: [], angles: {} }}
      referenceAngleData={testResults.instructorAngleTable || { timestamps: [], angles: {} }} // Pass reference data as well
    />
  )}

  return (
    <div className="m-0 p-0">
      <RecordingControls onRecordingComplete={(url) => setRecordedVideo(url)} />

      <div id="cameraContainer" className={`${isFullscreenMode ? 'border-0 rounded-none shadow-none h-[calc(100vh-72px)] w-screen' : 'border-0 border-red-900 overflow-hidden relative h-[calc(80vh-100px)]'}`}>
        <div className={`relative w-full ${isFullscreenMode ? 'h-full' : ''} flex flex-col`}>
          <div className={`flex ${isSplitView ? 'md:flex-row flex-col' : ''} ${isFullscreenMode ? 'h-full' : ''} h-full gap-0`}>
            <div className={`camera-container relative ${isSplitView ? 'md:w-1/2 w-full' : 'w-full'} ${isFullscreenMode ? 'h-full' : isSplitView ? '' : 'aspect-[16/12]'}`}>
              {(isSplitView || sourceType === 'camera') && stream && (
                <video
                  ref={videoRef}
                  className={`absolute top-0 left-0 w-full h-full ${isFullscreenMode ? 'object-contain mx-auto' : 'object-contain'}`}
                  playsInline
                  muted
                  style={isFullscreenMode ? { display: 'block', maxHeight: '100%', maxWidth: '100%' } : {}}
                ></video>
              )}

              {!isSplitView && sourceType === 'video' && (
                <video
                  ref={videoRef}
                  className={`absolute top-0 left-0 w-full h-full ${isFullscreenMode ? 'object-contain mx-auto' : 'object-contain'}`}
                  playsInline
                  muted
                  style={isFullscreenMode ? { display: 'block', maxHeight: '100%', maxWidth: '100%' } : {}}
                ></video>
              )}

              {!isSplitView && sourceType === 'image' && imageElement && (
                <div className={`absolute top-0 left-0 w-full h-full flex items-center justify-center ${isFullscreenMode ? 'flex-grow' : ''}`}>
                  <img
                    src={mediaUrl}
                    alt="Uploaded for pose detection"
                    className={`max-h-full max-w-full object-contain invisible ${isFullscreenMode ? 'mx-auto' : ''}`}
                    style={isFullscreenMode ? { display: 'block' } : {}}
                  />
                </div>
              )}

              <canvas
                id="outputCanvas"
                ref={canvasRef}
                className={`absolute top-0 left-0 w-full h-full ${isFullscreenMode ? 'object-contain mx-auto my-auto' : 'object-contain'}`}
                style={isFullscreenMode ? { display: 'block', maxHeight: '100%', maxWidth: '100%' } : {}}
              ></canvas>

              {testResults.isRunning && (
                <GreenGuideOverlay
                  videoRef={referenceVideoRef}
                  isTestMode={testResults.isRunning}
                  confidenceThreshold={confidenceThreshold}
                />
              )}

              {false && distanceInfo.showMeter && userPose && referencePose && !testResults.isRunning && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-lg bg-black/80 border border-red-900/40 shadow-lg">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="text-white text-sm font-medium">Position yourself at proper distance</div>

                    <div className="w-64 h-8 bg-gray-900 rounded-full overflow-hidden flex items-center relative">
                      <div className={`absolute h-full w-1 bg-white ${distanceInfo.isCorrect ? 'bg-opacity-100' : 'bg-opacity-70'} z-20`}
                        style={{ left: `${Math.min(Math.max(distanceInfo.scale * 50, 5), 95)}%` }}>
                      </div>

                      <div className="absolute left-1/2 h-full w-24 -translate-x-1/2 bg-green-600/30 z-10"></div>

                      <div className="absolute inset-0 flex justify-between px-1">
                        <div className="border-l-2 border-white/50 h-full"></div>
                        <div className="border-l-2 border-white/20 h-full"></div>
                        <div className="border-l-2 border-white h-full"></div>
                        <div className="border-l-2 border-white/20 h-full"></div>
                        <div className="border-l-2 border-white/50 h-full"></div>
                      </div>

                      <div className="absolute inset-0 flex justify-between items-center px-2 pointer-events-none text-[9px] font-bold text-white">
                        <span>Too Far</span>
                        <span>Perfect</span>
                        <span>Too Close</span>
                      </div>
                    </div>

                    <div className={`text-sm font-bold flex items-center ${
                      distanceInfo.isCorrect ? 'text-green-500' : 'text-yellow-500'
                    }`}>
                      <span className="material-icons mr-1 text-sm">
                        {distanceInfo.isCorrect ? 'check_circle' : 'warning'}
                      </span>
                      {distanceInfo.message}
                    </div>
                  </div>
                </div>
              )}

              {!mediaLoaded && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/70">
                  <div className="text-center p-4 bg-black/80 rounded border border-red-900/30">
                    <div className="loader mx-auto mb-3 border-t-red-500"></div>
                    <p className="text-red-100 font-medium">Loading media...</p>
                  </div>
                </div>
              )}

              {mediaLoaded && !isTracking && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/70">
                  <div className="text-center p-3 backdrop-blur-sm bg-black/80 rounded-lg border border-red-900/30">
                    <span className="material-icons text-4xl text-red-500 mb-2">sports_martial_arts</span>
                    <p className="text-white font-medium">Start tracking to begin pose analysis</p>
                  </div>
                </div>
              )}

              {isTracking && !testResults.isRunning && (
                <div className="absolute top-2 right-2 bg-gradient-to-r from-red-800 to-red-700 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center shadow-lg">
                  <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse mr-1.5"></span>
                  Tracking Active
                </div>
              )}

              {testResults.isRunning && (
                <div className="absolute top-2 right-2 bg-gradient-to-r from-red-900 to-red-600 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center shadow-lg">
                  <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse mr-1.5"></span>
                  Test in progress
                </div>
              )}

              {testResults.isRunning && referencePose && (isSplitView || sourceType === 'camera') && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/80 border border-emerald-600/50 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center shadow-lg">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>
                  Follow the green guide
                </div>
              )}

              <div className="absolute top-2 left-2 bg-black/70 border border-red-900/50 text-red-100 px-2 py-1 rounded-md text-xs font-medium shadow-md">
                {(isSplitView || sourceType === 'camera') && (
                  <span className="flex items-center">
                    <span className="material-icons text-xs mr-1 text-red-500">videocam</span>
                    Camera Feed
                  </span>
                )}
                {!isSplitView && sourceType === 'image' && (
                  <span className="flex items-center">
                    <span className="material-icons text-xs mr-1 text-red-500">image</span>
                    Image
                  </span>
                )}
                {!isSplitView && sourceType === 'video' && (
                  <span className="flex items-center">
                    <span className="material-icons text-xs mr-1 text-red-500">movie</span>
                    Video
                  </span>
                )}
              </div>
            </div>

            {!showMediaSelector && mediaUrl && (
              <div className={`reference-panel bg-black/90 relative ${
                isSplitView
                  ? 'md:w-1/2 w-full'
                  : isFullscreenMode
                    ? 'fixed bottom-14 right-2 w-40 h-40 rounded-lg border border-red-900/50 shadow-lg z-40'
                    : 'hidden'
              }`}>
                {isVideoUrl(mediaUrl) && (
                  <video
                    ref={referenceVideoRef}
                    className="w-full h-full object-cover reference-video"
                    playsInline
                    src={mediaUrl.split('#')[0]} // Remove our #video flag if present
                    // autoPlay={!isVideoPaused} // Removed to prevent autoplay
                    // loop // Removed default looping
                    muted
                    onError={(e) => console.error("Video error:", e)}
                    onLoadedData={() => {
                      console.log("Reference video loaded. Pausing.");
                      if (referenceVideoRef.current) {
                        referenceVideoRef.current.pause();
                        referenceVideoRef.current.currentTime = 0;
                      }
                      setIsVideoPaused(true); // Update UI to show 'Play' button
                    }}
                  ></video>
                )}

                {!isVideoUrl(mediaUrl) && (
                  <img
                    src={mediaUrl}
                    alt="Reference image"
                    className="w-full h-full object-cover"
                  />
                )}

                <div className={`absolute bottom-0 left-0 right-0 ${isFullscreenMode ? 'p-1' : 'p-2'} flex justify-between items-center bg-black/90 border-t border-red-900/30`}>
                  {!isFullscreenMode && (
                    <div className="bg-red-900/40 text-white px-2 py-1 rounded-md text-xs font-medium shadow-md border border-red-900/30">
                      <span className="flex items-center">
                        <span className="material-icons text-xs mr-1 text-red-500">compare</span>
                        Reference
                      </span>
                    </div>
                  )}

                  <div className={`flex gap-1 ${isFullscreenMode ? 'w-full justify-evenly' : ''}`}>
                    {isVideoUrl(mediaUrl) && (
                      <button
                        onClick={togglePlayPause}
                        className={`bg-red-600 hover:bg-red-700 text-white rounded shadow-md ${
                          isFullscreenMode ? 'px-1 py-0.5 text-[10px]' : 'px-2 py-1 text-xs font-medium'
                        }`}
                      >
                        <span className={`material-icons align-middle ${isFullscreenMode ? 'text-[10px]' : 'text-xs mr-1'}`}>
                          {isVideoPaused ? 'play_arrow' : 'pause'}
                        </span>
                        {!isFullscreenMode && (isVideoPaused ? 'Play' : 'Pause')}
                      </button>
                    )}

                    <button
                      onClick={toggleReferenceOverlay}
                      className={`text-white rounded shadow-md ${
                        showReferenceOverlay
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-gray-900 hover:bg-gray-800'
                      } ${
                        isFullscreenMode ? 'px-1 py-0.5 text-[10px]' : 'px-2 py-1 text-xs font-medium'
                      }`}
                    >
                      <span className={`material-icons align-middle ${isFullscreenMode ? 'text-[10px]' : 'text-xs mr-1'}`}>
                        {showReferenceOverlay ? 'filter_alt' : 'filter_alt_off'}
                      </span>
                      {!isFullscreenMode && (showReferenceOverlay ? 'Skeleton On' : 'Skeleton Off')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isSplitView && showMediaSelector && (
              <div className="bg-black/90 border border-red-900/40 relative md:w-1/2 w-full flex flex-col items-center justify-center p-4">
                <h3 className="text-xl font-bold text-red-500 mb-3">Select Reference Media</h3>
                <p className="text-red-100 text-sm mb-4 text-center">Upload an image or video to compare with your live tracking</p>

                <div className="grid grid-cols-1 gap-3 w-full max-w-xs">
                  <button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          const url = URL.createObjectURL(file);
                          const img = new Image();
                          img.src = url;
                          img.onload = () => {
                            if (onScreenshot) onScreenshot(url);
                            setShowMediaSelector(false);
                          };
                        }
                      };
                      input.click();
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-lg flex items-center justify-center shadow-lg"
                  >
                    <span className="material-icons mr-2">add_photo_alternate</span>
                    Upload Image
                  </button>

                  <button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'video/mp4,video/webm,video/ogg,video/*';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          if (!file.type.startsWith('video/')) {
                            console.error("Not a video file:", file.type);
                            return;
                          }

                          console.log("Selected video file:", file.name, file.type);
                          const url = URL.createObjectURL(file);
                          const flaggedUrl = url + '#video';

                          if (onScreenshot) {
                            console.log("Sending video URL to parent:", flaggedUrl);
                            onScreenshot(flaggedUrl);
                          }

                          setShowMediaSelector(false);
                        }
                      };
                      input.click();
                    }}
                    className="bg-red-700 hover:bg-red-800 text-white p-3 rounded-lg flex items-center justify-center shadow-lg"
                  >
                    <span className="material-icons mr-2">video_library</span>
                    Upload Video
                  </button>

                  <button
                    onClick={() => setShowMediaSelector(false)}
                    className="bg-gray-900 hover:bg-gray-800 text-white p-3 rounded-lg flex items-center justify-center shadow-lg border border-red-900/20"
                  >
                    <span className="material-icons mr-2">close</span>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {!isSplitView && (
            <button
              onClick={toggleSplitView}
              className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-gradient-to-r from-red-700 to-red-600 text-white p-2 rounded-full shadow-lg hover:from-red-800 hover:to-red-700 z-20"
              title="Add reference media"
            >
              <span className="material-icons">add</span>
            </button>
          )}
        </div>
      </div>

      <NotesEditor
        initialNotes={routineNotes || localRoutineNotes}
        onChange={(notes: string) => {
          setLocalRoutineNotes(notes);
          if (setRoutineNotes) {
            setRoutineNotes(notes);
          }
        }}
        onStartRoutine={() => {
          // Reset angle data when starting a new routine
          setRoutineAngleData({ timestamps: [], angles: {} });
          toggleTracking();
        }}
        onStopRoutine={stopRoutine}
        onStartTest={() => {
          // 1. Validate reference media is available
          if (!isSplitView || (!mediaUrl && !referenceVideoRef.current)) {
            alert('Please select a reference video in split view first.');
            if (!isSplitView) toggleSplitView(); // Open split view if not already open
            return;
          }
          
          // Reset routine angle data when starting a new test
          setRoutineAngleData({ timestamps: [], angles: {} });
          
          // Initialize angle history tables for the test
          const emptyTable = { timestamps: [], angles: {} };
          const testAngleTables = {
            userAngleTable: { ...emptyTable },
            instructorAngleTable: { ...emptyTable }
          };
          
          // A. Immediately signal that a test is starting and reference recording is active
          setIsRecordingReference(true); // Moved earlier
          setTestResults({
            isRunning: true,
            processing: false,
            scores: [],
            overallScore: 0,
            feedback: 'Follow the green guide to match the reference movement',
            ...testAngleTables // Initialize with empty tables
          });
          setTestStartTime(Date.now()); // Moved earlier
          setGraceTimeRemaining(0); // No countdown - start test immediately

          // B. Ensure tracking is active (like pressing "Start Routine")
          if (!isTracking) {
            toggleTracking(); // This will set isTracking to true
          }
          
          // C. Ensure reference skeleton overlay is visible
          if (!showReferenceOverlay && externalToggleReferenceOverlay) {
            externalToggleReferenceOverlay(); // This will set showReferenceOverlay to true
          }
          
          // D. Reset reference video and play it from the beginning / Handle image
          const refVideo = referenceVideoRef.current;
          if (refVideo) {
            refVideo.currentTime = 0;
            refVideo.loop = false;
            
            if (isVideoPaused) {
              refVideo.play().catch(e => console.error("Error playing reference video:", e));
              setIsVideoPaused(false);
            }
            
            // Start screen recording (if not already started or handled elsewhere)
            startRecording(); 
            
            // Auto end after video ends
            refVideo.onended = () => {
              console.log('Reference video ended. Test angle recording will continue until explicitly stopped.');
              //setIsRecordingReference(false); // Mark test as no longer recording reference // REMOVED to allow test to continue
              
              if (isRecording && mediaRecorder && mediaRecorder.state === "recording") {
                console.log('Reference video ended. Screen recording will continue until test is explicitly stopped.');
                // mediaRecorder.stop(); // REMOVED - Screen recording should continue until test stops
              }
              // stopRoutine(); // REMOVED to allow test to continue

              // Optional: If reference video should loop, add logic here e.g.:
              // if (refVideo) { refVideo.currentTime = 0; refVideo.play(); }
            };
          } else if (sourceType === 'image' && (mediaUrl || imageElement)) {
            // For images, start recording and set a timeout
            startRecording(); 
            // setIsRecordingReference(true) and setTestStartTime were already moved up
            
            // Set timeout to end test after 5 seconds for images
            setTimeout(() => {
              console.log('Image test duration ended.');
              setIsRecordingReference(false); // Mark test as no longer recording reference
              if (mediaRecorder && mediaRecorder.state === "recording") {
                console.log('Stopping screen recording for image test...');
                mediaRecorder.stop(); // Screen recording stops, onstop will set recordedVideo
              }
              // stopRoutine will capture final angles and initiate the popup sequence
              stopRoutine();
            }, 5000); // End test after 5 seconds for images
          }
          
          // Start recording angles immediately for both user and instructor
          startAngleRecording();
        }}
        onStopTest={() => {
          if (testResults.isRunning) {
            // Stop screen recording if active
            if (isRecording) {
              stopRecording();
            }
            
            // Stop reference video playback
            if (referenceVideoRef.current) {
              referenceVideoRef.current.pause();
              referenceVideoRef.current.onended = null;
              referenceVideoRef.current.onpause = null;
              referenceVideoRef.current.onerror = null;
              referenceVideoRef.current.loop = false;
            }
            
            // Stop angle recording
            stopAngleRecording();
            
            // Update test state
            setIsRecordingReference(false);
            
            // Stop tracking
            if (isTracking) {
              toggleTracking();
            }
            
            // Update test results state
            setTestResults(prev => ({
              ...prev,
              isRunning: false,
              processing: false
            }));
            
            setHasCompletedTest(true);
            
            // Show results popup
            setShowStopTestIntermediatePopup(true);
            
            // Disable other popups
            setShowStopRoutinePopup(false);
            setShowRecordingPopup(false);
          }
        }}
        isTracking={isTracking}
        hasReferenceMedia={isSplitView && (!!imageElement || !!referenceVideoRef.current)}
        hasCompletedTest={hasCompletedTest}
        onShowResults={() => setShowResultsModal(true)}
        onRecord={toggleRecording}
        isRecording={isRecording}
        isTestRunning={testResults.isRunning}
      />

      <ResultsModal
        isOpen={showResultsModal}
        onClose={() => setShowResultsModal(false)}
        scores={testResults.scores}
        overallScore={testResults.overallScore}
        feedback={testResults.feedback}
        timing={testResults.timing}
        recordedVideo={recordedVideo}
        routineNotes={routineNotes || localRoutineNotes}
        angleData={testResults.angleData}
        dtwResults={testResults.dtwResults}
        userAngleTable={testResults.userAngleTable} // Pass userAngleTable
        instructorAngleTable={testResults.instructorAngleTable} // Pass instructorAngleTable
      />

      {/* Distance Meter */}
      {false && distanceInfo.showMeter && (
        <div 
          className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 p-2 px-4 rounded-lg shadow-lg z-20
                     border-2 animate-fade-in-fast"
          style={{ borderColor: distanceInfo.isCorrect ? '#10b981' : '#ef4444' }}
        >
          <p className={`text-sm font-medium ${distanceInfo.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
            {distanceInfo.message}
          </p>
          <div className="w-32 h-2 bg-gray-700 rounded-full mt-1 overflow-hidden">
            <div 
              className="h-full transition-all duration-300 ease-in-out"
              style={{ 
                width: `${Math.min(100, Math.max(0, (distanceInfo.scale - 0.5) * 100 / 0.8))}%`, // scale 0.7-1.3 maps to ~25%-100%
                background: distanceInfo.isCorrect ? '#10b981' : '#ef4444'
              }}
            />
          </div>
        </div>
      )}

      {/* Recording Popup */}
      {showRecordingPopup && recordedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 p-6 rounded-xl shadow-2xl w-full max-w-3xl border border-red-700/50">
            <h3 className="text-xl font-semibold text-white mb-4 text-center">Screen Recording Complete</h3>
            <video 
              src={recordedVideo} 
              controls 
              autoPlay 
              className="w-full rounded-lg max-h-[70vh] mb-4 border border-gray-700"
            />
            <div className="flex flex-row gap-4 justify-end">
              <button
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = recordedVideo;
                  a.download = `CoachT-Training-${new Date().toISOString().slice(0,10)}.webm`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
                className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold shadow-md"
              >
                Download Recording
              </button>
              <button
                onClick={closeRecordingPopup}
                className="px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-semibold hover:from-red-700 hover:to-red-800 transition-colors shadow-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Stop Routine Popup with Angle Data Table */}
      {showStopRoutinePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 p-6 rounded-xl shadow-2xl w-full max-w-4xl border border-orange-600/50 max-h-[90vh] overflow-auto">
            <h3 className="text-xl font-semibold text-white mb-3 text-center">Routine Stopped</h3>
            <p className="text-gray-300 mb-4 text-center">
              Your routine has been stopped. Review your joint angle data below.
            </p>
            
            {/* Angle Data Table */}
            <div className="mb-6 overflow-x-auto">
              <h4 className="text-white font-medium mb-2">Joint Angle Data</h4>
              {routineAngleData.timestamps.length > 0 ? (
                <table className="min-w-full text-sm text-left text-gray-300">
                  <thead className="text-xs text-gray-400 uppercase bg-gray-800 sticky top-0">
                    <tr>
                      <th scope="col" className="px-4 py-3">Time</th>
                      {Object.keys(routineAngleData.angles).map(joint => (
                        <th scope="col" className="px-4 py-3" key={joint}>
                          {joint.replace('_', ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {routineAngleData.timestamps.map((time, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}>
                        <td className="px-4 py-2">{time}</td>
                        {Object.keys(routineAngleData.angles).map(joint => (
                          <td className="px-4 py-2" key={`${joint}-${idx}`}>
                            {routineAngleData.angles[joint][idx]?.toFixed(1) || '0'}°
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-400 text-center p-4">No angle data recorded.</p>
              )}
            </div>
            
            <div className="flex flex-row gap-3 justify-center">
              {wasTestActiveWhenRoutineStopped && (
                <button
                  onClick={handleCloseStopRoutinePopup}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold shadow-md text-lg"
                >
                  Continue to Test Results
                </button>
              )}
              <button
                onClick={() => setShowStopRoutinePopup(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Test Results Popup */}
      {showTestResultsPopup && (
        <TestResultsPopup
          isOpen={showTestResultsPopup}
          onClose={() => setShowTestResultsPopup(false)}
          userAngleData={testResults.userAngleTable || { timestamps: [], angles: {} }}
          referenceAngleData={testResults.instructorAngleTable || { timestamps: [], angles: {} }}
        />
      )}

      {/* Test Video Playback Popup */}
      {showTestVideoPopup && testVideoUrlForPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 p-6 rounded-xl shadow-2xl w-full max-w-3xl border border-blue-700/50">
            <h3 className="text-xl font-semibold text-white mb-4 text-center">Test Recording</h3>
            <video 
              src={testVideoUrlForPopup} 
              controls 
              autoPlay 
              className="w-full rounded-lg max-h-[70vh] mb-4 border border-gray-700"
            />
            <div className="flex flex-row gap-4 justify-end">
              <button
                onClick={() => {
                  setShowTestVideoPopup(false);
                  proceedToResultsModal(); // Call the new function
                }}
                className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-colors shadow-md"
              >
                View Results
              </button>
            </div>
          </div>
        </div>
      )}

      {showResultsModal && (
        <ResultsModal
          isOpen={showResultsModal}
          onClose={() => setShowResultsModal(false)}
          scores={testResults.scores}
          overallScore={testResults.overallScore}
          feedback={testResults.feedback}
          timing={testResults.timing}
          recordedVideo={recordedVideo}
          routineNotes={routineNotes || localRoutineNotes}
          angleData={testResults.angleData}
          dtwResults={testResults.dtwResults}
          userAngleTable={testResults.userAngleTable} // Pass userAngleTable again for the second instance
          instructorAngleTable={testResults.instructorAngleTable} // Pass instructorAngleTable again for the second instance
        />
      )}
    </div>
  );
}

const getConnectedJoint = (jointName: string, position: 'start' | 'end'): string => {
  const jointMap: Record<string, { start: string; end: string }> = {
    'left_elbow': { start: 'left_shoulder', end: 'left_wrist' },
    'right_elbow': { start: 'right_shoulder', end: 'right_wrist' },
    'left_shoulder': { start: 'left_hip', end: 'left_elbow' },
    'right_shoulder': { start: 'right_hip', end: 'right_elbow' },
    'left_wrist': { start: 'left_elbow', end: 'left_index' },
    'right_wrist': { start: 'right_elbow', end: 'right_index' },

    'left_knee': { start: 'left_hip', end: 'left_ankle' },
    'right_knee': { start: 'right_hip', end: 'right_ankle' },
    'left_ankle': { start: 'left_knee', end: 'left_foot_index' },
    'right_ankle': { start: 'right_knee', end: 'right_foot_index' },

    'left_hip': { start: 'left_knee', end: 'left_shoulder' },
    'right_hip': { start: 'right_knee', end: 'right_shoulder' }
  };

  return jointMap[jointName]?.[position] || jointName;
};

const calculateAngle = (
  a: { x: number, y: number },
  b: { x: number, y: number },
  c: { x: number, y: number }
): number => {
  const vectorBA = {x: a.x - b.x, y: a.y - b.y};
  const vectorBC = {x: c.x - b.x, y: c.y - b.y};

  const dotProduct = (vectorBA.x * vectorBC.x) + (vectorBA.y * vectorBC.y);

  const magnitudeBA = Math.sqrt(vectorBA.x * vectorBA.x + vectorBA.y * vectorBA.y);
  const magnitudeBC = Math.sqrt(vectorBC.x * vectorBC.x + vectorBC.y * vectorBC.y);

  let angleRadians = Math.acos(dotProduct / (magnitudeBA * magnitudeBC));

  let angleDegrees = (angleRadians * 180) / Math.PI;

  if (isNaN(angleDegrees)) {
    return 0;
  }

  return Math.round(angleDegrees);
};