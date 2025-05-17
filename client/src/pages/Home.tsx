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
  Dumbbell, HelpCircle, MessageSquare, BarChart, Info, RefreshCw, Trash2,
  Home as HomeIcon, ListChecks, Loader2, PanelRightOpen, PanelRightClose, Palette,
  ChevronDown, ChevronUp, ScrollText
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
import Leaderboard from '@/components/Leaderboard';
import BeltDisplay from '@/components/BeltDisplay';
import SessionTimer from '@/components/SessionTimer';
import CurrentTime from '@/components/CurrentTime';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, getQueryFn } from '@/lib/queryClient';
import { format } from 'date-fns';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export type TrackingStatus = 'inactive' | 'loading' | 'ready' | 'active' | 'error';
export type CameraFacing = 'user' | 'environment';
export type SourceType = 'camera' | 'image' | 'video';

interface Recording {
  id: number;
  userId: number;
  fileUrl: string;
  title: string | null;
  notes: string | null;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// Timer component specifically for the current session view on this page
function CurrentPageTimer() {
  const [sessionSeconds, setSessionSeconds] = useState(0);
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setSessionSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  const formatDisplayTime = (totalSeconds: number): string => {
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };
  return <span className="font-mono text-red-400">{formatDisplayTime(sessionSeconds)}</span>;
}

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
  const [isSessionPanelExpanded, setIsSessionPanelExpanded] = useState<boolean>(false);
  
  // Camera view options
  const [skeletonColorChoice, setSkeletonColorChoice] = useState<'red' | 'blue' | 'green' | 'purple' | 'orange'>('red');
  const [blackoutMode, setBlackoutMode] = useState<boolean>(false);
  
  // Dialog states
  const [showHowItWorksDialog, setShowHowItWorksDialog] = useState<boolean>(false);
  const [showLeaderboardDialog, setShowLeaderboardDialog] = useState<boolean>(false);
  const [showTips, setShowTips] = useState<boolean>(false);
  const [showCustomizeDialog, setShowCustomizeDialog] = useState<boolean>(false);
  
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
  
  // Theme state for buttons
  const [buttonTheme, setButtonTheme] = useState<'sky' | 'crimson' | 'emerald' | 'amber'>('sky');
  
  // Fetch recordings for the session log
  const { data: recordings, isLoading: isLoadingRecordings, error: recordingsError } = useQuery<Recording[], Error>({
    queryKey: ['/api/recordings', user?.id],
    queryFn: () => apiRequest("GET", "/api/recordings").then(res => res.json()),
    enabled: !!user,
  });

