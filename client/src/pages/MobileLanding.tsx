import { useState, FormEvent, useEffect } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, CheckCircle, AlertTriangle, Loader2, Send } from 'lucide-react';
import { motion } from 'framer-motion';

const MobileLandingPage = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) {
      setStatus('error');
      setMessage('Please enter a valid email.');
      return;
    }
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/send-guide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(result.message || 'Guide sent! Check your inbox.');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(result.message || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error('Submit Error:', error);
      setStatus('error');
      setMessage('An unexpected error occurred. Please try again later.');
    }
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-black text-white flex flex-col items-center justify-center p-6 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md text-center space-y-6 md:space-y-8"
      >
        <div className="flex justify-center items-center mb-6 md:mb-8">
            <motion.span 
                className="material-icons text-red-500 text-5xl md:text-6xl"
                initial={{ rotate: 0 }}
                animate={{ rotate: [0, 15, -10, 10, -5, 5, 0] }}
                transition={{ duration: 1.5, ease: "easeInOut", delay: 0.5, repeat: Infinity, repeatDelay: 3 }}
              >
                sports_martial_arts
            </motion.span>
            <h1 
              className="text-4xl md:text-5xl font-bold ml-2 md:ml-3"
              style={{
                backgroundImage: 'linear-gradient(to right, #f87171, #fb923c, #facc15)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent'
              }}
            >
              CoachT
            </h1>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          className="space-y-3 md:space-y-4"
        >
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Start Now.
          </h2>
          <p className="text-md md:text-lg text-sky-200/80 max-w-xs mx-auto">
            CoachT delivers the best experience on a bigger screen. Get started now.
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          className="space-y-4 md:space-y-5 w-full"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
        >
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 h-12 md:h-14 text-sm md:text-base bg-gray-800/70 border-gray-700 focus:border-red-500 focus:ring-red-500 placeholder-gray-500 rounded-xl shadow-lg"
              disabled={status === 'loading'}
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 md:h-14 text-md md:text-lg font-semibold bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-700 hover:to-rose-600 text-white shadow-xl hover:shadow-red-500/40 focus:ring-red-500 rounded-xl transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? (
              <Loader2 className="mr-2 h-5 md:h-6 w-5 md:w-6 animate-spin" />
            ) : (
              <>
                Let's Start! <Send className="ml-2 h-4 md:h-5 w-4 md:w-5" />
              </>
            )}
          </Button>
        </motion.form>

        {message && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`mt-3 md:mt-4 p-3 rounded-md text-xs md:text-sm flex items-center justify-center ${
              status === 'success' ? 'bg-green-600/80 text-white' :
              status === 'error' ? 'bg-red-600/80 text-white' : ''
            }`}
          >
            {status === 'success' && <CheckCircle className="mr-2 h-4 md:h-5 w-4 md:w-5" />}
            {status === 'error' && <AlertTriangle className="mr-2 h-4 md:h-5 w-4 md:w-5" />}
            {message}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
          className="pt-4 md:pt-6"
        >
          <p className="text-xs text-gray-500">
            Access CoachT on your <Link href="/" className="text-sky-400 hover:text-sky-300 underline">desktop or laptop</Link>.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default MobileLandingPage; 