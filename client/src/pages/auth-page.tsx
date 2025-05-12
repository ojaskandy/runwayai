import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
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

  // Check URL for tab parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'register') {
      setActiveTab('register');
    }
  }, []);

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
      password: "",
      confirmPassword: "",
    },
  });

  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    const { confirmPassword, ...registerData } = data;
    registerMutation.mutate(registerData);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-950">
      {/* Hero Section */}
      <div className="w-full md:w-1/2 bg-gradient-to-br from-gray-900 to-black p-8 flex flex-col justify-center items-center">
        <div className="max-w-md mx-auto text-center">
          <div className="mb-6">
            <div className="inline-block p-3 rounded-full bg-red-900/30 mb-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-r from-red-700 to-red-600 flex items-center justify-center">
                <span className="material-icons text-white text-3xl">sports_martial_arts</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">CoachT</h1>
            <p className="text-gray-400">Advanced Taekwondo Form Analysis</p>
          </div>
          
          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-gray-800/50 border border-red-900/30">
              <div className="flex items-center mb-3">
                <span className="material-icons text-red-500 mr-2">analytics</span>
                <h3 className="font-medium text-white">Real-time Form Analysis</h3>
              </div>
              <p className="text-sm text-gray-400">
                Perfect your Taekwondo stances and movements with AI-powered pose tracking
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-gray-800/50 border border-red-900/30">
              <div className="flex items-center mb-3">
                <span className="material-icons text-red-500 mr-2">compare</span>
                <h3 className="font-medium text-white">Comparison Training</h3>
              </div>
              <p className="text-sm text-gray-400">
                Upload videos to compare your technique with reference performances
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-gray-800/50 border border-red-900/30">
              <div className="flex items-center mb-3">
                <span className="material-icons text-red-500 mr-2">device_hub</span>
                <h3 className="font-medium text-white">Multi-device Access</h3>
              </div>
              <p className="text-sm text-gray-400">
                Save your settings and access your training data from any device
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Auth Forms */}
      <div className="w-full md:w-1/2 bg-gray-950 p-8 flex items-center justify-center">
        <div className="w-full max-w-md">
          <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-800 p-1 border border-red-900/30">
              <TabsTrigger 
                value="login" 
                className="text-lg data-[state=active]:bg-red-700 data-[state=active]:text-white data-[state=active]:shadow-none text-gray-300"
              >
                Login
              </TabsTrigger>
              <TabsTrigger 
                value="register" 
                className="text-lg data-[state=active]:bg-red-700 data-[state=active]:text-white data-[state=active]:shadow-none text-gray-300"
              >
                Register
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Card className="border-red-900/30 bg-gray-900">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-red-500">Login to Your Account</CardTitle>
                  <CardDescription className="text-gray-300">Enter your credentials to access your CoachT dashboard</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form id="login-form" onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white text-base">Username</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter your username" 
                                {...field} 
                                className="bg-gray-800 border-gray-700 text-white"
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
                            <FormLabel className="text-white text-base">Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Enter your password" 
                                {...field} 
                                className="bg-gray-800 border-gray-700 text-white"
                              />
                            </FormControl>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                  <Button 
                    type="submit" 
                    form="login-form" 
                    className="w-full bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white text-lg py-6"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? 
                      <span className="flex items-center">
                        <span className="material-icons animate-spin mr-2">refresh</span>
                        Signing in...
                      </span> : 
                      "Sign In"
                    }
                  </Button>
                  
                  <div className="w-full text-center pt-2">
                    <p className="text-gray-400">
                      Don't have an account?{" "}
                      <button 
                        type="button" 
                        onClick={() => setActiveTab("register")}
                        className="text-red-400 hover:text-red-300 font-semibold"
                      >
                        Register here
                      </button>
                    </p>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="register">
              <Card className="border-red-900/30 bg-gray-900">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-red-500">Create an Account</CardTitle>
                  <CardDescription className="text-gray-300">Register to save your training sessions and settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form id="register-form" onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
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
                                className="bg-gray-800 border-gray-700 text-white"
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
                            <FormLabel className="text-white text-base">Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Create a password" 
                                {...field}
                                className="bg-gray-800 border-gray-700 text-white" 
                              />
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
                            <FormLabel className="text-white text-base">Confirm Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Confirm your password" 
                                {...field}
                                className="bg-gray-800 border-gray-700 text-white" 
                              />
                            </FormControl>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                  <Button 
                    type="submit" 
                    form="register-form" 
                    className="w-full bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white text-lg py-6"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? 
                      <span className="flex items-center">
                        <span className="material-icons animate-spin mr-2">refresh</span>
                        Creating account...
                      </span> : 
                      "Create Account"
                    }
                  </Button>
                  
                  <div className="w-full text-center pt-2">
                    <p className="text-gray-400">
                      Already have an account?{" "}
                      <button 
                        type="button" 
                        onClick={() => setActiveTab("login")}
                        className="text-red-400 hover:text-red-300 font-semibold"
                      >
                        Login here
                      </button>
                    </p>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}