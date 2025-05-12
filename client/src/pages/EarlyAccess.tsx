import { useState, useEffect, useRef } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion, useAnimation, useMotionValue, useScroll, useTransform } from "framer-motion";
import { Sparkles, CheckCircle, ChevronLeft } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Define the form schema with Zod
const formSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  referralSource: z.string().min(1, { message: "Please tell us how you heard about us" }),
  experienceLevel: z.string().optional(),
  newsletterOptIn: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

export default function EarlyAccess() {
  const { toast } = useToast();
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  
  // For scroll-based animation
  const { scrollYProgress } = useScroll();
  const lightBeamY1 = useTransform(scrollYProgress, [0, 1], ["-100%", "100%"]);
  const lightBeamY2 = useTransform(scrollYProgress, [0, 1], ["-150%", "80%"]);
  const lightBeamY3 = useTransform(scrollYProgress, [0, 1], ["-120%", "90%"]);
  
  // Track scroll position for scroll-based animations
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      referralSource: "",
      experienceLevel: "beginner",
      newsletterOptIn: true,
    }
  });
  
  const signupMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiRequest("POST", "/api/early-access", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Something went wrong");
      }
      return response.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Success!",
        description: "You're on the list! We'll be in touch soon.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const onSubmit = (data: FormValues) => {
    signupMutation.mutate(data);
  };
  
  const nextStep = () => {
    if (step === 1) {
      form.trigger(['fullName', 'email']);
      if (form.formState.errors.fullName || form.formState.errors.email) return;
    }
    setStep(step + 1);
  };
  
  const prevStep = () => {
    setStep(step - 1);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black to-red-950 p-4 relative overflow-hidden">
        {/* Vertical light beams - animated with scroll */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          {/* Left side lights */}
          <motion.div
            className="absolute w-8 md:w-12 h-full opacity-60 left-[5%] top-0 rounded-full"
            style={{
              background: "linear-gradient(to bottom, #ff3d00, #ff0844, #9c27b0)",
              filter: "blur(15px)",
            }}
            animate={{
              y: ["0%", "100%", "0%"],
              opacity: [0.6, 0.8, 0.6]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          <motion.div
            className="absolute w-4 md:w-6 h-full opacity-40 left-[10%] top-0 rounded-full"
            style={{
              background: "linear-gradient(to bottom, #ff5722, #f44336, #e91e63)",
              filter: "blur(12px)",
            }}
            animate={{
              y: ["0%", "80%", "0%"],
              opacity: [0.4, 0.7, 0.4]
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Right side lights */}
          <motion.div
            className="absolute w-10 md:w-16 h-full opacity-50 right-[8%] top-0 rounded-full"
            style={{
              background: "linear-gradient(to bottom, #304ffe, #651fff, #d500f9)",
              filter: "blur(20px)",
            }}
            animate={{
              y: ["0%", "90%", "0%"],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
          />
          
          <motion.div
            className="absolute w-3 md:w-5 h-full opacity-30 right-[15%] top-0 rounded-full"
            style={{
              background: "linear-gradient(to bottom, #00b0ff, #2979ff, #651fff)",
              filter: "blur(10px)",
            }}
            animate={{
              y: ["0%", "85%", "0%"],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: 9,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
          />
        </div>
        
        {/* Success fireworks animation */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={`success-particle-${i}`}
              className="absolute rounded-full"
              style={{
                width: Math.random() * 8 + 2,
                height: Math.random() * 8 + 2,
                backgroundColor: [
                  "#4caf50", "#8bc34a", "#cddc39", "#ffeb3b", 
                  "#ffc107", "#ff9800", "#ff5722", "#f44336"
                ][Math.floor(Math.random() * 8)],
                filter: `blur(${Math.random() * 2}px)`,
                boxShadow: `0 0 ${Math.random() * 10 + 5}px rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.8)`,
                top: "50%",
                left: "50%"
              }}
              initial={{ 
                scale: 0,
                x: 0,
                y: 0,
                opacity: 0
              }}
              animate={{ 
                scale: [0, 1, 0.5],
                x: [(Math.random() - 0.5) * 300, (Math.random() - 0.5) * 400],
                y: [(Math.random() - 0.5) * 300, (Math.random() - 0.5) * 400],
                opacity: [0, 0.8, 0]
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
                repeatDelay: Math.random() * 3
              }}
            />
          ))}
        </div>
        
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full z-10"
        >
          <Card className="p-8 bg-black/80 border border-green-500/30 rounded-xl shadow-xl backdrop-blur-sm">
            <div className="flex flex-col items-center space-y-6 text-center">
              <motion.div
                initial={{ scale: 0.8, rotate: -10 }}
                animate={{ 
                  scale: [0.8, 1.2, 1],
                  rotate: [-10, 10, 0]
                }}
                transition={{ 
                  duration: 0.8,
                  ease: "easeOut"
                }}
              >
                <CheckCircle className="w-24 h-24 text-green-500" />
              </motion.div>
              
              <motion.h1 
                className="text-3xl font-bold text-white"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                You're on the List!
              </motion.h1>
              
              <motion.p 
                className="text-gray-300"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                Thanks for signing up for early access to CoachT. We'll notify you as soon as we're ready to welcome you!
              </motion.p>
              
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                whileHover={{ scale: 1.05 }}
              >
                <Button 
                  asChild 
                  className="px-6 py-3 rounded-lg text-base font-medium group relative overflow-hidden"
                  style={{
                    background: "linear-gradient(45deg, #00c853, #69f0ae, #00c853)",
                    backgroundSize: "200% 200%",
                    color: "white",
                    transition: "all 0.5s ease",
                    border: "2px solid rgba(255, 255, 255, 0.1)",
                    boxShadow: "0 10px 20px rgba(0, 200, 83, 0.3), inset 0 0 10px rgba(255, 255, 255, 0.1)"
                  }}
                >
                  <Link href="/" className="flex items-center">
                    <span className="font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]">Return to Home</span>
                    {/* Animated shimmer */}
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
                  </Link>
                </Button>
              </motion.div>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Spider web animation references and logic
  const webRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const webControls = useAnimation();
  
  // Track mouse position for web interaction
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (webRef.current) {
        const rect = webRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        mouseX.set(x);
        mouseY.set(y);
        
        // Animate web nodes that are close to the cursor
        webControls.start(i => {
          const nodeX = (i % 6) * (rect.width / 5);
          const nodeY = Math.floor(i / 6) * (rect.height / 5);
          
          const distance = Math.sqrt(
            Math.pow(nodeX - x, 2) + Math.pow(nodeY - y, 2)
          );
          
          const isClose = distance < 150;
          
          return {
            x: nodeX + (isClose ? (nodeX - x) * -0.1 : 0),
            y: nodeY + (isClose ? (nodeY - y) * -0.1 : 0),
            scale: isClose ? 1.5 : 1,
            opacity: isClose ? 1 : 0.4,
            transition: { duration: 0.5 }
          };
        });
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [webControls, mouseX, mouseY]);
  
  // Generate web nodes on mount
  useEffect(() => {
    if (webRef.current) {
      const rect = webRef.current.getBoundingClientRect();
      const nodes = [];
      
      for (let i = 0; i < 36; i++) {
        const x = (i % 6) * (rect.width / 5);
        const y = Math.floor(i / 6) * (rect.height / 5);
        
        nodes.push({
          id: i,
          x,
          y,
          opacity: Math.random() * 0.5 + 0.2,
          size: Math.random() * 3 + 2
        });
      }
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black to-red-950 p-4 relative overflow-hidden">
      {/* Vertical light beams - animated with scroll */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Left side lights */}
        <motion.div
          className="absolute w-8 md:w-12 h-full opacity-60 left-[5%] top-0 rounded-full"
          style={{
            background: "linear-gradient(to bottom, #ff3d00, #ff0844, #9c27b0)",
            filter: "blur(15px)",
            transform: "translateY(var(--y))",
            willChange: "transform",
            y: lightBeamY1
          }}
        />
        
        <motion.div
          className="absolute w-4 md:w-6 h-full opacity-40 left-[10%] top-0 rounded-full"
          style={{
            background: "linear-gradient(to bottom, #ff5722, #f44336, #e91e63)",
            filter: "blur(12px)",
            transform: "translateY(var(--y))",
            willChange: "transform",
            y: lightBeamY2
          }}
        />
        
        {/* Right side lights */}
        <motion.div
          className="absolute w-10 md:w-16 h-full opacity-50 right-[8%] top-0 rounded-full"
          style={{
            background: "linear-gradient(to bottom, #304ffe, #651fff, #d500f9)",
            filter: "blur(20px)",
            transform: "translateY(var(--y))",
            willChange: "transform",
            y: lightBeamY3
          }}
        />
        
        <motion.div
          className="absolute w-3 md:w-5 h-full opacity-30 right-[15%] top-0 rounded-full"
          style={{
            background: "linear-gradient(to bottom, #00b0ff, #2979ff, #651fff)",
            filter: "blur(10px)",
            transform: "translateY(var(--y))",
            willChange: "transform",
            y: lightBeamY1
          }}
        />
        
        <motion.div
          className="absolute w-6 md:w-8 h-full opacity-40 right-[20%] top-0 rounded-full"
          style={{
            background: "linear-gradient(to bottom, #ff9100, #ff3d00, #dd2c00)",
            filter: "blur(15px)",
            transform: "translateY(var(--y))",
            willChange: "transform",
            y: lightBeamY2
          }}
        />
      </div>
      
      {/* Dynamic Spider Web Background */}
      <div ref={webRef} className="absolute inset-0 z-0 pointer-events-none">
        {/* Web nodes - we'll generate 36 nodes in a 6x6 grid */}
        {Array.from({ length: 36 }).map((_, i) => (
          <motion.div
            key={`node-${i}`}
            custom={i}
            animate={webControls}
            initial={{
              x: (i % 6) * (window.innerWidth / 5),
              y: Math.floor(i / 6) * (window.innerHeight / 5),
              opacity: 0.4,
              scale: 1
            }}
            className="absolute rounded-full"
            style={{ 
              width: Math.random() * 3 + 2,
              height: Math.random() * 3 + 2,
              backgroundColor: `rgba(255, ${Math.random() * 100 + 50}, ${Math.random() * 100}, ${Math.random() * 0.3 + 0.7})`,
              boxShadow: `0 0 8px rgba(255, ${Math.random() * 50 + 100}, ${Math.random() * 50}, 0.7)`
            }}
          />
        ))}
        
        {/* Web connections */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <linearGradient id="webGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255, 30, 30, 0.4)" />
              <stop offset="50%" stopColor="rgba(255, 120, 50, 0.2)" />
              <stop offset="100%" stopColor="rgba(255, 60, 100, 0.4)" />
            </linearGradient>
          </defs>
          
          {/* Horizontal lines */}
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.line
              key={`h-line-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 + (i % 2) * 0.1 }}
              x1="0"
              y1={i * (window.innerHeight / 5)}
              x2={window.innerWidth}
              y2={i * (window.innerHeight / 5)}
              stroke="url(#webGradient)"
              strokeWidth="0.5"
            />
          ))}
          
          {/* Vertical lines */}
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.line
              key={`v-line-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 + (i % 2) * 0.1 }}
              x1={i * (window.innerWidth / 5)}
              y1="0"
              x2={i * (window.innerWidth / 5)}
              y2={window.innerHeight}
              stroke="url(#webGradient)"
              strokeWidth="0.5"
            />
          ))}
          
          {/* Diagonal lines */}
          {Array.from({ length: 10 }).map((_, i) => (
            <motion.line
              key={`d-line-${i}`}
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: [0.1, 0.3, 0.1], 
                pathLength: [0.3, 1, 0.3] 
              }}
              transition={{
                duration: 10 + i * 2,
                repeat: Infinity,
                repeatType: "reverse"
              }}
              x1={Math.random() * window.innerWidth}
              y1={Math.random() * window.innerHeight}
              x2={Math.random() * window.innerWidth}
              y2={Math.random() * window.innerHeight}
              stroke={`rgba(255, ${50 + i * 20}, ${50 + i * 5}, 0.4)`}
              strokeWidth="0.5"
            />
          ))}
        </svg>
      </div>
      
      {/* Floating particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute rounded-full z-0"
          initial={{ 
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            opacity: 0
          }}
          animate={{ 
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            opacity: [0, 0.7, 0],
            scale: [0.5, 1.5, 0.5]
          }}
          transition={{
            duration: 10 + Math.random() * 20,
            ease: "easeInOut",
            repeat: Infinity,
            delay: Math.random() * 5
          }}
          style={{
            width: Math.random() * 5 + 2,
            height: Math.random() * 5 + 2,
            backgroundColor: `rgba(${150 + Math.random() * 105}, ${30 + Math.random() * 225}, ${50 + Math.random() * 100}, 0.8)`,
            filter: `blur(${Math.random() * 2}px)`,
            boxShadow: `0 0 ${Math.random() * 10 + 5}px rgba(255, ${Math.random() * 150 + 50}, ${Math.random() * 100 + 50}, 0.8)`
          }}
        />
      ))}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl w-full"
      >
        <Card className="p-0 overflow-hidden bg-black/80 border border-red-500/30 rounded-xl shadow-xl backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Form Section */}
            <div className="p-8">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-5 h-5 text-red-500" />
                <h1 className="text-2xl font-bold text-white">CoachT Early Access</h1>
              </div>
              
              <p className="text-gray-400 mb-8">
                Join our exclusive waitlist and be among the first to experience the future of Taekwondo training.
              </p>
              
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {step === 1 && (
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-white">Full Name</Label>
                      <Input
                        id="fullName"
                        placeholder="Enter your full name"
                        className="bg-gray-900 border-gray-700 text-white"
                        {...form.register("fullName")}
                      />
                      {form.formState.errors.fullName && (
                        <p className="text-sm text-red-500">{form.formState.errors.fullName.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-white">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        className="bg-gray-900 border-gray-700 text-white"
                        {...form.register("email")}
                      />
                      {form.formState.errors.email && (
                        <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
                      )}
                    </div>
                    
                    <Button
                      type="button"
                      onClick={nextStep}
                      className="w-full bg-red-600 hover:bg-red-700"
                    >
                      Continue
                    </Button>
                  </motion.div>
                )}
                
                {step === 2 && (
                  <motion.div
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="experienceLevel" className="text-white">Your Taekwondo Experience</Label>
                      <RadioGroup 
                        defaultValue={form.getValues("experienceLevel") || "beginner"}
                        onValueChange={(value) => form.setValue("experienceLevel", value)}
                        className="pt-2"
                      >
                        <div className="flex items-center space-x-2 mb-2">
                          <RadioGroupItem value="beginner" id="beginner" />
                          <Label htmlFor="beginner" className="text-gray-300">Beginner</Label>
                        </div>
                        <div className="flex items-center space-x-2 mb-2">
                          <RadioGroupItem value="intermediate" id="intermediate" />
                          <Label htmlFor="intermediate" className="text-gray-300">Intermediate</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="advanced" id="advanced" />
                          <Label htmlFor="advanced" className="text-gray-300">Advanced</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    
                    <div className="space-y-2 mt-6">
                      <Label htmlFor="referralSource" className="text-white">How did you hear about us?</Label>
                      <Textarea
                        id="referralSource"
                        placeholder="Tell us how you found CoachT"
                        className="bg-gray-900 border-gray-700 text-white h-24"
                        {...form.register("referralSource")}
                      />
                      {form.formState.errors.referralSource && (
                        <p className="text-sm text-red-500">{form.formState.errors.referralSource.message}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 mt-6">
                      <Checkbox
                        id="newsletterOptIn"
                        defaultChecked={true}
                        onCheckedChange={(checked) => 
                          form.setValue("newsletterOptIn", checked as boolean)
                        }
                      />
                      <Label 
                        htmlFor="newsletterOptIn"
                        className="text-sm text-gray-300"
                      >
                        Keep me updated with news and progress
                      </Label>
                    </div>
                    
                    <div className="flex gap-2 mt-6">
                      <Button
                        type="button"
                        onClick={prevStep}
                        variant="outline"
                        className="flex-1 border-gray-700 text-white"
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        disabled={signupMutation.isPending}
                        className="flex-1 bg-red-600 hover:bg-red-700"
                      >
                        {signupMutation.isPending ? "Submitting..." : "Join the Waitlist"}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </form>
              
              <p className="text-gray-500 text-xs mt-8 text-center">
                By signing up, you agree to our Terms and Privacy Policy.
              </p>
            </div>
            
            {/* Visual Section */}
            <div className="bg-gradient-to-br from-red-950 to-black hidden md:block relative overflow-hidden">
              <div className="absolute inset-0 bg-black/40 z-10"></div>
              
              <div className="relative z-20 flex flex-col h-full justify-center px-8 py-12">
                <h2 className="text-3xl font-bold text-white mb-6">
                  Revolutionize Your Taekwondo Training
                </h2>
                
                <div className="space-y-6">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 bg-red-500 p-1 rounded-full">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">Real-time pose tracking</p>
                      <p className="text-gray-300 text-sm">Get instant feedback on your form and technique</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="mt-1 bg-red-500 p-1 rounded-full">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">Movement comparison</p>
                      <p className="text-gray-300 text-sm">Compare your moves with expert references</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="mt-1 bg-red-500 p-1 rounded-full">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">Progress tracking</p>
                      <p className="text-gray-300 text-sm">Monitor your improvement over time</p>
                    </div>
                  </div>
                </div>
                
                <Separator className="my-8 bg-red-500/30" />
                
                <div className="mt-auto">
                  <p className="text-white text-lg font-semibold">Early Access Benefits:</p>
                  <p className="text-gray-300 mt-2">
                    Get exclusive features, priority support, and be part of shaping the future of martial arts training technology.
                  </p>
                </div>
              </div>
              
              {/* Geometric patterns for background */}
              <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-red-600/10 rounded-full blur-3xl"></div>
              <div className="absolute top-1/4 -left-16 w-64 h-64 bg-red-600/10 rounded-full blur-3xl"></div>
            </div>
          </div>
        </Card>
      </motion.div>
      
      <motion.div 
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mt-8 mb-4"
      >
        <Button 
          asChild 
          className="px-8 py-6 rounded-lg text-lg font-medium group relative overflow-hidden"
          style={{
            background: "linear-gradient(45deg, #304ffe, #651fff, #d500f9, #304ffe)",
            backgroundSize: "300% 300%",
            color: "white",
            transition: "all 0.5s ease",
            border: "2px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 10px 20px rgba(80, 0, 190, 0.3), inset 0 0 10px rgba(255, 255, 255, 0.1)"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundPosition = "100% 100%";
            e.currentTarget.style.transform = "scale(1.05) translateY(-3px)";
            e.currentTarget.style.boxShadow = "0 15px 30px rgba(80, 0, 190, 0.4), inset 0 0 15px rgba(255, 255, 255, 0.2)";
            e.currentTarget.style.border = "2px solid rgba(255, 255, 255, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundPosition = "0% 0%";
            e.currentTarget.style.transform = "scale(1) translateY(0)";
            e.currentTarget.style.boxShadow = "0 10px 20px rgba(80, 0, 190, 0.3), inset 0 0 10px rgba(255, 255, 255, 0.1)";
            e.currentTarget.style.border = "2px solid rgba(255, 255, 255, 0.1)";
          }}
        >
          <Link href="/" className="flex items-center">
            {/* Animated particles */}
            <div className="absolute inset-0 overflow-hidden">
              {Array.from({ length: 8 }).map((_, i) => (
                <motion.div
                  key={`home-particle-${i}`}
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
            
            <ChevronLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]">Back to Home</span>
            
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
          </Link>
        </Button>
      </motion.div>
    </div>
  );
}