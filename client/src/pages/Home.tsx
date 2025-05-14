import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import CameraView from '@/components/CameraView';
import PermissionDialog from '@/components/PermissionDialog';
import LoadingState from '@/components/LoadingState';
import ScreenshotModal from '@/components/ScreenshotModal';
import { initPoseDetection, getModels } from '@/lib/poseDetection';
import { requestCameraPermission, getCameraStream } from '@/lib/cameraUtils';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { Sun, Moon, User, LogOut, Settings, Clock, Calendar, Award, Play, Dumbbell } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Import new components
import Leaderboard from '@/components/Leaderboard';
import BeltDisplay from '@/components/BeltDisplay';
import SessionTimer from '@/components/SessionTimer';
import CurrentTime from '@/components/CurrentTime';

export type TrackingStatus = 'inactive' | 'loading' | 'ready' | 'active' | 'error';
export type CameraFacing = 'user' | 'environment';
export type SourceType = 'camera' | 'image' | 'video';

export default function Home() {
  // Auth and theme contexts
  const { user, logoutMutation } = useAuth();
  const { theme, setTheme } = useTheme();
  
  // State for application flow
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>('inactive');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  
  // Media source state
  const [sourceType, setSourceType] = useState<SourceType>('camera');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>('user');
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null);
  const [uploadedVideo, setUploadedVideo] = useState<HTMLVideoElement | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | undefined>(undefined);
  
  // Detection settings
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.5);
  const [modelSelection, setModelSelection] = useState<string>('lightning');
  const [maxPoses, setMaxPoses] = useState<number>(1);
  const [showSkeleton, setShowSkeleton] = useState<boolean>(true);
  const [showPoints, setShowPoints] = useState<boolean>(true);
  
  // Background settings
  const [showBackground, setShowBackground] = useState<boolean>(true);
  const [backgroundOpacity, setBackgroundOpacity] = useState<number>(0.8);
  const [backgroundBlur, setBackgroundBlur] = useState<number>(0);
  
  // Reference view settings
  const [showReferenceOverlay, setShowReferenceOverlay] = useState<boolean>(false);
  
  // UI state
  const [isFullscreenMode, setIsFullscreenMode] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [routineNotes, setRoutineNotes] = useState<string>('');
  
  // Added for Record button
  const [isRecording, setIsRecording] = useState<boolean>(false);
  
  // Mock user belt data - to be replaced with API call
  const [userBelt, setUserBelt] = useState({
    color: 'red',
    name: 'Red Belt',
    level: 2
  });
  
  // Load routine notes from localStorage when component mounts
  useEffect(() => {
    const savedNotes = localStorage.getItem('routineNotes');
    if (savedNotes) {
      setRoutineNotes(savedNotes);
    }
  }, []);

  // Save routine notes to localStorage when they change
  useEffect(() => {
    localStorage.setItem('routineNotes', routineNotes);
  }, [routineNotes]);
  
  // Screenshot modal
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState<boolean>(false);

  // Initialize pose detection
  const loadModels = async () => {
    try {
      setIsLoading(true);
      setLoadingProgress(0);
      
      // Load camera stream if needed
      if (sourceType === 'camera' && !stream) {
        const newStream = await getCameraStream(cameraFacing);
        setStream(newStream);
      }
      
      // Load AI models
      await initPoseDetection(modelSelection);
      
      // Update status when everything is ready
      setTrackingStatus('ready');
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading pose detection models:', error);
      setTrackingStatus('error');
      setIsLoading(false);
    }
  };

  // Handle camera permission request
  const handlePermissionRequest = async () => {
    try {
      setIsLoading(true);
      const permission = await requestCameraPermission();
      setHasPermission(permission);
      
      if (permission) {
        setTrackingStatus('loading');
        setSourceType('camera');
        // Load AI models
        await loadModels();
      } else {
        setTrackingStatus('error');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      setTrackingStatus('error');
      setIsLoading(false);
    }
  };

  // Toggle tracking state
  const toggleTracking = () => {
    setIsTracking(!isTracking);
    if (trackingStatus === 'ready') {
      setTrackingStatus('active');
    }
  };

  // Toggle reference overlay
  const toggleReferenceOverlay = () => {
    setShowReferenceOverlay(!showReferenceOverlay);
  };

  // Toggle fullscreen mode
  const toggleFullscreenMode = () => {
    setIsFullscreenMode(!isFullscreenMode);
  };

  // Handle image upload
  const handleImageUpload = (image: HTMLImageElement, url: string) => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    setSourceType('image');
    setUploadedImage(image);
    setMediaUrl(url);
    setTrackingStatus('ready');
  };

  // Handle video upload
  const handleVideoUpload = (video: HTMLVideoElement, url: string) => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    setSourceType('video');
    setUploadedVideo(video);
    setMediaUrl(url + '#video'); // Add flag to identify as video
    setTrackingStatus('ready');
  };

  // Take screenshot
  const handleScreenshot = (dataUrl: string) => {
    if (dataUrl.startsWith('blob:')) {
      // This is a reference media upload (not a screenshot)
      setMediaUrl(dataUrl);
    } else {
      // This is a regular screenshot
      setScreenshotData(dataUrl);
      setIsScreenshotModalOpen(true);
    }
  };

  // Toggle dark/light mode
  const toggleDarkMode = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    setIsDarkMode(newTheme === 'dark');
  };

  // Handle record button click
  const handleRecordClick = () => {
    alert('Record button clicked!');
    setIsRecording(!isRecording);
  };

  // Render main component
  return (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Enhanced Header with app title and user menu */}
      <header className="bg-black border-b border-red-900/30 px-6 py-3 flex justify-between items-center shadow-md">
        <div className="flex items-center">
          <Link to="/" className="cursor-pointer">
            <h1 className="text-2xl font-bold gradient-heading flex items-center">
              <span className="material-icons text-red-600 mr-2">sports_martial_arts</span>
              CoachT
            </h1>
          </Link>
          
          <div className="mx-4 h-8 w-px bg-red-900/30"></div>
          
          {/* Current time */}
          <CurrentTime className="ml-2" showSeconds={false} />
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Animated Session timer with pulsing effect */}
          <div className="relative group">
            <SessionTimer className="transition-transform group-hover:scale-105 duration-300" />
            <div className="absolute inset-0 bg-red-500/10 rounded-md scale-105 animate-pulse -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </div>
          
          {/* User's belt display - simplified, animated */}
          <div className="relative group transition-transform hover:scale-105 duration-300">
            <div className="flex items-center bg-black/40 rounded-full px-3 py-1.5 border border-red-800/30">
              <div className="mr-2">
                <div className={`h-5 w-5 rounded-full ${userBelt.color === 'black' ? 'bg-black border border-white' : `bg-${userBelt.color}-600`} shadow-lg`}>
                  <div className="absolute inset-0 rounded-full bg-white/10 scale-0 group-hover:scale-100 transition-transform duration-500 ease-out"></div>
                </div>
              </div>
              
              <span className="text-white font-medium mr-2">{user?.username}</span>
              
              <div className="relative">
                <div className={`h-5 w-5 rounded-full ${userBelt.color === 'black' ? 'bg-black border border-white' : `bg-${userBelt.color}-600`} shadow-lg`}>
                  {userBelt.level > 1 && (
                    <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-white flex items-center justify-center">
                      <span className="text-[8px] font-bold text-black">{userBelt.level}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* UI Controls */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={toggleDarkMode} 
              className="h-8 w-8 rounded-full border-red-600 bg-transparent hover:bg-red-700/20"
            >
              {isDarkMode ? 
                <Sun className="h-4 w-4 text-white" /> : 
                <Moon className="h-4 w-4 text-white" />
              }
            </Button>
            
            {/* Profile button */}
            <Link href="/profile">
              <Button 
                variant="outline" 
                className="h-8 rounded-full border-red-600 bg-transparent hover:bg-red-700/20 flex items-center px-3 transition-all duration-300 hover:shadow-red-500/30 hover:shadow-sm"
              >
                <User className="h-4 w-4 text-white mr-2" />
                <span className="text-sm text-white font-medium">Profile</span>
              </Button>
            </Link>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="h-8 rounded-full border-red-600 bg-transparent hover:bg-red-700/20 flex items-center px-3"
                >
                  <Settings className="h-4 w-4 text-white mr-2" />
                  <span className="text-sm text-white font-medium">Menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 border border-red-600 bg-gray-900">
                <DropdownMenuItem 
                  className="cursor-pointer flex items-center text-white hover:bg-red-700/30"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-red-900/30" />
                <DropdownMenuItem 
                  className="cursor-pointer flex items-center text-white hover:bg-red-700/30" 
                  onClick={() => logoutMutation.mutate()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col">
        {/* Main content area */}
        <div className="flex-1 p-6">
          {/* Loading indicator */}
          {isLoading && (
            <LoadingState progress={loadingProgress} message="Loading pose detection models..." />
          )}
          
          {/* Initial screen - before starting routine */}
          {(!hasPermission || trackingStatus === 'inactive') && !isTracking ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-black text-center">
              <div className="w-full max-w-lg">
                {/* Taekwondo logo/icon with animation */}
                <div className="w-24 h-24 mb-8 mx-auto bg-gradient-to-r from-red-800 to-red-700 rounded-full flex items-center justify-center shadow-lg relative group">
                  <span className="material-icons text-4xl text-white group-hover:scale-110 transform transition-transform duration-300">sports_martial_arts</span>
                  <div className="absolute inset-0 rounded-full bg-red-600/30 animate-ping opacity-75"></div>
                </div>
                
                <h1 className="text-4xl font-bold text-white mb-4">
                  Welcome to <span className="gradient-heading">CoachT</span>
                </h1>
                
                <p className="text-red-200 mb-10 text-lg">
                  Your personal Taekwondo training assistant powered by AI. Perfect your form through advanced pose tracking.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                  {/* Start Routine button with hover animation */}
                  <button 
                    onClick={handlePermissionRequest}
                    className="w-full py-5 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 
                      text-white text-xl font-bold rounded-lg shadow-lg transform transition-all 
                      hover:scale-105 hover:shadow-red-500/20 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                  >
                    <div className="flex items-center justify-center">
                      <Play className="mr-3 h-5 w-5" />
                      START ROUTINE
                    </div>
                  </button>
                
                  {/* Practice button */}
                  <Link href="/practice">
                    <button 
                      className="w-full py-5 bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-900 hover:to-gray-800
                        text-white text-xl font-bold rounded-lg shadow-lg transform transition-all border border-red-800/30
                        hover:scale-105 hover:shadow-gray-700/20 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                    >
                      <div className="flex items-center justify-center">
                        <Dumbbell className="mr-3 h-5 w-5" />
                        PRACTICE
                      </div>
                    </button>
                  </Link>
                </div>
                
                {/* Notes section */}
                <div className="mt-6 bg-black/50 border border-red-900/30 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <span className="material-icons text-red-500 mr-2">edit_note</span>
                    <h3 className="text-lg font-medium text-red-100">Routine Notes</h3>
                  </div>
                  <textarea 
                    className="w-full h-32 bg-black/70 border border-red-900/40 rounded p-3 text-white placeholder-red-200/50
                      focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    placeholder="Write your notes for this training session here..."
                    value={routineNotes}
                    onChange={(e) => setRoutineNotes(e.target.value)}
                  ></textarea>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {/* Camera view with pose detection */}
              {(hasPermission || sourceType !== 'camera') && (
                <CameraView
                  stream={stream}
                  isTracking={isTracking}
                  confidenceThreshold={confidenceThreshold}
                  modelSelection={modelSelection}
                  maxPoses={maxPoses}
                  skeletonColor="red"
                  showSkeleton={showSkeleton}
                  showPoints={showPoints}
                  showBackground={showBackground}
                  backgroundOpacity={backgroundOpacity}
                  backgroundBlur={backgroundBlur}
                  sourceType={sourceType}
                  imageElement={uploadedImage}
                  videoElement={uploadedVideo}
                  mediaUrl={mediaUrl}
                  showReferenceOverlay={showReferenceOverlay}
                  isFullscreenMode={isFullscreenMode}
                  onScreenshot={handleScreenshot}
                  toggleTracking={toggleTracking}
                  toggleReferenceOverlay={toggleReferenceOverlay}
                />
              )}
            </div>
          )}
          
          {/* Camera permission request */}
          {trackingStatus === 'error' && hasPermission === false && (
            <PermissionDialog
              onRequestPermission={handlePermissionRequest}
            />
          )}
          
          {/* Leaderboard section with animations - moved below the main content */}
          <div className="mt-8 mb-4">
            <Leaderboard currentUsername={user?.username} />
          </div>
        </div>
      </main>
      
      {/* Screenshot modal */}
      {isScreenshotModalOpen && screenshotData && (
        <ScreenshotModal
          screenshotData={screenshotData}
          onClose={() => setIsScreenshotModalOpen(false)}
        />
      )}
    </div>
  );
}