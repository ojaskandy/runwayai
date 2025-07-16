import { useEffect, useState } from 'react';
import { useLocation, Route, Redirect } from 'wouter';

interface SimpleProtectedRouteProps {
  path: string;
  component: React.ComponentType<any>;
}

export function SimpleProtectedRoute({ path, component: Component }: SimpleProtectedRouteProps) {
  const [, navigate] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/user', {
          credentials: 'include'
        });
        
        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, [navigate]);

  return (
    <Route path={path}>
      {isAuthenticated === null ? (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Loading...</h1>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
          </div>
        </div>
      ) : isAuthenticated ? (
        <Component />
      ) : (
        <Redirect to="/auth" />
      )}
    </Route>
  );
}