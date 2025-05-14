import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "../hooks/use-theme";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ImageUploader from "@/components/ImageUploader";

export default function MarketingLanding() {
  const [scrollY, setScrollY] = useState(0);
  const [developerPassword, setDeveloperPassword] = useState("");
  const [isPasswordCorrect, setIsPasswordCorrect] = useState(false);
  const [showPasswordError, setShowPasswordError] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);
  const [developerMode, setDeveloperMode] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  const featuresRef = useRef<HTMLDivElement>(null);

  // State for custom images with localStorage persistence
  const [heroBackgroundImage, setHeroBackgroundImage] = useState<string>(
    localStorage.getItem("heroBackgroundImage") ||
      "/assets/images/taekwondo-training.png",
  );

  const [step1Image, setStep1Image] = useState<string>(
    localStorage.getItem("step1Image") || "/assets/images/coacht-interface.png",
  );

  const [step2Image, setStep2Image] = useState<string>(
    localStorage.getItem("step2Image") || "/assets/images/pose-comparison.png",
  );

  const [step3Image, setStep3Image] = useState<string>(
    localStorage.getItem("step3Image") || "/assets/images/taekwondo-training.png",
  );

  // Custom image setter functions that also update localStorage
  const setStep1ImageWithStorage = (url: string) => {
    setStep1Image(url);
    localStorage.setItem("step1Image", url);
  };

  const setStep2ImageWithStorage = (url: string) => {
    setStep2Image(url);
    localStorage.setItem("step2Image", url);
  };

  const setStep3ImageWithStorage = (url: string) => {
    setStep3Image(url);
    localStorage.setItem("step3Image", url);
  };

  // Features to cycle through in the hero animation
  const features = [
    "AI Movement Detection",
    "Real-time Feedback",
    "Form Perfection",
    "Progress Tracking",
    "Video Comparison",
  ];

  // Parallax scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Cycle through features automatically
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [features.length]);

  // Check developer password
  const handleDeveloperLogin = () => {
    if (developerPassword === "ojaskandy") {
      setIsPasswordCorrect(true);
      setDeveloperMode(true);
      // Redirect to app in 1 second
      setTimeout(() => {
        window.location.href = "/app";
      }, 1000);
    } else {
      setShowPasswordError(true);
      setTimeout(() => {
        setShowPasswordError(false);
      }, 3000);
    }
  };

  // Toggle developer mode for editing images
  const handleDevModeAccess = () => {
    if (developerPassword === "ojaskandy") {
      setDeveloperMode(true);
      setIsPasswordCorrect(true);
    } else {
      setShowPasswordError(true);
      setTimeout(() => {
        setShowPasswordError(false);
      }, 3000);
    }
  };

  return (
    <div 
      className="min-h-screen overflow-x-hidden flex flex-col transition-colors duration-300" 
      style={{
        backgroundColor: isDarkMode ? '#000000' : '#ffffff',
        color: isDarkMode ? '#ffffff' : '#1a1a1a'
      }}
    >
      {/* Theme toggle */}
      <button 
        onClick={toggleTheme} 
        className="fixed top-6 left-6 z-50 p-2 rounded-full backdrop-blur-sm transition-all duration-300"
        style={{
          background: isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          border: isDarkMode ? '1px solid rgba(220, 38, 38, 0.5)' : '1px solid rgba(220, 38, 38, 0.5)'
        }}
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

      {/* Floating Developer Access Button */}
      <Dialog>
        <DialogTrigger asChild>
          <button 
            className="fixed top-6 right-6 z-50 px-4 py-2 rounded-md hover:bg-red-900/20 transition-all duration-300 backdrop-blur-sm"
            style={{
              background: isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)',
              border: '1px solid rgba(220, 38, 38, 0.8)',
              color: 'rgba(220, 38, 38, 0.8)'
            }}
          >
            Developers →
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md bg-black border border-red-900">
          <div className="p-4 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center">
              <span className="material-icons mr-2 text-red-500">code</span>
              Developer Access
            </h2>
            <p className="text-gray-400 text-sm">
              Enter developer password to access the application or enable
              editing mode.
            </p>

            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Enter password"
                value={developerPassword}
                onChange={(e) => setDeveloperPassword(e.target.value)}
                className="bg-black/50 border-red-900/50 text-white"
              />

              <AnimatePresence>
                {showPasswordError && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-red-500 text-xs"
                  >
                    Incorrect password. Please try again.
                  </motion.p>
                )}
              </AnimatePresence>

              {developerMode && (
                <div className="mt-2 p-2 bg-green-900/20 border border-green-900/30 rounded text-green-500 text-sm">
                  <span className="flex items-center">
                    <span className="material-icons mr-1 text-sm">
                      check_circle
                    </span>
                    Developer mode enabled - You can now edit images
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end space-y-reverse space-y-2 sm:space-y-0 sm:space-x-2">
              <DialogClose asChild>
                <Button
                  variant="outline"
                  className="border-red-900/50 text-gray-400 hover:bg-red-900/20 hover:text-white"
                >
                  Cancel
                </Button>
              </DialogClose>

              <DialogClose asChild>
                <Button
                  onClick={handleDevModeAccess}
                  className={`mb-2 sm:mb-0 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-800 hover:to-amber-700 text-white ${developerMode ? "opacity-50 pointer-events-none" : ""}`}
                  disabled={developerMode}
                >
                  {developerMode ? (
                    <span className="flex items-center">
                      <span className="material-icons mr-1 text-sm">check</span>
                      Image Edit Mode On
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <span className="material-icons mr-1 text-sm">edit</span>
                      Enable Image Editing
                    </span>
                  )}
                </Button>
              </DialogClose>

              <Button
                onClick={handleDeveloperLogin}
                className={`bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white ${isPasswordCorrect ? "opacity-50 pointer-events-none" : ""}`}
              >
                {isPasswordCorrect ? (
                  <span className="flex items-center">
                    <span className="material-icons mr-1 text-sm">check</span>
                    Redirecting...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <span className="material-icons mr-1 text-sm">login</span>
                    Access App
                  </span>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header with animated background */}
      <header className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* HIGHLY VISIBLE VERTICAL LIGHT BEAMS */}
        <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden">
          {/* Left side beams */}
          <motion.div
            className="absolute h-screen w-[40px] md:w-[60px] left-[5%] opacity-70"
            style={{ 
              background: "linear-gradient(to bottom, #ff3d00, #ff0844, #9c27b0)",
              filter: "blur(20px)"
            }}
            animate={{ 
              height: ["100vh", "120vh", "100vh"],
              y: ["0vh", "-10vh", "0vh"],
              opacity: [0.7, 0.9, 0.7]
            }}
            transition={{ 
              duration: 8, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          />
          
          <motion.div
            className="absolute h-screen w-[30px] md:w-[40px] left-[12%] opacity-60"
            style={{ 
              background: "linear-gradient(to bottom, #ff5722, #f44336, #e91e63)",
              filter: "blur(15px)" 
            }}
            animate={{ 
              height: ["100vh", "110vh", "100vh"],
              y: ["-5vh", "5vh", "-5vh"],
              opacity: [0.6, 0.8, 0.6]
            }}
            transition={{ 
              duration: 9, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: 0.5
            }}
          />
          
          {/* Right side beams */}
          <motion.div
            className="absolute h-screen w-[50px] md:w-[70px] right-[6%] opacity-70"
            style={{ 
              background: "linear-gradient(to bottom, #304ffe, #651fff, #d500f9)",
              filter: "blur(25px)" 
            }}
            animate={{ 
              height: ["100vh", "130vh", "100vh"],
              y: ["-5vh", "5vh", "-5vh"],
              opacity: [0.7, 0.9, 0.7]
            }}
            transition={{ 
              duration: 10, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: 1
            }}
          />
          
          <motion.div
            className="absolute h-screen w-[25px] md:w-[35px] right-[15%] opacity-60"
            style={{ 
              background: "linear-gradient(to bottom, #00b0ff, #2979ff, #651fff)",
              filter: "blur(12px)" 
            }}
            animate={{ 
              height: ["100vh", "115vh", "100vh"],
              y: ["5vh", "-5vh", "5vh"],
              opacity: [0.6, 0.8, 0.6]
            }}
            transition={{ 
              duration: 7.5, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: 0.7
            }}
          />
          
          <motion.div
            className="absolute h-screen w-[35px] md:w-[45px] right-[20%] opacity-65"
            style={{ 
              background: "linear-gradient(to bottom, #ff9100, #ff3d00, #dd2c00)",
              filter: "blur(18px)" 
            }}
            animate={{ 
              height: ["100vh", "125vh", "100vh"],
              y: ["-10vh", "0vh", "-10vh"],
              opacity: [0.65, 0.85, 0.65]
            }}
            transition={{ 
              duration: 9.5, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: 1.5
            }}
          />
          
          {/* Extra spotlight effect */}
          <motion.div
            className="absolute bottom-[-200px] left-1/2 transform -translate-x-1/2 w-[300px] md:w-[500px] h-[400px] md:h-[600px] rounded-[50%] opacity-20"
            style={{
              background: "radial-gradient(ellipse at center, rgba(255, 255, 255, 0.3) 0%, rgba(255, 0, 0, 0.1) 40%, transparent 70%)",
              filter: "blur(40px)"
            }}
            animate={{
              opacity: [0.2, 0.4, 0.2],
              scale: [1, 1.1, 1]
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
        {/* Premium animated background particles */}
        <div className="absolute inset-0 overflow-hidden z-0">
          {/* Colorful Falling Stars Animation */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            {/* Starry background behind the logo with colorful stars */}
            <div className="absolute top-0 right-0 w-full h-full z-0 overflow-hidden">
              <div className="starry-background absolute top-0 right-0 w-full md:w-1/2 h-full opacity-50">
                {Array.from({ length: 50 }).map((_, i) => {
                  const hue = Math.random() * 360; // Full color spectrum
                  const size = Math.random() * 3 + 1;
                  return (
                    <motion.div
                      key={`star-${i}`}
                      className="absolute rounded-full"
                      style={{
                        width: size + 'px',
                        height: size + 'px',
                        top: `${Math.random() * 100}%`,
                        right: `${Math.random() * 50}%`,
                        opacity: Math.random() * 0.7 + 0.3,
                        backgroundColor: Math.random() > 0.7 
                          ? `hsl(${Math.random() > 0.5 ? 0 : 350}, 80%, 70%)` 
                          : `hsl(${hue}, 70%, 70%)`,
                        boxShadow: `0 0 ${Math.random() * 4 + 2}px hsl(${hue}, 80%, 60%)`,
                      }}
                      animate={{
                        opacity: [
                          Math.random() * 0.3 + 0.3,
                          Math.random() * 0.7 + 0.3,
                          Math.random() * 0.3 + 0.3
                        ],
                        scale: [1, 1.2, 1]
                      }}
                      transition={{
                        duration: Math.random() * 4 + 3,
                        repeat: Infinity,
                        repeatType: "reverse",
                        ease: "easeInOut",
                        delay: Math.random() * 5
                      }}
                    />
                  );
                })}
              </div>
            </div>
            
            {/* Falling stars with trails */}
            {Array.from({ length: 20 }).map((_, i) => {
              // Generate vibrant colors with emphasis on red spectrum
              const hue = Math.random() > 0.6 
                ? Math.random() * 30 || 350 + Math.random() * 30  // Red spectrum
                : Math.random() * 360;  // Full spectrum
                
              const trailLength = Math.random() * 200 + 150;
              const trailWidth = Math.random() * 3 + 1;
              const animDuration = Math.random() * 5 + 3;
              
              return (
                <motion.div 
                  key={`falling-star-${i}`}
                  className="absolute"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `-10%`,
                    width: `${trailWidth}px`,
                    height: `${trailLength}px`,
                    background: `linear-gradient(to bottom, 
                      transparent, 
                      hsla(${hue}, 100%, 70%, 0.5), 
                      hsla(${hue}, 90%, 60%, 0.8), 
                      hsla(${hue}, 80%, 50%, 0.5), 
                      transparent)`,
                    filter: `blur(${Math.random() * 1}px)`,
                    transform: `rotate(${85 + Math.random() * 10}deg)`,
                    transformOrigin: 'top',
                    zIndex: 1,
                    opacity: 0
                  }}
                  animate={{
                    y: [`-${trailLength}px`, `${window.innerHeight + trailLength}px`],
                    opacity: [0, 1, 1, 0]
                  }}
                  transition={{
                    duration: animDuration,
                    ease: "easeIn",
                    repeat: Infinity,
                    delay: Math.random() * 10,
                    repeatDelay: Math.random() * 10 + 5
                  }}
                >
                  {/* Head of the falling star with glow effect */}
                  <motion.div
                    className="absolute top-0 left-0 rounded-full z-10"
                    style={{
                      width: `${trailWidth * 3}px`,
                      height: `${trailWidth * 3}px`,
                      backgroundColor: `hsla(${hue}, 100%, 80%, 1)`,
                      boxShadow: `0 0 ${trailWidth * 5}px ${trailWidth * 2}px hsla(${hue}, 100%, 70%, 0.8)`,
                      transform: 'translateX(-50%)'
                    }}
                  />
                </motion.div>
              );
            })}
          </div>
          
          {/* Large circular gradients */}
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={`large-${i}`}
              className="absolute rounded-full bg-gradient-to-br from-red-900/10 via-red-700/5 to-transparent"
              style={{
                width: Math.random() * 500 + 300,
                height: Math.random() * 500 + 300,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                filter: 'blur(40px)',
              }}
              animate={{
                x: [0, Math.random() * 40 - 20],
                y: [0, Math.random() * 40 - 20],
                scale: [1, 1.05, 1],
                opacity: [0.15, 0.20, 0.15],
              }}
              transition={{
                duration: 25,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
              }}
            />
          ))}
          
          {/* Small floating particles */}
          {Array.from({ length: 35 }).map((_, i) => (
            <motion.div
              key={`small-${i}`}
              className="absolute rounded-full bg-red-500"
              style={{
                width: Math.random() * 4 + 1 + 'px',
                height: Math.random() * 4 + 1 + 'px',
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.5 + 0.1,
              }}
              animate={{
                y: [0, -(Math.random() * 150 + 50)],
                x: [0, (Math.random() * 50 - 25)],
                opacity: [0, Math.random() * 0.5 + 0.2, 0],
              }}
              transition={{
                duration: Math.random() * 10 + 8,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          ))}
          
          {/* Medium glowing dots */}
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={`medium-${i}`}
              className="absolute rounded-full bg-red-600"
              style={{
                width: Math.random() * 8 + 2 + 'px',
                height: Math.random() * 8 + 2 + 'px',
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                boxShadow: '0 0 10px 2px rgba(220, 38, 38, 0.3)',
                opacity: Math.random() * 0.3 + 0.1,
              }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.1, 0.3, 0.1],
                boxShadow: ['0 0 8px 2px rgba(220, 38, 38, 0.2)', '0 0 12px 4px rgba(220, 38, 38, 0.4)', '0 0 8px 2px rgba(220, 38, 38, 0.2)'],
              }}
              transition={{
                duration: Math.random() * 5 + 3,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            />
          ))}
        </div>

        {/* Martial arts silhouette with editable image */}
        <div
          className="absolute inset-0 z-10 opacity-30 bg-center bg-no-repeat bg-contain"
          style={{
            backgroundImage: `url('${heroBackgroundImage}')`,
            backgroundSize: "80%",
            filter: "brightness(0.4) contrast(1.2)",
            transform: `translateY(${scrollY * 0.2}px)`,
          }}
        />
        {/* Hero image is not editable */}

        {/* Dynamic overlay based on theme */}
        <div className="absolute inset-0 z-10 transition-colors duration-300" 
          style={{
            background: isDarkMode 
              ? 'linear-gradient(to bottom, rgba(0,0,0,1), rgba(0,0,0,0.8), rgba(0,0,0,1))' 
              : 'linear-gradient(to bottom, rgba(255,255,255,1), rgba(255,255,255,0.8), rgba(255,255,255,1))'
          }} 
        />

        {/* Hero content */}
        <div className="container mx-auto px-4 z-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8 max-w-4xl mx-auto"
          >
            {isDarkMode ? (
              // Dark mode logo
              <h1 className="text-5xl md:text-7xl relative">
                <span className="absolute inset-0 text-5xl md:text-7xl font-bold blur-[2px]" style={{
                  color: 'rgba(220, 38, 38, 0.8)',
                  filter: 'brightness(1.3) contrast(1.5)'
                }}>
                  CoachT
                </span>
                <span className="relative z-10 font-bold" style={{
                  background: 'linear-gradient(to right, #ff4b47, #ff0844)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 0 15px rgba(248, 113, 113, 0.6)',
                  WebkitTextStroke: '1px rgba(255, 255, 255, 0.3)'
                }}>
                  CoachT
                </span>
              </h1>
            ) : (
              // Light mode logo
              <h1 className="text-5xl md:text-7xl relative">
                {/* Shadow/Glow layer */}
                <span className="absolute inset-0 text-5xl md:text-7xl font-bold blur-[3px]" style={{
                  color: 'rgba(159, 18, 57, 0.8)',
                  filter: 'brightness(1.4) contrast(1.5)'
                }}>
                  CoachT
                </span>
                {/* Base text layer */}
                <span className="relative z-10 font-bold" style={{
                  background: 'linear-gradient(to right, #9f1239, #dc2626)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 0 12px rgba(220, 38, 38, 0.5)',
                  WebkitTextStroke: '1px rgba(0, 0, 0, 0.15)'
                }}>
                  CoachT
                </span>
                {/* Outline enhancement for better visibility */}
                <span className="absolute inset-0 text-5xl md:text-7xl font-bold z-5 opacity-50" style={{
                  color: 'transparent',
                  WebkitTextStroke: '1px rgba(159, 18, 57, 0.8)'
                }}>
                  CoachT
                </span>
              </h1>
            )}

            <h2 className="text-xl md:text-3xl font-light" style={{ 
              color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)' 
            }}>
              AI-Powered Martial Arts{" "}
              <span className="font-semibold inline-block px-2" style={{
                color: '#dc2626',
                boxShadow: isDarkMode 
                  ? '0 0 10px rgba(220, 38, 38, 0.6)' 
                  : '0 0 10px rgba(220, 38, 38, 0.4)',
                borderRadius: '4px',
                animation: 'pulse-glow 2s ease-in-out infinite'
              }}>
                Training Partner
              </span>
            </h2>
            
            <div className="mt-4 flex items-center justify-center">
              <span className="badge-trust flex items-center space-x-1" style={{
                background: isDarkMode ? 'linear-gradient(45deg, #1a1a1a, #333)' : 'linear-gradient(45deg, #f9fafb, #f3f4f6)',
                boxShadow: isDarkMode ? '0 2px 5px rgba(0, 0, 0, 0.2)' : '0 2px 5px rgba(0, 0, 0, 0.1)'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                <span className="text-xs" style={{ color: isDarkMode ? '#d1d5db' : '#4b5563' }}>Built by Martial Artists</span>
              </span>
            </div>

            <div className="h-16 overflow-hidden relative my-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentFeature}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <h3 className="text-2xl md:text-4xl font-light" style={{
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(31, 41, 55, 0.9)'
                  }}>
                    {features[currentFeature]}
                  </h3>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-8">
              <a
                href="https://cal.com/ojas-kandhare/coacht-demo"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 rounded-lg text-lg font-medium flex items-center justify-center group relative overflow-hidden"
                style={{
                  background: "linear-gradient(45deg, #b91c1c, #dc2626, #ef4444, #b91c1c)",
                  backgroundSize: "300% 300%",
                  color: "white",
                  transition: "all 0.5s ease",
                  border: "2px solid rgba(255, 255, 255, 0.1)",
                  boxShadow: "0 10px 20px rgba(185, 28, 28, 0.3), inset 0 0 10px rgba(255, 255, 255, 0.1)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundPosition = "100% 100%";
                  e.currentTarget.style.transform = "scale(1.05) translateY(-3px)";
                  e.currentTarget.style.boxShadow = "0 15px 30px rgba(185, 28, 28, 0.4), inset 0 0 15px rgba(255, 255, 255, 0.2)";
                  e.currentTarget.style.border = "2px solid rgba(255, 255, 255, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundPosition = "0% 0%";
                  e.currentTarget.style.transform = "scale(1) translateY(0)";
                  e.currentTarget.style.boxShadow = "0 10px 20px rgba(185, 28, 28, 0.3), inset 0 0 10px rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.border = "2px solid rgba(255, 255, 255, 0.1)";
                }}
              >
                {/* Animated particles */}
                <div className="absolute inset-0 overflow-hidden">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <motion.div
                      key={`schedule-particle-${i}`}
                      className="absolute rounded-full bg-white"
                      style={{
                        width: Math.random() * 3 + 1,
                        height: Math.random() * 3 + 1,
                        filter: "blur(1px)",
                        opacity: 0.3 + Math.random() * 0.3
                      }}
                      initial={{
                        x: Math.random() * 100 + "%",
                        y: Math.random() * 100 + "%",
                        scale: 0
                      }}
                      animate={{
                        x: [
                          Math.random() * 100 + "%",
                          Math.random() * 100 + "%",
                          Math.random() * 100 + "%",
                        ],
                        y: [
                          Math.random() * 100 + "%",
                          Math.random() * 100 + "%",
                          Math.random() * 100 + "%",
                        ],
                        scale: [0, 1, 0],
                        opacity: [0, 0.6, 0]
                      }}
                      transition={{
                        duration: 2 + Math.random() * 2,
                        repeat: Infinity,
                        delay: Math.random() * 2,
                        ease: "easeInOut"
                      }}
                    />
                  ))}
                </div>
                
                <div className="flex items-center relative z-10">
                  <span className="font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]">
                    Schedule a Demo
                  </span>
                  <span className="material-icons group-hover:translate-x-1 transition-transform relative z-10 ml-2">
                    arrow_forward
                  </span>
                </div>
                
                {/* Shimmering effect */}
                <div className="absolute inset-0 rounded-lg overflow-hidden">
                  <motion.div
                    className="absolute inset-0 opacity-30"
                    style={{
                      background: "linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.2), transparent)",
                      backgroundSize: "200% 200%"
                    }}
                    animate={{
                      backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"]
                    }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  />
                </div>
              </a>

              <Link
                href="/early-access"
                className="px-8 py-4 rounded-lg text-lg font-medium flex items-center justify-center group relative overflow-hidden"
                style={{
                  background: "linear-gradient(45deg, #ff3d00, #ff014f, #9c27b0, #673ab7)",
                  backgroundSize: "300% 300%",
                  color: "white",
                  transition: "all 0.5s ease",
                  border: "2px solid rgba(255, 255, 255, 0.2)",
                  boxShadow: "0 10px 20px rgba(255, 60, 0, 0.3), 0 0 15px rgba(255, 0, 80, 0.4), inset 0 0 10px rgba(255, 255, 255, 0.1)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundPosition = "100% 100%";
                  e.currentTarget.style.transform = "scale(1.05) translateY(-5px)";
                  e.currentTarget.style.boxShadow = "0 15px 30px rgba(255, 60, 0, 0.4), 0 0 20px rgba(255, 0, 80, 0.5), inset 0 0 15px rgba(255, 255, 255, 0.2)";
                  e.currentTarget.style.border = "2px solid rgba(255, 255, 255, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundPosition = "0% 0%";
                  e.currentTarget.style.transform = "scale(1) translateY(0)";
                  e.currentTarget.style.boxShadow = "0 10px 20px rgba(255, 60, 0, 0.3), 0 0 15px rgba(255, 0, 80, 0.4), inset 0 0 10px rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.border = "2px solid rgba(255, 255, 255, 0.2)";
                }}
              >
                {/* Dynamic glow effects */}
                <div className="absolute inset-0 overflow-hidden">
                  {/* Animated background glow spots */}
                  {Array.from({ length: 3 }).map((_, i) => (
                    <motion.div
                      key={`spot-${i}`}
                      className="absolute rounded-full"
                      style={{
                        background: i === 0 
                          ? "radial-gradient(circle, rgba(255,61,0,0.8) 0%, rgba(255,61,0,0) 70%)"
                          : i === 1 
                            ? "radial-gradient(circle, rgba(255,0,80,0.8) 0%, rgba(255,0,80,0) 70%)"
                            : "radial-gradient(circle, rgba(156,39,176,0.8) 0%, rgba(156,39,176,0) 70%)",
                        width: `${150 + i * 20}px`,
                        height: `${150 + i * 20}px`,
                        top: `${i * 20}%`,
                        left: `${i * 30}%`,
                        opacity: 0.6,
                        filter: "blur(20px)",
                      }}
                      animate={{
                        left: [`${i * 30}%`, `${(i+1) * 30}%`, `${i * 30}%`],
                        top: [`${i * 20}%`, `${(i+1) * 10}%`, `${i * 20}%`],
                        opacity: [0.3, 0.6, 0.3],
                        scale: [0.8, 1.2, 0.8],
                      }}
                      transition={{
                        duration: 3 + i,
                        repeat: Infinity,
                        repeatType: "reverse",
                        ease: "easeInOut"
                      }}
                    />
                  ))}
                
                  {/* Animated particles */}
                  {Array.from({ length: 12 }).map((_, i) => (
                    <motion.div
                      key={`particle-${i}`}
                      className="absolute rounded-full bg-white"
                      style={{
                        width: Math.random() * 3 + 1,
                        height: Math.random() * 3 + 1,
                        filter: "blur(1px)",
                        opacity: 0.5 + Math.random() * 0.5
                      }}
                      initial={{
                        x: Math.random() * 100 + "%",
                        y: Math.random() * 100 + "%",
                        scale: 0
                      }}
                      animate={{
                        x: [
                          Math.random() * 100 + "%",
                          Math.random() * 100 + "%",
                          Math.random() * 100 + "%",
                        ],
                        y: [
                          Math.random() * 100 + "%",
                          Math.random() * 100 + "%",
                          Math.random() * 100 + "%",
                        ],
                        scale: [0, 1, 0],
                        opacity: [0, 0.8, 0]
                      }}
                      transition={{
                        duration: 2 + Math.random() * 2,
                        repeat: Infinity,
                        delay: Math.random() * 2,
                        ease: "easeInOut"
                      }}
                    />
                  ))}
                </div>
                
                <div className="flex items-center relative z-10">
                  <span className="mr-2 font-bold text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)]">
                    Get Early Access
                  </span>
                  
                  <div className="bg-white text-xs font-bold px-3 py-1 rounded-full relative z-10 ml-1 text-transparent bg-clip-text" 
                    style={{
                      background: "linear-gradient(to right, #ff3d00, #ff014f)",
                      boxShadow: "0 0 10px rgba(255, 255, 255, 0.5)",
                      border: "1px solid rgba(255, 255, 255, 0.3)"
                    }}>
                    <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent font-bold">
                      For Students
                    </span>
                  </div>
                  
                  <span className="material-icons group-hover:translate-x-1 transition-transform relative z-10 ml-2 text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)]">
                    school
                  </span>
                </div>
                
                {/* Shimmering edge effect */}
                <div className="absolute inset-0 rounded-lg overflow-hidden">
                  <motion.div
                    className="absolute inset-0 opacity-50"
                    style={{
                      background: "linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent)",
                      backgroundSize: "200% 200%"
                    }}
                    animate={{
                      backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  />
                </div>
              </Link>

              <a
                href="#learn-more"
                className="px-8 py-4 rounded-lg text-lg font-medium flex items-center justify-center group relative overflow-hidden"
                style={{
                  background: isDarkMode ? 
                    "linear-gradient(to right, rgba(0, 0, 0, 0.5), rgba(20, 20, 20, 0.7))" : 
                    "linear-gradient(to right, rgba(255, 255, 255, 0.7), rgba(249, 250, 251, 0.9))",
                  color: isDarkMode ? "#f87171" : "#b91c1c",
                  transition: "all 0.4s ease",
                  border: isDarkMode ? 
                    "2px solid rgba(239, 68, 68, 0.4)" : 
                    "2px solid rgba(220, 38, 38, 0.3)",
                  boxShadow: "0 5px 15px rgba(220, 38, 38, 0.1)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDarkMode ? 
                    "linear-gradient(to right, rgba(20, 20, 20, 0.7), rgba(30, 30, 30, 0.9))" : 
                    "linear-gradient(to right, rgba(254, 242, 242, 0.9), rgba(254, 226, 226, 0.9))";
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = "0 8px 25px rgba(239, 68, 68, 0.25)";
                  e.currentTarget.style.border = isDarkMode ? 
                    "2px solid rgba(239, 68, 68, 0.6)" : 
                    "2px solid rgba(220, 38, 38, 0.5)";
                  e.currentTarget.style.color = isDarkMode ? "#ef4444" : "#991b1b";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isDarkMode ? 
                    "linear-gradient(to right, rgba(0, 0, 0, 0.5), rgba(20, 20, 20, 0.7))" : 
                    "linear-gradient(to right, rgba(255, 255, 255, 0.7), rgba(249, 250, 251, 0.9))";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 5px 15px rgba(220, 38, 38, 0.1)";
                  e.currentTarget.style.border = isDarkMode ? 
                    "2px solid rgba(239, 68, 68, 0.4)" : 
                    "2px solid rgba(220, 38, 38, 0.3)";
                  e.currentTarget.style.color = isDarkMode ? "#f87171" : "#b91c1c";
                }}
              >
                <div className="flex items-center relative z-10">
                  <span className="font-medium">Learn More</span>
                  <motion.span 
                    className="material-icons ml-1 text-sm"
                    animate={{ y: [0, -3, 0] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      repeatDelay: 1
                    }}
                  >
                    expand_more
                  </motion.span>
                </div>
                
                {/* Glowing particles */}
                <div className="absolute inset-0 overflow-hidden opacity-30">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <motion.div
                      key={`learn-particle-${i}`}
                      className="absolute rounded-full"
                      style={{
                        width: Math.random() * 4 + 2,
                        height: Math.random() * 4 + 2,
                        backgroundColor: isDarkMode ? 
                          `rgba(239, 68, 68, ${0.4 + Math.random() * 0.6})` : 
                          `rgba(220, 38, 38, ${0.3 + Math.random() * 0.4})`,
                        filter: "blur(2px)",
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`
                      }}
                      animate={{
                        opacity: [0.2, 0.6, 0.2],
                        scale: [1, 1.5, 1]
                      }}
                      transition={{
                        duration: 2 + Math.random() * 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: Math.random() * 1
                      }}
                    />
                  ))}
                </div>
              </a>
            </div>
          </motion.div>
        </div>

        {/* Enhanced scroll indicator */}
        <motion.div
          className="absolute bottom-12 left-0 right-0 transform z-20 flex flex-col items-center justify-center cursor-pointer"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
          onClick={() => {
            const learnMoreSection = document.getElementById("learn-more");
            if (learnMoreSection) {
              learnMoreSection.scrollIntoView({ behavior: "smooth" });
            }
          }}
        >
          <div className="text-center mb-2">
            <p className="text-xl md:text-2xl text-red-500 font-bold">
              Scroll to Explore
            </p>
            <p style={{ color: isDarkMode ? 'rgba(156, 163, 175, 0.8)' : 'rgba(107, 114, 128, 0.8)' }}>
              Discover how CoachT transforms your training
            </p>
          </div>
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatType: "loop" }}
            className="bg-red-600/80 rounded-full w-12 h-12 flex items-center justify-center shadow-lg shadow-red-900/50"
          >
            <span className="material-icons text-white text-3xl">
              keyboard_arrow_down
            </span>
          </motion.div>
        </motion.div>
      </header>

      {/* Features Section */}
      <section
        id="learn-more"
        className="py-20 relative z-10"
        style={{
          background: isDarkMode 
            ? 'linear-gradient(to bottom, #000000, rgba(127, 29, 29, 0.2))' 
            : 'linear-gradient(to bottom, #ffffff, rgba(254, 226, 226, 0.4))'
        }}
      >
        {/* Section background particles */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          {Array.from({ length: 10 }).map((_, i) => (
            <motion.div
              key={`section-particle-${i}`}
              className="absolute rounded-full"
              style={{
                width: Math.random() * 3 + 1 + 'px',
                height: Math.random() * 3 + 1 + 'px',
                backgroundColor: `rgba(${220 + Math.random() * 30}, ${38 + Math.random() * 30}, ${38 + Math.random() * 30}, ${0.4 + Math.random() * 0.6})`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                boxShadow: '0 0 8px 2px rgba(220, 38, 38, 0.3)',
              }}
              animate={{
                y: [0, Math.random() * 200 - 100],
                x: [0, Math.random() * 200 - 100],
                opacity: [0.4, 0.8, 0.4],
              }}
              transition={{
                duration: 10 + Math.random() * 20,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            />
          ))}
        </div>
      
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true }}
              className="inline-block bg-gradient-to-r from-black/80 to-red-950/80 backdrop-blur-md p-6 md:p-8 rounded-xl border border-red-500/30 shadow-xl shadow-red-900/20 mb-4"
            >
              <h2 className="text-4xl md:text-6xl font-bold mb-4" style={{
                background: isDarkMode 
                  ? 'linear-gradient(to right, #ff4b47, #ff0844)' 
                  : 'linear-gradient(to right, #dc2626, #ef4444)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: isDarkMode 
                  ? '0 0 15px rgba(220, 38, 38, 0.6)' 
                  : '0 0 15px rgba(220, 38, 38, 0.3)'
              }}>
                Advanced Training Features
              </h2>
              <p className="text-xl md:text-2xl max-w-2xl mx-auto font-medium" style={{ 
                color: isDarkMode ? 'rgba(249, 250, 251, 0.9)' : 'rgba(249, 250, 251, 0.9)'
              }}>
                CoachT combines cutting-edge AI technology with martial arts
                expertise to create the ultimate training partner.
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true, margin: "-100px" }}
              whileHover={{ 
                y: -10, 
                boxShadow: isDarkMode 
                  ? "0 15px 30px -10px rgba(220, 38, 38, 0.3)" 
                  : "0 15px 30px -10px rgba(220, 38, 38, 0.2)",
                borderColor: "rgba(220, 38, 38, 0.5)"
              }}
              className="group border border-red-900/30 rounded-lg p-6 transition-all duration-300"
              style={{
                background: isDarkMode 
                  ? 'linear-gradient(to bottom right, rgba(0, 0, 0, 0.9), rgba(17, 24, 39, 0.8))' 
                  : 'linear-gradient(to bottom right, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.95))',
                boxShadow: isDarkMode 
                  ? '0 4px 20px -5px rgba(0, 0, 0, 0.5)' 
                  : '0 4px 20px -5px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-900 to-red-700 flex items-center justify-center mb-6 mx-auto transform transition duration-300 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(220,38,38,0.5)]">
                <span className="material-icons text-white text-3xl">
                  sports_martial_arts
                </span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-center transition-colors" style={{ 
                color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
              }}>
                Real-time Pose Detection
              </h3>
              <p className="text-center" style={{ 
                color: isDarkMode ? 'rgba(156, 163, 175, 0.9)' : 'rgba(107, 114, 128, 0.9)' 
              }}>
                Advanced AI technology accurately detects and analyzes your body
                position and movements in real-time.
              </p>
              
              {/* Progress indicator that fills when in view */}
              <div className="w-full h-1 mt-4 rounded-full overflow-hidden" 
                style={{ 
                  background: isDarkMode ? 'rgba(31, 41, 55, 0.8)' : 'rgba(229, 231, 235, 0.8)' 
                }}>
                <motion.div 
                  className="h-full bg-gradient-to-r from-red-700 to-red-500"
                  initial={{ width: 0 }}
                  whileInView={{ width: "100%" }}
                  transition={{ duration: 1.5, delay: 0.5 }}
                  viewport={{ once: true }}
                />
              </div>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true, margin: "-100px" }}
              whileHover={{ 
                y: -10, 
                boxShadow: isDarkMode 
                  ? "0 15px 30px -10px rgba(220, 38, 38, 0.3)" 
                  : "0 15px 30px -10px rgba(220, 38, 38, 0.2)",
                borderColor: "rgba(220, 38, 38, 0.5)"
              }}
              className="group border border-red-900/30 rounded-lg p-6 transition-all duration-300"
              style={{
                background: isDarkMode 
                  ? 'linear-gradient(to bottom right, rgba(0, 0, 0, 0.9), rgba(17, 24, 39, 0.8))' 
                  : 'linear-gradient(to bottom right, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.95))',
                boxShadow: isDarkMode 
                  ? '0 4px 20px -5px rgba(0, 0, 0, 0.5)' 
                  : '0 4px 20px -5px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-900 to-red-700 flex items-center justify-center mb-6 mx-auto transform transition duration-300 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(220,38,38,0.5)]">
                <span className="material-icons text-white text-3xl">
                  compare
                </span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-center transition-colors" style={{ 
                color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
              }}>
                Form Comparison
              </h3>
              <p className="text-center" style={{ 
                color: isDarkMode ? 'rgba(156, 163, 175, 0.9)' : 'rgba(107, 114, 128, 0.9)' 
              }}>
                Compare your technique directly against reference videos of
                perfect form with visual overlays.
              </p>
              
              {/* Progress indicator that fills when in view */}
              <div className="w-full h-1 mt-4 rounded-full overflow-hidden" 
                style={{ 
                  background: isDarkMode ? 'rgba(31, 41, 55, 0.8)' : 'rgba(229, 231, 235, 0.8)' 
                }}>
                <motion.div 
                  className="h-full bg-gradient-to-r from-red-700 to-red-500"
                  initial={{ width: 0 }}
                  whileInView={{ width: "100%" }}
                  transition={{ duration: 1.5, delay: 0.6 }}
                  viewport={{ once: true }}
                />
              </div>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true, margin: "-100px" }}
              whileHover={{ 
                y: -10, 
                boxShadow: isDarkMode 
                  ? "0 15px 30px -10px rgba(220, 38, 38, 0.3)" 
                  : "0 15px 30px -10px rgba(220, 38, 38, 0.2)",
                borderColor: "rgba(220, 38, 38, 0.5)"
              }}
              className="group border border-red-900/30 rounded-lg p-6 transition-all duration-300"
              style={{
                background: isDarkMode 
                  ? 'linear-gradient(to bottom right, rgba(0, 0, 0, 0.9), rgba(17, 24, 39, 0.8))' 
                  : 'linear-gradient(to bottom right, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.95))',
                boxShadow: isDarkMode 
                  ? '0 4px 20px -5px rgba(0, 0, 0, 0.5)' 
                  : '0 4px 20px -5px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-900 to-red-700 flex items-center justify-center mb-6 mx-auto transform transition duration-300 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(220,38,38,0.5)]">
                <span className="material-icons text-white text-3xl">
                  insights
                </span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-center transition-colors" style={{ 
                color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
              }}>
                Performance Analytics
              </h3>
              <p className="text-center" style={{ 
                color: isDarkMode ? 'rgba(156, 163, 175, 0.9)' : 'rgba(107, 114, 128, 0.9)' 
              }}>
                Detailed metrics on your performance with specific feedback on
                how to improve your technique.
              </p>
              
              {/* Progress indicator that fills when in view */}
              <div className="w-full h-1 mt-4 rounded-full overflow-hidden" 
                style={{ 
                  background: isDarkMode ? 'rgba(31, 41, 55, 0.8)' : 'rgba(229, 231, 235, 0.8)' 
                }}>
                <motion.div 
                  className="h-full bg-gradient-to-r from-red-700 to-red-500"
                  initial={{ width: 0 }}
                  whileInView={{ width: "100%" }}
                  transition={{ duration: 1.5, delay: 0.7 }}
                  viewport={{ once: true }}
                />
              </div>
            </motion.div>
          </div>

          {/* Additional features grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            {/* Feature 4 */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true, margin: "-100px" }}
              className="flex items-start space-x-4 p-4 rounded-lg transition-all"
              style={{
                background: isDarkMode ? 'transparent' : 'rgba(255, 255, 255, 0.5)'
              }}
              whileHover={{
                background: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(254, 226, 226, 0.3)'
              }}
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-900/50 flex items-center justify-center">
                <span className="material-icons text-red-500">movie</span>
              </div>
              <div>
                <h3 className="text-lg font-bold mb-2" style={{ 
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)'
                }}>Video Recording</h3>
                <p style={{ 
                  color: isDarkMode ? 'rgba(156, 163, 175, 0.9)' : 'rgba(107, 114, 128, 0.9)' 
                }}>
                  Record your training sessions with one click and save or share
                  them instantly.
                </p>
              </div>
            </motion.div>

            {/* Feature 5 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true, margin: "-100px" }}
              className="flex items-start space-x-4 p-4 rounded-lg transition-all"
              style={{
                background: isDarkMode ? 'transparent' : 'rgba(255, 255, 255, 0.5)'
              }}
              whileHover={{
                background: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(254, 226, 226, 0.3)'
              }}
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-900/50 flex items-center justify-center">
                <span className="material-icons text-red-500">history</span>
              </div>
              <div>
                <h3 className="text-lg font-bold mb-2" style={{ 
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)'
                }}>Progress Tracking</h3>
                <p style={{ 
                  color: isDarkMode ? 'rgba(156, 163, 175, 0.9)' : 'rgba(107, 114, 128, 0.9)' 
                }}>
                  Monitor your development over time with progress tracking and
                  performance history.
                </p>
              </div>
            </motion.div>

            {/* Feature 6 */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true, margin: "-100px" }}
              className="flex items-start space-x-4 p-4 rounded-lg hover:bg-black/30 transition-all"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-900/50 flex items-center justify-center">
                <span className="material-icons text-red-500">
                  photo_library
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold mb-2">Training Gallery</h3>
                <p className="text-gray-400">
                  Create and organize a gallery of photos and videos from your
                  training and competitions.
                </p>
              </div>
            </motion.div>

            {/* Feature 7 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true, margin: "-100px" }}
              className="flex items-start space-x-4 p-4 rounded-lg hover:bg-black/30 transition-all"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-900/50 flex items-center justify-center">
                <span className="material-icons text-red-500">
                  auto_fix_high
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold mb-2">Instant Feedback</h3>
                <p className="text-gray-400">
                  Get real-time feedback on your technique with suggestions for
                  improvement during practice.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section 
        className="py-20 relative overflow-hidden"
        style={{
          background: isDarkMode 
            ? 'black' 
            : 'linear-gradient(to bottom, #f8f8f8, #ffffff)'
        }}>
        {/* Animated mesh background */}
        <div className="absolute inset-0 z-0">
          <svg width="100%" height="100%" className="opacity-20">
            <defs>
              <pattern id="mesh-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M0 20 L40 20 M20 0 L20 40" strokeWidth="0.5" stroke="rgba(220, 38, 38, 0.3)" fill="none" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#mesh-pattern)" />
          </svg>
          
          {/* Animated dots at intersections */}
          {Array.from({ length: 15 }).map((_, i) => (
            <motion.div
              key={`mesh-dot-${i}`}
              className="absolute rounded-full bg-red-500"
              style={{
                width: '4px',
                height: '4px',
                top: `${Math.floor(Math.random() * 20) * 5}%`,
                left: `${Math.floor(Math.random() * 20) * 5}%`,
                filter: 'blur(1px)',
              }}
              animate={{
                opacity: [0.2, 0.8, 0.2],
                boxShadow: [
                  '0 0 0px rgba(220, 38, 38, 0)',
                  '0 0 8px rgba(220, 38, 38, 0.5)',
                  '0 0 0px rgba(220, 38, 38, 0)',
                ],
              }}
              transition={{
                duration: 3 + Math.random() * 3,
                repeat: Infinity,
                repeatType: "loop",
              }}
            />
          ))}
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true }}
              className="inline-block bg-gradient-to-r from-black/80 to-red-950/80 backdrop-blur-md p-6 md:p-8 rounded-xl border border-red-500/30 shadow-xl shadow-red-900/20 mb-4"
            >
              <h2 className="text-4xl md:text-6xl font-bold mb-4" style={{
                background: isDarkMode 
                  ? 'linear-gradient(to right, #ff4b47, #ff0844)' 
                  : 'linear-gradient(to right, #dc2626, #ef4444)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: isDarkMode 
                  ? '0 0 15px rgba(220, 38, 38, 0.6)' 
                  : '0 0 15px rgba(220, 38, 38, 0.3)'
              }}>
                How CoachT Works
              </h2>
              <p className="text-xl md:text-2xl max-w-2xl mx-auto font-medium" style={{ 
                color: isDarkMode ? 'rgba(249, 250, 251, 0.9)' : 'rgba(249, 250, 251, 0.9)'
              }}>
                Our innovative AI platform makes training more effective and
                efficient.
              </p>
            </motion.div>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-gradient-to-b from-red-800 via-red-600 to-red-900/30 transform -translate-x-1/2 hidden md:block">
              {/* Animated pulse effect on the timeline */}
              <motion.div
                className="absolute w-3 h-3 rounded-full bg-red-500 top-0 left-1/2 transform -translate-x-1/2"
                animate={{
                  y: ["0%", "100%"],
                  boxShadow: [
                    "0 0 0px rgba(220, 38, 38, 0.3)",
                    "0 0 20px rgba(220, 38, 38, 0.6)",
                    "0 0 0px rgba(220, 38, 38, 0.3)",
                  ]
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </div>

            {/* Step 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true, margin: "-100px" }}
              className="relative md:grid md:grid-cols-2 items-center mb-24"
            >
              <div className="text-right pr-10 hidden md:block">
                <div className="bg-gradient-to-br from-black/90 to-red-950/80 backdrop-blur-md border border-red-500/40 rounded-xl p-5 shadow-lg shadow-red-900/20 inline-block mb-3">
                  <h3 className="text-2xl md:text-3xl font-bold mb-3" style={{
                    background: 'linear-gradient(to right, #ff4b47, #ff0844)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>Setup Your Camera</h3>
                  <p className="text-gray-200 text-lg">
                    Simply launch CoachT in your browser, grant camera access, and
                    you're ready to begin training.
                  </p>
                </div>
              </div>
              <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 top-1/2 z-10 hidden md:block">
                <div className="w-14 h-14 rounded-full bg-gradient-to-r from-red-700 to-red-500 flex items-center justify-center text-white text-xl font-bold border border-red-500/30 shadow-lg">
                  1
                </div>
              </div>
              <div className="md:pl-10">
                <div className="bg-gradient-to-br from-black/90 to-red-950/80 backdrop-blur-md border border-red-500/40 rounded-xl overflow-hidden md:hidden mb-6 shadow-lg shadow-red-900/20">
                  <h3 className="text-2xl md:text-3xl font-bold p-5 bg-gradient-to-r from-red-900/90 to-red-800/90 flex items-center">
                    <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white mr-4 border border-red-500/30 shadow-md">
                      1
                    </div>
                    Setup Your Camera
                  </h3>
                  <p className="p-5 text-gray-200 text-lg">
                    Simply launch CoachT in your browser, grant camera access,
                    and you're ready to begin training.
                  </p>
                </div>
                <div className="aspect-video rounded-xl overflow-hidden border border-red-500/50 shadow-2xl shadow-red-900/20 bg-black/70 backdrop-blur-sm p-0 hover:border-red-400/80 transition-all duration-300">
                  <img 
                    src="/assets/images/taekwondo-training.png" 
                    alt="Setup Your Camera" 
                    className="h-full w-full object-cover"
                  />
                </div>
                
                {/* Flash animation is defined in CSS */}
              </div>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true, margin: "-100px" }}
              className="relative md:grid md:grid-cols-2 items-center mb-24"
            >
              <div className="md:pr-10">
                <div className="bg-gradient-to-br from-black/90 to-red-950/80 backdrop-blur-md border border-red-500/40 rounded-xl overflow-hidden md:hidden mb-6 shadow-lg shadow-red-900/20">
                  <h3 className="text-2xl md:text-3xl font-bold p-5 bg-gradient-to-r from-red-900/90 to-red-800/90 flex items-center">
                    <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white mr-4 border border-red-500/30 shadow-md">
                      2
                    </div>
                    Start Tracking
                  </h3>
                  <p className="p-5 text-gray-200 text-lg">
                    Activate the AI tracking system with a single click to begin
                    analyzing your movements.
                  </p>
                </div>
                <div className="aspect-video rounded-xl overflow-hidden border border-red-500/50 shadow-2xl shadow-red-900/20 bg-black/70 backdrop-blur-sm p-0 hover:border-red-400/80 transition-all duration-300">
                  <img 
                    src="/assets/images/coacht-interface.png" 
                    alt="CoachT Interface" 
                    className="h-full w-full object-cover"
                  />
                </div>
                
                {/* Animations are defined in CSS */}
              </div>
              <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 top-1/2 z-10 hidden md:block">
                <div className="w-14 h-14 rounded-full bg-gradient-to-r from-red-700 to-red-500 flex items-center justify-center text-white text-xl font-bold border border-red-500/30 shadow-lg">
                  2
                </div>
              </div>
              <div className="text-left pl-10 hidden md:block">
                <div className="bg-gradient-to-br from-black/90 to-red-950/80 backdrop-blur-md border border-red-500/40 rounded-xl p-5 shadow-lg shadow-red-900/20 inline-block mb-3">
                  <h3 className="text-2xl md:text-3xl font-bold mb-3" style={{
                    background: 'linear-gradient(to right, #ff4b47, #ff0844)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>Start Tracking</h3>
                  <p className="text-gray-200 text-lg">
                    Activate the AI tracking system with a single click to begin
                    analyzing your movements.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true, margin: "-100px" }}
              className="relative md:grid md:grid-cols-2 items-center"
            >
              <div className="text-right pr-10 hidden md:block">
                <div className="bg-gradient-to-br from-black/90 to-red-950/80 backdrop-blur-md border border-red-500/40 rounded-xl p-5 shadow-lg shadow-red-900/20 inline-block mb-3">
                  <h3 className="text-2xl md:text-3xl font-bold mb-3" style={{
                    background: 'linear-gradient(to right, #ff4b47, #ff0844)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>Compare and Improve</h3>
                  <p className="text-gray-200 text-lg">
                    Test your technique against reference videos with our green
                    guide overlay to perfect your form.
                  </p>
                </div>
              </div>
              <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 top-1/2 z-10 hidden md:block">
                <div className="w-14 h-14 rounded-full bg-gradient-to-r from-red-700 to-red-500 flex items-center justify-center text-white text-xl font-bold border border-red-500/30 shadow-lg">
                  3
                </div>
              </div>
              <div className="md:pl-10">
                <div className="bg-gradient-to-br from-black/90 to-red-950/80 backdrop-blur-md border border-red-500/40 rounded-xl overflow-hidden md:hidden mb-6 shadow-lg shadow-red-900/20">
                  <h3 className="text-2xl md:text-3xl font-bold p-5 bg-gradient-to-r from-red-900/90 to-red-800/90 flex items-center">
                    <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white mr-4 border border-red-500/30 shadow-md">
                      3
                    </div>
                    Compare and Improve
                  </h3>
                  <p className="p-5 text-gray-200 text-lg">
                    Test your technique against reference videos with our green
                    guide overlay to perfect your form.
                  </p>
                </div>
                <div className="aspect-video rounded-xl overflow-hidden border border-red-500/50 shadow-2xl shadow-red-900/20 bg-black/70 backdrop-blur-sm p-0 hover:border-red-400/80 transition-all duration-300">
                  <img 
                    src="/assets/images/pose-comparison.png" 
                    alt="Compare and Improve" 
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Schedule Demo Section */}
      <section
        id="schedule-demo"
        className="py-20 relative overflow-hidden"
        style={{
          background: isDarkMode 
            ? 'linear-gradient(to bottom, black, rgba(127, 29, 29, 0.2))' 
            : 'linear-gradient(to bottom, rgba(254, 242, 242, 0.8), rgba(254, 226, 226, 0.4))'
        }}
      >
        {/* Background decoration elements */}
        <div className="absolute inset-0 overflow-hidden opacity-50">
          {/* Red circle decoration */}
          <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[60%] rounded-full bg-gradient-to-br from-red-900/10 to-red-800/5 blur-3xl" />
          
          {/* Floating elements */}
          {Array.from({ length: 3 }).map((_, i) => (
            <motion.div
              key={`float-circle-${i}`}
              className="absolute rounded-full"
              style={{
                width: `${Math.random() * 300 + 100}px`,
                height: `${Math.random() * 300 + 100}px`,
                border: '1px solid rgba(220, 38, 38, 0.1)',
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
              }}
              animate={{
                rotate: [0, 360],
                opacity: [0.05, 0.1, 0.05],
              }}
              transition={{
                duration: 15 + Math.random() * 10,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          ))}
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true }}
              className="inline-block bg-gradient-to-r from-black/80 to-red-950/80 backdrop-blur-md p-6 md:p-8 rounded-xl border border-red-500/30 shadow-xl shadow-red-900/20 mb-4"
            >
              <h2 className="text-4xl md:text-6xl font-bold mb-4" style={{
                background: isDarkMode 
                  ? 'linear-gradient(to right, #ff4b47, #ff0844)' 
                  : 'linear-gradient(to right, #dc2626, #ef4444)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: isDarkMode 
                  ? '0 0 15px rgba(220, 38, 38, 0.6)' 
                  : '0 0 15px rgba(220, 38, 38, 0.3)'
              }}>
                Schedule a Demo
              </h2>
              <p className="text-xl md:text-2xl max-w-2xl mx-auto font-medium" style={{ 
                color: isDarkMode ? 'rgba(249, 250, 251, 0.9)' : 'rgba(249, 250, 251, 0.9)'
              }}>
                Experience the future of martial arts training with a personalized
                demo of CoachT.
              </p>
            </motion.div>
          </div>

          <div className="modal-premium rounded-lg p-8 max-w-2xl mx-auto">
            <div className="text-center mb-8 relative">
              {/* Pulse effect behind the icon */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-red-600/10 pulse-glow"></div>
              
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-900 to-red-700 flex items-center justify-center mx-auto mb-4 relative z-10 shadow-lg shadow-red-900/30">
                <span className="material-icons text-white text-3xl">
                  calendar_month
                </span>
              </div>
              <h3 className="text-2xl font-bold mb-2">Book Your Demo</h3>
              <p className="text-gray-400 max-w-md mx-auto">
                Select a convenient time for a personalized demonstration of the
                CoachT platform.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center space-y-4">
              <a
                href="https://cal.com/ojas-kandhare/coacht-demo"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 w-full sm:w-auto rounded-md text-lg font-medium flex items-center justify-center space-x-2 group overflow-hidden relative"
                style={{
                  background: "linear-gradient(to right, #b91c1c, #dc2626)",
                  color: "white",
                  transition: "all 0.3s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "linear-gradient(to right, #991b1b, #b91c1c)";
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.boxShadow = "0 5px 15px rgba(220, 38, 38, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "linear-gradient(to right, #b91c1c, #dc2626)";
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <span className="material-icons mr-2 relative z-10">event</span>
                <span className="relative z-10">Schedule Now</span>
                <span className="material-icons group-hover:translate-x-1 transition-transform relative z-10">
                  arrow_forward
                </span>
                
                {/* Static particle effect inside button (not animated to avoid flickering) */}
                <div className="absolute inset-0 opacity-20">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-1 h-1 rounded-full bg-white"
                      style={{
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`,
                        opacity: 0.5,
                      }}
                    />
                  ))}
                </div>
              </a>
              
              <div className="flex items-center justify-center space-x-2 mt-2">
                <p className="text-gray-500 text-sm">
                  Demos are typically 30 minutes long and include a Q&A session.
                </p>
              </div>
              
              {/* Trust indicators */}
              <div className="flex flex-wrap items-center justify-center gap-3 mt-6 pt-6 border-t border-red-900/30">
                <span className="badge-trust flex items-center space-x-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                    <path d="m21 16-4 4-4-4"></path><path d="M17 20V4"></path><rect x="3" y="4" width="8" height="16" rx="2"></rect>
                  </svg>
                  <span className="text-xs text-gray-300">Mobile friendly</span>
                </span>
                
                <span className="badge-trust flex items-center space-x-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                  <span className="text-xs text-gray-300">Secure platform</span>
                </span>
                
                <span className="badge-trust flex items-center space-x-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                  </svg>
                  <span className="text-xs text-gray-300">No setup required</span>
                </span>
                
                <span className="badge-trust flex items-center space-x-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                    <circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path>
                  </svg>
                  <span className="text-xs text-gray-300">Free demo</span>
                </span>
              </div>
            </div>
          </div>
          
          {/* User testimonials */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="p-6 rounded-lg border border-red-900/20"
              style={{
                background: isDarkMode 
                  ? 'linear-gradient(to bottom right, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.7))' 
                  : 'linear-gradient(to bottom right, rgba(255, 255, 255, 0.95), rgba(254, 242, 242, 0.9))',
                boxShadow: isDarkMode 
                  ? '0 10px 15px -3px rgba(0, 0, 0, 0.5)' 
                  : '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center mr-4">
                  <span className="material-icons text-red-500">person</span>
                </div>
                <div>
                  <h4 className="font-bold" style={{ 
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)' 
                  }}>Taekwondo Instructor</h4>
                  <p className="text-sm" style={{ 
                    color: isDarkMode ? 'rgba(156, 163, 175, 0.9)' : 'rgba(107, 114, 128, 0.9)' 
                  }}>Black Belt, 4th Dan</p>
                </div>
              </div>
              <p className="italic" style={{ 
                color: isDarkMode ? 'rgba(156, 163, 175, 0.9)' : 'rgba(107, 114, 128, 0.9)' 
              }}>
                "CoachT saves me 30 minutes every class. My students can see exactly what needs
                fixing in their technique."
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="p-6 rounded-lg border border-red-900/20"
              style={{
                background: isDarkMode 
                  ? 'linear-gradient(to bottom right, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.7))' 
                  : 'linear-gradient(to bottom right, rgba(255, 255, 255, 0.95), rgba(254, 242, 242, 0.9))',
                boxShadow: isDarkMode 
                  ? '0 10px 15px -3px rgba(0, 0, 0, 0.5)' 
                  : '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center mr-4">
                  <span className="material-icons text-red-500">person</span>
                </div>
                <div>
                  <h4 className="font-bold" style={{ 
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)' 
                  }}>Martial Arts Student</h4>
                  <p className="text-sm" style={{ 
                    color: isDarkMode ? 'rgba(156, 163, 175, 0.9)' : 'rgba(107, 114, 128, 0.9)' 
                  }}>Training for 2 years</p>
                </div>
              </div>
              <p className="italic" style={{ 
                color: isDarkMode ? 'rgba(156, 163, 175, 0.9)' : 'rgba(107, 114, 128, 0.9)' 
              }}>
                "CoachT fixed the one form mistake I kept making for 6 months. Seeing the comparison
                made all the difference."
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section 
        className="py-20 relative overflow-hidden"
        style={{
          background: isDarkMode 
            ? 'black' 
            : 'linear-gradient(to bottom, #f8f8f8, #ffffff)'
        }}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true }}
              className="inline-block bg-gradient-to-r from-black/80 to-red-950/80 backdrop-blur-md p-6 md:p-8 rounded-xl border border-red-500/30 shadow-xl shadow-red-900/20 mb-4"
            >
              <h2 className="text-3xl md:text-5xl font-bold mb-4" style={{
                background: isDarkMode 
                  ? 'linear-gradient(to right, #ff4b47, #ff0844)' 
                  : 'linear-gradient(to right, #dc2626, #ef4444)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: isDarkMode 
                  ? '0 0 15px rgba(220, 38, 38, 0.6)' 
                  : '0 0 15px rgba(220, 38, 38, 0.3)'
              }}>
                What Practitioners Say
              </h2>
              <p className="text-xl md:text-2xl max-w-2xl mx-auto font-medium" style={{ 
                color: isDarkMode ? 'rgba(249, 250, 251, 0.9)' : 'rgba(249, 250, 251, 0.9)'
              }}>
                Hear from martial artists who have improved their skills with
                CoachT.
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Testimonial 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true, margin: "-100px" }}
              className="border border-red-900/30 rounded-lg p-6 relative"
              style={{
                background: isDarkMode 
                  ? 'linear-gradient(to bottom right, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.7))' 
                  : 'linear-gradient(to bottom right, rgba(255, 255, 255, 0.95), rgba(254, 242, 242, 0.9))',
                boxShadow: isDarkMode 
                  ? '0 10px 15px -3px rgba(0, 0, 0, 0.5)' 
                  : '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div className="absolute -top-5 left-6 text-5xl text-red-700">
                "
              </div>
              <p className="mb-6 relative z-10 pt-4" style={{ 
                color: isDarkMode ? 'rgba(209, 213, 219, 0.9)' : 'rgba(55, 65, 81, 0.9)' 
              }}>
                CoachT has completely transformed my training. The real-time
                feedback has helped me correct form issues I didn't even know I
                had.
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-red-800 flex items-center justify-center text-white font-bold mr-3">
                  JS
                </div>
                <div>
                  <h4 className="font-bold" style={{ 
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)' 
                  }}>Jamie S.</h4>
                  <p className="text-sm" style={{ 
                    color: isDarkMode ? 'rgba(156, 163, 175, 0.9)' : 'rgba(107, 114, 128, 0.9)' 
                  }}>3rd Dan Black Belt</p>
                </div>
              </div>
            </motion.div>

            {/* Testimonial 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true, margin: "-100px" }}
              className="border border-red-900/30 rounded-lg p-6 relative"
              style={{
                background: isDarkMode 
                  ? 'linear-gradient(to bottom right, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.7))' 
                  : 'linear-gradient(to bottom right, rgba(255, 255, 255, 0.95), rgba(254, 242, 242, 0.9))',
                boxShadow: isDarkMode 
                  ? '0 10px 15px -3px rgba(0, 0, 0, 0.5)' 
                  : '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div className="absolute -top-5 left-6 text-5xl text-red-700">
                "
              </div>
              <p className="mb-6 relative z-10 pt-4" style={{ 
                color: isDarkMode ? 'rgba(209, 213, 219, 0.9)' : 'rgba(55, 65, 81, 0.9)' 
              }}>
                As a coach, this tool has been invaluable. I can now show my
                students exactly what they need to adjust with precise visual
                feedback.
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-red-800 flex items-center justify-center text-white font-bold mr-3">
                  MK
                </div>
                <div>
                  <h4 className="font-bold" style={{ 
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)' 
                  }}>Michael K.</h4>
                  <p className="text-sm" style={{ 
                    color: isDarkMode ? 'rgba(156, 163, 175, 0.9)' : 'rgba(107, 114, 128, 0.9)' 
                  }}>Taekwondo Instructor</p>
                </div>
              </div>
            </motion.div>

            {/* Testimonial 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true, margin: "-100px" }}
              className="border border-red-900/30 rounded-lg p-6 relative"
              style={{
                background: isDarkMode 
                  ? 'linear-gradient(to bottom right, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.7))' 
                  : 'linear-gradient(to bottom right, rgba(255, 255, 255, 0.95), rgba(254, 242, 242, 0.9))',
                boxShadow: isDarkMode 
                  ? '0 10px 15px -3px rgba(0, 0, 0, 0.5)' 
                  : '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div className="absolute -top-5 left-6 text-5xl text-red-700">
                "
              </div>
              <p className="mb-6 relative z-10 pt-4" style={{ 
                color: isDarkMode ? 'rgba(209, 213, 219, 0.9)' : 'rgba(55, 65, 81, 0.9)' 
              }}>
                The recording feature is awesome. I can review my progress over
                time and see how much I've improved since I started using
                CoachT.
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-red-800 flex items-center justify-center text-white font-bold mr-3">
                  AL
                </div>
                <div>
                  <h4 className="font-bold" style={{ 
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)' 
                  }}>Aisha L.</h4>
                  <p className="text-sm" style={{ 
                    color: isDarkMode ? 'rgba(156, 163, 175, 0.9)' : 'rgba(107, 114, 128, 0.9)' 
                  }}>Competition Athlete</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Early Access CTA Banner */}
      <section className="py-16 relative overflow-hidden" style={{
        background: isDarkMode 
          ? 'linear-gradient(to right, #450a0a, #7f1d1d)'
          : 'linear-gradient(to right, #fee2e2, #fecaca)'
      }}>
        {/* Background particles */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={`cta-particle-${i}`}
              className="absolute rounded-full"
              style={{
                width: Math.random() * 4 + 2 + 'px',
                height: Math.random() * 4 + 2 + 'px',
                backgroundColor: isDarkMode 
                  ? `rgba(255, 255, 255, ${0.1 + Math.random() * 0.2})`
                  : `rgba(220, 38, 38, ${0.1 + Math.random() * 0.2})`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                boxShadow: isDarkMode
                  ? '0 0 10px 2px rgba(255, 255, 255, 0.1)'
                  : '0 0 10px 2px rgba(220, 38, 38, 0.1)',
              }}
              animate={{
                y: [0, Math.random() * 100 - 50],
                x: [0, Math.random() * 100 - 50],
                opacity: [0.1, 0.3, 0.1],
              }}
              transition={{
                duration: 10 + Math.random() * 20,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            />
          ))}
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="bg-gradient-to-r from-black/70 to-red-950/70 backdrop-blur-md p-6 md:p-8 rounded-xl border border-red-500/30 shadow-xl shadow-red-900/20"
            >
              <h2 className="text-3xl md:text-5xl font-bold mb-6" style={{ 
                background: isDarkMode 
                  ? 'linear-gradient(to right, #ffffff, #f0f0f0)' 
                  : 'linear-gradient(to right, #991b1b, #7f1d1d)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: isDarkMode 
                  ? '0 0 15px rgba(255, 255, 255, 0.6)' 
                  : '0 0 15px rgba(120, 20, 20, 0.4)'
              }}>
                Ready to Transform Your Training?
              </h2>
              
              <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto font-medium" style={{ 
                color: isDarkMode ? 'rgba(249, 250, 251, 0.9)' : 'rgba(249, 250, 251, 0.9)'
              }}>
                Join our exclusive early access program for students and be among the first to experience the future of Taekwondo training.
              </p>
              
              <Link
                href="/early-access"
                className="inline-flex items-center justify-center px-8 py-4 rounded-md text-lg font-medium space-x-2 group relative overflow-hidden transform transition-all duration-300 hover:scale-105"
                style={{
                  background: isDarkMode 
                    ? 'rgba(255, 255, 255, 0.15)' 
                    : 'rgba(255, 255, 255, 0.5)',
                  border: isDarkMode 
                    ? '2px solid rgba(255, 255, 255, 0.3)' 
                    : '2px solid rgba(220, 38, 38, 0.5)',
                  color: isDarkMode ? 'white' : '#7f1d1d',
                  boxShadow: isDarkMode 
                    ? '0 10px 25px -5px rgba(0, 0, 0, 0.3)' 
                    : '0 10px 25px -5px rgba(220, 38, 38, 0.2)'
                }}
              >
                <span className="relative z-10">Get Early Access Now</span>
                <span className="relative z-10 flex items-center">
                  <span className="material-icons ml-2 group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </span>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-red-900/30 relative overflow-hidden" style={{
        background: isDarkMode 
          ? 'linear-gradient(to bottom, #000000, rgba(127, 29, 29, 0.15))'
          : 'linear-gradient(to bottom, #f8f8f8, rgba(254, 226, 226, 0.2))'
      }}>
        {/* Footer background pattern */}
        <div className="absolute inset-0 z-0">
          <svg width="100%" height="100%" className="opacity-10">
            <defs>
              <pattern id="footer-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <rect width="40" height="40" fill="none" stroke="rgba(220, 38, 38, 0.2)" strokeWidth="0.5" />
                <circle cx="20" cy="20" r="1" fill="rgba(220, 38, 38, 0.2)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#footer-pattern)" />
          </svg>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start mb-12">
              <div className="mb-8 md:mb-0">
                <h2 className="gradient-heading text-3xl font-bold mb-2 inline-block">CoachT</h2>
                <p className="mb-4" style={{ 
                  color: isDarkMode ? 'rgba(156, 163, 175, 0.9)' : 'rgba(107, 114, 128, 0.9)' 
                }}>AI-Powered Martial Arts Training</p>
                
                <div className="flex space-x-4 mt-4">
                  <a href="#" className="transition-colors p-2 hover:bg-red-900/10 rounded-full" style={{ 
                    color: isDarkMode ? 'rgba(156, 163, 175, 0.9)' : 'rgba(107, 114, 128, 0.9)' 
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="hover:text-red-500">
                      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                      <rect x="2" y="9" width="4" height="12"></rect>
                      <circle cx="4" cy="4" r="2"></circle>
                    </svg>
                  </a>
                  <a href="#" className="transition-colors p-2 hover:bg-red-900/10 rounded-full" style={{ 
                    color: isDarkMode ? 'rgba(156, 163, 175, 0.9)' : 'rgba(107, 114, 128, 0.9)' 
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="hover:text-red-500">
                      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                    </svg>
                  </a>
                  <a href="#" className="transition-colors p-2 hover:bg-red-900/10 rounded-full" style={{ 
                    color: isDarkMode ? 'rgba(156, 163, 175, 0.9)' : 'rgba(107, 114, 128, 0.9)' 
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="hover:text-red-500">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                    </svg>
                  </a>
                </div>
                
                <div className="mt-6 inline-flex items-center rounded-lg border border-red-900/20 px-4 py-2" style={{
                  background: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.7)'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 mr-2">
                    <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path>
                    <line x1="16" y1="8" x2="2" y2="22"></line>
                    <line x1="17.5" y1="15" x2="9" y2="15"></line>
                  </svg>
                  <span className="text-sm" style={{ 
                    color: isDarkMode ? 'rgba(156, 163, 175, 0.9)' : 'rgba(107, 114, 128, 0.9)' 
                  }}>Powered by TensorFlow.js</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                <div>
                  <h3 className="font-bold mb-4" style={{ 
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)' 
                  }}>Platform</h3>
                  <ul className="space-y-2">
                    <li><a href="#learn-more" className="hover:text-red-500 transition-colors" style={{ 
                      color: isDarkMode ? 'rgba(156, 163, 175, 0.9)' : 'rgba(107, 114, 128, 0.9)' 
                    }}>Features</a></li>
                    <li><a href="#learn-more" className="hover:text-red-500 transition-colors" style={{ 
                      color: isDarkMode ? 'rgba(156, 163, 175, 0.9)' : 'rgba(107, 114, 128, 0.9)' 
                    }}>How it Works</a></li>
                    <li><a href="#schedule-demo" className="hover:text-red-500 transition-colors" style={{ 
                      color: isDarkMode ? 'rgba(156, 163, 175, 0.9)' : 'rgba(107, 114, 128, 0.9)' 
                    }}>Schedule Demo</a></li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-bold mb-4" style={{ 
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)' 
                  }}>Resources</h3>
                  <ul className="space-y-2">
                    <li><a href="#" className="hover:text-red-500 transition-colors" style={{ 
                      color: isDarkMode ? 'rgba(156, 163, 175, 0.9)' : 'rgba(107, 114, 128, 0.9)' 
                    }}>Documentation</a></li>
                    <li><a href="#" className="hover:text-red-500 transition-colors" style={{ 
                      color: isDarkMode ? 'rgba(156, 163, 175, 0.9)' : 'rgba(107, 114, 128, 0.9)' 
                    }}>Support</a></li>
                    <li><a href="#" className="hover:text-red-500 transition-colors" style={{ 
                      color: isDarkMode ? 'rgba(156, 163, 175, 0.9)' : 'rgba(107, 114, 128, 0.9)' 
                    }}>FAQ</a></li>
                  </ul>
                </div>
                
                <div className="col-span-2 md:col-span-1">
                  <h3 className="font-bold mb-4" style={{ 
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)' 
                  }}>Get Started</h3>
                  <div className="space-y-3">
                    <Link href="/early-access">
                      <Button
                        variant="outline"
                        className="w-full transition-all border border-red-700/30 text-red-600 hover:border-red-500 hover:text-red-500"
                        style={{
                          background: isDarkMode 
                            ? 'linear-gradient(90deg, rgba(127, 29, 29, 0.2), rgba(127, 29, 29, 0.1))' 
                            : 'linear-gradient(90deg, rgba(254, 226, 226, 0.5), rgba(254, 242, 242, 0.7))',
                          boxShadow: isDarkMode 
                            ? '0 4px 10px rgba(0, 0, 0, 0.3)' 
                            : '0 4px 10px rgba(0, 0, 0, 0.05)'
                        }}
                      >
                        <span className="flex items-center justify-center">
                          <span className="material-icons mr-2 text-sm">
                            school
                          </span>
                          <span>Student Early Access</span>
                        </span>
                      </Button>
                    </Link>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full transition-all border border-red-700/50 text-red-500 hover:border-red-500"
                          style={{
                            background: isDarkMode 
                              ? 'linear-gradient(to bottom right, #000000, rgba(0, 0, 0, 0.8))' 
                              : 'linear-gradient(to bottom right, #ffffff, rgba(255, 255, 255, 0.9))',
                            boxShadow: isDarkMode 
                              ? '0 4px 10px rgba(0, 0, 0, 0.3)' 
                              : '0 4px 10px rgba(0, 0, 0, 0.1)'
                          }}
                        >
                          <span className="flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                            <span>Developer Login</span>
                          </span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px] modal-premium" style={{
                        background: isDarkMode ? 'linear-gradient(to bottom, #111, #000)' : 'linear-gradient(to bottom, #fff, #f8f8f8)'
                      }}>
                        <div className="text-center p-4">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-900 to-red-700 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                              <circle cx="12" cy="12" r="10"></circle>
                              <circle cx="12" cy="10" r="3"></circle>
                              <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"></path>
                            </svg>
                          </div>
                          
                          <h3 className="text-xl font-bold mb-4">Developer Access</h3>
                          <p className="text-sm mb-4" style={{ 
                            color: isDarkMode ? 'rgba(156, 163, 175, 0.9)' : 'rgba(107, 114, 128, 0.9)' 
                          }}>
                            Please enter the developer password to access the CoachT application.
                          </p>
                          {showPasswordError && (
                            <p className="text-red-500 text-sm mb-4 flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                              </svg>
                              Incorrect password. Please try again.
                            </p>
                          )}
                          <Input
                            type="password"
                            placeholder="Enter password"
                            className="mb-4"
                            style={{
                              background: isDarkMode ? 'rgba(31, 41, 55, 0.8)' : 'rgba(249, 250, 251, 0.8)',
                              borderColor: isDarkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.8)',
                              color: isDarkMode ? 'rgba(229, 231, 235, 0.9)' : 'rgba(17, 24, 39, 0.9)'
                            }}
                            value={developerPassword}
                            onChange={(e) => setDeveloperPassword(e.target.value)}
                          />
                          <div className="flex justify-end space-x-2">
                            <DialogClose asChild>
                              <Button
                                variant="ghost"
                                className={isDarkMode 
                                  ? "bg-transparent text-gray-400 hover:bg-gray-800 hover:text-white transition-colors" 
                                  : "bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                                }
                              >
                                Cancel
                              </Button>
                            </DialogClose>
                            <Button
                              onClick={handleDeveloperLogin}
                              className={`${isDarkMode ? 'btn-gradient' : 'btn-gradient-light'} ${
                                isPasswordCorrect
                                  ? "opacity-50 pointer-events-none"
                                  : ""
                              }`}
                            >
                              {isPasswordCorrect ? (
                                <span className="flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                    <path d="M20 6 9 17l-5-5"></path>
                                  </svg>
                                  Redirecting...
                                </span>
                              ) : (
                                <span className="flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                                    <polyline points="10 17 15 12 10 7"></polyline>
                                    <line x1="15" y1="12" x2="3" y2="12"></line>
                                  </svg>
                                  Access App
                                </span>
                              )}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            </div>
  
            <div className="pt-8 border-t border-red-900/30 text-center flex flex-col md:flex-row justify-between items-center">
              <p className="text-sm mb-4 md:mb-0" style={{ 
                color: isDarkMode ? 'rgba(156, 163, 175, 0.7)' : 'rgba(107, 114, 128, 0.7)' 
              }}>
                &copy; {new Date().getFullYear()} CoachT. All rights reserved.
              </p>
              
              <div className="flex space-x-6 text-sm">
                <a href="#" className="hover:text-red-500 transition-colors" style={{ 
                  color: isDarkMode ? 'rgba(156, 163, 175, 0.7)' : 'rgba(107, 114, 128, 0.7)' 
                }}>Privacy Policy</a>
                <a href="#" className="hover:text-red-500 transition-colors" style={{ 
                  color: isDarkMode ? 'rgba(156, 163, 175, 0.7)' : 'rgba(107, 114, 128, 0.7)' 
                }}>Terms of Service</a>
                <a href="#" className="hover:text-red-500 transition-colors" style={{ 
                  color: isDarkMode ? 'rgba(156, 163, 175, 0.7)' : 'rgba(107, 114, 128, 0.7)' 
                }}>Cookie Policy</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
