import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { 
  Crown, Trophy, Award, BarChart, Settings, User, Clock, Play,
  MessageSquare, RefreshCw
} from 'lucide-react';

export default function Home() {
  // Auth context
  const { user, logoutMutation } = useAuth();
  
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
              <h1 className="text-lg font-bold text-pink-500">Arshia Kathpalia</h1>
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
          <Button variant="ghost" size="sm" className="text-pink-800 hover:bg-pink-300">
            <Crown className="h-4 w-4 mr-2" />
            Pageant Training
          </Button>
          <Button variant="ghost" size="sm" className="text-pink-800 hover:bg-pink-300">
            <Award className="h-4 w-4 mr-2" />
            Top Performers
          </Button>
          <Button variant="ghost" size="sm" className="text-pink-800 hover:bg-pink-300">
            <Trophy className="h-4 w-4 mr-2" />
            For Pageant Titles
          </Button>
          <Button variant="ghost" size="sm" className="text-pink-800 hover:bg-pink-300">
            <BarChart className="h-4 w-4 mr-2" />
            Miss USA
          </Button>
          <Button variant="ghost" size="sm" className="text-pink-800 hover:bg-pink-300">
            <Crown className="h-4 w-4 mr-2" />
            Training Sessions
          </Button>
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
              <p>Elevate your confidence, time your technique, we</p>
              <p>a should rita blending harmony supporting acid</p>
              <p>your hava foroooting at aut, tan oemace.</p>
            </div>
            
            {/* Main CTA Button */}
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold px-8 py-6 text-lg rounded-full shadow-lg"
            >
              <Play className="h-6 w-6 mr-3" />
              Begin Runway Practice
            </Button>
            
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
    </div>
  );
}