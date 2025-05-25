import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, RouteProps } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: React.ComponentType<any>;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex flex-col items-center justify-center min-h-screen bg-black">
          <div className="relative mb-2">
            <Loader2 className="h-12 w-12 md:h-16 md:w-16 animate-spin text-pink-300" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-white">AI</span>
            </div>
          </div>
          <div className="flex items-center">
            <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-pink-300 to-white bg-clip-text text-transparent">Runway AI</span>
          </div>
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  return (
    <Route path={path}>
      <Component />
    </Route>
  );
}