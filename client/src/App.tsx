import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Practice from "@/pages/Practice";
import EarlyAccess from "@/pages/EarlyAccess";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
// Use our custom ThemeProvider instead of the shadcn one
import { ThemeProvider } from "./hooks/use-theme";
import MarketingLanding from "@/pages/MarketingLanding";

function Router() {
  return (
    <Switch>
      {/* Marketing landing page as the default landing page */}
      <Route path="/" component={MarketingLanding} />
      
      {/* User dashboard after login */}
      <Route path="/dashboard" component={Landing} />
      
      {/* Main application with camera tracking */}
      <ProtectedRoute path="/app" component={Home} />
      
      {/* Practice page with moves library */}
      <ProtectedRoute path="/practice" component={Practice} />
      
      {/* Authentication page */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Early access signup page */}
      <Route path="/early-access" component={EarlyAccess} />
      
      {/* 404 page */}
      <Route component={NotFound} />
    </Switch>
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
