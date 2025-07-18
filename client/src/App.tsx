import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/not-found";
import SimpleAuthPage from "@/pages/simple-auth";
import Practice from "@/pages/Practice";
import EarlyAccess from "@/pages/EarlyAccess";
import Profile from "@/pages/Profile";
import { AuthProvider } from "@/hooks/use-auth";
import { SimpleProtectedRoute } from "@/lib/simple-protected-route";
// Use our custom ThemeProvider instead of the shadcn one
import { ThemeProvider } from "./hooks/use-theme";
import MarketingLanding from "@/pages/MarketingLanding";
import RootRedirector from "@/pages/RootRedirector";
import MobileLandingPage from "@/pages/MobileLanding";
import QuestionPractice from "@/pages/QuestionPractice";
import Dock from "@/components/Dock";

function Router() {
  const [location] = useLocation();
  const hideDock = ['/welcome', '/auth', '/early-access', '/mobile-landing', '/'].includes(location);
  
  return (
    <div className={`min-h-screen ${!hideDock ? 'pb-24' : ''}`}>
      <Switch>
      {/* Root path now uses RootRedirector */}
      <Route path="/" component={RootRedirector} />
      
      {/* Marketing landing page moved to /welcome */}
      <Route path="/welcome" component={MarketingLanding} />
      
      {/* User dashboard after login - This might be redundant if /app is the main target */}
      {/* Consider removing /dashboard if Home (at /app) is the primary post-login page */}
      <Route path="/dashboard" component={Landing} />
      
      {/* Main application with camera tracking */}
      <SimpleProtectedRoute path="/app" component={Home} />
      
      {/* Practice page with moves library */}
      <SimpleProtectedRoute path="/practice" component={Practice} />
      
      {/* Question practice page */}
      <SimpleProtectedRoute path="/question-practice" component={QuestionPractice} />

      {/* User profile page */}
      <SimpleProtectedRoute path="/profile" component={Profile} />
      
      {/* Authentication page */}
      <Route path="/auth" component={SimpleAuthPage} />
      
      {/* Early access signup page */}
      <Route path="/early-access" component={EarlyAccess} />
      
      {/* Mobile Landing Page route */}
      <Route path="/mobile-landing" component={MobileLandingPage} />
      
        {/* 404 page */}
        <Route component={NotFound} />
      </Switch>
      
      {!hideDock && <Dock />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
