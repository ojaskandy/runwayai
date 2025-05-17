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
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Form schemas
const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
  beltColor: z.string().optional(),
  experienceTime: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("login");
  const [isMobile, setIsMobile] = useState(false);
  
  // Password visibility toggles
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  
  // Check if the user's device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      beltColor: "white",
      experienceTime: "less_than_1_year",
    },
  });

  // Form submission handlers
  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center overflow-hidden relative">
      {/* Background gradients */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-1/3 h-1/3 bg-red-700/20 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-1/3 h-1/3 bg-red-700/20 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-1/3 h-1/3 bg-red-700/10 rounded-full blur-[150px] -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* CoachT Logo */}
      <motion.div 
        className="relative z-10 mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-red-700 to-red-600 flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.6)]">
            <span className="material-icons text-white text-3xl">sports_martial_arts</span>
          </div>
          <h1 className="text-4xl font-bold text-white">CoachT</h1>
        </div>
      </motion.div>

      {/* Main Card */}
      <motion.div 
        className="w-full max-w-md px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="border-red-900/30 bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-lg shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none"></div>
          
          {/* Tabs */}
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 bg-black/50 border-b border-gray-800 rounded-none w-full h-auto p-0">
              <TabsTrigger 
                value="login" 
                className="data-[state=active]:bg-gradient-to-b data-[state=active]:from-red-700 data-[state=active]:to-red-800 data-[state=active]:border-b-0 data-[state=active]:text-white rounded-none py-3 text-gray-400"
              >
                Login
              </TabsTrigger>
              <TabsTrigger 
                value="register" 
                className="data-[state=active]:bg-gradient-to-b data-[state=active]:from-red-700 data-[state=active]:to-red-800 data-[state=active]:border-b-0 data-[state=active]:text-white rounded-none py-3 text-gray-400"
              >
                Register
              </TabsTrigger>
            </TabsList>

            {/* Login Form */}
            <TabsContent value="login" className="m-0">
              <CardHeader>
                <CardTitle className="text-xl sm:text-2xl font-bold">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-red-300">
                    Login to Your Account
                  </span>
                </CardTitle>
                <CardDescription className="text-sm sm:text-base text-gray-300">
                  Enter your credentials to access your CoachT dashboard
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <Form {...loginForm}>
                  <form id="login-form" onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Username</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your username" 
                              {...field} 
                              className="bg-gray-800/70 border-gray-700/50 text-white focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30"
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
                          <FormLabel className="text-white">Password</FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input 
                                type={showLoginPassword ? "text" : "password"}
                                placeholder="Enter your password" 
                                {...field}
                                className="bg-gray-800/70 border-gray-700/50 text-white focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 pr-10"
                              />
                            </FormControl>
                            <button 
                              type="button"
                              onClick={() => setShowLoginPassword(!showLoginPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
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
              
              <CardFooter className="flex flex-col gap-4">
                <Button 
                  type="submit"
                  form="login-form"
                  className="w-full bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white py-5"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <div className="flex items-center">
                      <span className="material-icons animate-spin mr-2">autorenew</span>
                      Logging in...
                    </div>
                  ) : (
                    <>
                      <span className="material-icons mr-2">login</span>
                      Sign In
                    </>
                  )}
                </Button>
              </CardFooter>
            </TabsContent>

            {/* Register Form */}
            <TabsContent value="register" className="m-0">
              <CardHeader>
                <CardTitle className="text-xl sm:text-2xl font-bold text-red-500">
                  Create an Account
                </CardTitle>
                <CardDescription className="text-sm sm:text-base text-gray-300">
                  Register to save your training sessions and settings
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <Form {...registerForm}>
                  <form id="register-form" onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Username</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Choose a username" 
                              {...field} 
                              className="bg-gray-800/70 border-gray-700/50 text-white focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30"
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
                          <FormLabel className="text-white">Email Address</FormLabel>
                          <FormControl>
                            <Input 
                              type="email"
                              placeholder="Enter your email address" 
                              {...field} 
                              className="bg-gray-800/70 border-gray-700/50 text-white focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30"
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
                          <FormLabel className="text-white">Password</FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input 
                                type={showRegisterPassword ? "text" : "password"}
                                placeholder="Create a password" 
                                {...field}
                                className="bg-gray-800/70 border-gray-700/50 text-white focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 pr-10"
                              />
                            </FormControl>
                            <button 
                              type="button"
                              onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
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
                          <FormLabel className="text-white">Confirm Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password"
                              placeholder="Confirm your password" 
                              {...field}
                              className="bg-gray-800/70 border-gray-700/50 text-white focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30"
                            />
                          </FormControl>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />
                    
                    {/* Only show these fields on desktop */}
                    {!isMobile && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={registerForm.control}
                            name="beltColor"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-white">Belt Color</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger className="bg-gray-800/70 border-gray-700/50 text-white focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30">
                                      <SelectValue placeholder="Select belt" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                    <SelectItem value="white">White</SelectItem>
                                    <SelectItem value="yellow">Yellow</SelectItem>
                                    <SelectItem value="orange">Orange</SelectItem>
                                    <SelectItem value="green">Green</SelectItem>
                                    <SelectItem value="blue">Blue</SelectItem>
                                    <SelectItem value="red">Red</SelectItem>
                                    <SelectItem value="black">Black</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={registerForm.control}
                            name="experienceTime"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-white">Experience</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger className="bg-gray-800/70 border-gray-700/50 text-white focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30">
                                      <SelectValue placeholder="Select experience" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                    <SelectItem value="less_than_1_year">Less than 1 year</SelectItem>
                                    <SelectItem value="1_to_3_years">1-3 years</SelectItem>
                                    <SelectItem value="3_to_5_years">3-5 years</SelectItem>
                                    <SelectItem value="5_plus_years">5+ years</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </>
                    )}
                  </form>
                </Form>
              </CardContent>
              
              <CardFooter className="flex flex-col gap-4">
                <Button 
                  type="submit"
                  form="register-form"
                  className="w-full bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white py-5"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? (
                    <div className="flex items-center">
                      <span className="material-icons animate-spin mr-2">autorenew</span>
                      Creating Account...
                    </div>
                  ) : (
                    <>
                      <span className="material-icons mr-2">person_add</span>
                      Create Account
                    </>
                  )}
                </Button>
              </CardFooter>
            </TabsContent>
          </Tabs>
        </Card>
      </motion.div>

      {/* Features section - only show on desktop */}
      {!isMobile && (
        <motion.div 
          className="mt-8 w-full max-w-4xl px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          {/* Feature Cards */}
          <div className="p-5 rounded-2xl backdrop-blur-lg border border-red-500/20 bg-gradient-to-br from-gray-900/80 to-black/80 shadow-lg transform transition-all duration-300 hover:scale-105">
            <div className="mb-3 h-10 w-10 rounded-full bg-red-700/20 flex items-center justify-center">
              <span className="material-icons text-red-500">analytics</span>
            </div>
            <h3 className="text-lg font-semibold text-red-400 mb-2">Real-time Form Analysis</h3>
            <p className="text-sm text-gray-300">Perfect your Taekwondo stances with AI-powered pose tracking</p>
          </div>
          
          <div className="p-5 rounded-2xl backdrop-blur-lg border border-red-500/20 bg-gradient-to-br from-gray-900/80 to-black/80 shadow-lg transform transition-all duration-300 hover:scale-105">
            <div className="mb-3 h-10 w-10 rounded-full bg-red-700/20 flex items-center justify-center">
              <span className="material-icons text-red-500">compare</span>
            </div>
            <h3 className="text-lg font-semibold text-red-400 mb-2">Comparison Training</h3>
            <p className="text-sm text-gray-300">Compare your technique with reference performances</p>
          </div>
          
          <div className="p-5 rounded-2xl backdrop-blur-lg border border-red-500/20 bg-gradient-to-br from-gray-900/80 to-black/80 shadow-lg transform transition-all duration-300 hover:scale-105">
            <div className="mb-3 h-10 w-10 rounded-full bg-red-700/20 flex items-center justify-center">
              <span className="material-icons text-red-500">devices</span>
            </div>
            <h3 className="text-lg font-semibold text-red-400 mb-2">Multi-device Access</h3>
            <p className="text-sm text-gray-300">Access your training data from any device</p>
          </div>
        </motion.div>
      )}
      
      {/* Footer */}
      <motion.div 
        className="mt-8 text-center text-gray-500 text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        © 2025 CoachT. All rights reserved.
      </motion.div>
    </div>
  );
}