import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { 
  Crown, Trophy, Award, BarChart, Settings, User, Clock, Play,
  MessageSquare, RefreshCw, X, Star, Calendar, MapPin
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Link } from 'wouter';

export default function Home() {
  // Auth context
  const { user, logoutMutation } = useAuth();
  
  // State for profile popup
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Logo and User Info */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <Crown className="h-6 w-6 text-pink-500" />
              <span className="text-xl font-black text-gray-900">Runway AI</span>
              <span className="text-xs text-pink-500 font-medium">BETA</span>
            </div>
            
            {/* User greeting */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">Welcome back!</span>
              <Button 
                variant="ghost" 
                className="text-lg font-bold text-pink-500 hover:text-pink-600 p-0 h-auto"
                onClick={() => setShowProfileDialog(true)}
              >
                Arshia Kathpalia
              </Button>
            </div>
            
            {/* User avatar and title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-pink-300 flex items-center justify-center">
                <Crown className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Miss Teen India USA 2024</div>
              </div>
            </div>
          </div>
          
          {/* Right side - Status and Profile */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-pink-100 px-3 py-1 rounded-full">
              <Crown className="h-4 w-4 text-pink-600" />
              <span className="text-sm font-medium text-pink-700">Pageant Queen</span>
              <Settings className="h-4 w-4 text-pink-600" />
              <span className="text-sm font-bold text-pink-700">9000 hrs/8h</span>
            </div>
            
            <Button size="sm" variant="ghost" className="text-gray-600">
              <User className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      
      {/* Navigation Bar */}
      <nav className="bg-pink-200 px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/camera">
            <Button variant="ghost" size="sm" className="text-pink-800 hover:bg-pink-300">
              <Crown className="h-4 w-4 mr-2" />
              Pageant Training
            </Button>
          </Link>
          <Link href="/leaderboard">
            <Button variant="ghost" size="sm" className="text-pink-800 hover:bg-pink-300">
              <Award className="h-4 w-4 mr-2" />
              Top Performers
            </Button>
          </Link>
          <Link href="/recordings">
            <Button variant="ghost" size="sm" className="text-pink-800 hover:bg-pink-300">
              <Trophy className="h-4 w-4 mr-2" />
              For Pageant Titles
            </Button>
          </Link>
          <Link href="/profile">
            <Button variant="ghost" size="sm" className="text-pink-800 hover:bg-pink-300">
              <BarChart className="h-4 w-4 mr-2" />
              Miss USA
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="text-pink-800 hover:bg-pink-300">
              <Crown className="h-4 w-4 mr-2" />
              Training Sessions
            </Button>
          </Link>
        </div>
      </nav>
      
      {/* Main Content Area */}
      <div className="flex">
        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="max-w-2xl mx-auto text-center">
            {/* Presented By */}
            <div className="text-sm text-pink-500 font-medium mb-4 tracking-wide">
              PRESENTED BY
            </div>
            
            {/* Main Heading */}
            <h1 className="text-5xl font-black text-pink-500 mb-6 leading-tight">
              Welcome to the Runway!
            </h1>
            
            {/* Subtitle */}
            <h2 className="text-2xl font-bold text-pink-500 mb-8">
              Miss Teen India USA 2024
            </h2>
            
            {/* Description */}
            <div className="text-lg text-gray-700 mb-12 leading-relaxed space-y-2">
              <p>Perfect your poise. Capture your elegance. Own the stage.</p>
              <p>Elevate your confidence, refine your technique, and</p>
              <p>master the art of pageant excellence with AI-powered</p>
              <p>movement analysis and personalized coaching.</p>
            </div>
            
            {/* Main CTA Button */}
            <Link href="/camera">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold px-8 py-6 text-lg rounded-full shadow-lg"
              >
                <Play className="h-6 w-6 mr-3" />
                Begin Runway Practice
              </Button>
            </Link>
            
            {/* Secondary Action */}
            <div className="mt-8">
              <Button variant="ghost" size="sm" className="text-pink-500 hover:bg-pink-50">
                <Settings className="h-4 w-4 mr-2" />
                Customize Your Experience
              </Button>
            </div>
          </div>
        </main>
        
        {/* Right Sidebar */}
        <aside className="w-16 bg-pink-300 flex flex-col items-center py-6 gap-4">
          <Button size="sm" variant="ghost" className="text-pink-800 hover:bg-pink-400 p-2">
            <Clock className="h-5 w-5" />
          </Button>
          <Button size="sm" variant="ghost" className="text-pink-800 hover:bg-pink-400 p-2">
            <Trophy className="h-5 w-5" />
          </Button>
          <Button size="sm" variant="ghost" className="text-pink-800 hover:bg-pink-400 p-2">
            <BarChart className="h-5 w-5" />
          </Button>
          <Button size="sm" variant="ghost" className="text-pink-800 hover:bg-pink-400 p-2">
            <User className="h-5 w-5" />
          </Button>
          <Button size="sm" variant="ghost" className="text-pink-800 hover:bg-pink-400 p-2">
            <MessageSquare className="h-5 w-5" />
          </Button>
          <Button size="sm" variant="ghost" className="text-pink-800 hover:bg-pink-400 p-2">
            <Crown className="h-5 w-5" />
          </Button>
          <Button size="sm" variant="ghost" className="text-pink-800 hover:bg-pink-400 p-2">
            <Award className="h-5 w-5" />
          </Button>
          <Button size="sm" variant="ghost" className="text-pink-800 hover:bg-pink-400 p-2">
            <Settings className="h-5 w-5" />
          </Button>
          
          {/* Bottom icon */}
          <div className="mt-auto">
            <Button size="sm" variant="ghost" className="text-pink-800 hover:bg-pink-400 p-2">
              <RefreshCw className="h-5 w-5" />
            </Button>
          </div>
        </aside>
      </div>

      {/* Arshia Kathpalia Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-md bg-white border-pink-200 border-2">
          <DialogHeader>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-pink-300">
                <img 
                  src="/arshia-profile.png" 
                  alt="Arshia Kathpalia" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-pink-600">
                  Arshia Kathpalia
                </DialogTitle>
                <div className="flex items-center gap-2 text-sm text-pink-500">
                  <Crown className="h-4 w-4" />
                  Miss Teen India USA 2024
                </div>
              </div>
            </div>
          </DialogHeader>
          
          <DialogDescription className="text-gray-700 space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-pink-500" />
              <span>United States</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-pink-500" />
              <span>Crowned 2024</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Star className="h-4 w-4 text-pink-500" />
              <span>Runway AI Creator & Founder</span>
            </div>
            
            <p className="mt-4 leading-relaxed">
              Arshia Kathpalia is the reigning Miss Teen India USA 2024 and the visionary creator of Runway AI. 
              As a passionate advocate for pageant excellence, she developed this cutting-edge platform to help 
              aspiring contestants perfect their runway walk, poise, and stage presence through AI-powered movement analysis.
            </p>
            
            <p className="leading-relaxed">
              With her expertise in pageantry and technology, Arshia is revolutionizing how contestants train 
              and prepare for competitions, making professional coaching accessible to everyone.
            </p>
            
            <div className="flex items-center gap-2 mt-4 p-3 bg-pink-50 rounded-lg">
              <Trophy className="h-5 w-5 text-pink-600" />
              <span className="text-sm font-medium text-pink-700">
                "Empowering the next generation of pageant queens through technology"
              </span>
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </div>
  );
}