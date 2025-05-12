import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import UserProfileCard from '@/components/UserProfileCard';
import { Loader2 } from 'lucide-react';
import { useTheme } from '../hooks/use-theme';

export default function Landing() {
  const [scrollY, setScrollY] = useState(0);
  const [routineNotes, setRoutineNotes] = useState('');
  const { user, isLoading, logoutMutation } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [, navigate] = useLocation();
  
  // Add scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
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

  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        // Navigate to auth page after logout
        navigate('/auth');
      }
    });
  };

  // Auto-redirect to home page if user is logged in
  useEffect(() => {
    // Wait for loading to complete
    if (!isLoading && user) {
      // If user is already logged in, show user profile
      // Note: We now show profile in place instead of redirecting
    }
  }, [user, isLoading, navigate]);

  return (
    <div className={`min-h-screen flex flex-col overflow-hidden relative ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
      {/* Animated background shapes */}
      <div className="absolute w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-red-900/10 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-red-800/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-[30%] left-[20%] w-[30%] h-[30%] rounded-full bg-red-700/10 blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>
      
      {/* Header */}
      <header className={`${isDarkMode ? 'bg-black/50' : 'bg-white/70'} backdrop-blur-sm py-4 border-b ${isDarkMode ? 'border-red-900/20' : 'border-red-300/30'} sticky top-0 z-50`}>
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center">
            <div className="w-10 h-10 text-red-600 mr-2 animate-bounce" style={{ animationDuration: '3s' }}>
              <span className="material-icons text-3xl">sports_martial_arts</span>
            </div>
            <div className="relative">
              {isDarkMode ? (
                <>
                  <h1 className="text-2xl font-serif font-bold logo-dark absolute">
                    CoachT
                  </h1>
                  <h1 className="text-2xl font-serif font-bold logo-dark-glow absolute">
                    CoachT
                  </h1>
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-serif font-bold logo-light absolute">
                    CoachT
                  </h1>
                  <h1 className="text-2xl font-serif font-bold logo-light-glow absolute">
                    CoachT
                  </h1>
                </>
              )}
              <h1 className="text-2xl font-serif font-bold invisible">
                CoachT
              </h1>
            </div>
          </div>
          
          {/* Theme toggle button */}
          <button 
            onClick={toggleTheme} 
            className={`p-2 rounded-full ${isDarkMode ? 'bg-black/60 border-red-900/50' : 'bg-white/60 border-red-300/50'} border transition-all duration-300 mr-4`}
            aria-label="Toggle theme"
          >
            {isDarkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(220, 38, 38, 0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9f1239" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
          
          <div className="flex items-center space-x-4">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-red-500" />
            ) : user ? (
              <>
                <Link to="/app">
                  <button className="px-5 py-2 rounded-md bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white transition duration-300 flex items-center space-x-1">
                    <span className="material-icons text-sm">play_arrow</span>
                    <span>Start Routine</span>
                  </button>
                </Link>
                <button 
                  onClick={handleLogout}
                  className="px-5 py-2 rounded-md border border-red-700/50 text-red-500 hover:bg-red-900/20 transition duration-300 flex items-center space-x-1"
                >
                  <span className="material-icons text-sm">logout</span>
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <button className="px-5 py-2 rounded-md border border-red-700/50 text-red-500 hover:bg-red-900/20 transition duration-300 flex items-center space-x-1">
                    <span className="material-icons text-sm">login</span>
                    <span>Login</span>
                  </button>
                </Link>
                <Link to="/auth?tab=register">
                  <button className="px-5 py-2 rounded-md bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white transition duration-300 flex items-center space-x-1">
                    <span className="material-icons text-sm">person_add</span>
                    <span>Register</span>
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - Show either user profile or landing page */}
      <main className="flex-1 relative z-10">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="h-10 w-10 animate-spin text-red-500" />
          </div>
        ) : user ? (
          // Show user profile and dashboard
          <div className="container mx-auto px-4 py-8">
            <UserProfileCard />
            
            <div className="mt-8 w-full bg-black/30 border border-red-900/30 rounded-lg p-4 animate-fade-in">
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
            
            <div className="mt-8 flex justify-center">
              <Link to="/app">
                <div className="inline-block relative group animate-fade-in">
                  <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-red-400 rounded-lg blur-xl opacity-70 group-hover:opacity-100 transition duration-1000 animate-pulse"></div>
                  <div className="relative px-12 py-6 bg-black border border-red-800/50 rounded-lg leading-none flex items-center">
                    <span className="flex items-center space-x-5">
                      <span className="pr-6 text-gray-100 text-2xl font-bold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
                        START TRAINING
                      </span>
                    </span>
                    <span className="material-icons text-red-500 text-xl group-hover:translate-x-2 transition-transform">arrow_forward</span>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        ) : (
          // Show landing page for non-logged in users
          <div className="min-h-[90vh] flex flex-col items-center justify-center relative">
            {/* Animated floating martial arts icons */}
            <div className="absolute inset-0 z-0 overflow-hidden">
              <div className="absolute top-[10%] left-[10%] text-red-900/20 animate-float" style={{ animationDuration: '15s' }}>
                <span className="material-icons text-[120px]">sports_martial_arts</span>
              </div>
              <div className="absolute top-[30%] right-[15%] text-red-900/20 animate-float" style={{ animationDuration: '20s', animationDelay: '2s' }}>
                <span className="material-icons text-[80px]">sports_kabaddi</span>
              </div>
              <div className="absolute bottom-[20%] left-[20%] text-red-900/20 animate-float" style={{ animationDuration: '18s', animationDelay: '1s' }}>
                <span className="material-icons text-[100px]">fitness_center</span>
              </div>
            </div>
            
            {/* Main hero content */}
            <div 
              className="text-center px-4 py-16 transform transition-all duration-1000"
              style={{ 
                transform: `translateY(${scrollY * 0.2}px)`,
                opacity: 1 - scrollY / 500
              }}
            >
              <div className="animate-fade-in">
                <div className="relative mb-6">
                  {isDarkMode ? (
                    <>
                      <h2 className="text-7xl sm:text-8xl md:text-9xl font-serif font-bold logo-dark absolute inset-0">
                        CoachT
                      </h2>
                      <h2 className="text-7xl sm:text-8xl md:text-9xl font-serif font-bold logo-dark-glow absolute inset-0">
                        CoachT
                      </h2>
                    </>
                  ) : (
                    <>
                      <h2 className="text-7xl sm:text-8xl md:text-9xl font-serif font-bold logo-light absolute inset-0">
                        CoachT
                      </h2>
                      <h2 className="text-7xl sm:text-8xl md:text-9xl font-serif font-bold logo-light-glow absolute inset-0">
                        CoachT
                      </h2>
                    </>
                  )}
                  <h2 className="text-7xl sm:text-8xl md:text-9xl font-serif font-bold invisible">
                    CoachT
                  </h2>
                </div>
                <p className={`text-xl md:text-2xl max-w-2xl mx-auto mb-10 ${isDarkMode ? 'text-red-100' : 'text-red-800'}`}>
                  AI-powered martial arts form perfection.
                </p>
              </div>
              
              {/* Feature icons */}
              <div className="flex justify-center gap-8 md:gap-16 mb-16 flex-wrap">
                <div className="feature-icon-container animate-float" style={{animationDelay: '0.2s'}}>
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-red-800 to-red-600 flex items-center justify-center shadow-lg shadow-red-900/30 hover:shadow-red-500/30 transition-all duration-300 hover:scale-110">
                    <span className="material-icons text-white text-3xl md:text-4xl">motion_photos_on</span>
                  </div>
                  <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Real-time tracking</p>
                </div>
                
                <div className="feature-icon-container animate-float" style={{animationDelay: '0.4s'}}>
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-red-800 to-red-600 flex items-center justify-center shadow-lg shadow-red-900/30 hover:shadow-red-500/30 transition-all duration-300 hover:scale-110">
                    <span className="material-icons text-white text-3xl md:text-4xl">auto_fix_high</span>
                  </div>
                  <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Form analysis</p>
                </div>
                
                <div className="feature-icon-container animate-float" style={{animationDelay: '0.6s'}}>  
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-red-800 to-red-600 flex items-center justify-center shadow-lg shadow-red-900/30 hover:shadow-red-500/30 transition-all duration-300 hover:scale-110">
                    <span className="material-icons text-white text-3xl md:text-4xl">compare</span>
                  </div>
                  <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Video comparison</p>
                </div>
              </div>
              
              {/* Routine Notes Section */}
              <div className={`w-full max-w-lg mx-auto mb-10 ${isDarkMode ? 'bg-black/30 border-red-900/30' : 'bg-white/70 border-red-300/40'} border rounded-lg p-4 animate-fade-in`}>
                <div className="flex items-center mb-3">
                  <span className="material-icons text-red-500 mr-2">edit_note</span>
                  <h3 className={`text-lg font-medium ${isDarkMode ? 'text-red-100' : 'text-red-700'}`}>Routine Notes</h3>
                </div>
                <textarea 
                  className={`w-full h-32 rounded p-3 ${
                    isDarkMode 
                      ? 'bg-black/70 border-red-900/40 text-white placeholder-red-200/50' 
                      : 'bg-white/80 border-red-300/40 text-gray-800 placeholder-red-300'
                  } border
                    focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500`}
                  placeholder="Write your notes for this training session here..."
                  value={routineNotes}
                  onChange={(e) => setRoutineNotes(e.target.value)}
                ></textarea>
              </div>

              {/* Launch button with advanced animation */}
              <Link to="/auth">
                <div className="inline-block relative group animate-fade-in mt-6">
                  <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-red-400 rounded-lg blur-xl opacity-70 group-hover:opacity-100 transition duration-1000 animate-pulse"></div>
                  <div className={`relative px-12 py-6 ${isDarkMode ? 'bg-black border-red-800/50' : 'bg-white border-red-300/50'} border rounded-lg leading-none flex items-center`}>
                    <span className="flex items-center space-x-5">
                      <span className="pr-6 text-2xl font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
                        LAUNCH APP
                      </span>
                    </span>
                    <span className="material-icons text-red-500 text-xl group-hover:translate-x-2 transition-transform">arrow_forward</span>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className={`mt-auto backdrop-blur-sm py-6 border-t relative z-10 ${
        isDarkMode 
          ? 'bg-black/80 border-red-900/20' 
          : 'bg-white/80 border-red-300/20'
      }`}>
        <div className="container mx-auto px-4 text-center">
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>© 2025 CoachT</p>
          <p className={`${isDarkMode ? 'text-gray-600' : 'text-gray-500'} text-sm mt-1`}>
            Powered by TensorFlow.js
          </p>
        </div>
      </footer>
    </div>
  );
}