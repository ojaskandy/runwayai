import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ChevronLeft, 
  User, 
  Edit2, 
  Save, 
  Award, 
  Clock, 
  Calendar,
  BarChart,
  Activity,
  Camera,
  X,
  ImagePlus,
  Trash2
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { motion } from 'framer-motion';
import BeltDisplay from '@/components/BeltDisplay';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// Default mock data to use while API data is loading
const defaultUserStats = {
  totalSessions: 0,
  totalHours: 0,
  averageSessionLength: 0,
  longestStreak: 0,
  currentStreak: 0,
  lastSession: null,
  createdAt: new Date().toISOString(),
  activityData: [],
  beltHistory: [
    { belt: "white", achievedAt: new Date().toISOString() }
  ],
  galleryImages: []
};

// Define types for the API response
interface BeltHistoryEvent {
  belt: string;
  achievedAt: string;
}

interface UserStats {
  totalSessions: number;
  totalHours: number;
  averageSessionLength: number;
  longestStreak: number;
  currentStreak: number;
  lastSession: string | null;
  createdAt: string;
  activityData: Array<{ date: Date; level: number; minutes: number }>;
  beltHistory: BeltHistoryEvent[];
  galleryImages?: string[];
}

// Group contribution data by week
const groupContributionsByWeek = (contributionData: Array<{ date: Date; level: number; minutes: number }>, viewType: string = 'year') => {
  // Sort the data by date
  const sortedData = [...contributionData].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Filter data based on view type
  const now = new Date();
  let filteredData = sortedData;
  
  if (viewType === 'week') {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);
    filteredData = sortedData.filter(item => new Date(item.date) >= oneWeekAgo);
  } else if (viewType === 'month') {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(now.getMonth() - 1);
    filteredData = sortedData.filter(item => new Date(item.date) >= oneMonthAgo);
  } else {
    // Year view - last 12 months
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);
    filteredData = sortedData.filter(item => new Date(item.date) >= oneYearAgo);
  }
  
  // Create a grid of weeks/days
  const weeks = [];
  
  // For week view, show days horizontally
  if (viewType === 'week') {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date();
      day.setDate(day.getDate() - 6 + i);
      day.setHours(0, 0, 0, 0);
      
      const matchingData = filteredData.find(item => {
        const itemDate = new Date(item.date);
        itemDate.setHours(0, 0, 0, 0);
        return itemDate.getTime() === day.getTime();
      });
      
      days.push(matchingData || { date: day, level: 0, minutes: 0 });
    }
    weeks.push(days);
  } else {
    // For month and year views
    const startDate = viewType === 'month' 
      ? new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()) 
      : new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    
    const daysToShow = viewType === 'month' ? 31 : 365;
    const rowsPerWeek = 7;
    
    // Create a map of dates to activity data
    const dateMap = new Map();
    filteredData.forEach(item => {
      const date = new Date(item.date);
      date.setHours(0, 0, 0, 0);
      dateMap.set(date.getTime(), item);
    });
    
    // Fill in the grid
    const totalDays = Math.min(daysToShow, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const totalWeeks = Math.ceil(totalDays / rowsPerWeek);
    
    for (let i = 0; i < totalWeeks; i++) {
      const week = [];
      
      for (let j = 0; j < rowsPerWeek; j++) {
        const dayOffset = i * rowsPerWeek + j;
        if (dayOffset < totalDays) {
          const day = new Date(now);
          day.setDate(now.getDate() - totalDays + dayOffset);
          day.setHours(0, 0, 0, 0);
          
          const existingData = dateMap.get(day.getTime());
          week.push(existingData || { date: day, level: 0, minutes: 0 });
        } else {
          week.push(null);
        }
      }
      
      weeks.push(week);
    }
  }
  
  return weeks;
};

// Get appropriate month labels based on view type
const getMonthLabels = (viewType: string) => {
  const now = new Date();
  
  if (viewType === 'week') {
    // For week view, return day names
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  } else if (viewType === 'month') {
    // For month view, return dates or weeks
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);
    
    const week1 = new Date(oneMonthAgo);
    const week2 = new Date(oneMonthAgo);
    week2.setDate(week2.getDate() + 7);
    const week3 = new Date(oneMonthAgo);
    week3.setDate(week3.getDate() + 14);
    const week4 = new Date(oneMonthAgo);
    week4.setDate(week4.getDate() + 21);
    
    return [
      `${week1.getMonth() + 1}/${week1.getDate()}`,
      `${week2.getMonth() + 1}/${week2.getDate()}`,
      `${week3.getMonth() + 1}/${week3.getDate()}`,
      `${week4.getMonth() + 1}/${week4.getDate()}`,
      `${now.getMonth() + 1}/${now.getDate()}`
    ];
  } else {
    // For year view, return month names
    const months = [];
    const currentMonth = now.getMonth();
    
    for (let i = 0; i < 12; i++) {
      const month = (currentMonth - 11 + i + 12) % 12;
      months.push(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month]);
    }
    
    return months;
  }
};

