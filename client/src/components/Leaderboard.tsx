import { useState, useEffect } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trophy, Clock, Calendar, Medal, Crown } from 'lucide-react';
import { motion } from 'framer-motion';

// Mock data - to be replaced with real API calls
const mockConsistencyData = [
  { id: 1, username: 'taekwondo_master', streak: 42, belt: 'black' },
  { id: 2, username: 'kick_champion', streak: 38, belt: 'black' },
  { id: 3, username: 'ojaskandy', streak: 30, belt: 'red' },
  { id: 4, username: 'martial_artist', streak: 25, belt: 'blue' },
  { id: 5, username: 'tkd_beginner', streak: 20, belt: 'green' },
];

const mockTimeSpentData = [
  { id: 2, username: 'kick_champion', timeSpent: 12800, belt: 'black' },
  { id: 1, username: 'taekwondo_master', timeSpent: 11500, belt: 'black' },
  { id: 3, username: 'ojaskandy', timeSpent: 8900, belt: 'red' },
  { id: 5, username: 'tkd_beginner', timeSpent: 5200, belt: 'green' },
  { id: 4, username: 'martial_artist', timeSpent: 4300, belt: 'blue' },
];

const formatTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  
  return `${mins}m`;
};

type LeaderboardProps = {
  currentUsername?: string;
};

