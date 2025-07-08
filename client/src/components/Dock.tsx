import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Clock, Info, Trophy, Palette, MessageSquare, Sun } from 'lucide-react';

const Dock = () => {
  const [activeTab, setActiveTab] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [practiceTime, setPracticeTime] = useState('00:00:00');
  const [location, setLocation] = useLocation();

  // Update active tab based on current route
  useEffect(() => {
    const path = location.split('/')[1];
    setActiveTab(path || 'home');
  }, [location]);

  const navigate = (path: string) => {
    setLocation(path);
  };

  // Timer logic
  useEffect(() => {
    let seconds = 0;
    const timer = setInterval(() => {
      seconds++;
      const hours = Math.floor(seconds / 3600)
        .toString()
        .padStart(2, '0');
      const minutes = Math.floor((seconds % 3600) / 60)
        .toString()
        .padStart(2, '0');
      const secs = (seconds % 60).toString().padStart(2, '0');
      setPracticeTime(`${hours}:${minutes}:${secs}`);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const dockItems = [
    { id: 'quick-actions', icon: <Info size={20} />, label: 'Quick Actions' },
    { id: 'practice', icon: <Clock size={20} />, label: 'Practice' },
    { id: 'profile', icon: <Trophy size={20} />, label: 'Profile' },
  ];

  const quickActions = [
    { id: 'tips', icon: <Info size={16} />, label: 'Pageant Tips', action: () => navigate('/tips') },
    { id: 'top-performers', icon: <Trophy size={16} />, label: 'Top Performers', action: () => navigate('/leaderboard') },
    { id: 'customize', icon: <Palette size={16} />, label: 'Customize Experience', action: () => setShowMenu(false) },
    { id: 'feedback', icon: <MessageSquare size={16} />, label: 'Send Feedback', action: () => window.open('mailto:feedback@example.com') },
    { id: 'theme', icon: <Sun size={16} />, label: 'Light Mode', action: () => document.documentElement.classList.toggle('light') },
  ];

  return (
    <div className="fixed bottom-4 left-0 right-0 flex justify-center z-50 px-4">
      <div className="relative">
        {/* Quick Actions Menu */}
        {showMenu && (
          <div className="absolute bottom-full mb-4 left-1/2 transform -translate-x-1/2 w-64 bg-black/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-white/10">
            <h3 className="text-pink-400 text-sm font-medium mb-3 flex items-center">
              <Info className="mr-2" size={16} /> Quick Actions
            </h3>
            <div className="space-y-2">
              {quickActions.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    item.action();
                    if (item.id !== 'theme') setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-white/90 hover:bg-white/10 transition-colors flex items-center"
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
            
            <div className="mt-4 pt-3 border-t border-white/10">
              <div className="text-xs text-white/60 flex items-center">
                <Clock className="mr-2" size={14} />
                Practice time: <span className="text-orange-400 ml-1">{practiceTime}</span>
              </div>
              <div className="text-xs text-red-400 mt-1">
                Error: 401: Unauthorized
              </div>
            </div>
          </div>
        )}

        {/* Dock */}
        <div className="bg-black/50 backdrop-blur-xl rounded-2xl p-2 flex items-center border border-white/10 shadow-2xl">
          {dockItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'quick-actions') {
                  setShowMenu(!showMenu);
                } else {
                  setShowMenu(false);
                  navigate(`/${item.id}`);
                }
              }}
              className={`p-3 mx-1 rounded-xl transition-all duration-200 flex flex-col items-center ${
                activeTab === item.id || (item.id === 'quick-actions' && showMenu)
                  ? 'bg-pink-500/20 text-pink-400 scale-110'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              {item.icon}
              <span className="text-[10px] mt-1">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dock;
