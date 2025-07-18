import { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import CameraView from '@/components/CameraView';
import PermissionDialog from '@/components/PermissionDialog';
import LoadingState from '@/components/LoadingState';
import ScreenshotModal from '@/components/ScreenshotModal';
import { initPoseDetection, getModels } from '@/lib/poseDetection';
import { requestCameraPermission, getCameraStream } from '@/lib/cameraUtils';
// import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Sun, Moon, User, LogOut, Settings, Clock, Calendar, Award, Play, 
  Dumbbell, HelpCircle, MessageSquare, BarChart, Info, RefreshCw, Trash2,
  Home as HomeIcon, ListChecks, Loader2, PanelRightOpen, PanelRightClose, Palette,
  ChevronDown, ChevronUp, ScrollText, Smartphone, Crown, Trophy, Plus, X, MessageCircle
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { isMobileDevice } from '@/lib/deviceUtils';

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

interface UpcomingPageant {
  id: number;
  userId: number;
  name: string;
  location: string;
  date: string; // ISO date string
  specialNote: string | null;
  createdAt: string; // ISO date string
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
  const [user, setUser] = useState<any>(null);
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/user', {
          credentials: 'include'
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      }
    };
    fetchUser();
  }, []);

  // Simple logout function
  const handleLogout = async () => {
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
      if (response.ok) {
        window.location.href = '/auth';
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
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
  
  // Reference settings
  const [showReferenceOverlay, setShowReferenceOverlay] = useState<boolean>(false);
  
  // UI state
  const [isFullscreenMode, setIsFullscreenMode] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [isSessionPanelExpanded, setIsSessionPanelExpanded] = useState<boolean>(false);
  
  // Camera view options
  const [skeletonColorChoice, setSkeletonColorChoice] = useState<'red' | 'blue' | 'green' | 'purple' | 'orange'>('red');
  const [blackoutMode, setBlackoutMode] = useState<boolean>(true);
  
  // State for dialogs
  const [showCreditsDialog, setShowCreditsDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showCustomizeDialog, setShowCustomizeDialog] = useState(false);
  const [showLeaderboardDialog, setShowLeaderboardDialog] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showArshiaClone, setShowArshiaClone] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  
  // Added for Record button
  const [isRecording, setIsRecording] = useState<boolean>(false);
  
  // State for mobile warning popup
  const [showMobileWarningDialog, setShowMobileWarningDialog] = useState<boolean>(false);
  
  // Customize background state
  const [backgroundImages, setBackgroundImages] = useState<string[]>([]);
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null);
  

  
  // Mock user belt data - to be replaced with API call
  const [userBelt, setUserBelt] = useState({
    color: 'red',
    name: 'Red Belt',
    level: 2
  });
  
  // Theme state for buttons - default to crimson (pink/red)
  const [buttonTheme, setButtonTheme] = useState<'sky' | 'crimson' | 'emerald' | 'amber'>('crimson');
  
  // Fetch recordings for the session log
  const { data: recordings, isLoading: isLoadingRecordings, error: recordingsError } = useQuery<Recording[], Error>({
    queryKey: ['/api/recordings', user?.id],
    queryFn: () => apiRequest("GET", "/api/recordings").then(res => res.json()),
    enabled: !!user,
  });

  // Pageant data management
  const [showAddPageantDialog, setShowAddPageantDialog] = useState(false);
  const [pageantForm, setPageantForm] = useState({
    name: '',
    location: '',
    date: '',
    specialNote: ''
  });
  
  // Pageant data query
  const { data: pageants = [], isLoading: isPageantsLoading } = useQuery<UpcomingPageant[]>({
    queryKey: ['/api/pageants'],
    enabled: !!user,
  });

  // Pageant mutations
  const addPageantMutation = useMutation({
    mutationFn: (data: { name: string; location: string; date: string; specialNote?: string }) =>
      apiRequest('POST', '/api/pageants', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pageants'] });
      setShowAddPageantDialog(false);
      setPageantForm({ name: '', location: '', date: '', specialNote: '' });
    },
  });

  const deletePageantMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/pageants/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pageants'] });
    },
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

    // Set button theme to crimson (pink/red) by default
    setButtonTheme('crimson');
    localStorage.setItem('buttonTheme', 'crimson');

    // Skip welcome guide by default
    localStorage.setItem('hasSeenWelcomeGuide', 'true');

    // Check for mobile device after user context is available
    if (user) {
      if (isMobileDevice()) {
        // Optionally, check localStorage here to show only once per session/device
        // For now, show every time on mobile after login
        setShowMobileWarningDialog(true);
      }
    }
  }, [user]); // Add user to dependency array to run when user loads

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
    <div className={`h-screen w-full flex flex-col overflow-hidden transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-white'
    }`}>
      {/* Sticky Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 shadow-lg transition-colors duration-300 ${
        theme === 'dark' 
          ? 'bg-gradient-to-r from-pink-700 to-pink-600' 
          : 'bg-gradient-to-r from-pink-500 to-pink-400'
      }`}>
        <div className="flex items-center justify-between p-4 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2L3 7v11a2 2 0 002 2h10a2 2 0 002-2V7l-7-5z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold">Runway AI</h1>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
        </div>
      </header>
      
      {/* Main Content Area */}
      <main className={`flex-1 overflow-y-auto pt-20 pb-16 transition-colors duration-300 ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800' 
          : 'bg-gradient-to-br from-pink-100 via-pink-50 to-pink-100'
      }`}>
        <div className="p-4">
          {isLoading && <LoadingState progress={loadingProgress} message="Loading pose detection models..." />}
          
          {(!hasPermission || trackingStatus === 'inactive') && !isTracking ? (
            <div className="flex flex-col h-full">
              {/* Upcoming Pageants Card - Expanded */}
              <div className={`backdrop-blur-sm rounded-3xl p-4 shadow-lg flex-1 mb-4 transition-colors duration-300 ${
                theme === 'dark' 
                  ? 'bg-gray-800/60 border border-gray-700' 
                  : 'bg-white/60'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-semibold transition-colors duration-300 ${
                    theme === 'dark' ? 'text-pink-300' : 'text-pink-700'
                  }`}>Upcoming Pageants</h3>
                  <button
                    onClick={() => setShowAddPageantDialog(true)}
                    className="w-8 h-8 rounded-full bg-pink-500 hover:bg-pink-600 text-white transition-colors flex items-center justify-center"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="space-y-3 mb-6 flex-1 min-h-32">
                    {isPageantsLoading ? (
                      <div className="animate-pulse space-y-2">
                        <div className="h-4 bg-pink-200 rounded w-3/4"></div>
                        <div className="h-3 bg-pink-200 rounded w-1/2"></div>
                        <div className="h-3 bg-pink-200 rounded w-2/3"></div>
                      </div>
                    ) : pageants.length === 0 ? (
                      <div className="text-center py-4">
                        <p className={`text-sm transition-colors duration-300 ${
                          theme === 'dark' ? 'text-pink-300' : 'text-pink-600'
                        }`}>No upcoming pageants</p>
                        <p className={`text-xs mt-1 transition-colors duration-300 ${
                          theme === 'dark' ? 'text-pink-400' : 'text-pink-500'
                        }`}>Click the + button to add your first pageant!</p>
                      </div>
                    ) : (
                      pageants.map((pageant) => (
                        <div key={pageant.id} className="group">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className={`font-bold text-base transition-colors duration-300 ${
                                theme === 'dark' ? 'text-pink-200' : 'text-pink-800'
                              }`}>{pageant.name}</h4>
                              <p className={`text-sm transition-colors duration-300 ${
                                theme === 'dark' ? 'text-pink-300' : 'text-pink-600'
                              }`}>{format(new Date(pageant.date), 'MMM d, yyyy')}</p>
                              <p className={`text-sm transition-colors duration-300 ${
                                theme === 'dark' ? 'text-pink-400' : 'text-pink-500'
                              }`}>{pageant.location}</p>
                              {pageant.specialNote && (
                                <p className={`text-sm italic mt-1 transition-colors duration-300 ${
                                  theme === 'dark' ? 'text-pink-500' : 'text-pink-400'
                                }`}>{pageant.specialNote}</p>
                              )}
                            </div>
                            <button
                              onClick={() => deletePageantMutation.mutate(pageant.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-pink-200 transition-all"
                            >
                              <X className="h-3 w-3 text-pink-600" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                {/* Main Practice Buttons */}
                <div className="space-y-4">
                  <motion.button 
                    onClick={handlePermissionRequest}
                    className="w-full py-4 px-6 text-base font-bold rounded-full bg-gradient-to-r from-pink-500 to-pink-400 hover:from-pink-400 hover:to-pink-300 text-white shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95"
                    whileTap={{ scale: 0.97 }}
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: 0.3 }}
                  >
                    <div className="flex items-center justify-center">
                      <Play className="mr-2 h-5 w-5" />
                      Begin Runway Practice
                    </div>
                  </motion.button>
                  
                  <Link href="/question-practice">
                    <motion.button 
                      className="w-full py-4 px-6 text-base font-bold rounded-full bg-gradient-to-r from-pink-500 to-pink-400 hover:from-pink-400 hover:to-pink-300 text-white shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95"
                      whileTap={{ scale: 0.97 }}
                      initial={{ opacity: 0, y: 20 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ delay: 0.4 }}
                    >
                      Begin Interview Practice
                    </motion.button>
                  </Link>
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
                <div className="absolute bottom-4 left-4 bg-white/95 border border-pink-200 rounded-lg p-3 shadow-lg z-20">
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
      
      {/* Pageant Tips Dialog */}
      <Dialog open={showTips} onOpenChange={setShowTips}>
        <DialogContent className={`shadow-xl border transition-colors duration-300 ${
          theme === 'dark' 
            ? 'bg-gray-800 border-gray-600 text-gray-100' 
            : 'bg-white border-pink-200 text-gray-900'
        }`}>
          <DialogHeader>
            <DialogTitle className={`text-2xl flex items-center transition-colors duration-300 ${
              theme === 'dark' ? 'text-pink-400' : 'text-pink-600'
            }`}>
              <Crown className="mr-2 h-5 w-5" /> 
              Pageant Tips
            </DialogTitle>
            <DialogDescription className={`transition-colors duration-300 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Expert advice to help you shine on stage
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className={`p-4 rounded-lg border shadow-sm transition-colors duration-300 ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600' 
                : 'bg-pink-50 border-pink-200'
            }`}>
              <h3 className={`text-lg font-semibold mb-2 transition-colors duration-300 ${
                theme === 'dark' ? 'text-pink-300' : 'text-pink-900'
              }`}>Walking & Posture</h3>
              <ul className={`list-disc pl-5 space-y-1 transition-colors duration-300 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <li>Keep your shoulders back and chest open</li>
                <li>Maintain a straight spine and elongated neck</li>
                <li>Take confident, measured steps with purpose</li>
                <li>Practice your signature walk daily</li>
              </ul>
            </div>
            
            <div className={`p-4 rounded-lg border shadow-sm transition-colors duration-300 ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600' 
                : 'bg-pink-50 border-pink-200'
            }`}>
              <h3 className={`text-lg font-semibold mb-2 transition-colors duration-300 ${
                theme === 'dark' ? 'text-pink-300' : 'text-pink-900'
              }`}>Stage Presence</h3>
              <ul className={`list-disc pl-5 space-y-1 transition-colors duration-300 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <li>Make eye contact with judges and audience</li>
                <li>Smile genuinely and let your personality shine</li>
                <li>Use graceful hand gestures and poses</li>
                <li>Practice your turns and pivots smoothly</li>
              </ul>
            </div>
            
            <div className={`p-4 rounded-lg border shadow-sm transition-colors duration-300 ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600' 
                : 'bg-pink-50 border-pink-200'
            }`}>
              <h3 className={`text-lg font-semibold mb-2 transition-colors duration-300 ${
                theme === 'dark' ? 'text-pink-300' : 'text-pink-900'
              }`}>Competition Prep</h3>
              <ul className={`list-disc pl-5 space-y-1 transition-colors duration-300 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <li>Practice in your competition heels daily</li>
                <li>Record yourself to review and improve</li>
                <li>Work on your interview skills and current events</li>
                <li>Maintain physical fitness and proper nutrition</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => setShowTips(false)}
              className={`text-white transition-colors duration-300 ${
                theme === 'dark' 
                  ? 'bg-pink-700 hover:bg-pink-800' 
                  : 'bg-pink-600 hover:bg-pink-700'
              }`}
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

      {/* Mobile Device Warning Dialog */}
      {user && showMobileWarningDialog && (
        <Dialog open={showMobileWarningDialog} onOpenChange={setShowMobileWarningDialog}>
          <DialogContent className={`bg-gray-950 border text-white max-w-md ${getButtonClasses(buttonTheme, 'outline').split(' ').find(c => c.startsWith('border-')) || 'border-sky-800'}`}>
            <DialogHeader>
              <DialogTitle className={`text-2xl flex items-center ${buttonTheme === 'sky' ? 'text-sky-400' : buttonTheme === 'crimson' ? 'text-red-400' : buttonTheme === 'emerald' ? 'text-emerald-400' : 'text-amber-400'}`}>
                <Smartphone className="mr-3 h-6 w-6" />
                Mobile Device Detected
              </DialogTitle>
              <DialogDescription className="text-gray-400 mt-2">
                For the best experience with CoachT, including optimal pose tracking and interface usability, we recommend using a tablet or laptop/desktop computer.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 text-gray-300">
              <p>
                While CoachT may function on mobile devices, its features are optimized for larger screens. You might experience layout issues or reduced performance on a smaller screen.
              </p>
            </div>
            <DialogFooter className="mt-2">
              <Button
                onClick={() => setShowMobileWarningDialog(false)}
                className={`text-white px-6 py-2 text-base ${getButtonClasses(buttonTheme, 'primary')}`}
              >
                Understood, Continue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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
              

            </svg>
          </div>
        </div>
      )}

      {/* Add Pageant Dialog */}
      <Dialog open={showAddPageantDialog} onOpenChange={setShowAddPageantDialog}>
        <DialogContent className="bg-white border border-pink-200 text-pink-900 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center text-pink-700">
              <Crown className="mr-2 h-5 w-5" />
              Add Upcoming Pageant
            </DialogTitle>
            <DialogDescription className="text-pink-600">
              Keep track of your pageant competitions and deadlines
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-pink-700 block mb-2">
                Pageant Name
              </label>
              <Input
                placeholder="e.g., Miss Universe USA"
                value={pageantForm.name}
                onChange={(e) => setPageantForm({ ...pageantForm, name: e.target.value })}
                className="border-pink-200 focus:border-pink-500"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-pink-700 block mb-2">
                Location
              </label>
              <Input
                placeholder="e.g., Los Angeles, CA"
                value={pageantForm.location}
                onChange={(e) => setPageantForm({ ...pageantForm, location: e.target.value })}
                className="border-pink-200 focus:border-pink-500"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-pink-700 block mb-2">
                Date
              </label>
              <Input
                type="date"
                value={pageantForm.date}
                onChange={(e) => setPageantForm({ ...pageantForm, date: e.target.value })}
                className="border-pink-200 focus:border-pink-500"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-pink-700 block mb-2">
                Special Note (Optional)
              </label>
              <Textarea
                placeholder="e.g., Need to practice evening gown segment"
                value={pageantForm.specialNote}
                onChange={(e) => setPageantForm({ ...pageantForm, specialNote: e.target.value })}
                className="border-pink-200 focus:border-pink-500 min-h-[60px]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => setShowAddPageantDialog(false)}
              variant="outline"
              className="border-pink-200 text-pink-700 hover:bg-pink-50"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (pageantForm.name && pageantForm.location && pageantForm.date) {
                  addPageantMutation.mutate({
                    name: pageantForm.name,
                    location: pageantForm.location,
                    date: pageantForm.date,
                    specialNote: pageantForm.specialNote || undefined
                  });
                }
              }}
              disabled={!pageantForm.name || !pageantForm.location || !pageantForm.date || addPageantMutation.isPending}
              className="bg-pink-500 hover:bg-pink-600 text-white"
            >
              {addPageantMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Pageant'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
        <DialogContent className={`shadow-xl border transition-colors duration-300 ${
          theme === 'dark' 
            ? 'bg-gray-800 border-gray-600 text-gray-100' 
            : 'bg-white border-pink-200 text-gray-900'
        }`}>
          <DialogHeader>
            <DialogTitle className={`text-2xl flex items-center transition-colors duration-300 ${
              theme === 'dark' ? 'text-pink-300' : 'text-pink-700'
            }`}>
              <MessageCircle className="mr-2 h-5 w-5" />
              Send Feedback
            </DialogTitle>
            <DialogDescription className={`transition-colors duration-300 ${
              theme === 'dark' ? 'text-gray-300' : 'text-pink-600'
            }`}>
              Help us improve Runway AI by sharing your thoughts and suggestions
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className={`text-sm font-medium block mb-2 transition-colors duration-300 ${
                theme === 'dark' ? 'text-pink-300' : 'text-pink-700'
              }`}>
                What's your feedback about?
              </label>
              <select className={`w-full p-2 border rounded-md transition-colors duration-300 ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-gray-100' 
                  : 'bg-white border-pink-200 text-gray-900'
              }`}>
                <option value="">Select a topic...</option>
                <option value="features">Feature Request</option>
                <option value="bug">Bug Report</option>
                <option value="pageant">Pageant Content</option>
                <option value="ui">User Interface</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div>
              <label className={`text-sm font-medium block mb-2 transition-colors duration-300 ${
                theme === 'dark' ? 'text-pink-300' : 'text-pink-700'
              }`}>
                Your Message
              </label>
              <Textarea
                placeholder="Share your thoughts, suggestions, or report any issues you've encountered..."
                className={`min-h-[100px] transition-colors duration-300 ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                    : 'bg-white border-pink-200 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => setShowFeedback(false)}
              variant="outline"
              className={`transition-colors duration-300 ${
                theme === 'dark' 
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                  : 'border-pink-200 text-pink-700 hover:bg-pink-50'
              }`}
            >
              Cancel
            </Button>
            <Button 
              className={`text-white transition-colors duration-300 ${
                theme === 'dark' 
                  ? 'bg-pink-700 hover:bg-pink-800' 
                  : 'bg-pink-600 hover:bg-pink-700'
              }`}
            >
              Send Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Dialog */}
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className={`shadow-xl border transition-colors duration-300 ${
          theme === 'dark' 
            ? 'bg-gray-800 border-gray-600 text-gray-100' 
            : 'bg-white border-pink-200 text-gray-900'
        }`}>
          <DialogHeader>
            <DialogTitle className={`text-2xl flex items-center transition-colors duration-300 ${
              theme === 'dark' ? 'text-pink-300' : 'text-pink-700'
            }`}>
              <User className="mr-2 h-5 w-5" />
              Profile Information
            </DialogTitle>
            <DialogDescription className={`transition-colors duration-300 ${
              theme === 'dark' ? 'text-gray-300' : 'text-pink-600'
            }`}>
              View and manage your profile details
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className={`p-4 rounded-lg border transition-colors duration-300 ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600' 
                : 'bg-pink-50 border-pink-200'
            }`}>
              <div className="flex items-center space-x-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-300 ${
                  theme === 'dark' ? 'bg-pink-700' : 'bg-pink-500'
                }`}>
                  <User className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className={`text-lg font-semibold transition-colors duration-300 ${
                    theme === 'dark' ? 'text-pink-300' : 'text-pink-900'
                  }`}>
                    {user?.username || 'User'}
                  </h3>
                  <p className={`text-sm transition-colors duration-300 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {user?.email || 'user@example.com'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className={`p-4 rounded-lg border transition-colors duration-300 ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600' 
                : 'bg-pink-50 border-pink-200'
            }`}>
              <h4 className={`font-medium mb-2 transition-colors duration-300 ${
                theme === 'dark' ? 'text-pink-300' : 'text-pink-900'
              }`}>
                Account Stats
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className={`transition-colors duration-300 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Recordings
                  </p>
                  <p className={`font-semibold transition-colors duration-300 ${
                    theme === 'dark' ? 'text-pink-300' : 'text-pink-800'
                  }`}>
                    {recordings?.length || 0}
                  </p>
                </div>
                <div>
                  <p className={`transition-colors duration-300 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Pageants
                  </p>
                  <p className={`font-semibold transition-colors duration-300 ${
                    theme === 'dark' ? 'text-pink-300' : 'text-pink-800'
                  }`}>
                    {pageants?.length || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => setShowProfile(false)}
              className={`text-white transition-colors duration-300 ${
                theme === 'dark' 
                  ? 'bg-pink-700 hover:bg-pink-800' 
                  : 'bg-pink-600 hover:bg-pink-700'
              }`}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating AI Menu Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Quick Actions Menu */}
        <AnimatePresence>
          {showQuickMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-20 right-0 w-48 mb-2"
            >
              <div className={`backdrop-blur-md rounded-2xl p-2 shadow-2xl border transition-colors duration-300 ${
                theme === 'dark' 
                  ? 'bg-gray-800/90 border-gray-600' 
                  : 'bg-white/90 border-pink-200'
              }`}>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setShowTips(true);
                      setShowQuickMenu(false);
                    }}
                    className={`w-full p-3 rounded-xl transition-colors flex items-center text-left ${
                      theme === 'dark' 
                        ? 'text-pink-300 hover:bg-gray-700/40' 
                        : 'text-pink-600 hover:bg-pink-50'
                    }`}
                  >
                    <Info className="h-4 w-4 mr-3" />
                    Pageant Tips
                  </button>
                  <button
                    onClick={() => {
                      setShowProfile(true);
                      setShowQuickMenu(false);
                    }}
                    className={`w-full p-3 rounded-xl transition-colors flex items-center text-left ${
                      theme === 'dark' 
                        ? 'text-pink-300 hover:bg-gray-700/40' 
                        : 'text-pink-600 hover:bg-pink-50'
                    }`}
                  >
                    <User className="h-4 w-4 mr-3" />
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      setShowArshiaClone(true);
                      setShowQuickMenu(false);
                    }}
                    className={`w-full p-3 rounded-xl transition-colors flex items-center text-left ${
                      theme === 'dark' 
                        ? 'text-pink-300 hover:bg-gray-700/40' 
                        : 'text-pink-600 hover:bg-pink-50'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mr-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-white/90"></div>
                    </div>
                    Arshia Clone
                  </button>
                  <button
                    onClick={() => {
                      const subject = "Runway AI - User Feedback";
                      const body = `Hi Arshia and Team,

I'd like to share some feedback about Runway AI:

[Please add your feedback here]

Best regards,
${user?.username || 'User'}`;
                      
                      const mailtoLink = `mailto:arshia.x.kathpalia@gmail.com,okandy@uw.edu?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                      window.location.href = mailtoLink;
                      setShowQuickMenu(false);
                    }}
                    className={`w-full p-3 rounded-xl transition-colors flex items-center text-left ${
                      theme === 'dark' 
                        ? 'text-pink-300 hover:bg-gray-700/40' 
                        : 'text-pink-600 hover:bg-pink-50'
                    }`}
                  >
                    <MessageCircle className="h-4 w-4 mr-3" />
                    Feedback
                  </button>
                  <div className={`border-t my-1 ${theme === 'dark' ? 'border-gray-600' : 'border-pink-200'}`}></div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setShowQuickMenu(false);
                    }}
                    className={`w-full p-3 rounded-xl transition-colors flex items-center text-left ${
                      theme === 'dark' 
                        ? 'text-pink-300 hover:bg-gray-700/40' 
                        : 'text-pink-600 hover:bg-pink-50'
                    }`}
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    Logout
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main floating button */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1, duration: 0.5, type: "spring" }}
        >
          <motion.button
            onClick={() => setShowQuickMenu(!showQuickMenu)}
            className={`w-16 h-16 rounded-full shadow-2xl backdrop-blur-md border-2 overflow-hidden relative transition-all duration-300 ${
              theme === 'dark' 
                ? 'bg-gradient-to-br from-pink-500/20 to-purple-600/20 border-pink-400/30' 
                : 'bg-gradient-to-br from-pink-500/80 to-purple-600/80 border-pink-300/50'
            }`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            animate={{
              boxShadow: [
                "0 0 20px rgba(236, 72, 153, 0.4)",
                "0 0 30px rgba(147, 51, 234, 0.6)",
                "0 0 20px rgba(236, 72, 153, 0.4)"
              ]
            }}
            transition={{
              boxShadow: {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }
            }}
          >
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-pink-400 via-purple-500 to-pink-600 animate-pulse opacity-80"></div>
            
            {/* Rotating ring */}
            <motion.div
              className="absolute inset-1 rounded-full border-2 border-white/30"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />
            
            {/* Inner pulsing dot */}
            <motion.div
              className="absolute inset-4 rounded-full bg-white/90 flex items-center justify-center"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.8, 1, 0.8]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="w-3 h-3 rounded-full bg-gradient-to-br from-pink-500 to-purple-600"></div>
            </motion.div>
            
            {/* Sparkle effects */}
            <motion.div
              className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white/80"
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0]
              }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            />
            <motion.div
              className="absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full bg-white/60"
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0]
              }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
            />
          </motion.button>
        </motion.div>
      </div>

      {/* Arshia Clone Chatbot Dialog */}
      <Dialog open={showArshiaClone} onOpenChange={setShowArshiaClone}>
        <DialogContent className={`shadow-xl border transition-colors duration-300 max-w-md ${
          theme === 'dark' 
            ? 'bg-gray-800 border-gray-600 text-gray-100' 
            : 'bg-white border-pink-200 text-gray-900'
        }`}>
          <DialogHeader>
            <DialogTitle className={`text-2xl flex items-center transition-colors duration-300 ${
              theme === 'dark' ? 'text-pink-300' : 'text-pink-700'
            }`}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mr-3">
                <div className="w-3 h-3 rounded-full bg-white/90"></div>
              </div>
              Arshia Clone
            </DialogTitle>
            <DialogDescription className={`transition-colors duration-300 ${
              theme === 'dark' ? 'text-gray-300' : 'text-pink-600'
            }`}>
              Your AI pageant coach powered by Arshia's expertise
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className={`p-4 rounded-lg border transition-colors duration-300 ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600' 
                : 'bg-pink-50 border-pink-200'
            }`}>
              <p className={`text-sm transition-colors duration-300 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                👋 Hi! I'm Arshia Clone, your AI pageant coach. I can help you with:
              </p>
              <ul className={`mt-2 space-y-1 text-sm transition-colors duration-300 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                <li>• Runway walking techniques</li>
                <li>• Interview preparation</li>
                <li>• Pageant tips and strategies</li>
                <li>• Confidence building</li>
              </ul>
            </div>
            
            <div className={`p-3 rounded-lg border transition-colors duration-300 ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600' 
                : 'bg-pink-50 border-pink-200'
            }`}>
              <p className={`text-xs text-center transition-colors duration-300 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                💡 Chat feature coming soon! For now, use the feedback button to reach out directly.
              </p>
            </div>
            
            {/* Presented by Credit */}
            <div className={`pt-3 border-t transition-colors duration-300 ${
              theme === 'dark' ? 'border-gray-600' : 'border-pink-200'
            }`}>
              <p className={`text-center text-xs font-medium transition-colors duration-300 ${
                theme === 'dark' ? 'text-pink-400' : 'text-pink-500'
              }`}>PRESENTED BY</p>
              <p className={`text-center text-sm font-bold transition-colors duration-300 ${
                theme === 'dark' ? 'text-pink-300' : 'text-pink-600'
              }`}>Arshia Kathpalia</p>
              <p className={`text-center text-xs transition-colors duration-300 ${
                theme === 'dark' ? 'text-pink-400' : 'text-pink-500'
              }`}>Miss Teen India USA 2024</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => setShowArshiaClone(false)}
              className={`text-white transition-colors duration-300 ${
                theme === 'dark' 
                  ? 'bg-pink-700 hover:bg-pink-800' 
                  : 'bg-pink-600 hover:bg-pink-700'
              }`}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}