export default function Leaderboard({ currentUsername }: LeaderboardProps) {
  const [activeTab, setActiveTab] = useState('consistency');
  const [animateRows, setAnimateRows] = useState(false);
  
  useEffect(() => {
    // Add entrance animation
    setAnimateRows(true);
    
    // Reset animation when tab changes for re-entrance effect
    return () => setAnimateRows(false);
  }, [activeTab]);
  
  // Calculate ranking badges
  const getBadge = (index: number) => {
    switch (index) {
      case 0:
        return (
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 500 }}
            className="absolute -left-3 -top-3 bg-yellow-500 rounded-full h-7 w-7 flex items-center justify-center shadow-lg"
          >
            <Crown className="h-4 w-4 text-black" />
          </motion.div>
        );
      case 1:
        return (
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 400 }}
            className="absolute -left-3 -top-3 bg-gray-300 rounded-full h-6 w-6 flex items-center justify-center shadow-md"
          >
            <Medal className="h-3 w-3 text-gray-800" />
          </motion.div>
        );
      case 2:
        return (
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
            className="absolute -left-3 -top-3 bg-amber-700 rounded-full h-5 w-5 flex items-center justify-center shadow-sm"
          >
            <Medal className="h-3 w-3 text-amber-200" />
          </motion.div>
        );
      default:
        return null;
    }
  };
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };
  
  const rowVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", stiffness: 100 }
    }
  };
  
  return (
    <div className="w-full">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-center mb-6 space-x-2"
      >
        <Trophy className="h-6 w-6 text-yellow-500" />
        <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
        <Trophy className="h-6 w-6 text-yellow-500" />
      </motion.div>
      
      <Tabs defaultValue="consistency" onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 h-14 bg-gradient-to-r from-gray-900 to-gray-800 border border-red-900/30 rounded-lg overflow-hidden">
          <TabsTrigger 
            value="consistency" 
            className="h-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-700 data-[state=active]:to-red-600 data-[state=active]:text-white rounded-none"
          >
            <div className="flex flex-col items-center">
              <Calendar className="h-5 w-5 mb-1" />
              <span className="font-medium">Consistency</span>
            </div>
          </TabsTrigger>
          
          <TabsTrigger 
            value="time-spent" 
            className="h-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-700 data-[state=active]:to-red-600 data-[state=active]:text-white rounded-none"
          >
            <div className="flex flex-col items-center">
              <Clock className="h-5 w-5 mb-1" />
              <span className="font-medium">Time Spent</span>
            </div>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="consistency" className="mt-0">
          <div className="bg-gradient-to-b from-gray-900 to-black rounded-xl border border-red-900/30 p-5 shadow-lg">
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className="grid grid-cols-3 gap-6 font-medium text-gray-400 mb-4 text-sm px-4"
            >
              <div>Rank</div>
              <div>User</div>
              <div className="text-right">Streak</div>
            </motion.div>
            
            <motion.div 
              initial="hidden"
              animate={animateRows ? "visible" : "hidden"}
              variants={containerVariants}
              className="space-y-4"
            >
              {mockConsistencyData.map((user, index) => (
                <motion.div 
                  key={user.id}
                  variants={rowVariants}
                  className={`relative flex items-center bg-gradient-to-r ${
                    user.username === currentUsername 
                      ? 'from-red-900/40 to-red-800/20 border-red-500/50' 
                      : 'from-gray-800/40 to-transparent hover:from-gray-800/60'
                  } rounded-lg p-4 border border-gray-800/70 shadow-md cursor-pointer transition-all hover:transform hover:-translate-y-1 hover:shadow-lg hover:shadow-red-900/5`}
                >
                  {getBadge(index)}
                  
                  <div className="grid grid-cols-3 gap-6 w-full items-center">
                    <div className="flex items-center justify-center">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-lg font-bold ${
                        index < 3 ? 'bg-gradient-to-r from-yellow-500 to-amber-400 text-black' : 'bg-gray-800 text-gray-200'
                      }`}>
                        {index + 1}
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className={`h-3 w-3 rounded-full mr-2 bg-${user.belt}-600 ${user.belt === 'black' ? 'border border-white/50' : ''}`}></div>
                      <span className={`font-semibold ${user.username === currentUsername ? 'text-white' : 'text-gray-200'}`}>
                        {user.username}
                      </span>
                    </div>
                    
                    <div className="text-right font-bold text-lg">
                      <span className={user.username === currentUsername ? 'text-red-500' : 'text-white'}>
                        {user.streak}
                      </span>
                      <span className="text-xs font-normal text-gray-400 ml-1">days</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-6 pt-4 border-t border-red-900/20 text-center"
            >
              <p className="text-sm text-gray-400">
                Keep your streak going! <span className="text-red-500 font-medium">Log in daily</span> to climb the ranks.
              </p>
            </motion.div>
          </div>
        </TabsContent>
        
        <TabsContent value="time-spent" className="mt-0">
          <div className="bg-gradient-to-b from-gray-900 to-black rounded-xl border border-red-900/30 p-5 shadow-lg">
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className="grid grid-cols-3 gap-6 font-medium text-gray-400 mb-4 text-sm px-4"
            >
              <div>Rank</div>
              <div>User</div>
              <div className="text-right">Time</div>
            </motion.div>
            
            <motion.div 
              initial="hidden"
              animate={animateRows ? "visible" : "hidden"}
              variants={containerVariants}
              className="space-y-4"
            >
              {mockTimeSpentData.map((user, index) => (
                <motion.div 
                  key={user.id}
                  variants={rowVariants}
                  className={`relative flex items-center bg-gradient-to-r ${
                    user.username === currentUsername 
                      ? 'from-red-900/40 to-red-800/20 border-red-500/50' 
                      : 'from-gray-800/40 to-transparent hover:from-gray-800/60'
                  } rounded-lg p-4 border border-gray-800/70 shadow-md cursor-pointer transition-all hover:transform hover:-translate-y-1 hover:shadow-lg hover:shadow-red-900/5`}
                >
                  {getBadge(index)}
                  
                  <div className="grid grid-cols-3 gap-6 w-full items-center">
                    <div className="flex items-center justify-center">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-lg font-bold ${
                        index < 3 ? 'bg-gradient-to-r from-yellow-500 to-amber-400 text-black' : 'bg-gray-800 text-gray-200'
                      }`}>
                        {index + 1}
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className={`h-3 w-3 rounded-full mr-2 bg-${user.belt}-600 ${user.belt === 'black' ? 'border border-white/50' : ''}`}></div>
                      <span className={`font-semibold ${user.username === currentUsername ? 'text-white' : 'text-gray-200'}`}>
                        {user.username}
                      </span>
                    </div>
                    
                    <div className="text-right">
                      <span className={`font-bold text-lg ${user.username === currentUsername ? 'text-red-500' : 'text-white'}`}>
                        {formatTime(Math.floor(user.timeSpent / 60))}
                      </span>
                      <span className="block text-xs font-normal text-gray-400">total time</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-6 pt-4 border-t border-red-900/20 text-center"
            >
              <p className="text-sm text-gray-400">
                Practice makes perfect! <span className="text-red-500 font-medium">More training time</span> means better skills.
              </p>
            </motion.div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 