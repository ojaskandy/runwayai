import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

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

export default function SimpleAuthPage() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("login");
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/user', {
          credentials: 'include'
        });
        if (response.ok) {
          navigate('/app');
        }
      } catch (error) {
        // User not logged in, stay on auth page
      }
    };
    checkAuth();
  }, [navigate]);

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

  // Login function
  const handleLogin = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      if (response.ok) {
        const userData = await response.json();
        toast({
          title: "Login Successful",
          description: `Welcome back, ${userData.username}!`,
        });
        setTimeout(() => {
          navigate('/app');
        }, 1000);
      } else {
        const error = await response.json();
        toast({
          title: "Login Failed",
          description: error.message || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Login Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const handleRegister = async (data: RegisterFormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      if (response.ok) {
        const userData = await response.json();
        toast({
          title: "Registration Successful",
          description: `Account created for ${userData.username}! Redirecting...`,
        });
        setTimeout(() => {
          navigate('/app');
        }, 1000);
      } else {
        const error = await response.json();
        toast({
          title: "Registration Failed",
          description: error.message || "Failed to create account",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Registration Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-8">
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

      {/* Auth Card */}
      <motion.div
        className="w-full max-w-sm mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="border-gray-200 bg-white shadow-sm border rounded-lg">
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
                  Sign in to continue your pageant training journey
                </CardDescription>
              </CardHeader>
              
              <CardContent className="px-4 sm:px-6">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
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
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showLoginPassword ? "text" : "password"}
                                placeholder="Enter your password" 
                                {...field} 
                                className="bg-gray-50 border-gray-300 text-gray-900 font-medium placeholder:text-gray-400 focus:bg-white focus:border-gray-400 focus:ring-0 h-12 sm:h-11 rounded-lg text-base sm:text-sm pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => setShowLoginPassword(!showLoginPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                              >
                                {showLoginPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit"
                      className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold h-12 sm:h-11 rounded-lg transition-colors text-base sm:text-sm mt-6"
                      disabled={isLoading}
                    >
                      {isLoading ? "Signing In..." : "Sign In"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
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
                  <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
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
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showRegisterPassword ? "text" : "password"}
                                placeholder="Choose a password" 
                                {...field} 
                                className="bg-gray-50 border-gray-300 text-gray-900 font-medium placeholder:text-gray-400 focus:bg-white focus:border-gray-400 focus:ring-0 h-12 sm:h-11 rounded-lg text-base sm:text-sm pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                              >
                                {showRegisterPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                              </button>
                            </div>
                          </FormControl>
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
                    
                    <Button 
                      type="submit"
                      className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold h-12 sm:h-11 rounded-lg transition-colors text-base sm:text-sm mt-6"
                      disabled={isLoading}
                    >
                      {isLoading ? "Creating Account..." : "Create Account"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </motion.div>
    </div>
  );
}