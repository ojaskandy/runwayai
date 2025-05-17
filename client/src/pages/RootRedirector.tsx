import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

export default function RootRedirector() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        navigate('/app', { replace: true });
      } else {
        navigate('/auth', { replace: true });
      }
    }
  }, [user, isLoading, navigate]);

  // Display a loading indicator while checking auth status
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
      <Loader2 className="h-16 w-16 animate-spin text-red-500 mb-4" />
      <p className="text-xl">Loading...</p>
    </div>
  );
} 