const belts = [
  { value: 'white', label: 'White Belt', level: 1 },
  { value: 'yellow', label: 'Yellow Belt', level: 1 },
  { value: 'yellow', label: 'Yellow Belt', level: 2 },
  { value: 'green', label: 'Green Belt', level: 1 },
  { value: 'green', label: 'Green Belt', level: 2 },
  { value: 'blue', label: 'Blue Belt', level: 1 },
  { value: 'blue', label: 'Blue Belt', level: 2 },
  { value: 'red', label: 'Red Belt', level: 1 },
  { value: 'red', label: 'Red Belt', level: 2 },
  { value: 'black', label: 'Black Belt', level: 1 },
];

export default function Profile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [beltColor, setBeltColor] = useState('white');
  const [beltName, setBeltName] = useState('White Belt');
  const [beltLevel, setBeltLevel] = useState(1);
  const [activityView, setActivityView] = useState('year');
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Fetch user stats from API
  const { data: stats = defaultUserStats, isLoading } = useQuery({
    queryKey: ['userStats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/user-stats');
      if (response instanceof Response) {
        const data = await response.json();
        // Convert activity data date strings to Date objects
        if (data.activityData) {
          data.activityData = data.activityData.map((item: any) => ({
            ...item,
            date: new Date(item.date)
          }));
        }
        return data;
      }
      return response;
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      const response = await apiRequest('POST', '/api/gallery', { imageUrl });
      if (response instanceof Response) {
        return await response.json();
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      const response = await apiRequest('DELETE', '/api/gallery', { imageUrl });
      if (response instanceof Response) {
        return await response.json();
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
    },
  });
  
  // Group contributions by week
  const weeks = groupContributionsByWeek(Array.isArray(stats.activityData) ? stats.activityData : [], activityView);
  const months = getMonthLabels(activityView);
  
  // Handle username edit submission
  const handleUsernameSubmit = () => {
    // In a real app, you would update the username here
    console.log('Username updated to:', username);
    setIsEditingUsername(false);
  };
  
  // Handle belt change
  const handleBeltChange = (value: string) => {
    const [color, level] = value.split('-');
    const matchingBelt = belts.find(belt => belt.value === color && belt.level === parseInt(level));
    setBeltColor(color);
    setBeltLevel(parseInt(level));
    setBeltName(matchingBelt?.label || '');
    
    // Save belt information to localStorage
    const beltInfo = {
      color,
      name: matchingBelt?.label || '',
      level: parseInt(level)
    };
    localStorage.setItem('userBelt', JSON.stringify(beltInfo));
  };
  
  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  
  // Get CSS class for activity level
  const getActivityLevelClass = (level: number) => {
    switch (level) {
      case 0: return 'bg-gray-800';
      case 1: return 'bg-red-900';
      case 2: return 'bg-red-700';
      case 3: return 'bg-red-600';
      case 4: return 'bg-red-500';
      default: return 'bg-gray-800';
    }
  };
  
  // Handle photo selection for upload
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    
    // Limit to 10 photos max (including existing ones)
    const existingCount = stats.galleryImages?.length || 0;
    const allowedNewCount = Math.max(0, 10 - existingCount);
    const filesToAdd = validFiles.slice(0, allowedNewCount);
    
    setSelectedImages(prev => [...prev, ...filesToAdd]);
    
    // Generate preview URLs
    filesToAdd.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          setPreviewUrls(prev => [...prev, e.target?.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove a photo from selection
  const handleRemovePhoto = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Upload all selected photos
  const handleUploadPhotos = async () => {
    if (!selectedImages.length) return;
    
    setIsUploading(true);
    
    try {
      // Process each image
      for (let i = 0; i < previewUrls.length; i++) {
        await uploadPhotoMutation.mutateAsync(previewUrls[i]);
      }
      
      // Clear selections after successful uploads
      setSelectedImages([]);
      setPreviewUrls([]);
      setIsCustomizeModalOpen(false);
    } catch (error) {
      console.error("Error uploading images:", error);
    } finally {
      setIsUploading(false);
    }
  };

  // Delete a photo from gallery
  const handleDeletePhoto = async (imageUrl: string) => {
    try {
      await deletePhotoMutation.mutateAsync(imageUrl);
    } catch (error) {
      console.error("Error deleting image:", error);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-red-950/30">
      <main className="container mx-auto px-4 py-8">
        {/* Back button */}
        <Link href="/">
          <Button variant="ghost" className="mb-8 -ml-2 text-white">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Home
          </Button>
        </Link>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Left column for photos */}
            <div className="hidden md:block">
              <div className="grid grid-cols-1 gap-4">
                {stats.galleryImages?.slice(0, Math.ceil((stats.galleryImages.length || 0) / 2))
                  .map((image: string, index: number) => (
                    <motion.div
                      key={`left-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="relative group rounded-lg overflow-hidden border-2 border-red-900/30 shadow-lg h-40"
                    >
                      <img
                        src={image}
                        alt={`Training photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDeletePhoto(image)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
              </div>
            </div>
            
            {/* Main content */}
            <div className="md:col-span-2">
              {/* User Profile Header */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center justify-center mb-12 text-center"
              >
                {/* Profile picture */}
                <div className="h-32 w-32 rounded-full bg-gradient-to-br from-red-700 to-red-900 flex items-center justify-center mb-6 border-4 border-red-600/30 shadow-lg shadow-red-900/20">
                  <User className="h-16 w-16 text-white" />
                </div>
                
                {/* Username */}
                <div className="mb-6">
                  {isEditingUsername ? (
                    <div className="flex items-center">
                      <Input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="bg-red-950/30 border-red-900/50 text-white text-center"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleUsernameSubmit}
                        className="text-white hover:bg-red-900/20"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <h1 className="text-3xl font-bold text-white mr-2">{username}</h1>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsEditingUsername(true)}
                        className="text-white hover:bg-red-900/20"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                
                {/* Stretched belt with username engraved */}
                <div className="w-full max-w-3xl">
                  <BeltDisplay 
                    beltColor={beltColor}
                    beltName={beltName}
                    beltLevel={beltLevel}
                    showLevel={true}
                    stretched={true}
                    username={username}
                  />
                </div>
                
                {/* Belt selector and Customize Profile Button */}
                <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Current belt:</span>
                    <Select
                      value={`${beltColor}-${beltLevel}`}
                      onValueChange={handleBeltChange}
                    >
                      <SelectTrigger className="w-40 bg-red-950/30 border-red-900/50">
                        <SelectValue placeholder="Select Belt" />
                      </SelectTrigger>
                      <SelectContent className="bg-black border border-red-900/50">
                        {belts.map((belt) => (
                          <SelectItem 
                            key={`${belt.value}-${belt.level}`} 
                            value={`${belt.value}-${belt.level}`}
                            className="text-white hover:bg-red-900/20"
                          >
                            {belt.label} {belt.level > 1 ? `(Level ${belt.level})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button
                    onClick={() => setIsCustomizeModalOpen(true)}
                    variant="outline"
                    className="bg-red-950/30 border-red-900/50 text-white hover:bg-red-900/40"
                  >
                    <ImagePlus className="h-4 w-4 mr-2" />
                    Customize Profile
                  </Button>
                </div>
              </motion.div>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatCard
                  icon={<Clock className="h-5 w-5 text-red-400" />}
                  title="Training Time"
                  value={`${stats.totalHours} hours`}
                  description="Total time spent training"
                />
                
                <StatCard
                  icon={<Calendar className="h-5 w-5 text-red-400" />}
                  title="Sessions"
                  value={stats.totalSessions.toString()}
                  description={`Avg. ${stats.averageSessionLength} mins per session`}
                />
                
                <StatCard
                  icon={<Activity className="h-5 w-5 text-red-400" />}
                  title="Current Streak"
                  value={`${stats.currentStreak} days`}
                  description={`Longest: ${stats.longestStreak} days`}
                />
                
                <StatCard
                  icon={<Award className="h-5 w-5 text-red-400" />}
                  title="Member Since"
                  value={formatDate(stats.createdAt)}
                  description={`${Math.floor((Date.now() - new Date(stats.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30))} months`}
                />
              </div>
              
              {/* Training activity contribution chart */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mb-10"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <BarChart className="h-5 w-5 text-red-500 mr-2" />
                    <h2 className="text-xl font-bold text-white">Training Activity</h2>
                  </div>
                  
                  <Tabs defaultValue="year" value={activityView} onValueChange={setActivityView} className="w-[300px]">
                    <TabsList className="bg-red-950/30">
                      <TabsTrigger value="week" className="data-[state=active]:bg-red-800">Week</TabsTrigger>
                      <TabsTrigger value="month" className="data-[state=active]:bg-red-800">Month</TabsTrigger>
                      <TabsTrigger value="year" className="data-[state=active]:bg-red-800">Year</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                
                <div className="bg-gradient-to-b from-gray-900 to-black rounded-xl border border-red-900/30 p-6 shadow-lg overflow-x-auto">
                  <div className="min-w-[720px] max-w-full">
                    {/* Month/Week labels */}
                    <div className="flex mb-2 pl-10">
                      {months.map((month, index) => (
                        <div key={index} className="flex-1 text-center text-xs text-gray-400">
                          {month}
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex">
                      {/* Day labels */}
                      <div className="flex flex-col pr-2 text-xs text-gray-400">
                        {activityView === 'week' ? (
                          <div className="h-5 mt-1">Activity</div>
                        ) : (
                          <>
                            <div className="h-5 mt-1">Mon</div>
                            <div className="h-5 mt-1">Wed</div>
                            <div className="h-5 mt-1"></div>
                            <div className="h-5 mt-1">Fri</div>
                            <div className="h-5 mt-1"></div>
                          </>
                        )}
                      </div>
                      
                      {/* Contribution grid */}
                      <div className="flex-1 flex">
                        {weeks.map((week, weekIndex) => (
                          <div key={weekIndex} className={`flex-1 flex ${activityView === 'week' ? 'flex-row' : 'flex-col'} mr-1`}>
                            {week.map((day, dayIndex) => (
                              <div 
                                key={dayIndex} 
                                className={`${activityView === 'week' ? 'h-10 w-full flex items-center justify-center flex-col' : 'h-5 w-5'} rounded-sm m-px ${day ? getActivityLevelClass(day.level) : 'bg-gray-800/30'}`}
                                title={day ? `${day.date.toLocaleDateString()}: ${day.minutes} minutes` : 'No training'}
                              >
                                {activityView === 'week' && day && (
                                  <>
                                    <div className="text-xs text-white">{day.minutes}m</div>
                                    <div className="text-[10px] text-gray-400">{day.date.toLocaleDateString('en-US', {weekday: 'short'})}</div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Legend */}
                  <div className="flex items-center justify-end mt-4 space-x-2 text-sm">
                    <span className="text-gray-400">Less</span>
                    <div className="h-4 w-4 rounded-sm bg-gray-800"></div>
                    <div className="h-4 w-4 rounded-sm bg-red-900"></div>
                    <div className="h-4 w-4 rounded-sm bg-red-700"></div>
                    <div className="h-4 w-4 rounded-sm bg-red-600"></div>
                    <div className="h-4 w-4 rounded-sm bg-red-500"></div>
                    <span className="text-gray-400">More</span>
                  </div>
                </div>
              </motion.div>
              
              {/* Belt progression history */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <div className="flex items-center mb-6">
                  <Award className="h-5 w-5 text-red-500 mr-2" />
                  <h2 className="text-xl font-bold text-white">Belt Progression</h2>
                </div>
                
                <div className="bg-gradient-to-b from-gray-900 to-black rounded-xl border border-red-900/30 p-6 shadow-lg">
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute top-0 bottom-0 left-[15px] w-0.5 bg-red-900/70"></div>
                    
                    {/* Belt progression events */}
                    {stats.beltHistory.map((event: BeltHistoryEvent, index: number) => (
                      <div key={index} className="relative pl-10 pb-8">
                        {/* Timeline node */}
                        <div className={`absolute left-0 top-1 w-8 h-8 flex items-center justify-center rounded-full bg-${event.belt}-600 ${event.belt === 'black' ? 'border-2 border-white/70' : ''} shadow-md`}>
                          <Award className="h-4 w-4 text-white" />
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-medium text-white">
                            {event.belt.charAt(0).toUpperCase() + event.belt.slice(1)} Belt
                          </h3>
                          <p className="text-gray-400">
                            Achieved on {formatDate(event.achievedAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
            
            {/* Right column for photos */}
            <div className="hidden md:block">
              <div className="grid grid-cols-1 gap-4">
                {stats.galleryImages?.slice(Math.ceil((stats.galleryImages?.length || 0) / 2))
                  .map((image: string, index: number) => (
                    <motion.div
                      key={`right-${index}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="relative group rounded-lg overflow-hidden border-2 border-red-900/30 shadow-lg h-40"
                    >
                      <img
                        src={image}
                        alt={`Training photo ${index + Math.ceil((stats.galleryImages?.length || 0) / 2) + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDeletePhoto(image)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
              </div>
            </div>
            
            {/* Mobile gallery view - only shown on small screens */}
            <div className="md:hidden mt-8">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <ImagePlus className="mr-2 h-5 w-5 text-red-500" />
                Photo Gallery
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {stats.galleryImages?.map((image: string, index: number) => (
                  <motion.div
                    key={`mobile-${index}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="relative group rounded-lg overflow-hidden border-2 border-red-900/30 shadow-lg aspect-square"
                  >
                    <img
                      src={image}
                      alt={`Training photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDeletePhoto(image)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
                
                {(!stats.galleryImages || stats.galleryImages.length === 0) && (
                  <div className="col-span-full text-center py-10 bg-red-950/10 rounded-lg border border-red-900/30">
                    <ImagePlus className="h-10 w-10 text-red-500/50 mx-auto mb-2" />
                    <p className="text-gray-400">No photos added yet</p>
                    <Button
                      onClick={() => setIsCustomizeModalOpen(true)}
                      variant="outline"
                      size="sm"
                      className="mt-4 bg-red-950/30 border-red-900/50 text-white hover:bg-red-900/40"
                    >
                      <ImagePlus className="h-4 w-4 mr-2" />
                      Add Photos
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Customize Profile Dialog */}
      <Dialog open={isCustomizeModalOpen} onOpenChange={setIsCustomizeModalOpen}>
        <DialogContent className="bg-black border border-red-900/50 text-white sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center">
              <ImagePlus className="mr-2 h-5 w-5 text-red-500" />
              Customize Profile
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Upload photos to display in your profile gallery (maximum 10 photos)
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 space-y-4">
            {/* Current gallery summary */}
            <div className="flex items-center justify-between px-4 py-2 bg-red-950/20 rounded-lg border border-red-900/30">
              <span className="text-sm text-gray-300">
                {stats.galleryImages?.length || 0} of 10 photos used
              </span>
              <span className="text-xs text-gray-400">
                {10 - (stats.galleryImages?.length || 0)} slots available
              </span>
            </div>
            
            {/* Upload area */}
            {(stats.galleryImages?.length || 0) < 10 && (
              <div className="border-2 border-dashed border-red-900/40 rounded-lg p-4 flex flex-col items-center">
                <Camera className="h-10 w-10 text-red-500/70 mb-2" />
                <p className="text-sm text-gray-300 mb-4">Upload your photos</p>
                
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  className="bg-red-950/20 border-red-900/40 text-white"
                  onChange={handlePhotoSelect}
                  disabled={isUploading}
                />
              </div>
            )}
            
            {/* Preview area */}
            {previewUrls.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Preview:</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-md border border-red-900/40"
                      />
                      <button
                        className="absolute top-1 right-1 p-1 bg-black/70 rounded-full hover:bg-red-900/80"
                        onClick={() => handleRemovePhoto(index)}
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Current gallery */}
            {(stats.galleryImages?.length || 0) > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Current Photos:</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-2">
                  {stats.galleryImages?.map((image: string, index: number) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`Gallery image ${index + 1}`}
                        className="w-full h-24 object-cover rounded-md border border-red-900/40"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleDeletePhoto(image)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between">
            <Button
              variant="ghost"
              className="text-gray-400 hover:text-white hover:bg-red-950/30"
              onClick={() => {
                setSelectedImages([]);
                setPreviewUrls([]);
                setIsCustomizeModalOpen(false);
              }}
            >
              Cancel
            </Button>
            
            <Button
              className="bg-red-700 hover:bg-red-800 text-white"
              onClick={handleUploadPhotos}
              disabled={previewUrls.length === 0 || isUploading}
            >
              {isUploading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white/50 border-t-white rounded-full mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  Upload Photos
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper component for stat cards
function StatCard({ icon, title, value, description }: { 
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <Card className="bg-red-950/20 border-red-900/30">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          {icon}
          <CardTitle className="text-xl">{value}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-gray-400">{title}</CardDescription>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </CardContent>
    </Card>
  );
} 