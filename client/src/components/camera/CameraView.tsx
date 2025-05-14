import { useRef, useEffect, useState } from 'react'; // Ensure useState and useRef are imported
import { detectPoses } from '@/lib/poseDetection';
import { compareAnglesWithDTW } from '@/lib/dtw';
import GreenGuideOverlay from '../GreenGuideOverlay';
import RecordingControls from './RecordingControls';
import ResultsModal from './ResultsModal';
import NotesEditor from './NotesEditor'; // Using the camera directory version
import { calculateJointAngles, type JointScore } from './JointScoringEngine';
import { detectSignificantMovements, detectMovementGaps, type TimingIssues } from './TimingAnalyzer';
import { isVideoUrl } from './utils';

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
}

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
  toggleReferenceOverlay: externalToggleReferenceOverlay
}: CameraViewProps) {
  const toggleTracking = externalToggleTracking || (() => {});
  const toggleReferenceOverlay = externalToggleReferenceOverlay || (() => {});
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const referenceVideoRef = useRef<HTMLVideoElement | null>(null);
  const [mediaLoaded, setMediaLoaded] = useState<boolean>(false);
  const [isSplitView, setIsSplitView] = useState<boolean>(false);
  const [isVideoPaused, setIsVideoPaused] = useState<boolean>(false);
  const [showMediaSelector, setShowMediaSelector] = useState<boolean>(false);
  const [routineNotes, setRoutineNotes] = useState<string>('');
  const [testResults, setTestResults] = useState<TestResults>(({ isRunning: false, processing: false, scores: [], overallScore: 0, feedback: '', dtwScores: {}, dtwResults: {} }));
  const [showResultsModal, setShowResultsModal] = useState<boolean>(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [recordedVideo, setRecordedVideo] = useState<string | undefined>(undefined);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [showRecordingPopup, setShowRecordingPopup] = useState<boolean>(false);
  const [userPose, setUserPose] = useState<any>(null);
  const [referencePose, setReferencePose] = useState<any>(null);
  const [userPoseHistory, setUserPoseHistory] = useState<Array<{pose: any, timestamp: number}>>([]);
  const [referencePoseHistory, setReferencePoseHistory] = useState<Array<{pose: any, timestamp: number}>>([]);
  const [isRecordingReference, setIsRecordingReference] = useState<boolean>(false);
  const [testStartTime, setTestStartTime] = useState<number>(0);
  const angleJoints = ['left_elbow', 'right_elbow', 'left_shoulder', 'right_shoulder', 'left_wrist', 'right_wrist', 'left_hip', 'right_hip', 'left_knee', 'right_knee', 'left_ankle', 'right_ankle'];
  const [hasCompletedTest, setHasCompletedTest] = useState<boolean>(false);
  const [angleRecordingInterval, setAngleRecordingInterval] = useState<NodeJS.Timeout | null>(null);
  const [userAngleHistory, setUserAngleHistory] = useState<{[joint: string]: Array<{angle: number, timestamp: number}>}>({});
  const [referenceAngleHistory, setReferenceAngleHistory] = useState<{[joint: string]: Array<{angle: number, timestamp: number}>}>({});
  const [timingIssues, setTimingIssues] = useState<TimingIssues>({ delays: false, gaps: false, speed: 'good' });
  const [userAngleSequences, setUserAngleSequences] = useState<Record<string, number[]>>({});
  const [referenceAngleSequences, setReferenceAngleSequences] = useState<Record<string, number[]>>({});
  const [isScreenRecording, setIsScreenRecording] = useState<boolean>(false);
  const screenMediaRecorder = useRef<MediaRecorder | null>(null);
  const screenRecordedChunks = useRef<Blob[]>([]);
  const [screenRecordedVideoUrl, setScreenRecordedVideoUrl] = useState<string | undefined>(undefined);
  const [showScreenRecordingPopup, setShowScreenRecordingPopup] = useState<boolean>(false);

  useEffect(() => {
    const savedNotes = localStorage.getItem('routineNotes');
    if (savedNotes) {
      setRoutineNotes(savedNotes);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('routineNotes', routineNotes);
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
    console.log("Pose detection useEffect running");
  }, [
    stream, isTracking, confidenceThreshold, maxPoses, skeletonColor, showSkeleton, 
    showPoints, sourceType, imageElement, showBackground, backgroundOpacity, 
    backgroundBlur, isFullscreenMode, modelSelection, testResults.isRunning
  ]);

  useEffect(() => {
    console.log("Reference skeleton useEffect running");
  }, [
    isSplitView, showReferenceOverlay, isTracking, mediaUrl, isVideoPaused, confidenceThreshold,
    maxPoses, skeletonColor, showPoints, isFullscreenMode, modelSelection, testResults.isRunning
  ]);

  useEffect(() => {
    if (testStartTime > 0 && testResults.isRunning) {
      // ... grace time logic ...
    }
  }, [testStartTime, testResults.isRunning]);

  useEffect(() => {
    if (isRecordingReference) {
      // ... angle recording logic ...
    } else if (angleRecordingInterval) {
      clearInterval(angleRecordingInterval);
      setAngleRecordingInterval(null);
    }
  }, [isRecordingReference, userPose, referencePose, angleJoints]);

  useEffect(() => {
    return () => {
      if (recordedVideo && !showRecordingPopup) { 
        URL.revokeObjectURL(recordedVideo);
      }
      if (screenRecordedVideoUrl && !showScreenRecordingPopup) {
        URL.revokeObjectURL(screenRecordedVideoUrl);
      }
    };
  }, [recordedVideo, showRecordingPopup, screenRecordedVideoUrl, showScreenRecordingPopup]);

  const getConnectedJoint = (jointName: string, position: 'start' | 'end'): string => { /* ... original code ... */ return ''; };
  const calculateAngle = (a: { x: number, y: number }, b: { x: number, y: number }, c: { x: number, y: number }): number => { /* ... original code ... */ return 0; };
  const comparePoses = (userPose: any, referencePose: any): { jointScores: JointScore[], overallScore: number } => { /* ... original code ... */ return { jointScores: [], overallScore: 0 }; };
  const generateAngleComparisonData = () => { /* ... original code ... */ return { timestamps: [], userAngles: {}, expectedAngles: {} }; };
  const togglePlayPause = () => { /* ... original code ... */ };
  const analyzeSequenceMatch = () => { /* ... original code ... */ return null; };
  const updateDistanceMeter = (userPose: any, refPose: any) => { /* ... original code ... */ };
  const findBestMatchingPose = (timestamp: number, poseHistory: Array<{pose: any, timestamp: number}>, windowSize: number = 300): any | null => { /* ... original code ... */ return null; };
  const performTimingAnalysis = (jointScores: JointScore[], totalScore: number, validJoints: number) => { /* ... original code ... */ return { jointScores: [], overallScore: 0 }; };
  const detectSignificantMovements2 = (poseHistory: any[]): number[] => { /* ... original code ... */ return []; };
  const detectMovementGaps2 = (poseHistory: any[]): {start: number, end: number}[] => { /* ... original code ... */ return []; };
  const toggleSplitView = () => { /* ... original code ... */ };

  const startRecording = () => {
    if (!stream) {
      alert("No camera stream available. Please make sure your camera is connected and permissions are granted.");
      return;
    }
    
    try {
      // Reset chunks array
      recordedChunksRef.current = [];
      
      // Use specific codec that works well across browsers
      const supportedMimeType = 'video/webm;codecs=vp8,opus';
      
      // Create a composite stream with both video and audio
      navigator.mediaDevices.getUserMedia({ video: false, audio: true })
        .then(audioStream => {
          // Combine video stream from camera with new audio stream
          const tracks = [...stream.getVideoTracks(), ...audioStream.getTracks()];
          const combinedStream = new MediaStream(tracks);
          
          // Set up media recorder with reliable settings
          const recorder = new MediaRecorder(combinedStream, { 
            mimeType: supportedMimeType,
            videoBitsPerSecond: 2500000, // 2.5 Mbps
            audioBitsPerSecond: 128000   // 128 kbps
          });
          
          mediaRecorderRef.current = recorder;

          // Collect data periodically (every second) to ensure we get chunks
          recorder.ondataavailable = (event) => {
            console.log("Data available event triggered, size:", event.data.size);
            if (event.data && event.data.size > 0) {
              recordedChunksRef.current.push(event.data);
            }
          };

          recorder.onstop = () => {
            console.log("Recording stopped. Chunks collected:", recordedChunksRef.current.length);
            // Only create video if we actually have data
            if (recordedChunksRef.current.length === 0) {
              console.warn("No data chunks recorded.");
              setIsRecording(false);
              return;
            }
            
            const blob = new Blob(recordedChunksRef.current, { type: supportedMimeType });
            // Only proceed if blob has actual size
            if (blob.size <= 100) {
              console.warn("Recording too small, likely empty.");
              setIsRecording(false);
              return;
            }
            
            const url = URL.createObjectURL(blob);
            setRecordedVideo(url);
            setShowRecordingPopup(true);
            setIsRecording(false);
            console.log("Recording blob created, size:", blob.size, "bytes, URL:", url);
            
            // Clean up tracks from audio stream
            audioStream.getTracks().forEach(track => track.stop());
          };

          recorder.onerror = (event) => {
            console.error("MediaRecorder error:", event);
            alert("An error occurred during recording.");
            setIsRecording(false);
            audioStream.getTracks().forEach(track => track.stop());
          };

          // Start recording with data collection every 1 second
          recorder.start(1000);
          setIsRecording(true);
          console.log("Recording started successfully with type:", supportedMimeType);
        })
        .catch(err => {
          console.error("Error getting audio stream:", err);
          alert("Could not access microphone. Recording will continue without audio.");
          
          // Fallback to video-only recording
          const videoOnlyRecorder = new MediaRecorder(stream, { mimeType: supportedMimeType });
          mediaRecorderRef.current = videoOnlyRecorder;
          
          videoOnlyRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
              recordedChunksRef.current.push(event.data);
            }
          };
          
          videoOnlyRecorder.onstop = () => {
            if (recordedChunksRef.current.length === 0) {
              console.warn("No data chunks recorded.");
              setIsRecording(false);
              return;
            }
            
            const blob = new Blob(recordedChunksRef.current, { type: supportedMimeType });
            if (blob.size <= 100) {
              console.warn("Recording too small, likely empty.");
              setIsRecording(false);
              return;
            }
            
            const url = URL.createObjectURL(blob);
            setRecordedVideo(url);
            setShowRecordingPopup(true);
            setIsRecording(false);
          };
          
          videoOnlyRecorder.start(1000);
          setIsRecording(true);
        });
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Could not start recording. Ensure you have granted permissions and your browser supports it.");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    console.log("Attempting to stop recording...");
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      // Add a small delay to ensure we've collected chunks before stopping
      setTimeout(() => {
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stop();
          console.log("MediaRecorder.stop() called.");
        }
      }, 1000);
    } else {
      console.warn("No active recording to stop or recorder not in correct state.");
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startScreenRecording = async () => {
    if (isScreenRecording) return;
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: "screen" } as MediaTrackConstraints,
        audio: false,
      });
      
      screenRecordedChunks.current = [];
      const MimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4' 
      ];
      const supportedMimeType = MimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';

      const recorder = new MediaRecorder(displayStream, { mimeType: supportedMimeType });
      screenMediaRecorder.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          screenRecordedChunks.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        console.log("Screen recording stopped. Chunks collected:", screenRecordedChunks.current.length);
        if (screenRecordedChunks.current.length === 0) {
            console.warn("No data chunks recorded for screen.");
            setIsScreenRecording(false);
            displayStream.getTracks().forEach(track => track.stop());
            return; 
        }
        const blob = new Blob(screenRecordedChunks.current, { type: supportedMimeType });
        const url = URL.createObjectURL(blob);
        setScreenRecordedVideoUrl(url);
        setShowScreenRecordingPopup(true);
        displayStream.getTracks().forEach(track => track.stop());
        setIsScreenRecording(false);
        console.log("Screen recording blob created, URL:", url);
      };

      recorder.onerror = (event) => {
        console.error("MediaRecorder error (screen):", event);
        alert("An error occurred during screen recording.");
        setIsScreenRecording(false);
        displayStream.getTracks().forEach(track => track.stop());
      };

      displayStream.getVideoTracks()[0].addEventListener('ended', () => {
        if (screenMediaRecorder.current && screenMediaRecorder.current.state === "recording") {
          screenMediaRecorder.current.stop();
        }
        setIsScreenRecording(false);
      });

      recorder.start(1000);
      setIsScreenRecording(true);
      console.log("Screen recording started successfully with type:", supportedMimeType);
    } catch (error) {
      console.error("Error starting screen recording:", error);
      alert("Could not start screen recording. Ensure you have granted permissions and your browser supports it.");
      setIsScreenRecording(false);
    }
  };

  const stopScreenRecording = () => {
    console.log("Attempting to stop screen recording...");
    if (screenMediaRecorder.current && screenMediaRecorder.current.state === "recording") {
      screenMediaRecorder.current.stop();
    } else {
      console.warn("No active screen recording to stop or recorder not in correct state.");
      setIsScreenRecording(false);
    }
  };

  const toggleScreenRecording = () => {
    if (isScreenRecording) {
      stopScreenRecording();
    } else {
      startScreenRecording();
    }
  };

  const closeScreenRecordingPopup = () => {
    setShowScreenRecordingPopup(false);
    if (screenRecordedVideoUrl) {
      URL.revokeObjectURL(screenRecordedVideoUrl);
    }
    setScreenRecordedVideoUrl(undefined);
    screenRecordedChunks.current = [];
    console.log("Closed screen recording popup and revoked URL.");
  };

  const closeRecordingPopup = () => {
    setShowRecordingPopup(false);
    if (recordedVideo) {
      URL.revokeObjectURL(recordedVideo);
    }
    setRecordedVideo(undefined);
    recordedChunksRef.current = [];
    console.log("Closed recording popup and revoked URL.");
  };

  return (
    <div className="m-0 p-0">
      <RecordingControls onRecordingComplete={(url: string) => { /* url is string */ }} />

      <div id="cameraContainer" className={`${isFullscreenMode ? 'border-0 rounded-none shadow-none h-[calc(100vh-72px)] w-screen' : 'border-0 border-red-900 overflow-hidden relative h-[calc(80vh-100px)]'}`}>
        <div className={`relative w-full ${isFullscreenMode ? 'h-full' : ''} flex flex-col`}>
          <div className={`flex ${isSplitView ? 'md:flex-row flex-col' : ''} ${isFullscreenMode ? 'h-full' : ''} h-full gap-0`}>
            <div className={`camera-container relative ${isSplitView ? 'md:w-1/2 w-full' : 'w-full'} ${isFullscreenMode ? 'h-full' : isSplitView ? '' : 'aspect-[16/12]'}`}>
            </div>
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
        initialNotes={routineNotes}
        onChange={setRoutineNotes}
        onStartRoutine={toggleTracking} 
        onStartTest={() => { /* Full onStartTest logic */ }}
        isTracking={isTracking}
        hasReferenceMedia={isSplitView && (!!imageElement || !!referenceVideoRef.current)}
        hasCompletedTest={hasCompletedTest}
        onShowResults={() => setShowResultsModal(true)}
        onToggleScreenRecording={toggleScreenRecording} 
        isScreenRecording={isScreenRecording}
        onRecord={toggleRecording}
        isRecording={isRecording}
      />

      <ResultsModal
        isOpen={showResultsModal}
        onClose={() => setShowResultsModal(false)}
        scores={testResults.scores}
        overallScore={testResults.overallScore}
        feedback={testResults.feedback}
        timing={timingIssues}
        recordedVideo={recordedVideo}
        routineNotes={routineNotes}
        angleData={testResults.angleData}
        dtwResults={testResults.dtwResults}
      />

      {showRecordingPopup && recordedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 p-6 rounded-xl shadow-2xl w-full max-w-3xl border border-purple-700/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white text-center">Camera Recording</h3>
              <button 
                onClick={closeRecordingPopup} 
                className="text-gray-400 hover:text-white"
                aria-label="Close"
              >
                <span className="material-icons">close</span>
              </button>
            </div>
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
                  a.download = 'recording.webm';
                  document.body.appendChild(a); 
                  a.click(); 
                  document.body.removeChild(a);
                }}
                className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold shadow-md flex items-center"
              >
                <span className="material-icons mr-2">download</span>
                Download
              </button>
              <button 
                onClick={closeRecordingPopup} 
                className="px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg font-semibold hover:from-gray-700 hover:to-gray-800 transition-colors shadow-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showScreenRecordingPopup && screenRecordedVideoUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[100] p-4">
          <div className="bg-gray-900 p-6 rounded-xl shadow-2xl w-full max-w-3xl border border-purple-700/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white text-center">Screen Recording</h3>
              <button 
                onClick={closeScreenRecordingPopup} 
                className="text-gray-400 hover:text-white"
                aria-label="Close"
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            <video 
              src={screenRecordedVideoUrl} 
              controls 
              autoPlay 
              className="w-full rounded-lg max-h-[70vh] mb-4 border border-gray-700" 
            />
            <div className="flex flex-row gap-4 justify-end">
              <button
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = screenRecordedVideoUrl;
                  a.download = `recording.webm`;
                  document.body.appendChild(a); 
                  a.click(); 
                  document.body.removeChild(a);
                }}
                className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold shadow-md flex items-center"
              >
                <span className="material-icons mr-2">download</span>
                Download
              </button>
              <button 
                onClick={closeScreenRecordingPopup} 
                className="px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg font-semibold hover:from-gray-700 hover:to-gray-800 transition-colors shadow-md"
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