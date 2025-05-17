import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useLocation } from "wouter";
import { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence, useAnimationControls, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
  beltColor: z.string().min(1, "Please select your current belt"),
  experienceTime: z.string().min(1, "Please specify how long you've been training"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [location, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("login");
  const [introComplete, setIntroComplete] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [startLogoAnimation, setStartLogoAnimation] = useState(false);
  const [revealElements, setRevealElements] = useState(false);
  const [glitchEffect, setGlitchEffect] = useState(false);
  const backgroundControls = useAnimationControls();
  const logoControls = useAnimationControls();
  const contentControls = useAnimationControls();
  const glowControls = useAnimationControls();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothMouseX = useSpring(mouseX, { damping: 50, stiffness: 300 });
  const smoothMouseY = useSpring(mouseY, { damping: 50, stiffness: 300 });
  const [typedText, setTypedText] = useState("");
  const [logoColorTransition, setLogoColorTransition] = useState(false);
  const [cornerGradientVisible, setCornerGradientVisible] = useState(false);
  const [skeletonAnimationStep, setSkeletonAnimationStep] = useState(0);
  
  // Password visibility toggles
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Feature Card component for glass-like cards
  interface FeatureCardProps {
    icon: string;
    title: string;
    description: string;
    glassEffect?: boolean;
  }
  
  const FeatureCard = ({ icon, title, description, glassEffect = false }: FeatureCardProps) => (
    <motion.div
      className={`p-5 rounded-2xl backdrop-blur-lg border ${glassEffect ? 'border-white/20 bg-white/10' : 'border-red-500/20 bg-gradient-to-br from-gray-900/80 to-black/80'} 
        transition-all duration-300 transform hover:scale-105 hover:border-red-500/40 shadow-lg`}
      whileHover={{ 
        boxShadow: '0 10px 40px rgba(255,255,255,0.15)',
        y: -5,
        rotate: Math.random() > 0.5 ? 5 : -5
      }}
    >
      <div className="flex items-start relative z-10">
        <div 
          className="w-12 h-12 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center mr-4 shadow-[0_0_15px_rgba(255,0,0,0.2)]"
        >
          <span className="material-icons text-white text-xl m-0 p-0 flex items-center justify-center h-full w-full">{icon}</span>
        </div>
        <div>
          <h3 className="font-bold text-white text-lg mb-1">{title}</h3>
          <p className="text-sm text-white/80">{description}</p>
        </div>
      </div>
    </motion.div>
  );

  // Animated Taekwondo Skeleton Component
  const TaekwondoSkeleton = () => {
    // Animation sequence for taekwondo moves
    useEffect(() => {
      const interval = setInterval(() => {
        setSkeletonAnimationStep(prev => (prev + 1) % 4);
      }, 1800);
      
      return () => clearInterval(interval);
    }, []);

    // Different poses for the skeleton animation - focusing on punching
    const getPose = () => {
      switch(skeletonAnimationStep) {
        case 0: return { // Ready stance
          left: { rotate: 0, x: -40 },
          right: { rotate: 0, x: 40 },
          leftLeg: { rotate: 0, y: 60 },
          rightLeg: { rotate: 0, y: 60 },
          body: { rotate: 0 },
          y: 0
        };
        case 1: return { // Left punch
          left: { rotate: -90, x: 30 },
          right: { rotate: -20, x: 40 },
          leftLeg: { rotate: -5, y: 60 },
          rightLeg: { rotate: 5, y: 60 },
          body: { rotate: -15 },
          y: 0
        };
        case 2: return { // Right punch
          left: { rotate: -20, x: -40 },
          right: { rotate: -90, x: -30 },
          leftLeg: { rotate: 5, y: 60 },
          rightLeg: { rotate: -5, y: 60 },
          body: { rotate: 15 },
          y: 0
        };
        case 3: return { // Double punch
          left: { rotate: -90, x: 20 },
          right: { rotate: -90, x: -20 },
          leftLeg: { rotate: -10, y: 60 },
          rightLeg: { rotate: 10, y: 60 },
          body: { rotate: 0 },
          y: -10
        };
        default: return { // Default stance
          left: { rotate: 0, x: -40 },
          right: { rotate: 0, x: 40 },
          leftLeg: { rotate: 0, y: 60 },
          rightLeg: { rotate: 0, y: 60 },
          body: { rotate: 0 },
          y: 0
        };
      }
    };

    const pose = getPose();

    return (
      <div className="relative h-60 w-60">
        <motion.div 
          className="absolute left-1/2 top-10 h-32 w-1.5 bg-white/40 rounded-full origin-top"
          animate={{ 
            rotate: pose.body.rotate,
            y: pose.y
          }}
          transition={{ duration: 0.3, ease: "anticipate" }}
        >
          {/* Head */}
          <motion.div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-12 rounded-full border-2 border-red-500/60 bg-white/10 shadow-[0_0_15px_rgba(255,0,0,0.3)]" />
          
          {/* Arms */}
          <motion.div 
            className="absolute top-8 left-0 h-1.5 w-20 bg-white/40 rounded-full origin-left"
            animate={{ rotate: pose.left.rotate, x: pose.left.x }}
            transition={{ duration: 0.3, ease: "anticipate" }}
          >
            <motion.div className="absolute right-0 top-0 h-4 w-4 rounded-full bg-red-500/60 shadow-[0_0_10px_rgba(255,0,0,0.5)]" />
          </motion.div>
          
          <motion.div 
            className="absolute top-8 right-0 h-1.5 w-20 bg-white/40 rounded-full origin-right"
            animate={{ rotate: pose.right.rotate, x: pose.right.x }}
            transition={{ duration: 0.3, ease: "anticipate" }}
          >
            <motion.div className="absolute left-0 top-0 h-4 w-4 rounded-full bg-red-500/60 shadow-[0_0_10px_rgba(255,0,0,0.5)]" />
          </motion.div>
          
          {/* Legs */}
          <motion.div 
            className="absolute bottom-0 left-0 h-1.5 w-24 bg-white/40 rounded-full origin-top-left"
            animate={{ rotate: pose.leftLeg.rotate, y: pose.leftLeg.y }}
            transition={{ duration: 0.3, ease: "anticipate" }}
          >
            <motion.div className="absolute right-0 top-0 h-4 w-4 rounded-full bg-red-500/60 shadow-[0_0_10px_rgba(255,0,0,0.5)]" />
          </motion.div>
          
          <motion.div 
            className="absolute bottom-0 right-0 h-1.5 w-24 bg-white/40 rounded-full origin-top-right"
            animate={{ rotate: pose.rightLeg.rotate, y: pose.rightLeg.y }}
            transition={{ duration: 0.3, ease: "anticipate" }}
          >
            <motion.div className="absolute left-0 top-0 h-4 w-4 rounded-full bg-red-500/60 shadow-[0_0_10px_rgba(255,0,0,0.5)]" />
          </motion.div>
        </motion.div>
        
        {/* Shadow */}
        <motion.div 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 h-3 w-32 bg-red-500/20 rounded-full blur-md"
          animate={{ 
            width: [30, 40, 30],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
          }}
        />
        
        {/* Motion trails for punches */}
        {(skeletonAnimationStep === 1 || skeletonAnimationStep === 2 || skeletonAnimationStep === 3) && (
          <motion.div 
            className="absolute"
            style={{
              top: "35%",
              left: skeletonAnimationStep === 1 ? "65%" : skeletonAnimationStep === 2 ? "35%" : "50%"
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: [0, 0.5, 0],
              scale: [0.8, 1.5, 0.8]
            }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="h-8 w-8 rounded-full bg-red-500/30 blur-md" />
          </motion.div>
        )}
      </div>
    );
  };
  
  // Mouse parallax effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const x = clientX / window.innerWidth;
      const y = clientY / window.innerHeight;
      mouseX.set(x);
      mouseY.set(y);
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  // Generate particles
  const particles = useMemo(() => 
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      size: 2 + Math.random() * 6,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: 5 + Math.random() * 15,
      delay: Math.random() * 5
    })), []
  );

  // Check URL for tab parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'register') {
      setActiveTab('register');
    }
  }, []);

  // Enhanced intro animation sequence
  useEffect(() => {
    const introSequence = async () => {
      // Start with blank screen (pure black)
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Fade in logo in the middle of the screen
      setStartLogoAnimation(true);
      await logoControls.start({
        scale: [0, 1],
        opacity: [0, 1],
        transition: { duration: 0.5, ease: "easeOut" }
      });
      
      // Type out C o a c h T letter by letter
      const letters = ["C", " o", " a", " c", " h", " T"];
      setTypedText("");
      
      // Type each letter with a small delay
      for (let i = 0; i < letters.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setTypedText(prev => prev + letters[i]);
      }
      
      // Transition screen to red gradient from corners
      setCornerGradientVisible(true);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Change logo color to black with red border for contrast
      setLogoColorTransition(true);
      
      // Complete intro and show content
      await new Promise(resolve => setTimeout(resolve, 400));
      setIntroComplete(true);
      setShowContent(true);
      setTimeout(() => setRevealElements(true), 100);
    };
    
    introSequence();
  }, [logoControls]);

  // If the user is already logged in, redirect to home page
  useEffect(() => {
    if (user) {
      navigate("/app");
    }
  }, [user, navigate]);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      beltColor: "",
      experienceTime: ""
    },
  });

  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    // Call the registration mutation directly with the form data
    registerMutation.mutate(data);
  };

  // Function to calculate the approximate start date based on experience input
  const calculateApproximateStart = (experienceText: string) => {
    const dateElement = document.getElementById('approx-date');
    const messageContainer = document.getElementById('approximate-start-message');
    if (!dateElement || !messageContainer) return;
    
    const currentDate = new Date();
    let monthsAgo = 0;
    
    // Try to parse years and months from the input text
    const yearsMatch = experienceText.match(/(\d+)\s*years?/i);
    const monthsMatch = experienceText.match(/(\d+)\s*months?/i);
    
    if (yearsMatch && yearsMatch[1]) {
      monthsAgo += parseInt(yearsMatch[1]) * 12;
    }
    
    if (monthsMatch && monthsMatch[1]) {
      monthsAgo += parseInt(monthsMatch[1]);
    }
    
    // If we couldn't parse anything meaningful, hide the message
    if (monthsAgo === 0) {
      messageContainer.style.opacity = '0';
      messageContainer.style.visibility = 'hidden';
      return;
    }
    
    // Calculate the approximate start date
    const startDate = new Date(currentDate);
    startDate.setMonth(startDate.getMonth() - monthsAgo);
    
    // Format the date as "Month, Year"
    const month = startDate.toLocaleString('default', { month: 'long' });
    const year = startDate.getFullYear();
    
    dateElement.textContent = `${month}, ${year}`;
    
    // Show the message
    messageContainer.style.opacity = '1';
    messageContainer.style.visibility = 'visible';
  };

  // Calculate initial date if value is already set
  const calculateInitialDate = (value: string) => {
    if (!value) return '';
    
    const currentDate = new Date();
    let monthsAgo = 0;
    
    const yearsMatch = value.match(/(\d+)\s*years?/i);
    const monthsMatch = value.match(/(\d+)\s*months?/i);
    
    if (yearsMatch && yearsMatch[1]) {
      monthsAgo += parseInt(yearsMatch[1]) * 12;
    }
    
    if (monthsMatch && monthsMatch[1]) {
      monthsAgo += parseInt(monthsMatch[1]);
    }
    
    if (monthsAgo === 0) return '';
    
    const startDate = new Date(currentDate);
    startDate.setMonth(startDate.getMonth() - monthsAgo);
    
    const month = startDate.toLocaleString('default', { month: 'long' });
    const year = startDate.getFullYear();
    
    return `${month}, ${year}`;
  };

  // Fix for motion value transforms - pre-compute these values outside of render
  const beamXPosition = useTransform(smoothMouseX, [0, 1], [-20, 20]);
  const beamXPosition2 = useTransform(smoothMouseX, [0, 1], [20, -20]);
  const radialGradientPosition = {
    x: useTransform(smoothMouseX, [0, 1], ['0%', '100%']),
    y: useTransform(smoothMouseY, [0, 1], ['0%', '100%'])
  };
  const gridTransform = {
    x: useTransform(smoothMouseX, [0, 1], [-20, 20]),
    y: useTransform(smoothMouseY, [0, 1], [-20, 20])
  };
  const rotateX = useTransform(smoothMouseY, [0, 1], [5, -5]);
  const rotateY = useTransform(smoothMouseX, [0, 1], [-5, 5]);
  const cardRotateX = useTransform(smoothMouseY, [0, 1], [2, -2]);
  const cardRotateY = useTransform(smoothMouseX, [0, 1], [-2, 2]);
  const cardRotateX2 = useTransform(smoothMouseY, [0, 1], [3, -3]);
  const cardRotateY2 = useTransform(smoothMouseX, [0, 1], [-3, 3]);
  const glassShinePosition = useTransform(smoothMouseX, [0, 1], ['-100%', '100%']);

  return (
    <div 
      className="min-h-screen w-full overflow-hidden flex items-center justify-center relative bg-black"
      style={{ 
        perspective: "1000px",
        perspectiveOrigin: "center"
      }}
    >
      {/* Glitch overlay */}
      {glitchEffect && (
        <div className="absolute inset-0 z-50 bg-red-500/5 mix-blend-screen pointer-events-none">
          <div className="absolute inset-0 opacity-20 mix-blend-overlay animate-pulse"
               style={{
                 backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                 backgroundSize: '200px 200px'
               }}
          ></div>
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={`glitch-${i}`}
              className="absolute h-1 bg-red-500/80 left-0 right-0"
              style={{ 
                top: `${Math.random() * 100}%`,
                left: `${Math.random() > 0.5 ? '-5%' : '0%'}`,
                width: `${100 + Math.random() * 10}%`,
                height: `${1 + Math.random() * 3}px`,
                opacity: 0.7 + Math.random() * 0.3,
                filter: 'blur(0.5px)'
              }}
              animate={{
                x: [0, Math.random() > 0.5 ? '100%' : '-100%', 0],
                opacity: [0.7, 0.9, 0.7]
              }}
              transition={{
                duration: 0.15,
                ease: "easeInOut",
                repeat: 1
              }}
            />
          ))}
              </div>
      )}
    
      {/* Animated Background */}
      <motion.div 
        className="absolute inset-0 z-0 overflow-hidden"
        animate={backgroundControls}
        initial={{ opacity: 0 }}
      >
        {/* Red gradient background */}
        <motion.div 
          className="absolute inset-0 bg-gradient-radial from-red-800 via-red-900 to-black opacity-90"
          style={{
            backgroundPosition: useTransform(
              smoothMouseX, 
              [0, 1], 
              ['0% 0%', '100% 0%']
            ),
            backgroundSize: '200% 200%'
          }}
        />
        
        {/* Animated grid */}
        <motion.div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,0,0,0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,0,0,0.05) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            x: gridTransform.x,
            y: gridTransform.y
          }}
        />

        {introComplete && (
          <>
            {/* Ambient orbs/lights */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={`orb-${i}`}
                className="absolute rounded-full"
                style={{
                  background: `radial-gradient(circle, rgba(255,0,0,${0.1 + Math.random() * 0.2}) 0%, rgba(255,0,0,0) 70%)`,
                  width: `${150 + Math.random() * 350}px`,
                  height: `${150 + Math.random() * 350}px`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  filter: 'blur(60px)',
                  mixBlendMode: 'color-dodge'
                }}
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: [0, 0.3 + Math.random() * 0.5, 0],
                  scale: [0.8, 1 + Math.random() * 0.5, 0.8],
                  x: [0, Math.random() > 0.5 ? 50 : -50, 0],
                  y: [0, Math.random() > 0.5 ? 50 : -50, 0]
                }}
                transition={{
                  duration: 8 + Math.random() * 15,
                  repeat: Infinity,
                  delay: Math.random() * 5,
                  ease: "easeInOut"
                }}
              />
            ))}

            {/* Advanced particles */}
            {particles.map(particle => (
              <motion.div
                key={`particle-${particle.id}`}
                className="absolute rounded-full"
                style={{
                  background: `radial-gradient(circle, rgba(255,${Math.random() > 0.5 ? 100 : 0},0,0.8) 0%, rgba(255,${Math.random() > 0.7 ? 100 : 0},0,0) 80%)`,
                  width: `${particle.size}px`,
                  height: `${particle.size}px`,
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                  filter: 'blur(1px)',
                  opacity: 0
                }}
                animate={{ 
                  opacity: [0, 0.7 + Math.random() * 0.3, 0],
                  scale: [0, 1, 0],
                  x: [0, (Math.random() - 0.5) * 200, 0],
                  y: [0, (Math.random() - 0.5) * 200, 0],
                  filter: ['blur(2px)', 'blur(1px)', 'blur(2px)']
                }}
                transition={{
                  duration: particle.duration,
                  repeat: Infinity,
                  delay: particle.delay,
                  ease: "easeInOut"
                }}
              />
            ))}
            
            {/* Horizontal laser beams */}
            <motion.div
              className="absolute top-1/3 h-[1px] left-0 right-0 bg-gradient-to-r from-red-500/0 via-red-500/70 to-red-500/0"
              style={{ 
                boxShadow: '0 0 20px 5px rgba(255,0,0,0.3), 0 0 40px 10px rgba(255,0,0,0.1)'
              }}
              animate={{ 
                scaleY: [1, 20, 1],
                opacity: [0, 0.5, 0],
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity,
                repeatDelay: 6,
                ease: "easeInOut"
              }}
            />
            
            <motion.div
              className="absolute top-2/3 h-[1px] left-0 right-0 bg-gradient-to-r from-red-500/0 via-orange-500/70 to-red-500/0"
              style={{ 
                boxShadow: '0 0 20px 5px rgba(255,100,0,0.3), 0 0 40px 10px rgba(255,100,0,0.1)'
              }}
              animate={{ 
                scaleY: [1, 20, 1],
                opacity: [0, 0.5, 0],
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity,
                repeatDelay: 5,
                delay: 3,
                ease: "easeInOut"
              }}
            />
            
            {/* Vertical light beams - enhanced */}
            <motion.div
              className="absolute h-screen w-[30px] right-[10%] opacity-40"
              style={{ 
                background: "linear-gradient(to bottom, #ff4d4d, #ff0000, #990000)",
                filter: "blur(25px)",
                mixBlendMode: "screen",
                x: beamXPosition
              }}
              animate={{ 
                height: ["100vh", "130vh", "100vh"],
                y: ["-10vh", "0vh", "-10vh"],
                opacity: [0.2, 0.4, 0.2]
              }}
              transition={{ 
                duration: 10, 
                repeat: Infinity, 
                ease: "easeInOut",
                delay: 1
              }}
            />
            
            <motion.div
              className="absolute h-screen w-[20px] right-[25%] opacity-30"
              style={{ 
                background: "linear-gradient(to bottom, #ff9900, #ff6600, #cc3300)",
                filter: "blur(20px)",
                mixBlendMode: "screen",
                x: beamXPosition2
              }}
              animate={{ 
                height: ["100vh", "120vh", "100vh"],
                y: ["5vh", "-5vh", "5vh"],
                opacity: [0.3, 0.5, 0.3]
              }}
              transition={{ 
                duration: 8, 
                repeat: Infinity, 
                ease: "easeInOut",
                delay: 2
              }}
            />
            
            {/* Advanced mesh grid with 3D effect */}
            <motion.div 
              className="absolute inset-0 opacity-10"
              style={{
                background: `radial-gradient(circle at ${radialGradientPosition.x} ${radialGradientPosition.y}, rgba(255,0,0,0.2) 0%, rgba(255,0,0,0) 60%)`,
                rotateX: rotateX,
                rotateY: rotateY,
                backgroundSize: '100px 100px'
              }}
            />
            
            {/* Fog overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-70 mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black opacity-70 mix-blend-overlay"></div>
          </>
        )}
      </motion.div>

      {/* Intro Animation - Logo */}
      {!introComplete && (
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          <div className="flex flex-col items-center justify-center">
            {/* Main logo */}
            <motion.div 
              className="flex justify-center items-center mb-4"
              animate={logoControls}
              initial={{ opacity: 0, scale: 0 }}
            >
              <div className={`h-32 w-32 rounded-full ${logoColorTransition ? 'bg-black border-4 border-red-500' : 'bg-gradient-to-br from-red-700 to-red-600'} flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.6)]`}>
                <span className={`material-icons ${logoColorTransition ? 'text-red-500' : 'text-white'} text-6xl`}>sports_martial_arts</span>
              </div>
            </motion.div>
            
            {/* Typed text */}
            <motion.div
              className="text-center mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <h1 className={`text-4xl font-bold ${logoColorTransition ? 'text-black' : 'text-white'}`}>
                {typedText}<span className={`animate-pulse ${logoColorTransition ? 'text-black' : 'text-white'}`}>|</span>
              </h1>
            </motion.div>
          </div>
          
          {/* Corner gradients */}
          {cornerGradientVisible && (
            <>
              <motion.div 
                className="absolute top-0 left-0 w-1/2 h-1/2 bg-gradient-to-br from-red-600 to-transparent pointer-events-none"
                initial={{ opacity: 0, scale: 0, x: "-50%", y: "-50%" }}
                animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                transition={{ duration: 0.5 }}
              />
              <motion.div 
                className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-red-600 to-transparent pointer-events-none"
                initial={{ opacity: 0, scale: 0, x: "50%", y: "-50%" }}
                animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                transition={{ duration: 0.5, delay: 0.05 }}
              />
              <motion.div 
                className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-to-tr from-red-600 to-transparent pointer-events-none"
                initial={{ opacity: 0, scale: 0, x: "-50%", y: "50%" }}
                animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              />
              <motion.div 
                className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-to-tl from-red-600 to-transparent pointer-events-none"
                initial={{ opacity: 0, scale: 0, x: "50%", y: "50%" }}
                animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
              />
              <motion.div 
                className="absolute inset-0 bg-red-600 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.9 }}
                transition={{ duration: 0.4, delay: 0.6 }}
              />
            </>
          )}
        </div>
      )}

      {/* Main Content - Enhanced */}
      <AnimatePresence>
        {showContent && (
          <motion.div 
            className="relative z-10 w-full h-full mx-auto flex flex-col justify-center items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* CoachT Logo at top */}
            <motion.div
              className="absolute top-8 z-20"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-red-700 to-red-600 flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.6)]">
                  <span className="material-icons text-white text-3xl">sports_martial_arts</span>
                </div>
                <h1 className="text-4xl font-bold text-white">CoachT</h1>
              </div>
            </motion.div>
            
            {/* Centered Auth Form */}
            <motion.div 
              className="relative z-20 w-full max-w-md mx-auto px-4 mt-40" 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              style={{
                rotateX: cardRotateX2,
                rotateY: cardRotateY2,
                perspective: "1000px"
              }}
            >
              <div className="w-full relative">
                {/* Glass reflection effect */}
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-transparent rounded-xl opacity-0 pointer-events-none"
                  animate={{ 
                    opacity: [0, 0.2, 0],
                    x: ['-100%', '100%', '-100%'],
                  }}
                  transition={{ 
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                
                <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-900/40 backdrop-blur-md p-1 border border-red-900/30 rounded-lg overflow-hidden">
                    <TabsTrigger 
                      value="login" 
                      className="text-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-700 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-[0_5px_15px_rgba(220,38,38,0.4)] text-gray-300 relative z-0 rounded-md overflow-hidden"
                    >
                      <motion.div 
                        className="absolute inset-0 w-full h-full -z-10 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full"
                        animate={{ translateX: ['100%', '-100%'] }}
                        transition={{ 
                          duration: 1.5,
                          repeat: Infinity,
                          repeatDelay: 3
                        }}
                      />
                      Login
                    </TabsTrigger>
                    <TabsTrigger 
                      value="register" 
                      className="text-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-700 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-[0_5px_15px_rgba(220,38,38,0.4)] text-gray-300 relative z-0 rounded-md overflow-hidden"
                    >
                      <motion.div 
                        className="absolute inset-0 w-full h-full -z-10 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full"
                        animate={{ translateX: ['100%', '-100%'] }}
                        transition={{ 
                          duration: 1.5,
                          repeat: Infinity,
                          repeatDelay: 2.5,
                          delay: 0.5
                        }}
                      />
                      Register
                    </TabsTrigger>
                  </TabsList>
                  
                  {/* Existing login/register form content */}
                  <TabsContent value="login">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key="login-card"
                        initial={{ opacity: 0, y: 20, rotateX: 10 }}
                        animate={{ opacity: 1, y: 0, rotateX: 0 }}
                        exit={{ opacity: 0, y: -20, rotateX: -10 }}
                        transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
                      >
                        <Card className="border-red-900/30 bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-lg overflow-hidden relative">
                          {/* Enhanced shadow and lighting */}
                          <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(220,38,38,0.15)] pointer-events-none"></div>
                          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-red-500/0 to-transparent pointer-events-none"></div>
                          
                          {/* Glass shine effect */}
                          <motion.div
                            className="absolute inset-0 opacity-20"
                            style={{
                              background: 'linear-gradient(45deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)',
                              x: glassShinePosition
                            }}
                          />
                          
                          {/* Edge light effect */}
                          <div className="absolute inset-0 shadow-[0_10px_50px_rgba(220,38,38,0.25)] opacity-50 pointer-events-none"></div>
                          
                <CardHeader>
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1, duration: 0.4 }}
                            >
                              <CardTitle className="text-2xl font-bold">
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-red-300">
                                  Login to Your Account
                                </span>
                              </CardTitle>
                  <CardDescription className="text-gray-300">Enter your credentials to access your CoachT dashboard</CardDescription>
                            </motion.div>
                </CardHeader>
                          
                          {/* Rest of login form with enhanced inputs */}
                <CardContent>
                  <Form {...loginForm}>
                    <form id="login-form" onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.2, duration: 0.4 }}
                                >
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white text-base">Username</FormLabel>
                                        <div className="relative">
                            <FormControl>
                              <Input 
                                placeholder="Enter your username" 
                                {...field} 
                                              className="bg-gray-800/70 backdrop-blur-md border-gray-700/50 text-white focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all pr-10"
                              />
                            </FormControl>
                                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500/70">
                                            <span className="material-icons text-xl">person</span>
                                          </div>
                                          <motion.div 
                                            className="absolute -inset-[1px] rounded-md border border-red-500/30 pointer-events-none opacity-0"
                                            animate={{ opacity: [0, 0.8, 0] }}
                                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                                          />
                                        </div>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                                </motion.div>
                      
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.3, duration: 0.4 }}
                                >
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white text-base">Password</FormLabel>
                                        <div className="relative">
                            <FormControl>
                              <Input 
                                type={showLoginPassword ? "text" : "password"}
                                placeholder="Enter your password" 
                                {...field} 
                                              className="bg-gray-800/70 backdrop-blur-md border-gray-700/50 text-white focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all pr-10"
                              />
                            </FormControl>
                                          <button 
                                            type="button"
                                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                          >
                                            <span className="material-icons text-xl">
                                              {showLoginPassword ? "visibility_off" : "visibility"}
                                            </span>
                                          </button>
                                          <motion.div 
                                            className="absolute -inset-[1px] rounded-md border border-red-500/30 pointer-events-none opacity-0"
                                            animate={{ opacity: [0, 0.8, 0] }}
                                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.5, delay: 0.5 }}
                                          />
                                        </div>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                                </motion.div>
                    </form>
                  </Form>
                </CardContent>
                          
                <CardFooter className="flex flex-col space-y-4">
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.4, duration: 0.4 }}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              className="w-full"
                            >
                  <Button 
                    type="submit" 
                    form="login-form" 
                                className="w-full bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white text-lg py-6 shadow-[0_5px_15px_rgba(220,38,38,0.3)] hover:shadow-[0_5px_25px_rgba(220,38,38,0.5)] transition-all duration-300 relative overflow-hidden group"
                    disabled={loginMutation.isPending}
                  >
                                {/* Button light sweep effect */}
                                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                
                                {/* Button glow pulse */}
                                <motion.div 
                                  className="absolute inset-0 opacity-0 bg-gradient-to-r from-red-500/0 via-red-500/20 to-red-500/0"
                                  animate={{ 
                                    opacity: [0, 1, 0],
                                    x: ['-100%', '100%']
                                  }}
                                  transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    repeatDelay: 1
                                  }}
                                />
                                
                    {loginMutation.isPending ? 
                      <span className="flex items-center">
                                    <motion.span 
                                      className="material-icons mr-2"
                                      animate={{ rotate: 360 }}
                                      transition={{ 
                                        duration: 1,
                                        repeat: Infinity,
                                        ease: "linear" 
                                      }}
                                    >
                                      refresh
                                    </motion.span>
                        Signing in...
                      </span> : 
                                  <>
                                    {/* Button inner elements with staggered animations */}
                                    <motion.span 
                                      className="relative flex items-center"
                                      whileHover={{
                                        scale: revealElements ? 1.03 : 1
                                      }}
                                    >
                                      <motion.span 
                                        className="material-icons mr-2" 
                                        animate={revealElements ? {
                                          y: [5, 0],
                                          opacity: [0, 1],
                                          rotateY: [90, 0]
                                        } : {}}
                                        transition={{ 
                                          duration: 0.4, 
                                          delay: 0.3 
                                        }}
                                      >
                                        login
                                      </motion.span>
                                      
                                      <motion.span
                                        animate={revealElements ? {
                                          y: [5, 0],
                                          opacity: [0, 1]
                                        } : {}}
                                        transition={{ 
                                          duration: 0.4, 
                                          delay: 0.4 
                                        }}
                                      >
                                        Sign In
                                      </motion.span>
                                    </motion.span>
                                  </>
                    }
                  </Button>
                            </motion.div>
                            
                            <motion.div 
                              className="w-full text-center pt-2"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.5, duration: 0.4 }}
                            >
                    <p className="text-gray-400">
                      Don't have an account?{" "}
                      <button 
                        type="button" 
                        onClick={() => setActiveTab("register")}
                                  className="text-red-400 hover:text-red-300 font-semibold relative group"
                      >
                        Register here
                                  <motion.span 
                                    className="absolute left-0 bottom-0 h-0.5 bg-red-400 w-0 group-hover:w-full transition-all duration-300"
                                    animate={revealElements ? { 
                                      width: ["0%", "100%", "0%"],
                                      opacity: [0.5, 1, 0.5] 
                                    } : {}}
                                    transition={{ 
                                      duration: 2, 
                                      repeat: Infinity,
                                      repeatDelay: 3,
                                      ease: "easeInOut" 
                                    }}
                                  />
                      </button>
                    </p>
                            </motion.div>
                </CardFooter>
              </Card>
                      </motion.div>
                      
                      {/* Forgot username/password link - positioned outside the card */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.4 }}
                        className="mt-4 text-center"
                      >
                        <a 
                          href="mailto:ojaskandy@gmail.com?subject=Account Recovery Request&body=Name:%0D%0AEmail address:%0D%0AReason for reaching out:%0D%0A"
                          className="px-4 py-2 text-sm inline-block bg-red-600/30 hover:bg-red-600/50 text-white rounded-md border border-red-500/50 transition-all duration-300 shadow-lg hover:shadow-red-500/20"
                          onClick={(e) => {
                            // Direct mailto: link without preventing default
                            window.location.href = "mailto:ojaskandy@gmail.com?subject=Account Recovery Request&body=Name:%0D%0AEmail address:%0D%0AReason for reaching out:%0D%0A";
                          }}
                        >
                          <span className="flex items-center">
                            <span className="material-icons mr-2 text-base">mail</span>
                            Forgot username/password? Contact support
                          </span>
                        </a>
                      </motion.div>
                    </AnimatePresence>
                  </TabsContent>
                  
                  <TabsContent value="register">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key="register-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card className="border-red-900/30 bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-lg shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none"></div>
                <CardHeader>
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1, duration: 0.4 }}
                            >
                  <CardTitle className="text-2xl font-bold text-red-500">Create an Account</CardTitle>
                  <CardDescription className="text-gray-300">Register to save your training sessions and settings</CardDescription>
                            </motion.div>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form id="register-form" onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.2, duration: 0.4 }}
                                >
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white text-base">Username</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Choose a username" 
                                {...field} 
                                            className="bg-gray-800/70 backdrop-blur-md border-gray-700/50 text-white focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all"
                              />
                            </FormControl>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                                </motion.div>
                      
                                {/* Email field */}
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.3, duration: 0.4 }}
                                >
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white text-base">Email Address</FormLabel>
                            <FormControl>
                              <Input 
                                type="email"
                                placeholder="Enter your email address" 
                                {...field} 
                                className="bg-gray-800/70 backdrop-blur-md border-gray-700/50 text-white focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all"
                              />
                            </FormControl>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                                </motion.div>
                                
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.4, duration: 0.4 }}
                                >
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white text-base">Password</FormLabel>
                            <div className="relative">
                              <FormControl>
                                <Input 
                                  type={showRegisterPassword ? "text" : "password"}
                                  placeholder="Create a password" 
                                  {...field}
                                  className="bg-gray-800/70 backdrop-blur-md border-gray-700/50 text-white focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all pr-10"
                                />
                              </FormControl>
                              <button 
                                type="button"
                                onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                              >
                                <span className="material-icons text-xl">
                                  {showRegisterPassword ? "visibility_off" : "visibility"}
                                </span>
                              </button>
                            </div>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                                </motion.div>
                      
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.4, duration: 0.4 }}
                                >
                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white text-base">Confirm Password</FormLabel>
                            <div className="relative">
                              <FormControl>
                                <Input 
                                  type={showConfirmPassword ? "text" : "password"}
                                  placeholder="Confirm your password" 
                                  {...field}
                                  className="bg-gray-800/70 backdrop-blur-md border-gray-700/50 text-white focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all pr-10"
                                />
                              </FormControl>
                              <button 
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                              >
                                <span className="material-icons text-xl">
                                  {showConfirmPassword ? "visibility_off" : "visibility"}
                                </span>
                              </button>
                            </div>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                                </motion.div>
                      
                                {/* New Belt Color field with stripe indicators */}
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.5, duration: 0.4 }}
                                >
                                  <FormField
                                    control={registerForm.control}
                                    name="beltColor"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-white text-base">Current Belt</FormLabel>
                                        <FormControl>
                                          <select 
                                            {...field}
                                            className="w-full bg-gray-800/70 backdrop-blur-md border border-gray-700/50 text-white focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all rounded-md px-3 py-2"
                                          >
                                            <option value="" disabled>Select your belt</option>
                                            <option value="white">White Belt</option>
                                            <option value="yellow">Yellow Belt</option>
                                            <option value="yellow-sr">Yellow Belt Sr.</option>
                                            <option value="orange">Orange Belt</option>
                                            <option value="green">Green Belt</option>
                                            <option value="green-sr">Green Belt Sr.</option>
                                            <option value="purple">Purple Belt</option>
                                            <option value="blue">Blue Belt</option>
                                            <option value="blue-sr">Blue Belt Sr.</option>
                                            <option value="brown">Brown Belt</option>
                                            <option value="brown-sr">Brown Belt Sr.</option>
                                            <option value="red">Red Belt</option>
                                            <option value="black-jr">Jr. Black Belt</option>
                                            <option value="black">Black Belt</option>
                                          </select>
                                        </FormControl>
                                        <FormMessage className="text-red-400" />
                                      </FormItem>
                                    )}
                                  />
                                </motion.div>
                                
                                {/* Experience time field */}
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.6, duration: 0.4 }}
                                >
                                  <FormField
                                    control={registerForm.control}
                                    name="experienceTime"
                                    render={({ field }) => (
                                      <FormItem className="relative">
                                        <FormLabel className="text-white text-base">How long have you been doing Taekwondo?</FormLabel>
                                        <div className="flex items-start gap-4">
                                          <div className="flex-1">
                                            <FormControl>
                                              <Input 
                                                type="text" 
                                                placeholder="e.g. 2 years, 6 months" 
                                                {...field}
                                                className="bg-gray-800/70 backdrop-blur-md border-gray-700/50 text-white focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all"
                                                onChange={(e) => {
                                                  field.onChange(e);
                                                  // This will be used to generate the start date message
                                                  const enteredValue = e.target.value;
                                                  calculateApproximateStart(enteredValue);
                                                }}
                                              />
                                            </FormControl>
                                            <FormMessage className="text-red-400" />
                                          </div>
                                          
                                          {/* Approximate start date message (positioned to the right of the input) */}
                                          <div 
                                            id="approximate-start-message" 
                                            className="w-60 rounded-lg bg-gradient-to-br from-slate-800/90 to-slate-900/95 backdrop-blur-md p-3 text-sm border-l-4 border-sky-500 shadow-[0_5px_15px_rgba(14,165,233,0.2)] transition-all duration-300 transform hover:scale-105"
                                            style={{ opacity: 0, visibility: 'hidden' }}
                                          >
                                            <div className="text-sky-400 font-bold">
                                              You've been training since <span id="approx-date" className="text-white font-bold"></span>. 
                                            </div>
                                            <div className="text-sky-300 mt-1 text-xs">
                                              Keep it up!
                                            </div>
                                          </div>
                                        </div>
                                      </FormItem>
                                    )}
                                  />
                                </motion.div>
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.7, duration: 0.4 }}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                            >
                  <Button 
                    type="submit" 
                    form="register-form" 
                                className="w-full bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white text-lg py-6 shadow-[0_5px_15px_rgba(220,38,38,0.3)] hover:shadow-[0_5px_25px_rgba(220,38,38,0.5)] transition-all duration-300 relative overflow-hidden group"
                    disabled={registerMutation.isPending}
                  >
                                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    {registerMutation.isPending ? 
                      <span className="flex items-center">
                        <span className="material-icons animate-spin mr-2">refresh</span>
                        Creating account...
                      </span> : 
                      "Create Account"
                    }
                  </Button>
                            </motion.div>
                            
                            <motion.div 
                              className="w-full text-center pt-2"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.8, duration: 0.4 }}
                            >
                    <p className="text-gray-400">
                      Already have an account?{" "}
                      <button 
                        type="button" 
                        onClick={() => setActiveTab("login")}
                                  className="text-red-400 hover:text-red-300 font-semibold relative group"
                      >
                        Login here
                                  <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-red-400 group-hover:w-full transition-all duration-300"></span>
                      </button>
                    </p>
                            </motion.div>
                </CardFooter>
              </Card>
                      </motion.div>
                    </AnimatePresence>
                  </TabsContent>
                </Tabs>
              </div>
            </motion.div>
            
            {/* Feature Cards positioned on sides */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* Feature Cards - Left Side - Properly stacked and rotated toward center */}
              <motion.div 
                className="absolute left-[5%] top-[25%] w-64 md:w-72"
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.5 }}
                style={{ transform: "rotate(22deg)", transformOrigin: "right center" }}
              >
                <FeatureCard 
                  icon="analytics" 
                  title="Real-time Form Analysis" 
                  description="Perfect your Taekwondo stances with AI-powered pose tracking"
                  glassEffect={true}
                />
              </motion.div>
              
              <motion.div 
                className="absolute left-[5%] top-[55%] w-64 md:w-72"
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.7 }}
                style={{ transform: "rotate(22deg)", transformOrigin: "right center" }}
              >
                <FeatureCard 
                  icon="compare" 
                  title="Comparison Training" 
                  description="Compare your technique with reference performances"
                  glassEffect={true}
                />
              </motion.div>
              
              {/* Feature Cards - Right Side - Properly stacked and rotated toward center */}
              <motion.div 
                className="absolute right-[5%] top-[25%] w-64 md:w-72"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.6 }}
                style={{ transform: "rotate(-22deg)", transformOrigin: "left center" }}
              >
                <FeatureCard 
                  icon="device_hub" 
                  title="Multi-device Access" 
                  description="Access your training data from any device"
                  glassEffect={true}
                />
              </motion.div>
              
              <motion.div 
                className="absolute right-[5%] top-[55%] w-64 md:w-72"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.8 }}
                style={{ transform: "rotate(-22deg)", transformOrigin: "left center" }}
              >
                <FeatureCard 
                  icon="desktop_windows" 
                  title="Performance Metrics" 
                  description="Track improvement with detailed analysis reports"
                  glassEffect={true}
                />
              </motion.div>
            </div>

            {/* Colorful streaking lines at the bottom - positioned below login panel */}
            <div className="fixed bottom-0 left-0 right-0 z-50" style={{ height: '12px' }}>
              {/* Red streak - bottom */}
              <div className="absolute bottom-0 left-0 w-full" style={{ height: '1.5px' }}>
                <motion.div 
                  className="h-full bg-red-600/90 w-full"
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ 
                    duration: 2, 
                    delay: 1.6,
                    ease: "easeOut" 
                  }}
                  style={{ filter: 'drop-shadow(0 0 3px rgba(248, 113, 113, 0.8))' }}
                />
              </div>
              
              {/* Brown streak */}
              <div className="absolute left-0 w-full" style={{ bottom: '1.5px', height: '1.5px' }}>
                <motion.div 
                  className="h-full bg-amber-800/90 w-full"
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ 
                    duration: 2, 
                    delay: 1.4,
                    ease: "easeOut" 
                  }}
                  style={{ filter: 'drop-shadow(0 0 3px rgba(146, 64, 14, 0.8))' }}
                />
              </div>
              
              {/* Blue streak */}
              <div className="absolute left-0 w-full" style={{ bottom: '3px', height: '1.5px' }}>
                <motion.div 
                  className="h-full bg-blue-500/90 w-full"
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ 
                    duration: 2, 
                    delay: 1.2,
                    ease: "easeOut" 
                  }}
                  style={{ filter: 'drop-shadow(0 0 3px rgba(59, 130, 246, 0.8))' }}
                />
              </div>
              
              {/* Purple streak */}
              <div className="absolute left-0 w-full" style={{ bottom: '4.5px', height: '1.5px' }}>
                <motion.div 
                  className="h-full bg-purple-500/90 w-full"
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ 
                    duration: 2, 
                    delay: 1.0,
                    ease: "easeOut" 
                  }}
                  style={{ filter: 'drop-shadow(0 0 3px rgba(139, 92, 246, 0.8))' }}
                />
              </div>
              
              {/* Green streak */}
              <div className="absolute left-0 w-full" style={{ bottom: '6px', height: '1.5px' }}>
                <motion.div 
                  className="h-full bg-green-500/90 w-full"
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ 
                    duration: 2, 
                    delay: 0.8,
                    ease: "easeOut" 
                  }}
                  style={{ filter: 'drop-shadow(0 0 3px rgba(34, 197, 94, 0.8))' }}
                />
              </div>
              
              {/* Orange streak */}
              <div className="absolute left-0 w-full" style={{ bottom: '7.5px', height: '1.5px' }}>
                <motion.div 
                  className="h-full bg-orange-500/90 w-full"
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ 
                    duration: 2, 
                    delay: 0.6,
                    ease: "easeOut" 
                  }}
                  style={{ filter: 'drop-shadow(0 0 3px rgba(249, 115, 22, 0.8))' }}
                />
              </div>
              
              {/* Yellow streak */}
              <div className="absolute left-0 w-full" style={{ bottom: '9px', height: '1.5px' }}>
                <motion.div 
                  className="h-full bg-yellow-400/90 w-full"
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ 
                    duration: 2, 
                    delay: 0.4,
                    ease: "easeOut" 
                  }}
                  style={{ filter: 'drop-shadow(0 0 3px rgba(250, 204, 21, 0.8))' }}
                />
              </div>
              
              {/* White streak - top */}
              <div className="absolute left-0 w-full" style={{ bottom: '10.5px', height: '1.5px' }}>
                <motion.div 
                  className="h-full bg-white/90 w-full"
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ 
                    duration: 2, 
                    delay: 0.2,
                    ease: "easeOut" 
                  }}
                  style={{ filter: 'drop-shadow(0 0 3px rgba(255, 255, 255, 0.8))' }}
                />
              </div>
              
              {/* Collective glow effect when all lines are formed */}
              <motion.div 
                className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20 blur-xl opacity-0 pointer-events-none"
                animate={{ 
                  opacity: [0, 0.4, 0.1],
                  y: [0, -5, 0]
                }}
                transition={{
                  duration: 3,
                  delay: 2, // Start after all lines have formed
                  repeat: Infinity,
                  repeatType: "reverse",
                  repeatDelay: 1
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  );
}