  // Load routine notes from localStorage when component mounts
  useEffect(() => {
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

    // Load button theme
    const savedButtonTheme = localStorage.getItem('buttonTheme') as typeof buttonTheme;
    if (savedButtonTheme) {
      setButtonTheme(savedButtonTheme);
    }

    // Check if user has seen the welcome guide
    const hasSeenGuide = localStorage.getItem('hasSeenWelcomeGuide');
    if (!hasSeenGuide) {
      setShowHowItWorksDialog(true); // Show dialog on first visit
    }
  }, []);

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
    const subject = encodeURIComponent(`Feedback on CoachT by ${username}`);
    const body = encodeURIComponent("Please type your feedback here:\n\n"); // Default body
    window.location.href = `mailto:ojaskandy@gmail.com?subject=${subject}&body=${body}`;
  };

  const getButtonClasses = (theme: typeof buttonTheme, type: 'primary' | 'outline') => {
    const themes = {
      sky: {
        primary: 'bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-700 hover:to-cyan-600 text-white shadow-lg hover:shadow-sky-500/40 focus:ring-sky-500',
        outline: 'border-sky-700 text-sky-400 hover:bg-sky-900/30 hover:text-sky-300 focus:ring-sky-500',
      },
      crimson: {
        primary: 'bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-700 hover:to-rose-600 text-white shadow-lg hover:shadow-red-500/40 focus:ring-red-500',
        outline: 'border-red-700 text-red-400 hover:bg-red-900/30 hover:text-red-300 focus:ring-red-500',
      },
      emerald: {
        primary: 'bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-700 hover:to-green-600 text-white shadow-lg hover:shadow-emerald-500/40 focus:ring-emerald-500',
        outline: 'border-emerald-700 text-emerald-400 hover:bg-emerald-900/30 hover:text-emerald-300 focus:ring-emerald-500',
      },
      amber: {
        primary: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg hover:shadow-amber-500/40 focus:ring-amber-500',
        outline: 'border-amber-700 text-amber-400 hover:bg-amber-900/30 hover:text-amber-300 focus:ring-amber-500',
      }
    };
    return themes[theme][type];
  };

  // Effect to update background visibility based on blackout mode
  useEffect(() => {
    setShowBackground(!blackoutMode);
  }, [blackoutMode]);

  // Render main component
  return (
    <div className="min-h-screen flex flex-col bg-black overflow-hidden">
      {/* Enhanced Header with belt display, app title and user menu */}
      <header className="bg-gradient-to-r from-black to-red-950/90 border-b border-red-900/30 px-6 py-3 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-4">
          <Link to="/welcome" className="cursor-pointer">
            <h1 className="text-2xl font-bold gradient-heading flex items-center group z-50 relative">
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
            <motion.div 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }} 
              className="relative group" // Added relative group for badge positioning
            >
              <Button 
                variant="outline" 
                className="h-8 rounded-full border-red-600 bg-transparent hover:bg-red-700/20 flex items-center px-3 transition-all duration-300 hover:shadow-red-500/30 hover:shadow-sm"
              >
                <User className="h-4 w-4 text-white mr-2" />
                <span className="text-sm text-white font-medium">Profile</span>
              </Button>
              <span className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full shadow-md transform group-hover:scale-110 transition-transform z-10">
                In Development
              </span>
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

            <Link href="/welcome">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="h-10 rounded-full px-4 py-2 border border-red-600 bg-transparent hover:bg-red-700/20 flex items-center text-white transition-colors"
              >
                <HomeIcon className="h-4 w-4 mr-2" />
                <span className="font-medium text-sm">View Welcome Page</span>
              </motion.button>
            </Link>
          </div>
          
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="h-10 rounded-full px-4 py-2 border border-red-600 bg-transparent hover:bg-red-700/20 flex items-center text-white transition-colors"
              onClick={handleFeedbackSubmit}
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
        {/* Adjusted padding for the main content area */}
        <div className="flex-1 p-8 md:p-10">
          {isLoading && <LoadingState progress={loadingProgress} message="Loading pose detection models..." />}
          
          {(!hasPermission || trackingStatus === 'inactive') && !isTracking ? (
            // New layout for the home screen
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-x-8 items-start max-w-screen-xl mx-auto w-full h-full">
              {/* Left Column: Welcome Text and Actions - Centered */}
              <div className={`lg:mx-auto ${isSessionPanelExpanded ? 'lg:col-span-8' : 'lg:col-span-10 lg:col-start-2'} space-y-8 flex flex-col items-center transition-all duration-300 ease-in-out mt-16 md:mt-24`}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-center w-full">
                  <h1 className="text-4xl md:text-5xl font-bold text-white">
                    Ready to train, <span className="gradient-heading">{user?.username || 'User'}</span>?
                  </h1>
                  <p className="text-sky-200 mt-3 text-lg md:text-xl">
                    Track progress. Perfect your form.
                  </p>
                </motion.div>

                <motion.div 
                  className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 relative group w-full max-w-2xl"
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                >
                  <div className="relative group"> {/* Wrapper for badge */}
                    <motion.button 
                      onClick={handlePermissionRequest}
                      className={`w-full py-4 md:py-5 text-lg font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 flex items-center justify-center transition-all duration-300 ease-in-out transform hover:scale-103 ${getButtonClasses(buttonTheme, 'primary')}`}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Play className="mr-2 h-5 w-5" />
                      Start Live Routine
                    </motion.button>
                    <span className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full shadow-md transform group-hover:scale-110 transition-transform z-10">
                      In Development
                    </span>
                  </div>
                
                  <Link href="/practice">
                    <motion.button
                      className={`w-full py-4 md:py-5 text-lg font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 flex items-center justify-center transition-all duration-300 ease-in-out transform hover:scale-103 ${getButtonClasses(buttonTheme, 'primary')}`}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Dumbbell className="mr-2 h-5 w-5" />
                      Practice Library
                    </motion.button>
                  </Link>
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="pt-6" 
                >
                   <Button
                    onClick={() => setShowCustomizeDialog(true)}
                    variant="outline"
                    className={`px-6 py-3 text-base transition-all duration-300 ease-in-out rounded-lg ${getButtonClasses(buttonTheme, 'outline')}`}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Customize Screen
                  </Button>
                </motion.div>
              </div>

              {/* Right Column: Session Log - Collapsible */}
              <motion.div 
                className={`bg-gray-950/70 border shadow-xl h-full flex flex-col fixed top-[220px] right-0 md:right-4 lg:right-8 transition-all duration-300 ease-in-out z-20 ${isSessionPanelExpanded ? 'lg:col-span-3 w-[350px] p-6' : 'lg:col-span-1 w-[70px] p-3 items-center'} ${buttonTheme === 'sky' ? 'border-sky-800/40' : buttonTheme === 'crimson' ? 'border-red-800/40' : buttonTheme === 'emerald' ? 'border-emerald-800/40' : 'border-amber-800/40'} rounded-xl`}
                initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
                layout // Animate layout changes
              >
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setIsSessionPanelExpanded(!isSessionPanelExpanded)} 
                  className={`absolute -left-10 top-2 hover:bg-opacity-20 ${buttonTheme === 'sky' ? 'text-sky-400 hover:text-sky-300 hover:bg-sky-700/20' : buttonTheme === 'crimson' ? 'text-red-400 hover:text-red-300 hover:bg-red-700/20' : buttonTheme === 'emerald' ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-700/20' : 'text-amber-400 hover:text-amber-300 hover:bg-amber-700/20'} ${isSessionPanelExpanded ? 'rounded-l-md rounded-r-none' : 'rounded-md'}`}
                  title={isSessionPanelExpanded ? "Collapse Panel" : "Expand Panel"}
                >
                  {isSessionPanelExpanded ? <PanelRightClose className="h-6 w-6" /> : <PanelRightOpen className="h-6 w-6" />}
                </Button>

                {/* Current Session Info */}
                <div className={`mb-6 pb-6 border-b ${!isSessionPanelExpanded ? 'hidden' : 'block'} ${buttonTheme === 'sky' ? 'border-sky-800/50' : buttonTheme === 'crimson' ? 'border-red-800/50' : buttonTheme === 'emerald' ? 'border-emerald-800/50' : 'border-amber-800/50'}`}>
                  <h2 className={`text-2xl font-semibold mb-3 flex items-center ${buttonTheme === 'sky' ? 'text-sky-400' : buttonTheme === 'crimson' ? 'text-red-400' : buttonTheme === 'emerald' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    <Clock className="mr-3 h-6 w-6" />
                    Current Session
                  </h2>
                  <p className="text-gray-300">
                    Time on this page: <CurrentPageTimer />
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    This timer resets if you refresh or leave the page.
                  </p>
                </div>

                {/* Recordings Log */}
                <div className={`${!isSessionPanelExpanded ? 'hidden' : 'block'} flex-1 overflow-hidden`}>
                  <h2 className={`text-2xl font-semibold mb-5 flex items-center ${buttonTheme === 'sky' ? 'text-sky-400' : buttonTheme === 'crimson' ? 'text-red-400' : buttonTheme === 'emerald' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    <ListChecks className="mr-3 h-7 w-7" />
                    Recent Recordings
                  </h2>
                  <div className={`overflow-y-auto pr-2 scrollbar-thin scrollbar-track-gray-800 ${isSessionPanelExpanded ? 'max-h-[calc(100vh-480px)]' : 'max-h-0'} ${buttonTheme === 'sky' ? 'scrollbar-thumb-sky-600' : buttonTheme === 'crimson' ? 'scrollbar-thumb-red-600' : buttonTheme === 'emerald' ? 'scrollbar-thumb-emerald-600' : 'scrollbar-thumb-amber-600'}`}>
                    {isLoadingRecordings && (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 className={`h-10 w-10 animate-spin ${buttonTheme === 'sky' ? 'text-sky-400' : buttonTheme === 'crimson' ? 'text-red-400' : buttonTheme === 'emerald' ? 'text-emerald-400' : 'text-amber-400'}`} />
                        {isSessionPanelExpanded && <p className="ml-4 text-gray-400 text-lg">Loading...</p>}
                      </div>
                    )}
                    {recordingsError && (
                      <p className="text-red-400 text-center py-5">Error: {recordingsError.message}</p>
                    )}
                    {!isLoadingRecordings && recordings && recordings.length > 0 && (
                      <ul className="space-y-3">
                        {recordings.slice().reverse().map(rec => (
                          <li key={rec.id} className={`bg-gray-900 p-3 rounded-lg border border-gray-800 hover:shadow-md transition-all duration-200 ease-in-out transform ${buttonTheme === 'sky' ? 'hover:border-sky-600/60 hover:shadow-sky-700/20' : buttonTheme === 'crimson' ? 'hover:border-red-600/60 hover:shadow-red-700/20' : buttonTheme === 'emerald' ? 'hover:border-emerald-600/60 hover:shadow-emerald-700/20' : 'hover:border-amber-600/60 hover:shadow-amber-700/20'}`}>
                            <p className="text-sm text-white font-medium truncate">
                              {rec.title || `Practice Recording ${rec.id}`}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {format(new Date(rec.createdAt), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                    {!isLoadingRecordings && (!recordings || recordings.length === 0) && !recordingsError && (
                      <p className="text-gray-500 italic text-center py-10 text-sm">No recordings yet.</p>
                    )}
                  </div>
                </div>
                 {/* Collapsed State Icons */}
                {!isSessionPanelExpanded && (
                  <div className="flex flex-col items-center space-y-6 mt-6">
                    <span title="Current Session">
                      <Clock className={`h-7 w-7 ${buttonTheme === 'sky' ? 'text-sky-400' : buttonTheme === 'crimson' ? 'text-red-400' : buttonTheme === 'emerald' ? 'text-emerald-400' : 'text-amber-400'}`} />
                    </span>
                    <span title="Recent Recordings">
                      <ListChecks className={`h-7 w-7 ${buttonTheme === 'sky' ? 'text-sky-400' : buttonTheme === 'crimson' ? 'text-red-400' : buttonTheme === 'emerald' ? 'text-emerald-400' : 'text-amber-400'}`} />
                    </span>
                  </div>
                )}
              </motion.div>
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
                  skeletonColor={skeletonColorChoice}
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
                  customBackground={selectedBackground}
                />
              )}

              {/* Camera Settings Panel */}
              {sourceType === 'camera' && hasPermission && !isLoading && (
                <div className="absolute top-4 right-4 bg-gray-950/80 border border-gray-800 rounded-lg p-3 shadow-lg z-20">
                  <h3 className={`text-sm font-semibold mb-2 ${buttonTheme === 'sky' ? 'text-sky-400' : buttonTheme === 'crimson' ? 'text-red-400' : buttonTheme === 'emerald' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    Camera Options
                  </h3>
                  
                  <div className="space-y-3">
                    {/* Skeleton Color Selection */}
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Skeleton Color</label>
                      <div className="flex space-x-2">
                        {['red', 'blue', 'green', 'purple', 'orange'].map((color) => (
                          <button
                            key={color}
                            onClick={() => setSkeletonColorChoice(color as typeof skeletonColorChoice)}
                            className={`w-6 h-6 rounded-full border ${skeletonColorChoice === color ? 'border-white border-2' : 'border-gray-600'}`}
                            style={{ backgroundColor: 
                              color === 'red' ? '#ef4444' : 
                              color === 'blue' ? '#3b82f6' : 
                              color === 'green' ? '#10b981' : 
                              color === 'purple' ? '#8b5cf6' : 
                              '#f97316' // orange
                            }}
                            aria-label={`Set skeleton color to ${color}`}
                          />
                        ))}
                      </div>
                    </div>
                    
                    {/* Blackout Mode Toggle */}
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Blackout Mode</label>
                      <button
                        onClick={() => setBlackoutMode(!blackoutMode)}
                        className={`w-full py-1 px-3 rounded text-sm font-medium ${blackoutMode ? 'bg-gray-200 text-black' : 'bg-gray-800 text-white'}`}
                      >
                        {blackoutMode ? 'On (Skeleton Only)' : 'Off (Show Camera)'}
                      </button>
                    </div>
                  </div>
                </div>
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
      <Dialog open={showHowItWorksDialog} onOpenChange={(isOpen) => {
        setShowHowItWorksDialog(isOpen);
        if (!isOpen) {
          localStorage.setItem('hasSeenWelcomeGuide', 'true'); // Mark as seen when closed
        }
      }}>
        <DialogContent className={`bg-gray-950 border text-white max-w-3xl ${getButtonClasses(buttonTheme, 'outline').split(' ').find(c => c.startsWith('border-')) || 'border-sky-800'}`}>
          <DialogHeader>
            <DialogTitle className={`text-3xl flex items-center ${buttonTheme === 'sky' ? 'text-sky-400' : buttonTheme === 'crimson' ? 'text-red-400' : buttonTheme === 'emerald' ? 'text-emerald-400' : 'text-amber-400'}`}>
              <HelpCircle className="mr-3 h-7 w-7" /> 
              How CoachT Works
            </DialogTitle>
            <DialogDescription className="text-gray-400 mt-1">
              Welcome to CoachT! Here's a quick guide to get you started.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 text-gray-300 h-[60vh] overflow-y-auto pr-4 scrollbar-thin scrollbar-track-gray-800 ${buttonTheme === 'sky' ? 'scrollbar-thumb-sky-600' : buttonTheme === 'crimson' ? 'scrollbar-thumb-red-600' : buttonTheme === 'emerald' ? 'scrollbar-thumb-emerald-600' : 'scrollbar-thumb-amber-600'}">
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="item-1" className="border-b-0">
                <AccordionTrigger className={`text-xl font-semibold ${buttonTheme === 'sky' ? 'text-sky-300' : buttonTheme === 'crimson' ? 'text-red-300' : buttonTheme === 'emerald' ? 'text-emerald-300' : 'text-amber-300'} hover:no-underline`}>
                  <div className="flex items-center">
                    <Play className="mr-2 h-5 w-5" />
                    Start Live Routine
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-3 pb-2 px-2">
                  <p className="mb-2">
                    This is your main training ground! Clicking 'Start Live Routine' will activate your camera for real-time AI pose tracking.
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-sm">
                    <li><strong>Permissions:</strong> Your browser will ask for camera access. Please allow it for CoachT to see your movements.</li>
                    <li><strong>Real-time Feedback:</strong> Once active, CoachT analyzes your form and provides instant visual cues and (soon!) audio feedback.</li>
                    <li><strong>During the Routine:</strong> You'll have options to record your session, pause, and adjust settings (like skeleton visibility) directly on the screen.</li>
                    <li><strong>Goal:</strong> Focus on matching the target poses and refining your technique based on the AI's guidance.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border-b-0">
                <AccordionTrigger className={`text-xl font-semibold ${buttonTheme === 'sky' ? 'text-sky-300' : buttonTheme === 'crimson' ? 'text-red-300' : buttonTheme === 'emerald' ? 'text-emerald-300' : 'text-amber-300'} hover:no-underline`}>
                  <div className="flex items-center">
                    <Dumbbell className="mr-2 h-5 w-5" />
                    Practice Library
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-3 pb-2 px-2">
                  <p className="mb-2">
                    The 'Practice Library' is where you can explore and master individual Taekwondo moves or other exercises.
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-sm">
                    <li><strong>Browse Moves:</strong> Navigate through categories to find specific techniques, forms, or drills.</li>
                    <li><strong>Detailed View:</strong> Each move has a dedicated page with reference visuals, key joint angle data, and (eventually) video demonstrations.</li>
                    <li><strong>Focused Practice:</strong> Launch a targeted practice session for any move directly from its library page. This works similarly to the 'Start Live Routine' but focuses on that single move.</li>
                    <li><strong>Reference Poses:</strong> For developers or advanced users, you can contribute by saving your own reference poses for moves.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="border-b-0">
                <AccordionTrigger className={`text-xl font-semibold ${buttonTheme === 'sky' ? 'text-sky-300' : buttonTheme === 'crimson' ? 'text-red-300' : buttonTheme === 'emerald' ? 'text-emerald-300' : 'text-amber-300'} hover:no-underline`}>
                  <div className="flex items-center">
                    <MessageSquare className="mr-2 h-5 w-5" />
                    Providing Feedback
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-3 pb-2 px-2">
                  <p className="mb-2">
                    Your input is invaluable for making CoachT better! Use the 'Feedback' button (usually in the top navigation or menu) to share your thoughts.
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-sm">
                    <li><strong>How it Works:</strong> Clicking 'Feedback' will typically open your default email client with a pre-filled subject line.</li>
                    <li><strong>What to Share:</strong> Tell us about your experience, any bugs you encounter, features you'd love to see, or general suggestions.</li>
                    <li><strong>Be Specific:</strong> The more detail you provide, the better we can understand and address your feedback.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="border-b-0">
                <AccordionTrigger className={`text-xl font-semibold ${buttonTheme === 'sky' ? 'text-sky-300' : buttonTheme === 'crimson' ? 'text-red-300' : buttonTheme === 'emerald' ? 'text-emerald-300' : 'text-amber-300'} hover:no-underline`}>
                  <div className="flex items-center">
                    <Info className="mr-2 h-5 w-5" />
                    General Tips for Best Results
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-3 pb-2 px-2">
                  <ul className="list-disc pl-6 space-y-2 text-sm">
                    <li>Position yourself 6-8 feet from the camera for full-body tracking.</li>
                    <li>Ensure your entire body is visible within the camera frame.</li>
                    <li>Train in a well-lit area with a contrasting background if possible.</li>
                    <li>Wear clothing that doesn't blend in too much with your surroundings.</li>
                    <li>Start with slower movements to help the AI calibrate and for you to get used to the feedback.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          
          <DialogFooter className="mt-2">
            <Button 
              onClick={() => {
                setShowHowItWorksDialog(false);
                localStorage.setItem('hasSeenWelcomeGuide', 'true'); // Explicitly set on click too
              }}
              className={`text-white px-6 py-2 text-base ${getButtonClasses(buttonTheme, 'primary')}`}
            >
              Got it, Let's Train!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Leaderboard Dialog */}
      <Dialog open={showLeaderboardDialog} onOpenChange={setShowLeaderboardDialog}>
        <DialogContent className={`bg-gray-950 border text-white max-w-3xl ${getButtonClasses(buttonTheme, 'outline').split(' ').find(c => c.startsWith('border-')) || 'border-sky-800'}`}>
          <DialogHeader>
            <DialogTitle className={`text-2xl flex items-center ${buttonTheme === 'sky' ? 'text-sky-400' : buttonTheme === 'crimson' ? 'text-red-400' : buttonTheme === 'emerald' ? 'text-emerald-400' : 'text-amber-400'}`}>
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
              className={`text-white ${getButtonClasses(buttonTheme, 'primary')}`}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Training Tips Dialog */}
      <Dialog open={showTips} onOpenChange={setShowTips}>
        <DialogContent className={`bg-gray-950 border text-white ${getButtonClasses(buttonTheme, 'outline').split(' ').find(c => c.startsWith('border-')) || 'border-sky-800'}`}>
          <DialogHeader>
            <DialogTitle className={`text-2xl flex items-center ${buttonTheme === 'sky' ? 'text-sky-400' : buttonTheme === 'crimson' ? 'text-red-400' : buttonTheme === 'emerald' ? 'text-emerald-400' : 'text-amber-400'}`}>
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
              className={`text-white ${getButtonClasses(buttonTheme, 'primary')}`}
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customize Screen Dialog - Repurposed for Color Themes */}
      <Dialog open={showCustomizeDialog} onOpenChange={setShowCustomizeDialog}>
        <DialogContent className={`bg-gray-950 border text-white max-w-lg ${getButtonClasses(buttonTheme, 'outline').split(' ').find(c => c.startsWith('border-')) || 'border-sky-800'}`}>
          <DialogHeader>
            <DialogTitle className={`text-2xl flex items-center ${buttonTheme === 'sky' ? 'text-sky-400' : buttonTheme === 'crimson' ? 'text-red-400' : buttonTheme === 'emerald' ? 'text-emerald-400' : 'text-amber-400'}`}>
              <Palette className="mr-3 h-6 w-6" />
              Customize UI Theme
            </DialogTitle>
            <DialogDescription className="text-gray-400 mt-1">
              Change the primary color theme for buttons and accents.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-lg text-gray-200">Select a Color Theme:</h3>
              {(['sky', 'crimson', 'emerald', 'amber'] as const).map((themeOption) => (
                <Button
                  key={themeOption}
                  onClick={() => {
                    setButtonTheme(themeOption);
                    localStorage.setItem('buttonTheme', themeOption);
                  }}
                  className={`w-full justify-start py-3 px-4 text-base rounded-md transition-all duration-200 ease-in-out ${getButtonClasses(themeOption, 'primary')} ${buttonTheme === themeOption ? 'ring-2 ring-offset-2 ring-offset-gray-950 ' + (themeOption === 'sky' ? 'ring-sky-400' : themeOption === 'crimson' ? 'ring-red-400' : themeOption === 'emerald' ? 'ring-emerald-400' : 'ring-amber-400') : ''}`}
                >
                  <span className={`w-4 h-4 rounded-full mr-3 ${
                    themeOption === 'sky' ? 'bg-sky-500' : 
                    themeOption === 'crimson' ? 'bg-red-500' : 
                    themeOption === 'emerald' ? 'bg-emerald-500' : 
                    'bg-amber-500'
                  }`}></span>
                  {themeOption.charAt(0).toUpperCase() + themeOption.slice(1)}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button onClick={() => setShowCustomizeDialog(false)} className={`text-white px-6 py-2 text-base ${getButtonClasses(buttonTheme, 'primary')}`}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gallery frames for welcome screen (only shown if not tracking and backgroundImages exist) */}
      {(!hasPermission || trackingStatus === 'inactive') && !isTracking && backgroundImages.length > 0 && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }}>
          <div className="flex h-full items-center justify-between">
            {/* Left side frames */}
            <div className="hidden md:flex flex-col ml-8 space-y-8" style={{ position: 'absolute', left: '2rem', top: '50%', transform: 'translateY(-50%)' }}>
              {backgroundImages.slice(0, Math.min(3, Math.ceil(backgroundImages.length / 2))).map((image, index) => (
                <motion.div
                  key={`left-${index}`}
                  className="picture-frame pointer-events-auto"
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + (index * 0.1) }}
                  whileHover={{ scale: 1.05, rotate: index % 2 === 0 ? -8 : -4 }}
                  style={{ 
                    transform: `rotate(${index % 2 === 0 ? -10 : -5}deg)`,
                    width: '180px',
                    height: '200px',
                    transformOrigin: 'center center'
                  }}
                >
                  <div className="relative w-full h-full">
                    {/* Outer frame with shadow */}
                    <div className="absolute inset-0 border-[12px] rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.6)]" 
                      style={{
                        borderImage: 'linear-gradient(45deg, #0c2a4d 0%, #1f6bac 50%, #0c2a4d 100%) 1',
                        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8), 0 10px 25px rgba(0,0,0,0.7)'
                      }}>
                    </div>
                    
                    {/* Inner frame with glass effect */}
                    <div className="absolute inset-[12px] border-2 border-sky-900/40 backdrop-blur-sm bg-white/5 rounded"></div>
                    
                    {/* Decorative corner elements */}
                    <div className="absolute top-[-5px] left-[-5px] w-8 h-8 bg-gradient-to-br from-sky-900 to-sky-700 rounded-full flex items-center justify-center transform -rotate-45">
                      <span className="text-white text-xs">◆</span>
                    </div>
                    <div className="absolute top-[-5px] right-[-5px] w-8 h-8 bg-gradient-to-bl from-sky-900 to-sky-700 rounded-full flex items-center justify-center transform rotate-45">
                      <span className="text-white text-xs">◆</span>
                    </div>
                    <div className="absolute bottom-[-5px] left-[-5px] w-8 h-8 bg-gradient-to-tr from-sky-900 to-sky-700 rounded-full flex items-center justify-center transform rotate-45">
                      <span className="text-white text-xs">◆</span>
                    </div>
                    <div className="absolute bottom-[-5px] right-[-5px] w-8 h-8 bg-gradient-to-tl from-sky-900 to-sky-700 rounded-full flex items-center justify-center transform -rotate-45">
                      <span className="text-white text-xs">◆</span>
                    </div>
                    
                    {/* Image with overlay */}
                    <img 
                      src={image} 
                      alt="Gallery" 
                      className="absolute inset-[16px] object-cover w-[calc(100%-32px)] h-[calc(100%-32px)]"
                    />
                    
                    {/* Enhanced glass-like reflection overlay */}
                    <div className="absolute inset-[16px] bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
                    <div className="absolute inset-[16px] overflow-hidden rounded">
                      <div className="absolute top-0 left-[-100%] w-[300%] h-[50%] bg-gradient-to-br from-white/30 to-transparent transform rotate-45 opacity-60"></div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            
            {/* Right side frames */}
            <div className="hidden md:flex flex-col mr-8 space-y-8" style={{ position: 'absolute', right: '2rem', top: '50%', transform: 'translateY(-50%)' }}>
              {backgroundImages.slice(Math.ceil(backgroundImages.length / 2), Math.min(6, backgroundImages.length)).map((image, index) => (
                <motion.div
                  key={`right-${index}`}
                  className="picture-frame pointer-events-auto"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + (index * 0.1) }}
                  whileHover={{ scale: 1.05, rotate: index % 2 === 0 ? 8 : 4 }}
                  style={{ 
                    transform: `rotate(${index % 2 === 0 ? 10 : 5}deg)`,
                    width: '180px',
                    height: '200px',
                    transformOrigin: 'center center'
                  }}
                >
                  <div className="relative w-full h-full">
                    {/* Outer frame with shadow */}
                    <div className="absolute inset-0 border-[12px] rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.6)]" 
                      style={{
                        borderImage: 'linear-gradient(45deg, #0c2a4d 0%, #1f6bac 50%, #0c2a4d 100%) 1',
                        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8), 0 10px 25px rgba(0,0,0,0.7)'
                      }}>
                    </div>
                    
                    {/* Inner frame with glass effect */}
                    <div className="absolute inset-[12px] border-2 border-sky-900/40 backdrop-blur-sm bg-white/5 rounded"></div>
                    
                    {/* Decorative corner elements */}
                    <div className="absolute top-[-5px] left-[-5px] w-8 h-8 bg-gradient-to-br from-sky-900 to-sky-700 rounded-full flex items-center justify-center transform -rotate-45">
                      <span className="text-white text-xs">◆</span>
                    </div>
                    <div className="absolute top-[-5px] right-[-5px] w-8 h-8 bg-gradient-to-bl from-sky-900 to-sky-700 rounded-full flex items-center justify-center transform rotate-45">
                      <span className="text-white text-xs">◆</span>
                    </div>
                    <div className="absolute bottom-[-5px] left-[-5px] w-8 h-8 bg-gradient-to-tr from-sky-900 to-sky-700 rounded-full flex items-center justify-center transform rotate-45">
                      <span className="text-white text-xs">◆</span>
                    </div>
                    <div className="absolute bottom-[-5px] right-[-5px] w-8 h-8 bg-gradient-to-tl from-sky-900 to-sky-700 rounded-full flex items-center justify-center transform -rotate-45">
                      <span className="text-white text-xs">◆</span>
                    </div>
                    
                    {/* Image with overlay */}
                    <img 
                      src={image} 
                      alt="Gallery" 
                      className="absolute inset-[16px] object-cover w-[calc(100%-32px)] h-[calc(100%-32px)]"
                    />
                    
                    {/* Enhanced glass-like reflection overlay */}
                    <div className="absolute inset-[16px] bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
                    <div className="absolute inset-[16px] overflow-hidden rounded">
                      <div className="absolute top-0 left-[-100%] w-[300%] h-[50%] bg-gradient-to-br from-white/30 to-transparent transform rotate-45 opacity-60"></div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          
          {/* Colorful animated elements at the bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-40 overflow-hidden">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ff3366" stopOpacity="0.8">
                    <animate attributeName="offset" values="0;0.3;0" dur="10s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="30%" stopColor="#4f6df5" stopOpacity="0.8">
                    <animate attributeName="offset" values="0.3;0.6;0.3" dur="10s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="60%" stopColor="#11d3f3" stopOpacity="0.8">
                    <animate attributeName="offset" values="0.6;0.9;0.6" dur="10s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="90%" stopColor="#ff9933" stopOpacity="0.8">
                    <animate attributeName="offset" values="0.9;1.0;0.9" dur="10s" repeatCount="indefinite" />
                  </stop>
                </linearGradient>
                <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#11d3f3" stopOpacity="0.8">
                    <animate attributeName="offset" values="0;0.3;0" dur="8s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="30%" stopColor="#ff9933" stopOpacity="0.8">
                    <animate attributeName="offset" values="0.3;0.6;0.3" dur="8s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="60%" stopColor="#ff3366" stopOpacity="0.8">
                    <animate attributeName="offset" values="0.6;0.9;0.6" dur="8s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="90%" stopColor="#4f6df5" stopOpacity="0.8">
                    <animate attributeName="offset" values="0.9;1.0;0.9" dur="8s" repeatCount="indefinite" />
                  </stop>
                </linearGradient>
              </defs>
              
              <path d="M0,40 Q250,5 500,40 T1000,40 T1500,40 T2000,40 T2500,40 V100 H0 V40" fill="url(#grad1)">
                <animate attributeName="d" 
                  values="M0,40 Q250,5 500,40 T1000,40 T1500,40 T2000,40 T2500,40 V100 H0 V40;
                          M0,40 Q250,20 500,35 T1000,35 T1500,45 T2000,30 T2500,40 V100 H0 V40;
                          M0,40 Q250,40 500,20 T1000,30 T1500,25 T2000,40 T2500,40 V100 H0 V40;
                          M0,40 Q250,5 500,40 T1000,40 T1500,40 T2000,40 T2500,40 V100 H0 V40"
                  dur="20s" 
                  repeatCount="indefinite" />
              </path>
              
              <path d="M0,65 Q250,45 500,65 T1000,65 T1500,65 T2000,65 T2500,65 V100 H0 V65" fill="url(#grad2)">
                <animate attributeName="d" 
                  values="M0,65 Q250,45 500,65 T1000,65 T1500,65 T2000,65 T2500,65 V100 H0 V65;
                          M0,65 Q250,75 500,60 T1000,60 T1500,70 T2000,55 T2500,65 V100 H0 V65;
                          M0,65 Q250,65 500,45 T1000,55 T1500,50 T2000,65 T2500,65 V100 H0 V65;
                          M0,65 Q250,45 500,65 T1000,65 T1500,65 T2000,65 T2500,65 V100 H0 V65"
                  dur="15s" 
                  repeatCount="indefinite" />
              </path>
              
              <path d="M0,80 Q250,105 500,80 T1000,80 T1500,80 T2000,80 T2500,80 V100 H0 V80" fill="url(#grad1)" opacity="0.6">
                <animate attributeName="d" 
                  values="M0,80 Q250,105 500,80 T1000,80 T1500,80 T2000,80 T2500,80 V100 H0 V80;
                          M0,80 Q250,70 500,80 T1000,90 T1500,75 T2000,85 T2500,80 V100 H0 V80;
                          M0,80 Q250,85 500,70 T1000,75 T1500,90 T2000,80 T2500,80 V100 H0 V80;
                          M0,80 Q250,105 500,80 T1000,80 T1500,80 T2000,80 T2500,80 V100 H0 V80"
                  dur="25s" 
                  repeatCount="indefinite" />
              </path>
              
              <circle cx="10%" cy="85%" r="5" fill="#ff3366">
                <animate attributeName="cx" values="10%;90%;10%" dur="20s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0.4;0.8" dur="5s" repeatCount="indefinite" />
              </circle>
              
              <circle cx="20%" cy="75%" r="3" fill="#4f6df5">
                <animate attributeName="cx" values="20%;70%;20%" dur="15s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;0.3;0.7" dur="7s" repeatCount="indefinite" />
              </circle>
              
              <circle cx="80%" cy="80%" r="6" fill="#11d3f3">
                <animate attributeName="cx" values="80%;30%;80%" dur="25s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0.2;0.6" dur="8s" repeatCount="indefinite" />
              </circle>
              
              <circle cx="65%" cy="90%" r="4" fill="#ff9933">
                <animate attributeName="cx" values="65%;25%;65%" dur="18s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0.3;0.5" dur="6s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}