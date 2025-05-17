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

  // Display a loading indicator with "CoachT" text while checking auth status
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
      <div className="relative">
        <Loader2 className="h-16 w-16 md:h-20 md:w-20 animate-spin text-red-500 mb-4" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-white">T</span>
        </div>
      </div>
      <div className="flex items-center">
        <span className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-red-500 to-red-300 bg-clip-text text-transparent">CoachT</span>
      </div>
    </div>
  );
} 