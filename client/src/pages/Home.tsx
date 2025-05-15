import { useState, useEffect, useRef } from 'react';
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
import { 
  Sun, Moon, User, LogOut, Settings, Clock, Calendar, Award, Play, 
  Dumbbell, HelpCircle, MessageSquare, BarChart, Info, RefreshCw, Trash2
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

// Import new components
import Leaderboard from '@/components/Leaderboard';
import BeltDisplay from '@/components/BeltDisplay';
import SessionTimer from '@/components/SessionTimer';
import CurrentTime from '@/components/CurrentTime';
import { motion, AnimatePresence } from 'framer-motion';

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
  
  // Dialog states
  const [showHowItWorksDialog, setShowHowItWorksDialog] = useState<boolean>(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState<boolean>(false);
  const [showLeaderboardDialog, setShowLeaderboardDialog] = useState<boolean>(false);
  const [showTips, setShowTips] = useState<boolean>(false);
  const [showCustomizeDialog, setShowCustomizeDialog] = useState<boolean>(false);
  const [feedbackText, setFeedbackText] = useState<string>('');

  // Added for Record button
  const [isRecording, setIsRecording] = useState<boolean>(false);
  
  // Customize background state
  const [backgroundImages, setBackgroundImages] = useState<string[]>([]);
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null);
  
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
    
    // Get user belt from localStorage if available
    const savedBelt = localStorage.getItem('userBelt');
    if (savedBelt) {
      setUserBelt(JSON.parse(savedBelt));
    }
    
    // Load saved background images
    const savedBackgrounds = localStorage.getItem('backgroundImages');
    if (savedBackgrounds) {
      setBackgroundImages(JSON.parse(savedBackgrounds));
    }
    
    // Load selected background
    const savedSelectedBackground = localStorage.getItem('selectedBackground');
    if (savedSelectedBackground) {
      setSelectedBackground(savedSelectedBackground);
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
  
  // Handle background image upload
  const handleBackgroundImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const file = event.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        const newImage = e.target.result;
        const updatedImages = [...backgroundImages, newImage];
        
        // Save to state and localStorage
        setBackgroundImages(updatedImages);
        localStorage.setItem('backgroundImages', JSON.stringify(updatedImages));
        
        // Automatically select the new image
        setSelectedBackground(newImage);
        localStorage.setItem('selectedBackground', newImage);
      }
    };
    
    reader.readAsDataURL(file);
  };
  
  // Handle background selection
  const handleSelectBackground = (imageUrl: string) => {
    setSelectedBackground(imageUrl);
    localStorage.setItem('selectedBackground', imageUrl);
  };
  
  // Handle background deletion
  const handleDeleteBackground = (imageUrl: string) => {
    const updatedImages = backgroundImages.filter(img => img !== imageUrl);
    setBackgroundImages(updatedImages);
    localStorage.setItem('backgroundImages', JSON.stringify(updatedImages));
    
    // If the deleted image was selected, clear the selection
    if (selectedBackground === imageUrl) {
      setSelectedBackground(null);
      localStorage.removeItem('selectedBackground');
    }
  };

  // Handle feedback submission by opening email client
  const handleFeedbackSubmit = () => {
    const username = user?.username || 'User';
    const subject = encodeURIComponent(`Feedback on CoachT: ${username}`);
    const body = encodeURIComponent(feedbackText);
    window.location.href = `mailto:okandy@uw.edu?subject=${subject}&body=${body}`;
    setShowFeedbackDialog(false);
    setFeedbackText('');
  };

  // Render main component
  return (
    <div className="min-h-screen flex flex-col bg-black overflow-hidden">
      {/* Enhanced Header with belt display, app title and user menu */}
      <header className="bg-gradient-to-r from-black to-red-950/90 border-b border-red-900/30 px-6 py-3 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-4">
          <Link to="/" className="cursor-pointer">
            <h1 className="text-2xl font-bold gradient-heading flex items-center group">
              <motion.span 
                className="material-icons text-red-600 mr-2"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
              >
                sports_martial_arts
              </motion.span>
              <span className="group-hover:text-red-500 transition-colors">CoachT</span>
            </h1>
          </Link>
          
          <div className="h-8 w-px bg-red-900/30 mx-2"></div>
          
          {/* Current time */}
          <CurrentTime className="ml-2" showSeconds={false} />
        </div>

        {/* Belt Display - moved to header */}
        <div className="flex-1 mx-4 max-w-lg">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
          >
            <BeltDisplay 
              beltColor={userBelt.color} 
              beltName={userBelt.name} 
              beltLevel={userBelt.level} 
              stretched={true} 
              username={user?.username?.toUpperCase()} 
            />
          </motion.div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Animated Session timer with pulsing effect */}
          <motion.div 
            className="relative group"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <SessionTimer className="transition-transform duration-300" />
            <div className="absolute inset-0 bg-red-500/10 rounded-md scale-105 animate-pulse -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </motion.div>
          
          {/* Profile button */}
          <Link href="/profile">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                variant="outline" 
                className="h-8 rounded-full border-red-600 bg-transparent hover:bg-red-700/20 flex items-center px-3 transition-all duration-300 hover:shadow-red-500/30 hover:shadow-sm"
              >
                <User className="h-4 w-4 text-white mr-2" />
                <span className="text-sm text-white font-medium">Profile</span>
              </Button>
            </motion.div>
          </Link>
            
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  variant="outline" 
                  className="h-8 rounded-full border-red-600 bg-transparent hover:bg-red-700/20 flex items-center px-3"
                >
                  <Settings className="h-4 w-4 text-white mr-2" />
                  <span className="text-sm text-white font-medium">Menu</span>
                </Button>
              </motion.div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 border border-red-600 bg-gray-900">
              <DropdownMenuItem 
                className="cursor-pointer flex items-center text-white hover:bg-red-700/30"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer flex items-center text-white hover:bg-red-700/30"
                onClick={() => setShowTips(true)}
              >
                <Info className="mr-2 h-4 w-4" />
                <span>Training Tips</span>
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
      </header>
      
      {/* Navigation buttons bar */}
      <div className="bg-black/70 border-b border-red-900/30 px-6 py-2 flex justify-center items-center shadow-md">
        <div className="w-full max-w-4xl flex justify-between">
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="h-10 rounded-full px-4 py-2 border border-red-600 bg-transparent hover:bg-red-700/20 flex items-center text-white transition-colors"
              onClick={() => setShowHowItWorksDialog(true)}
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              <span className="font-medium text-sm">How it Works</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="h-10 rounded-full px-4 py-2 border border-red-600 bg-transparent hover:bg-red-700/20 flex items-center text-white transition-colors"
              onClick={() => setShowLeaderboardDialog(true)}
            >
              <BarChart className="h-4 w-4 mr-2" />
              <span className="font-medium text-sm">Leaderboard</span>
            </motion.button>
          </div>
          
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="h-10 rounded-full px-4 py-2 border border-red-600 bg-transparent hover:bg-red-700/20 flex items-center text-white transition-colors"
              onClick={() => setShowFeedbackDialog(true)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              <span className="font-medium text-sm">Feedback</span>
            </motion.button>
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={toggleDarkMode} 
              className="h-10 w-10 rounded-full border-red-600 bg-transparent hover:bg-red-700/20"
            >
              {isDarkMode ? 
                <Sun className="h-5 w-5 text-white" /> : 
                <Moon className="h-5 w-5 text-white" />
              }
            </Button>
          </div>
        </div>
      </div>
      
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
                <motion.div 
                  className="w-24 h-24 mb-8 mx-auto bg-gradient-to-r from-red-800 to-red-700 rounded-full flex items-center justify-center shadow-lg relative group"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: 0.1
                  }}
                >
                  <motion.span 
                    className="material-icons text-4xl text-white transform"
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      repeatType: "reverse",
                      ease: "easeInOut"
                    }}
                  >
                    sports_martial_arts
                  </motion.span>
                  <div className="absolute inset-0 rounded-full bg-red-600/30 animate-ping opacity-75"></div>
                </motion.div>
                
                <motion.h1 
                  className="text-4xl font-bold text-white mb-4"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  Welcome to <span className="gradient-heading">CoachT</span>
                </motion.h1>
                
                <motion.p 
                  className="text-red-200 mb-10 text-lg"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Your personal Taekwondo training assistant powered by AI. Perfect your form through advanced pose tracking.
                </motion.p>
                
                <motion.div 
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {/* Start Routine button with hover animation */}
                  <motion.button 
                    onClick={handlePermissionRequest}
                    className="w-full py-5 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 
                      text-white text-xl font-bold rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                    whileHover={{ 
                      scale: 1.05,
                      boxShadow: "0 0 15px rgba(239, 68, 68, 0.5)" 
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center justify-center">
                      <Play className="mr-3 h-5 w-5" />
                      START ROUTINE
                    </div>
                  </motion.button>
                
                  {/* Practice button */}
                  <Link href="/practice">
                    <motion.button 
                      className="w-full py-5 bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-900 hover:to-gray-800
                        text-white text-xl font-bold rounded-lg shadow-lg border border-red-800/30
                        focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                      whileHover={{ 
                        scale: 1.05,
                        boxShadow: "0 0 15px rgba(107, 114, 128, 0.5)" 
                      }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center justify-center">
                        <Dumbbell className="mr-3 h-5 w-5" />
                        PRACTICE
                      </div>
                    </motion.button>
                  </Link>
                </motion.div>
                
                {/* Customize Screen Button */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.45 }}
                  className="flex justify-center"
                >
                  <motion.button
                    onClick={() => setShowCustomizeDialog(true)}
                    className="px-4 py-2 bg-transparent border border-red-700 text-red-400 rounded-md flex items-center
                      hover:bg-red-900/20 transition-all shadow-sm hover:shadow"
                    whileHover={{ y: -2 }}
                  >
                    <span className="material-icons mr-2 text-sm">wallpaper</span>
                    Customize Screen
                  </motion.button>
                </motion.div>
                
                {/* Notes section */}
                <motion.div 
                  className="mt-6 bg-black/50 border border-red-900/30 rounded-lg p-4"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
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
                </motion.div>
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
                  cameraFacing={cameraFacing}
                  setCameraFacing={setCameraFacing}
                  externalIsRecording={isRecording}
                  onRecordClick={handleRecordClick}
                  routineNotes={routineNotes}
                  setRoutineNotes={setRoutineNotes}
                  customBackground={selectedBackground}
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
        </div>
      </main>
      
      {/* Screenshot modal */}
      {isScreenshotModalOpen && screenshotData && (
        <ScreenshotModal
          screenshotData={screenshotData}
          onClose={() => setIsScreenshotModalOpen(false)}
        />
      )}

      {/* "How It Works" Dialog */}
      <Dialog open={showHowItWorksDialog} onOpenChange={setShowHowItWorksDialog}>
        <DialogContent className="bg-gray-950 border-red-900 text-white max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center text-red-500">
              <HelpCircle className="mr-2 h-5 w-5" /> 
              How CoachT Works
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Learn how to get the most out of your training with CoachT
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div 
                className="bg-black/50 p-4 rounded-lg border border-red-900/30"
                whileHover={{ scale: 1.03, boxShadow: "0 0 8px rgba(239, 68, 68, 0.3)" }}
              >
                <div className="w-12 h-12 rounded-full bg-red-900/50 flex items-center justify-center mb-3">
                  <Play className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">Step 1: Start Routine</h3>
                <p className="text-gray-400 text-sm">
                  Click 'Start Routine' to activate your camera and begin AI pose tracking.
                </p>
              </motion.div>
              
              <motion.div 
                className="bg-black/50 p-4 rounded-lg border border-red-900/30"
                whileHover={{ scale: 1.03, boxShadow: "0 0 8px rgba(239, 68, 68, 0.3)" }}
              >
                <div className="w-12 h-12 rounded-full bg-red-900/50 flex items-center justify-center mb-3">
                  <RefreshCw className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">Step 2: See Feedback</h3>
                <p className="text-gray-400 text-sm">
                  Watch in real-time as CoachT provides instant feedback on your form.
                </p>
              </motion.div>
              
              <motion.div 
                className="bg-black/50 p-4 rounded-lg border border-red-900/30"
                whileHover={{ scale: 1.03, boxShadow: "0 0 8px rgba(239, 68, 68, 0.3)" }}
              >
                <div className="w-12 h-12 rounded-full bg-red-900/50 flex items-center justify-center mb-3">
                  <Award className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">Step 3: Track Progress</h3>
                <p className="text-gray-400 text-sm">
                  Monitor your improvements over time with detailed statistics and records.
                </p>
              </motion.div>
            </div>
            
            <div className="mt-4">
              <h3 className="font-bold text-xl mb-3">Tips For Best Results</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-300">
                <li>Position yourself 6-8 feet from the camera</li>
                <li>Ensure your entire body is visible in the frame</li>
                <li>Train in a well-lit area with minimal background distractions</li>
                <li>Wear clothing that contrasts with your background</li>
                <li>Start with slower movements to get familiar with the tracking</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => setShowHowItWorksDialog(false)}
              className="bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white"
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Feedback Dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent className="bg-gray-950 border-red-900 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center text-red-500">
              <MessageSquare className="mr-2 h-5 w-5" /> 
              Provide Feedback
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Share your suggestions or report issues to help us improve
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <textarea 
              placeholder="Type your feedback here..."
              className="min-h-[150px] bg-gray-900 border border-red-900/40 rounded p-3 text-white"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
            ></textarea>
          </div>
          
          <DialogFooter>
            <Button 
              className="bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white"
              onClick={handleFeedbackSubmit}
            >
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Customize Screen Dialog */}
      <Dialog open={showCustomizeDialog} onOpenChange={setShowCustomizeDialog}>
        <DialogContent className="bg-gray-950 border-red-900 text-white max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center text-red-500">
              <span className="material-icons mr-2">wallpaper</span>
              Customize Screen
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Upload and select custom background images for your training sessions
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            {/* Upload new background section */}
            <div className="border-2 border-dashed border-red-900/40 rounded-lg p-4 flex flex-col items-center">
              <span className="material-icons text-4xl text-red-500/70 mb-2">add_photo_alternate</span>
              <p className="text-sm text-gray-300 mb-4">Upload a background image</p>
              
              <input
                type="file"
                accept="image/*"
                onChange={handleBackgroundImageUpload}
                className="bg-red-950/20 border-red-900/40 text-white p-2 rounded-md w-full"
              />
            </div>
            
            {/* Background gallery */}
            <div>
              <h3 className="font-bold text-lg mb-3">Your Backgrounds</h3>
              {backgroundImages.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {backgroundImages.map((image, index) => (
                    <div 
                      key={index} 
                      className={`relative group rounded-lg overflow-hidden border-2 ${selectedBackground === image ? 'border-red-500' : 'border-red-900/30'} h-40 cursor-pointer`}
                      onClick={() => handleSelectBackground(image)}
                    >
                      <img
                        src={image}
                        alt={`Background ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBackground(image);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {selectedBackground === image && (
                        <div className="absolute top-2 right-2 bg-red-500 rounded-full p-1">
                          <span className="material-icons text-white text-sm">check</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-900/50 rounded-lg">
                  <p className="text-gray-400">No background images uploaded yet</p>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => setShowCustomizeDialog(false)}
              className="bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Leaderboard Dialog */}
      <Dialog open={showLeaderboardDialog} onOpenChange={setShowLeaderboardDialog}>
        <DialogContent className="bg-gray-950 border-red-900 text-white max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center text-red-500">
              <BarChart className="mr-2 h-5 w-5" /> 
              Leaderboard
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              See how you rank among other CoachT practitioners
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Leaderboard currentUsername={user?.username} />
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => setShowLeaderboardDialog(false)}
              className="bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Training Tips Dialog */}
      <Dialog open={showTips} onOpenChange={setShowTips}>
        <DialogContent className="bg-gray-950 border-red-900 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center text-red-500">
              <Info className="mr-2 h-5 w-5" /> 
              Training Tips
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Expert advice to help improve your technique
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="bg-black/50 p-4 rounded-lg border border-red-900/30">
              <h3 className="font-bold text-lg mb-2">Stance Tips</h3>
              <ul className="list-disc pl-5 space-y-1 text-gray-300">
                <li>Keep your knees bent at the proper angle</li>
                <li>Distribute weight evenly between feet</li>
                <li>Maintain straight back and proper posture</li>
              </ul>
            </div>
            
            <div className="bg-black/50 p-4 rounded-lg border border-red-900/30">
              <h3 className="font-bold text-lg mb-2">Kick Techniques</h3>
              <ul className="list-disc pl-5 space-y-1 text-gray-300">
                <li>Chamber your knee properly before extending</li>
                <li>Keep your supporting foot firmly planted</li>
                <li>Focus on hip rotation for power</li>
              </ul>
            </div>
            
            <div className="bg-black/50 p-4 rounded-lg border border-red-900/30">
              <h3 className="font-bold text-lg mb-2">Training Consistency</h3>
              <ul className="list-disc pl-5 space-y-1 text-gray-300">
                <li>Train at least 3-4 times per week</li>
                <li>Balance technical practice with conditioning</li>
                <li>Record and review your movements regularly</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => setShowTips(false)}
              className="bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white"
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add gallery frames on left and right sides when not tracking */}
      {(!hasPermission || trackingStatus === 'inactive') && !isTracking && backgroundImages.length > 0 && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }}>
          <div className="flex h-full items-center">
            {/* Left side frames */}
            <div className="hidden md:flex flex-col ml-8 space-y-8">
              {backgroundImages.slice(0, Math.min(3, Math.ceil(backgroundImages.length / 2))).map((image, index) => (
                <motion.div
                  key={`left-${index}`}
                  className="picture-frame pointer-events-auto"
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + (index * 0.1) }}
                  whileHover={{ scale: 1.05, rotate: index % 2 === 0 ? -2 : 2 }}
                  style={{ 
                    transform: `rotate(${index % 2 === 0 ? -3 : 3}deg)`,
                    width: '180px',
                    height: '200px'
                  }}
                >
                  <div className="relative w-full h-full">
                    {/* Outer frame with shadow */}
                    <div className="absolute inset-0 border-[12px] rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.6)]" 
                      style={{
                        borderImage: 'linear-gradient(45deg, #2d1a16 0%, #701f1f 50%, #2d1a16 100%) 1',
                        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8), 0 10px 25px rgba(0,0,0,0.7)'
                      }}>
                    </div>
                    
                    {/* Inner frame */}
                    <div className="absolute inset-[12px] border-2 border-red-900/40"></div>
                    
                    {/* Decorative corner elements */}
                    <div className="absolute top-[-5px] left-[-5px] w-8 h-8 bg-gradient-to-br from-red-900 to-red-700 rounded-full flex items-center justify-center transform -rotate-45">
                      <span className="text-white text-xs">◆</span>
                    </div>
                    <div className="absolute top-[-5px] right-[-5px] w-8 h-8 bg-gradient-to-bl from-red-900 to-red-700 rounded-full flex items-center justify-center transform rotate-45">
                      <span className="text-white text-xs">◆</span>
                    </div>
                    <div className="absolute bottom-[-5px] left-[-5px] w-8 h-8 bg-gradient-to-tr from-red-900 to-red-700 rounded-full flex items-center justify-center transform rotate-45">
                      <span className="text-white text-xs">◆</span>
                    </div>
                    <div className="absolute bottom-[-5px] right-[-5px] w-8 h-8 bg-gradient-to-tl from-red-900 to-red-700 rounded-full flex items-center justify-center transform -rotate-45">
                      <span className="text-white text-xs">◆</span>
                    </div>
                    
                    {/* Image with overlay */}
                    <img 
                      src={image} 
                      alt="Gallery" 
                      className="absolute inset-[16px] object-cover w-[calc(100%-32px)] h-[calc(100%-32px)]"
                    />
                    
                    {/* Glass-like reflection overlay */}
                    <div className="absolute inset-[16px] bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
                  </div>
                </motion.div>
              ))}
            </div>
            
            {/* Center content - just a spacer */}
            <div className="flex-1"></div>
            
            {/* Right side frames */}
            <div className="hidden md:flex flex-col mr-8 space-y-8">
              {backgroundImages.slice(Math.ceil(backgroundImages.length / 2), Math.min(6, backgroundImages.length)).map((image, index) => (
                <motion.div
                  key={`right-${index}`}
                  className="picture-frame pointer-events-auto"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + (index * 0.1) }}
                  whileHover={{ scale: 1.05, rotate: index % 2 === 0 ? 2 : -2 }}
                  style={{ 
                    transform: `rotate(${index % 2 === 0 ? 3 : -3}deg)`,
                    width: '180px',
                    height: '200px'
                  }}
                >
                  <div className="relative w-full h-full">
                    {/* Outer frame with shadow */}
                    <div className="absolute inset-0 border-[12px] rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.6)]" 
                      style={{
                        borderImage: 'linear-gradient(45deg, #2d1a16 0%, #701f1f 50%, #2d1a16 100%) 1',
                        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8), 0 10px 25px rgba(0,0,0,0.7)'
                      }}>
                    </div>
                    
                    {/* Inner frame */}
                    <div className="absolute inset-[12px] border-2 border-red-900/40"></div>
                    
                    {/* Decorative corner elements */}
                    <div className="absolute top-[-5px] left-[-5px] w-8 h-8 bg-gradient-to-br from-red-900 to-red-700 rounded-full flex items-center justify-center transform -rotate-45">
                      <span className="text-white text-xs">◆</span>
                    </div>
                    <div className="absolute top-[-5px] right-[-5px] w-8 h-8 bg-gradient-to-bl from-red-900 to-red-700 rounded-full flex items-center justify-center transform rotate-45">
                      <span className="text-white text-xs">◆</span>
                    </div>
                    <div className="absolute bottom-[-5px] left-[-5px] w-8 h-8 bg-gradient-to-tr from-red-900 to-red-700 rounded-full flex items-center justify-center transform rotate-45">
                      <span className="text-white text-xs">◆</span>
                    </div>
                    <div className="absolute bottom-[-5px] right-[-5px] w-8 h-8 bg-gradient-to-tl from-red-900 to-red-700 rounded-full flex items-center justify-center transform -rotate-45">
                      <span className="text-white text-xs">◆</span>
                    </div>
                    
                    {/* Image with overlay */}
                    <img 
                      src={image} 
                      alt="Gallery" 
                      className="absolute inset-[16px] object-cover w-[calc(100%-32px)] h-[calc(100%-32px)]"
                    />
                    
                    {/* Glass-like reflection overlay */}
                    <div className="absolute inset-[16px] bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}