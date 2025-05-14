import { useRef, useEffect, useState } from 'react';
import { detectPoses } from '@/lib/poseDetection';
import { compareAnglesWithDTW } from '@/lib/dtw';
import GreenGuideOverlay from './GreenGuideOverlay';
import RecordingControls from './camera/RecordingControls';
import ResultsModal from './camera/ResultsModal';
import NotesEditor from './camera/NotesEditor';
import { calculateJointAngles, type JointScore } from './camera/JointScoringEngine';
import { detectSignificantMovements, detectMovementGaps, type TimingIssues } from './camera/TimingAnalyzer';
import { isVideoUrl } from './camera/utils';

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
  onRecordClick?: () => void;
  routineNotes?: string;
  setRoutineNotes?: (notes: string) => void;
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
  angleData?: any;
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
  onRecordClick,
  routineNotes = '',
  setRoutineNotes
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
  
  // State variables for media recording
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordedVideo, setRecordedVideo] = useState<string | undefined>(undefined);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  
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
  const angleJoints = [
    'left_elbow', 'right_elbow',
    'left_shoulder', 'right_shoulder',
    'left_wrist', 'right_wrist',
    'left_hip', 'right_hip',
    'left_knee', 'right_knee',
    'left_ankle', 'right_ankle'
  ];

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

    if ((isSplitView || sourceType === 'camera') && stream) {
      videoElement.srcObject = stream;
      videoElement.play().catch(err => {
        console.error("Error playing camera stream:", err);
      });
      setMediaLoaded(true);
    } else if (!isSplitView && sourceType === 'video' && externalVideoElement && mediaUrl) {
      videoElement.srcObject = null;
      videoElement.src = mediaUrl;
      videoElement.loop = true;
      videoElement.muted = true;

      if (!isVideoPaused) {
        videoElement.play().catch(err => {
          console.error("Error playing video file:", err);
        });
      } else {
        videoElement.pause();
      }

      setMediaLoaded(true);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

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
      setMediaLoaded(imageElement.complete && imageElement.naturalWidth > 0);
      if (!imageElement.complete || imageElement.naturalWidth === 0) {
        console.log("Image not fully loaded, waiting...");
        return;
      }
    } else if (sourceType === 'camera' && videoRef.current) {
      sourceElement = videoRef.current;
      const hasValidDimensions = sourceElement.videoWidth > 0 && sourceElement.videoHeight > 0;
      console.log(`Using camera source: ${sourceElement.videoWidth}x${sourceElement.videoHeight}, ready state: ${sourceElement.readyState}`);
      setMediaLoaded(sourceElement.readyState >= 1 && hasValidDimensions);
      
      // Add a timeout to force camera to initialize after 3 seconds if it hasn't already
      if (sourceElement.readyState < 1) {
        console.log("Camera not ready yet, setting a timeout to force initialization");
        setTimeout(() => {
          if (videoRef.current && videoRef.current.readyState < 1) {
            console.log("Forcing camera initialization after timeout");
            // Attempt to reinitialize the stream
            if (stream) {
              videoRef.current.srcObject = null;
              videoRef.current.srcObject = stream;
              videoRef.current.play().catch(err => console.error("Error playing video after timeout:", err));
            }
          }
        }, 3000);
        return;
      }
    } else if ((sourceType === 'video' || isSplitView) && videoRef.current) {
      sourceElement = videoRef.current;
      const hasValidDimensions = sourceElement.videoWidth > 0 && sourceElement.videoHeight > 0;
      console.log(`Using video source: ${sourceElement.videoWidth}x${sourceElement.videoHeight}, ready state: ${sourceElement.readyState}`);
      setMediaLoaded(sourceElement.readyState >= 2 && hasValidDimensions);
      if (sourceElement.readyState < 2 || !hasValidDimensions) {
        console.log("Video not ready yet, waiting for more data");
        return;
      }
    } else {
      console.log("No valid source element found");
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

    const detect = async () => {
      if (!sourceElement || !canvasElement) return;

      const ctx = canvasElement.getContext('2d', { alpha: !showBackground });
      if (!ctx) return;

      let width = 0;
      let height = 0;

      if (sourceType === 'image' && imageElement) {
        width = imageElement.naturalWidth;
        height = imageElement.naturalHeight;
      } else if (sourceElement instanceof HTMLVideoElement) {
        width = sourceElement.videoWidth;
        height = sourceElement.videoHeight;
      }

      if (width === 0 || height === 0) {
        console.log("Source has zero dimensions, skipping detection");
        if (animationFrameId) {
          animationFrameId = requestAnimationFrame(detect);
        }
        return;
      }

      const container = document.getElementById('cameraContainer');
      let containerWidth = width;
      let containerHeight = height;
      let scaleX = 1;
      let scaleY = 1;

      if (container && isFullscreenMode) {
        containerWidth = container.clientWidth;
        containerHeight = container.clientHeight;

        const videoRatio = width / height;
        const containerRatio = containerWidth / containerHeight;

        if (videoRatio > containerRatio) {
          scaleX = containerWidth / width;
          scaleY = scaleX;
        } else {
          scaleY = containerHeight / height;
          scaleX = scaleY;
        }

        console.log("Fullscreen scaling:", { width, height, containerWidth, containerHeight, scaleX, scaleY });
      }

      if (canvasElement.width !== width || canvasElement.height !== height) {
        canvasElement.width = width;
        canvasElement.height = height;
      }

      ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

      if (showBackground) {
        ctx.globalAlpha = backgroundOpacity;
        if (backgroundBlur > 0) {
          ctx.filter = `blur(${backgroundBlur}px)`;
        }
        ctx.drawImage(
          sourceElement,
          0,
          0,
          canvasElement.width,
          canvasElement.height
        );
        ctx.filter = 'none';
        ctx.globalAlpha = 1.0;
      }

      if (isTracking) {
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
                ctx.strokeStyle = skeletonColor || '#B91C1C';
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
                    ctx.shadowColor = 'rgba(220, 38, 38, 0.7)';
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
                keypoints.forEach(keypoint => {
                  if (typeof keypoint.score === 'number' && keypoint.score > confidenceThreshold) {
                    const { x, y } = keypoint;

                    ctx.shadowColor = 'rgba(220, 38, 38, 0.7)';
                    ctx.shadowBlur = 15;

                    ctx.fillStyle = '#ef4444';
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
      } else if (!isTracking && showBackground) {
        ctx.drawImage(
          sourceElement,
          0,
          0,
          canvasElement.width,
          canvasElement.height
        );
      }

      animationFrameId = requestAnimationFrame(detect);
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
    testResults.isRunning
  ]);

  useEffect(() => {
    if (!showReferenceOverlay || !isTracking || !mediaUrl) return;

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
        const poses = await detectPoses(
          refElement,
          maxPoses,
          confidenceThreshold
        );

        if (poses && poses.length > 0) {
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

            const scaleX = overlayCanvas.width / width;
            const scaleY = overlayCanvas.height / height;

            ctx.strokeStyle = skeletonColor || '#B91C1C';
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
                ctx.shadowColor = 'rgba(220, 38, 38, 0.7)';
                ctx.shadowBlur = 10;

                ctx.beginPath();
                ctx.moveTo(from.x * scaleX, from.y * scaleY);
                ctx.lineTo(to.x * scaleX, to.y * scaleY);
                ctx.stroke();

                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
              }
            });

            if (showPoints) {
              keypoints.forEach(keypoint => {
                if (typeof keypoint.score === 'number' && keypoint.score > confidenceThreshold) {
                  const { x, y } = keypoint;

                  ctx.shadowColor = 'rgba(220, 38, 38, 0.7)';
                  ctx.shadowBlur = 15;

                  ctx.fillStyle = '#ef4444';
                  ctx.beginPath();
                  ctx.arc(x * scaleX, y * scaleY, 6, 0, 2 * Math.PI);
                  ctx.fill();

                  ctx.shadowColor = 'transparent';
                  ctx.shadowBlur = 0;
                }
              });
            }

            if (showSkeleton) {
              ctx.font = 'bold 16px Arial';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.lineWidth = 2;

              const refAngles = calculateJointAngles(pose);

              Object.entries(refAngles).forEach(([jointName, angle]) => {
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
                    const offsetX = (joint.x > width / 2) ? -30 : 30;
                    const offsetY = (joint.y > height / 2) ? -30 : 30;

                    const scaledX = joint.x * scaleX;
                    const scaledY = joint.y * scaleY;

                    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                    ctx.beginPath();
                    ctx.arc(scaledX + offsetX/2, scaledY + offsetY/2, 22, 0, 2 * Math.PI);
                    ctx.fill();

                    ctx.strokeStyle = '#ef4444';
                    ctx.lineWidth = 2;
                    ctx.shadowColor = '#ef4444';
                    ctx.shadowBlur = 5;
                    ctx.beginPath();
                    ctx.arc(scaledX + offsetX/2, scaledY + offsetY/2, 22, 0, 2 * Math.PI);
                    ctx.stroke();

                    ctx.shadowBlur = 0;
                    ctx.shadowColor = 'transparent';

                    ctx.fillStyle = 'white';
                    ctx.fillText(`${angle}°`, scaledX + offsetX/2, scaledY + offsetY/2);

                    ctx.strokeStyle = '#ef4444';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(scaledX, scaledY);
                    ctx.lineTo(scaledX + offsetX/2, scaledY + offsetY/2);
                    ctx.stroke();
                  }
                }
              });
            }
          });
        }
      } catch (error) {
        console.error('Error during reference pose detection:', error);
      }

      if (refElement instanceof HTMLVideoElement && !isVideoPaused) {
        animationFrameId = requestAnimationFrame(detectReferencePose);
      } else if (refElement instanceof HTMLImageElement) {
        setTimeout(() => {
          if (animationFrameId) cancelAnimationFrame(animationFrameId);
          animationFrameId = requestAnimationFrame(detectReferencePose);
        }, 500);
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
    testResults.isRunning
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
      mediaRecorder.stop();
      console.log("MediaRecorder.stop() called.");
    } else {
      console.log("MediaRecorder not recording or not available.");
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

  // Update the useEffect that handles angle recording
  useEffect(() => {
    // Only start recording angles when isRecordingReference is true
    if (isRecordingReference) {
      console.log("Starting angle recording...");
      
      // Clear any existing intervals
      if (angleRecordingInterval) {
        clearInterval(angleRecordingInterval);
      }
      
      // Initialize angle history
      const initialUserHistory: {[joint: string]: Array<{angle: number, timestamp: number}>} = {};
      const initialRefHistory: {[joint: string]: Array<{angle: number, timestamp: number}>} = {};
      
      angleJoints.forEach(joint => {
        initialUserHistory[joint] = [];
        initialRefHistory[joint] = [];
      });
      
      setUserAngleHistory(initialUserHistory);
      setReferenceAngleHistory(initialRefHistory);
      
      // Start recording angles every 100ms
      const interval = setInterval(() => {
        const currentTime = Date.now();
        
        // Debug log to verify the interval is running
        console.log("Recording angles at", new Date(currentTime).toISOString());
        
        // Get current user pose and reference pose
        if (userPose?.keypoints && referencePose?.keypoints) {
          // Debug: log that we found valid poses
          console.log("Found valid poses for recording angles");
          
          // Record angles for each joint
          angleJoints.forEach(jointName => {
            try {
              // User pose angle calculation
              const userJoint = userPose.keypoints.find((kp: any) => kp.name === jointName);
              const userStartJointName = getConnectedJoint(jointName, 'start');
              const userEndJointName = getConnectedJoint(jointName, 'end');
              
              const userStartJoint = userPose.keypoints.find((kp: any) => kp.name === userStartJointName);
              const userEndJoint = userPose.keypoints.find((kp: any) => kp.name === userEndJointName);
              
              // Reference pose angle calculation
              const refJoint = referencePose.keypoints.find((kp: any) => kp.name === jointName);
              const refStartJointName = getConnectedJoint(jointName, 'start');
              const refEndJointName = getConnectedJoint(jointName, 'end');
              
              const refStartJoint = referencePose.keypoints.find((kp: any) => kp.name === refStartJointName);
              const refEndJoint = referencePose.keypoints.find((kp: any) => kp.name === refEndJointName);
              
              // Calculate and store user angle if all points are valid
              if (userJoint && userStartJoint && userEndJoint && 
                  userJoint.score > 0.1 && userStartJoint.score > 0.1 && userEndJoint.score > 0.1) {
                const userAngle = calculateAngle(
                  { x: userStartJoint.x, y: userStartJoint.y }, 
                  { x: userJoint.x, y: userJoint.y }, 
                  { x: userEndJoint.x, y: userEndJoint.y }
                );
                
                setUserAngleHistory(prev => ({
                  ...prev,
                  [jointName]: [...(prev[jointName] || []), {angle: userAngle, timestamp: currentTime}]
                }));
                
                console.log(`Recorded user angle for ${jointName}: ${userAngle}°`);
              } else {
                console.log(`Cannot calculate user angle for ${jointName} - missing valid points`);
              }
              
              // Calculate and store reference angle if all points are valid
              if (refJoint && refStartJoint && refEndJoint && 
                  refJoint.score > 0.1 && refStartJoint.score > 0.1 && refEndJoint.score > 0.1) {
                const refAngle = calculateAngle(
                  { x: refStartJoint.x, y: refStartJoint.y }, 
                  { x: refJoint.x, y: refJoint.y }, 
                  { x: refEndJoint.x, y: refEndJoint.y }
                );
                
                setReferenceAngleHistory(prev => ({
                  ...prev,
                  [jointName]: [...(prev[jointName] || []), {angle: refAngle, timestamp: currentTime}]
                }));
                
                console.log(`Recorded reference angle for ${jointName}: ${refAngle}°`);
              } else {
                console.log(`Cannot calculate reference angle for ${jointName} - missing valid points`);
              }
            } catch (error) {
              console.error(`Error recording angles for joint ${jointName}:`, error);
            }
          });
        } else {
          console.warn("Missing keypoints for angle recording");
          if (!userPose?.keypoints) console.warn("User pose keypoints missing");
          if (!referencePose?.keypoints) console.warn("Reference pose keypoints missing");
        }
      }, 100); // Record every 100ms (0.1 seconds)
      
      setAngleRecordingInterval(interval);
      
      return () => {
        if (interval) {
          clearInterval(interval);
          console.log("Stopped angle recording interval");
        }
      };
    } else if (angleRecordingInterval) {
      // Stop recording angles when not in recording mode
      clearInterval(angleRecordingInterval);
      setAngleRecordingInterval(null);
      console.log("Angle recording disabled");
    }
  }, [isRecordingReference, userPose, referencePose, angleJoints]);

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
                    src={mediaUrl.split('#')[0]}
                    autoPlay={!isVideoPaused}
                    loop
                    muted
                    onError={(e) => console.error("Video error:", e)}
                    onLoadedData={() => console.log("Video loaded successfully in reference panel")}
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
        onStartRoutine={toggleTracking}
        onStartTest={() => {
          // 1. Validate reference media is available
          if (!isSplitView || (!mediaUrl && !referenceVideoRef.current)) {
            alert('Please select a reference video in split view first.');
            if (!isSplitView) toggleSplitView();
            return;
          }
          
          // 2. Ensure tracking is active
          if (!isTracking) {
            toggleTracking();
          }
          
          // 3. Ensure reference skeleton overlay is visible
          if (!showReferenceOverlay && externalToggleReferenceOverlay) {
            externalToggleReferenceOverlay();
          }
          
          // 4. Reset test results and begin new test
          setTestResults({
            isRunning: true,
            processing: false,
            scores: [],
            overallScore: 0,
            feedback: 'Follow the green guide to match the reference movement'
          });
          
          // 5. Reset reference video and play it from the beginning
          const refVideo = referenceVideoRef.current;
          if (refVideo) {
            refVideo.currentTime = 0;
            refVideo.loop = false;
            
            if (isVideoPaused) {
              refVideo.play().catch(e => console.error("Error playing reference video:", e));
              setIsVideoPaused(false);
            }
            
            // 6. Start recording immediately
            startRecording();
            setIsRecordingReference(true);
            setTestStartTime(Date.now());
            
            // No countdown - start test immediately
            setGraceTimeRemaining(0);
            
            // 8. Auto end after video ends
            refVideo.onended = () => {
              setIsRecordingReference(false);
              
              // Stop recording if active
              if (isRecording && mediaRecorder) {
                console.log('Stopping recording before showing test results...');
                mediaRecorder.stop();
                // Wait for recording to be processed before showing results
                setTimeout(() => {
                  setTestResults(prev => ({ ...prev, isRunning: false, processing: true }));
                  
                  // Process both pose sequences and run the test
                  setTimeout(() => {
                    if (userPoseHistory.length < 5 || referencePoseHistory.length < 5) {
                      setTestResults(prev => ({
                        ...prev,
                        isRunning: false, // Ensure this is explicitly set to false
                        processing: false,
                        feedback: 'Not enough pose data. Please try again.',
                        overallScore: 0
                      }));
                      // Ensure hasCompletedTest is set to allow re-opening results if needed.
                      setHasCompletedTest(true); 
                      setShowResultsModal(true); // Show modal even with error to inform user
                      return;
                    }
                    
                    // Log data to debug
                    console.log("Processing test results...");
                    console.log("User pose history:", userPoseHistory.length, "frames");
                    console.log("Reference pose history:", referencePoseHistory.length, "frames");
                    
                    // Compare poses and calculate scores
                    const userAnglesData: Record<string, number[]> = {};
                    const refAnglesData: Record<string, number[]> = {};
                    
                    // Get angle sequences for DTW comparison
                    angleJoints.forEach(joint => {
                      if (userAngleHistory[joint]?.length && referenceAngleHistory[joint]?.length) {
                        userAnglesData[joint] = userAngleHistory[joint].map(entry => entry.angle);
                        refAnglesData[joint] = referenceAngleHistory[joint].map(entry => entry.angle);
                      } else if (userAngleSequences[joint]?.length && referenceAngleSequences[joint]?.length) {
                        // Fallback to old angle sequences if new ones aren't available
                        userAnglesData[joint] = userAngleSequences[joint];
                        refAnglesData[joint] = referenceAngleSequences[joint];
                      }
                    });
                    
                    // Calculate DTW-based scores
                    const dtwScores: Record<string, number> = {};
                    const dtwResultsFromComparison: Record<string, any> = {}; // Renamed to avoid conflict
                    let totalDtwScore = 0;
                    let validJointCount = 0;
                    
                    Object.keys(userAnglesData).forEach(joint => {
                      if (userAnglesData[joint].length >= 5 && refAnglesData[joint].length >= 5) {
                        const result = compareAnglesWithDTW(userAnglesData[joint], refAnglesData[joint], joint);
                        // Get the score from the result object
                        const score = result.score;
                        dtwScores[joint] = score;
                        dtwResultsFromComparison[joint] = result; // Use renamed variable
                        totalDtwScore += score;
                        validJointCount++;
                      }
                    });
                    
                    const avgDtwScore = validJointCount > 0 ? Math.round(totalDtwScore / validJointCount) : 0;
                    
                    // Get latest frame comparison
                    const latestUserPose = userPoseHistory[userPoseHistory.length - 1]?.pose;
                    const latestRefPose = referencePoseHistory[referencePoseHistory.length - 1]?.pose;
                    
                    // Create a properly typed frame comparison object
                    let frameComparison: { jointScores: JointScore[]; overallScore: number } = { 
                      jointScores: [], 
                      overallScore: 0 
                    };
                    
                    if (latestUserPose && latestRefPose) {
                      const result = comparePoses(latestUserPose, latestRefPose);
                      if (result.jointScores && Array.isArray(result.jointScores)) {
                        // IMPORTANT: comparePoses returns overallScore as a SUM of joint scores.
                        // We need an average for the frame comparison part of the final score.
                        const frameOverallScoreSum = result.overallScore;
                        const frameValidJoints = result.jointScores.filter(s => s.score > 0).length;
                        const avgFrameScore = frameValidJoints > 0 ? Math.round(frameOverallScoreSum / frameValidJoints) : 0;

                        frameComparison = {
                          jointScores: result.jointScores as JointScore[],
                          overallScore: avgFrameScore // Use the averaged frame score
                        };
                      }
                    }
                    
                    // Weight the scores: 70% DTW (movement pattern), 30% frame comparison
                    let calculatedFinalScore = Math.round(0.7 * avgDtwScore + 0.3 * frameComparison.overallScore);
                    // CLAMP THE FINAL SCORE
                    calculatedFinalScore = Math.max(0, Math.min(100, calculatedFinalScore));

                    // Generate detailed angle data for charts/tables
                    const angleDataForChart = generateAngleComparisonData();

                    // Debug the angle data for charts
                    console.log("Angle data ready for visualization:");
                    console.log("Timestamps:", angleDataForChart.timestamps?.length || 0, "points");

                    if (angleDataForChart.userAngles) {
                      Object.entries(angleDataForChart.userAngles).forEach(([joint, angles]) => {
                        console.log(`${joint} user angles:`, (angles as number[]).length, "points");
                      });
                    }

                    if (angleDataForChart.expectedAngles) {
                      Object.entries(angleDataForChart.expectedAngles).forEach(([joint, angles]) => {
                        console.log(`${joint} expected angles:`, (angles as number[]).length, "points");
                      });
                    }
                    
                    // Construct feedback message (example)
                    const feedback = `Test completed. Overall Score: ${calculatedFinalScore}%. DTW Score: ${avgDtwScore}%. Frame Score: ${frameComparison.overallScore}%.`;
                    
                    // Set the test results with the angle data
                    setTestResults({
                      isRunning: false,
                      processing: false,
                      scores: frameComparison.jointScores, // These are from the last frame, consider if overall joint scores are needed
                      overallScore: calculatedFinalScore, // Pass the clamped and final score
                      feedback,
                      timing: timingIssues, // Ensure timingIssues state is up-to-date
                      dtwScores,
                      angleData: angleDataForChart, // Pass the generated chart data
                      dtwResults: dtwResultsFromComparison // Pass the detailed DTW results
                    });
                    
                    // Log the test results
                    console.log("Test completed with score:", calculatedFinalScore);
                    console.log("Joint scores (last frame):", frameComparison.jointScores);
                    
                    // Set hasCompletedTest to true to enable the Test Results button
                    setHasCompletedTest(true);
                    
                    // Show results modal immediately
                    setShowResultsModal(true);
                  }, 1000); // Simulate processing delay
                }, 500); // Give time for mediaRecorder.onstop to execute
              } else {
                setTestResults(prev => ({ ...prev, isRunning: false, processing: true }));
                
                // ... existing processing code ...
                
                // Set hasCompletedTest to true to enable the Test Results button
                setHasCompletedTest(true);
              }
            };
          } else {
            // If it's a static image reference
            // Start recording
            startRecording();
            setIsRecordingReference(true);
            setTestStartTime(Date.now());
            
            // Set timeout to end test after 5 seconds for images
            setTimeout(() => {
              setIsRecordingReference(false);
              if (isRecording && mediaRecorder) {
                mediaRecorder.stop();
              }
              setTestResults(prev => ({ ...prev, isRunning: false, processing: true }));
              // Add test evaluation logic similar to video onended handler
              setTimeout(() => {
                // Processing logic would go here (similar to above)
                // ... (duplicate logic from above)
                
                setTestResults(prev => ({
                  ...prev,
                  processing: false,
                  feedback: 'Test completed with static image reference.',
                  overallScore: 0 // This would need to be calculated
                }));
                
                // Set hasCompletedTest to true to enable the Test Results button
                setHasCompletedTest(true);
                
                setShowResultsModal(true);
              }, 1000);
            }, 5000);
          }
        }}
        isTracking={isTracking}
        hasReferenceMedia={isSplitView && (!!imageElement || !!referenceVideoRef.current)}
        hasCompletedTest={hasCompletedTest}
        onShowResults={() => setShowResultsModal(true)}
        onRecord={toggleRecording}
        isRecording={isRecording}
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