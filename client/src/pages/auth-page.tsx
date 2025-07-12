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
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MobileWarningDialog from "@/components/MobileWarningDialog";

// Schemas for form validation
const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation, showMobileWarning, setShowMobileWarning } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("login");
  const [isMobile, setIsMobile] = useState(false);
  
  // Loading animation states
  const [loading, setLoading] = useState(true);
  const [typedText, setTypedText] = useState("");
  const [colorTransition, setColorTransition] = useState(false);
  const [cornerGradients, setCornerGradients] = useState(false);
  const [logoContrast, setLogoContrast] = useState(false);
  
  // Password visibility
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  
  // Form handlers
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });
  
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  
  // Check if user is already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);
  
  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Animation sequence for loading
  useEffect(() => {
    let text = "Runway AI";
    let currentIndex = 0;
    
    const typingInterval = setInterval(() => {
      if (currentIndex <= text.length) {
        setTypedText(text.substring(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        
        // Start corner gradients
        setTimeout(() => {
          setCornerGradients(true);
          
          // Start color transition
          setTimeout(() => {
            setColorTransition(true);
            
            // Add logo contrast
            setTimeout(() => {
              setLogoContrast(true);
              
              // Complete loading
              setTimeout(() => {
                setLoading(false);
              }, 800);
            }, 400);
          }, 500);
        }, 300);
      }
    }, 150);
    
    return () => clearInterval(typingInterval);
  }, []);
  
  // Form submission
  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };
  
  const onRegisterSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate(data);
  };
  
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-8">
      {/* Clean minimal background - no gradients */}
      
      {/* Mobile Warning Dialog */}
      <MobileWarningDialog
        open={showMobileWarning}
        onOpenChange={setShowMobileWarning}
      />
      
      {/* Loading screen */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white overflow-hidden">
          {/* Simple white to pink gradient sliding from left to right */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Elegant sweeping gradient animation */}
            <div 
              className={`absolute inset-0 bg-gradient-to-r from-white via-pink-200 to-pink-300 
              transition-transform duration-1500 ease-in-out ${colorTransition ? 'translate-x-0' : '-translate-x-full'}`}
            ></div>
            <div 
              className={`absolute inset-0 bg-black transition-transform duration-1500 ease-in-out delay-300
              ${colorTransition ? 'translate-x-full' : 'translate-x-0'}`}
            ></div>
            {/* Subtle sparkle effects */}
            <div className={`absolute top-1/4 left-1/4 w-1 h-1 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)] transition-opacity duration-700 ${cornerGradients ? 'opacity-70' : 'opacity-0'}`}></div>
            <div className={`absolute top-1/3 right-1/3 w-2 h-2 rounded-full bg-pink-200 shadow-[0_0_10px_rgba(236,72,153,0.6)] transition-opacity duration-700 delay-200 ${cornerGradients ? 'opacity-70' : 'opacity-0'}`}></div>
            <div className={`absolute bottom-1/4 right-1/5 w-1 h-1 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)] transition-opacity duration-700 delay-300 ${cornerGradients ? 'opacity-70' : 'opacity-0'}`}></div>
          </div>
          
          {/* Enhanced Runway AI text typing with elegant animation */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <h1 className="text-5xl sm:text-6xl md:text-8xl font-bold relative inline-block">
              <span className={`relative bg-gradient-to-r from-black to-pink-900 bg-clip-text text-transparent transition-all duration-500 ${logoContrast ? 'blur-[0.5px]' : 'blur-0'}`}>
                {typedText}
                <span className="inline-block h-[0.8em] w-[3px] ml-[2px] align-middle bg-pink-400 animate-blink"></span>
              </span>
            </h1>
          </div>
          
          {/* No corner gradients - clean minimal design */}
        </div>
      )}
      
      {/* Main content - only show after loading */}
      {!loading && (
        <>
          {/* Minimal Logo */}
          <motion.div
            className="mb-8 sm:mb-12 text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
              Runway AI
            </h1>
            <p className="text-gray-500 text-sm mt-2 font-medium">
              Pageant Training Platform
            </p>
          </motion.div>
          
          {/* Minimal Auth Card */}
          <motion.div
            className="w-full max-w-sm mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="border-gray-200 bg-white shadow-sm border rounded-lg">
              {/* No background gradients for minimal look */}
              
              <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-2 bg-gray-50 rounded-lg w-full h-auto p-1 mb-4 sm:mb-6">
                  <TabsTrigger 
                    value="login" 
                    className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm rounded-md py-2.5 sm:py-2 text-gray-600 font-semibold text-sm"
                  >
                    Login
                  </TabsTrigger>
                  <TabsTrigger 
                    value="register" 
                    className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm rounded-md py-2.5 sm:py-2 text-gray-600 font-semibold text-sm"
                  >
                    Register
                  </TabsTrigger>
                </TabsList>
                
                {/* Login Form */}
                <TabsContent value="login" className="m-0">
                  <CardHeader className="pb-4 px-4 sm:px-6">
                    <CardTitle className="text-lg sm:text-xl font-black text-gray-900 mb-1">
                      Welcome Back
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600 font-medium">
                      Sign in to continue your pageant training
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="px-4 sm:px-6">
                    <Form {...loginForm}>
                      <form id="login-form" onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                        <FormField
                          control={loginForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-900 font-bold text-sm mb-2">Username</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter your username" 
                                  {...field} 
                                  className="bg-gray-50 border-gray-300 text-gray-900 font-medium placeholder:text-gray-400 focus:bg-white focus:border-gray-400 focus:ring-0 h-12 sm:h-11 rounded-lg text-base sm:text-sm"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={loginForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-900 font-bold text-sm mb-2">Password</FormLabel>
                              <div className="relative">
                                <FormControl>
                                  <Input 
                                    type={showLoginPassword ? "text" : "password"}
                                    placeholder="Enter your password" 
                                    {...field}
                                    className="bg-gray-50 border-gray-300 text-gray-900 font-medium placeholder:text-gray-400 focus:bg-white focus:border-gray-400 focus:ring-0 h-12 sm:h-11 rounded-lg pr-10 text-base sm:text-sm"
                                  />
                                </FormControl>
                                <button 
                                  type="button"
                                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                  <span className="material-icons text-xl">
                                    {showLoginPassword ? "visibility_off" : "visibility"}
                                  </span>
                                </button>
                              </div>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />
                      </form>
                    </Form>
                  </CardContent>
                  
                  <CardFooter className="pt-6 px-4 sm:px-6">
                    <Button 
                      type="submit"
                      form="login-form"
                      className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold h-12 sm:h-11 rounded-lg transition-colors text-base sm:text-sm"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <div className="flex items-center">
                          <span className="material-icons animate-spin mr-2 text-sm">autorenew</span>
                          Signing In...
                        </div>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </CardFooter>
                </TabsContent>
                
                {/* Register Form */}
                <TabsContent value="register" className="m-0">
                  <CardHeader className="pb-4 px-4 sm:px-6">
                    <CardTitle className="text-lg sm:text-xl font-black text-gray-900 mb-1">
                      Create an Account
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600 font-medium">
                      Register to save your pageant training sessions and settings
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="px-4 sm:px-6">
                    <Form {...registerForm}>
                      <form id="register-form" onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                        <FormField
                          control={registerForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-900 font-bold text-sm mb-2">Username</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Choose a username" 
                                  {...field} 
                                  className="bg-gray-50 border-gray-300 text-gray-900 font-medium placeholder:text-gray-400 focus:bg-white focus:border-gray-400 focus:ring-0 h-12 sm:h-11 rounded-lg text-base sm:text-sm"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={registerForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-900 font-bold text-sm mb-2">Email Address</FormLabel>
                              <FormControl>
                                <Input 
                                  type="email"
                                  placeholder="Enter your email address" 
                                  {...field} 
                                  className="bg-gray-50 border-gray-300 text-gray-900 font-medium placeholder:text-gray-400 focus:bg-white focus:border-gray-400 focus:ring-0 h-12 sm:h-11 rounded-lg text-base sm:text-sm"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-900 font-bold text-sm mb-2">Password</FormLabel>
                              <div className="relative">
                                <FormControl>
                                  <Input 
                                    type={showRegisterPassword ? "text" : "password"}
                                    placeholder="Create a password" 
                                    {...field}
                                    className="bg-gray-50 border-gray-300 text-gray-900 font-medium placeholder:text-gray-400 focus:bg-white focus:border-gray-400 focus:ring-0 h-12 sm:h-11 rounded-lg pr-10 text-base sm:text-sm"
                                  />
                                </FormControl>
                                <button 
                                  type="button"
                                  onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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
                        
                        <FormField
                          control={registerForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-900 font-bold text-sm mb-2">Confirm Password</FormLabel>
                              <FormControl>
                                <Input 
                                  type="password"
                                  placeholder="Confirm your password" 
                                  {...field}
                                  className="bg-gray-50 border-gray-300 text-gray-900 font-medium placeholder:text-gray-400 focus:bg-white focus:border-gray-400 focus:ring-0 h-12 sm:h-11 rounded-lg text-base sm:text-sm"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />
                      </form>
                    </Form>
                  </CardContent>
                  
                  <CardFooter className="pt-6 px-4 sm:px-6">
                    <Button 
                      type="submit"
                      form="register-form"
                      className="w-full bg-gradient-to-r from-pink-500 to-pink-400 hover:from-pink-400 hover:to-pink-300 text-white font-bold h-12 sm:h-11 rounded-lg transition-colors text-base sm:text-sm"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <div className="flex items-center">
                          <span className="material-icons animate-spin mr-2 text-sm">autorenew</span>
                          Creating Account...
                        </div>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </CardFooter>
                </TabsContent>
              </Tabs>
            </Card>
          </motion.div>
          
          {/* Feature cards - only show on desktop */}
          {!isMobile && (
            <motion.div
              className="mt-8 w-full max-w-4xl px-4 grid grid-cols-1 md:grid-cols-3 gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="p-5 rounded-2xl backdrop-blur-lg border border-red-500/20 bg-gradient-to-br from-gray-900/80 to-black/80 shadow-lg hover:scale-105 transition-transform duration-300">
                <div className="mb-3 h-10 w-10 rounded-full bg-pink-300/20 flex items-center justify-center">
                  <span className="material-icons text-pink-300">analytics</span>
                </div>
                <h3 className="text-lg font-semibold text-pink-300 mb-2">Real-time Form Analysis</h3>
                <p className="text-sm text-gray-300">Perfect your pageant poses and runway walks with AI-powered pose tracking</p>
              </div>
              
              <div className="p-5 rounded-2xl backdrop-blur-lg border border-pink-300/20 bg-gradient-to-br from-gray-900/80 to-black/80 shadow-lg hover:scale-105 transition-transform duration-300">
                <div className="mb-3 h-10 w-10 rounded-full bg-pink-300/20 flex items-center justify-center">
                  <span className="material-icons text-pink-300">compare</span>
                </div>
                <h3 className="text-lg font-semibold text-pink-300 mb-2">Comparison Training</h3>
                <p className="text-sm text-gray-300">Compare your poses with professional pageant performances</p>
              </div>
              
              <div className="p-5 rounded-2xl backdrop-blur-lg border border-pink-300/20 bg-gradient-to-br from-gray-900/80 to-black/80 shadow-lg hover:scale-105 transition-transform duration-300">
                <div className="mb-3 h-10 w-10 rounded-full bg-pink-300/20 flex items-center justify-center">
                  <span className="material-icons text-pink-300">insights</span>
                </div>
                <h3 className="text-lg font-semibold text-pink-300 mb-2">Performance Metrics</h3>
                <p className="text-sm text-gray-300">Track your pageant performance with detailed progress reports</p>
              </div>
            </motion.div>
          )}
          
          {/* Footer */}
          <motion.div
            className="mt-8 text-center text-gray-500 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            © 2025 Runway AI by Arshia Kathpalia, Miss Teen India USA 2024. All rights reserved.
          </motion.div>
        </>
      )}
    </div>
  );
}