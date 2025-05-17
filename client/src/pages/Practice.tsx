import { useState, useRef, useEffect } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sun, Moon, User, LogOut, Search, ArrowLeft, Camera, Shield, MessageSquare } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { detectPoses, initPoseDetection, getJointConnections } from '@/lib/poseDetection';
import { calculateJointAngles, angleJoints } from '@/components/camera/JointScoringEngine';

// Define a reference pose type
interface ReferencePose {
  imageUrl: string;
  angles?: Record<string, number>;  // Joint angles data
  jointAngles?: Record<string, number>; // Add this line to support both keys
  processed: boolean;
}

// Extended Taekwondo techniques and forms data with reference images
const defaultTaekwondoMovesData: Array<{ // Renamed from taekwondoMoves
  id: number;
  name: string;
  category: string;
  difficulty: string;
  description: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  referencePose?: ReferencePose; 
  tip?: string;
}> = [
  {
    id: 1,
    name: 'Front Kick (Ap Chagi)',
    category: 'Basic Kicks',
    difficulty: 'Beginner',
    description: 'A forward kick with the ball of the foot as the striking surface.',
    videoUrl: '/moves/front-kick.mp4',
    thumbnailUrl: '/moves/front-kick-thumb.jpg',
    tip: 'Keep your supporting leg slightly bent and maintain balance throughout the kick.',
    referencePose: undefined
  },
  {
    id: 2,
    name: 'Side Kick (Yeop Chagi)',
    category: 'Basic Kicks',
    difficulty: 'Intermediate',
    description: 'A kick delivered with the side edge of the foot or heel.',
    videoUrl: '/moves/side-kick.mp4',
    thumbnailUrl: '/moves/side-kick-thumb.jpg'
  },
  {
    id: 3,
    name: 'Roundhouse Kick (Dollyo Chagi)',
    category: 'Basic Kicks',
    difficulty: 'Intermediate',
    description: 'A kick that rotates around the body, striking with the top of the foot or instep.',
    videoUrl: '/moves/roundhouse-kick.mp4',
    thumbnailUrl: '/moves/roundhouse-kick-thumb.jpg',
    referencePose: {
      imageUrl: 'https://i.sstatic.net/pjuvo.jpg',
      processed: true,
      angles: {
        left_shoulder: 45,
        right_shoulder: 135,
        left_elbow: 90,
        right_elbow: 160,
        left_hip: 120,
        right_hip: 60,
        left_knee: 170,
        right_knee: 160
      }
    }
  },
  {
    id: 4,
    name: 'Back Kick (Dwi Chagi)',
    category: 'Basic Kicks',
    difficulty: 'Advanced',
    description: 'A kick delivered directly backward, striking with the heel.',
    videoUrl: '/moves/back-kick.mp4',
    thumbnailUrl: '/moves/back-kick-thumb.jpg'
  },
  {
    id: 5,
    name: 'Axe Kick (Naeryeo Chagi)',
    category: 'Advanced Kicks',
    difficulty: 'Advanced',
    description: 'An overhand downward strike with the heel.',
    videoUrl: '/moves/axe-kick.mp4',
    thumbnailUrl: '/moves/axe-kick-thumb.jpg'
  },
  {
    id: 6,
    name: 'Spinning Hook Kick (Huryeo Chagi)',
    category: 'Advanced Kicks',
    difficulty: 'Expert',
    description: 'A spinning kick that hooks around to strike with the heel.',
    videoUrl: '/moves/spinning-hook-kick.mp4',
    thumbnailUrl: '/moves/spinning-hook-kick-thumb.jpg'
  },
  {
    id: 7,
    name: 'Taegeuk Il Jang',
    category: 'Poomsae (Forms)',
    difficulty: 'Beginner',
    description: 'The first of the eight Taegeuk forms, focusing on the heaven principle.',
    videoUrl: '/moves/taegeuk-1.mp4',
    thumbnailUrl: '/moves/taegeuk-1-thumb.jpg'
  },
  {
    id: 8,
    name: 'Taegeuk Yi Jang',
    category: 'Poomsae (Forms)',
    difficulty: 'Beginner',
    description: 'The second Taegeuk form, representing joyfulness.',
    videoUrl: '/moves/taegeuk-2.mp4',
    thumbnailUrl: '/moves/taegeuk-2-thumb.jpg'
  },
  {
    id: 9,
    name: 'Front Stance Punch (Ap Kubi Jireugi)',
    category: 'Basic Techniques',
    difficulty: 'Beginner',
    description: 'A punch delivered from the front stance position.',
    videoUrl: '/moves/front-stance-punch.mp4',
    thumbnailUrl: '/moves/front-stance-punch-thumb.jpg'
  },
  {
    id: 10,
    name: 'Horse Stance Block (Juchum Seo Makki)',
    category: 'Basic Techniques',
    difficulty: 'Beginner',
    description: 'A blocking technique performed from the horse stance position.',
    videoUrl: '/moves/horse-stance-block.mp4',
    thumbnailUrl: '/moves/horse-stance-block-thumb.jpg'
  },
  {
    id: 11,
    name: 'Sparring Combination 1',
    category: 'Kyorugi (Sparring)',
    difficulty: 'Intermediate',
    description: 'A basic sparring combination with roundhouse and side kicks.',
    videoUrl: '/moves/sparring-combo-1.mp4',
    thumbnailUrl: '/moves/sparring-combo-1-thumb.jpg'
  },
  {
    id: 12,
    name: 'Sparring Combination 2',
    category: 'Kyorugi (Sparring)',
    difficulty: 'Advanced',
    description: 'Advanced sparring combination with feints and spinning kicks.',
    videoUrl: '/moves/sparring-combo-2.mp4',
    thumbnailUrl: '/moves/sparring-combo-2-thumb.jpg'
  },
  // Basic Techniques (Green)
  {
    id: 13,
    name: 'Low Block (Arae Makki)',
    category: 'Basic Techniques',
    difficulty: 'Beginner',
    description: 'A defensive technique to block low attacks, typically aimed at the lower body.',
    videoUrl: '/moves/low-block.mp4',
    thumbnailUrl: '/moves/low-block-thumb.jpg',
    tip: 'Keep your blocking arm strong and ensure your stance is stable.'
  },
  {
    id: 14,
    name: 'High Block (Eolgul Makki)',
    category: 'Basic Techniques',
    difficulty: 'Beginner',
    description: 'A block where the arm is raised above the head to defend against high attacks.',
    videoUrl: '/moves/high-block.mp4',
    thumbnailUrl: '/moves/high-block-thumb.jpg',
    tip: 'Focus on a strong finishing position with your arm at a 45-degree angle above your head.'
  },
  {
    id: 15,
    name: 'Middle Punch (Momtong Jireugi)',
    category: 'Basic Techniques',
    difficulty: 'Beginner',
    description: 'A straight punch aimed at the middle section (solar plexus) of an opponent.',
    videoUrl: '/moves/middle-punch.mp4',
    thumbnailUrl: '/moves/middle-punch-thumb.jpg',
    tip: 'Rotate your hip and shoulder to generate power, keeping your non-punching hand at your hip.'
  },
  {
    id: 16,
    name: 'Knifehand Strike (Sonnal Chigi)',
    category: 'Basic Techniques',
    difficulty: 'Beginner',
    description: 'A strike performed with the side of the open hand, often targeting the neck.',
    videoUrl: '/moves/knifehand-strike.mp4',
    thumbnailUrl: '/moves/knifehand-strike-thumb.jpg',
    tip: 'Keep your hand straight and tense, with thumb tucked in, focusing on striking with the edge of your hand.'
  },
  {
    id: 17,
    name: 'Palm Block (Batangson Makki)',
    category: 'Basic Techniques',
    difficulty: 'Beginner',
    description: 'A blocking technique using the palm of the hand in a downward pushing motion.',
    videoUrl: '/moves/palm-block.mp4',
    thumbnailUrl: '/moves/palm-block-thumb.jpg',
    tip: 'Use the heel of your palm for power and keep your fingers tightly together.'
  },
  // Intermediate Techniques (Blue)
  {
    id: 18,
    name: 'Double Roundhouse Kick (Dollyo Chagi x2)',
    category: 'Advanced Kicks',
    difficulty: 'Intermediate',
    description: 'Two consecutive roundhouse kicks performed with the same leg without putting the foot down.',
    videoUrl: '/moves/double-roundhouse.mp4',
    thumbnailUrl: '/moves/double-roundhouse-thumb.jpg',
    tip: 'Chamber your leg quickly after the first kick to set up the second one efficiently.'
  },
  {
    id: 19,
    name: 'Twist Kick (Bituro Chagi)',
    category: 'Advanced Kicks',
    difficulty: 'Intermediate',
    description: 'A kick where the leg is twisted during execution, usually targeting the face.',
    videoUrl: '/moves/twist-kick.mp4',
    thumbnailUrl: '/moves/twist-kick-thumb.jpg',
    tip: 'The twisting motion comes from rotating your hips and pivoting on your supporting foot.'
  },
  {
    id: 20,
    name: 'Push Kick (Meereo Chagi)',
    category: 'Basic Kicks',
    difficulty: 'Intermediate',
    description: 'A front kick that pushes the opponent away rather than striking through them.',
    videoUrl: '/moves/push-kick.mp4',
    thumbnailUrl: '/moves/push-kick-thumb.jpg',
    tip: 'Push through with the heel of your foot and keep your knee bent slightly on impact.'
  },
  {
    id: 21,
    name: 'Elbow Strike (Palkup Chigi)',
    category: 'Basic Techniques',
    difficulty: 'Intermediate',
    description: 'A close-range strike using the point or edge of the elbow.',
    videoUrl: '/moves/elbow-strike.mp4',
    thumbnailUrl: '/moves/elbow-strike-thumb.jpg',
    tip: 'Generate power by rotating your torso and keeping your elbow tensed at impact.'
  },
  {
    id: 22,
    name: 'Twin Forearm Block (Sang Palmok Makki)',
    category: 'Basic Techniques',
    difficulty: 'Intermediate',
    description: 'A defensive technique using both forearms in an X-shape to block attacks.',
    videoUrl: '/moves/twin-forearm-block.mp4',
    thumbnailUrl: '/moves/twin-forearm-block-thumb.jpg',
    tip: 'Cross your arms in front of your body and extend forcefully to execute the block.'
  },
  // Advanced Techniques (Red)
  {
    id: 23,
    name: 'Jumping Side Kick (Twimyeo Yeop Chagi)',
    category: 'Advanced Kicks',
    difficulty: 'Advanced',
    description: 'A side kick performed while jumping, increasing its height and power.',
    videoUrl: '/moves/jumping-side-kick.mp4',
    thumbnailUrl: '/moves/jumping-side-kick-thumb.jpg',
    tip: 'Push off strongly with your non-kicking leg and maintain proper side kick form in the air.'
  },
  {
    id: 24,
    name: 'Jumping Back Kick (Twimyeo Dwi Chagi)',
    category: 'Advanced Kicks',
    difficulty: 'Advanced',
    description: 'A back kick executed while jumping, combining height with the power of a back kick.',
    videoUrl: '/moves/jumping-back-kick.mp4',
    thumbnailUrl: '/moves/jumping-back-kick-thumb.jpg',
    tip: 'Look over your shoulder to spot your target before executing the kick in the air.'
  },
  {
    id: 25,
    name: 'Spinning Crescent Kick (Bandal Chagi)',
    category: 'Advanced Kicks',
    difficulty: 'Advanced',
    description: 'A kick that traces a crescent moon shape, performed with a spinning motion.',
    videoUrl: '/moves/spinning-crescent-kick.mp4',
    thumbnailUrl: '/moves/spinning-crescent-kick-thumb.jpg',
    tip: 'Pivot on your supporting foot and maintain height throughout the kick\'s arc.'
  },
  {
    id: 26,
    name: 'Reverse Turning Kick (Bandae Dollyo Chagi)',
    category: 'Advanced Kicks',
    difficulty: 'Advanced',
    description: 'A roundhouse kick performed in the opposite direction of a standard turning kick.',
    videoUrl: '/moves/reverse-turning-kick.mp4',
    thumbnailUrl: '/moves/reverse-turning-kick-thumb.jpg',
    tip: 'Turn your head quickly to spot your target and pivot fully on your supporting foot.'
  },
  {
    id: 27,
    name: 'Downward Knifehand Block (Naeryeo Sonnal Makki)',
    category: 'Basic Techniques',
    difficulty: 'Advanced',
    description: 'A blocking technique using the knifehand in a downward diagonal motion.',
    videoUrl: '/moves/downward-knifehand-block.mp4',
    thumbnailUrl: '/moves/downward-knifehand-block-thumb.jpg',
    tip: 'Keep your arm strong throughout the motion and end with a tense, straight hand.'
  },
  // Expert Techniques (Black)
  {
    id: 28,
    name: '540 Hook Kick (540 Huryeo Chagi)',
    category: 'Advanced Kicks',
    difficulty: 'Expert',
    description: 'An advanced jumping spinning hook kick involving a 540-degree rotation in the air.',
    videoUrl: '/moves/540-hook-kick.mp4',
    thumbnailUrl: '/moves/540-hook-kick-thumb.jpg',
    tip: 'Focus on generating height in your jump before initiating the spin to complete the full rotation.'
  },
  {
    id: 29,
    name: 'Jumping Axe Kick (Twimyeo Naeryeo Chagi)',
    category: 'Advanced Kicks',
    difficulty: 'Expert',
    description: 'An axe kick performed while jumping, increasing its impact and reach.',
    videoUrl: '/moves/jumping-axe-kick.mp4',
    thumbnailUrl: '/moves/jumping-axe-kick-thumb.jpg',
    tip: 'Raise your kicking leg as high as possible before bringing it down with force.'
  },
  {
    id: 30,
    name: 'Spinning Elbow Strike (Dwi Palkup Chigi)',
    category: 'Basic Techniques',
    difficulty: 'Expert',
    description: 'An elbow strike delivered with a spinning motion to increase power and surprise.',
    videoUrl: '/moves/spinning-elbow-strike.mp4',
    thumbnailUrl: '/moves/spinning-elbow-strike-thumb.jpg',
    tip: 'Keep your core tight during the spin and focus on accuracy in targeting.'
  },
  {
    id: 31,
    name: 'Double Jump Kick (E Dan Chagi)',
    category: 'Advanced Kicks',
    difficulty: 'Expert',
    description: 'A technique where two different kicks are executed during a single jump.',
    videoUrl: '/moves/double-jump-kick.mp4',
    thumbnailUrl: '/moves/double-jump-kick-thumb.jpg',
    tip: 'Time your kicks carefully and aim to hit the first target before transitioning to the second kick.'
  },
  {
    id: 32,
    name: 'Tornado Kick (Huryeo Dollyo Chagi)',
    category: 'Advanced Kicks',
    difficulty: 'Expert',
    description: 'A complex kick combining a spinning motion with a roundhouse kick execution.',
    videoUrl: '/moves/tornado-kick.mp4',
    thumbnailUrl: '/moves/tornado-kick-thumb.jpg',
    tip: 'Begin with a strong pivot on your supporting leg and maintain momentum throughout the spin.'
  }
];

// Categories for filtering
const categories = ['All', 'Basic Kicks', 'Advanced Kicks', 'Basic Techniques', 'Poomsae (Forms)', 'Kyorugi (Sparring)'];
const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced', 'Expert'];

// Add a helper to check if an image URL is public (not a data URL)
function isPublicImageUrl(url: string | undefined): boolean {
  return !!url && !url.startsWith('data:');
}

// Add a simple stick figure renderer
function StickFigure({ angles }: { angles: Record<string, number> }) {
  // For demo: just render a basic SVG stick figure using a few key angles
  // In production, you would use the angles to position lines/circles
  return (
    <svg width="200" height="300" viewBox="0 0 200 300" style={{ display: 'block', margin: '0 auto' }}>
      {/* Head */}
      <circle cx="100" cy="50" r="20" fill="#10b981" />
      {/* Body */}
      <line x1="100" y1="70" x2="100" y2="170" stroke="#10b981" strokeWidth="6" />
      {/* Arms */}
      <line x1="100" y1="90" x2="60" y2="130" stroke="#10b981" strokeWidth="6" />
      <line x1="100" y1="90" x2="140" y2="130" stroke="#10b981" strokeWidth="6" />
      {/* Legs */}
      <line x1="100" y1="170" x2="70" y2="250" stroke="#10b981" strokeWidth="6" />
      <line x1="100" y1="170" x2="130" y2="250" stroke="#10b981" strokeWidth="6" />
      {/* Label */}
      <text x="100" y="280" textAnchor="middle" fill="#10b981" fontSize="18">HINT</text>
    </svg>
  );
}

// Sound helpers for countdown
function playBeep() {
  const ctx = new window.AudioContext();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = 660; // Soothing beep
  g.gain.value = 0.08;
  o.connect(g);
  g.connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + 0.15);
  o.onended = () => ctx.close();
}
function playShutter() {
  const ctx = new window.AudioContext();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'triangle';
  o.frequency.value = 220;
  g.gain.value = 0.18;
  o.connect(g);
  g.connect(ctx.destination);
  o.start();
  setTimeout(() => { o.frequency.value = 110; }, 60);
  setTimeout(() => { g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08); }, 120);
  o.stop(ctx.currentTime + 0.18);
  o.onended = () => ctx.close();
}

export default function Practice() {
  // Auth and theme contexts
  const { user, logoutMutation } = useAuth();
  const { theme, setTheme } = useTheme();
  
  const [taekwondoMoves, setTaekwondoMoves] = useState(defaultTaekwondoMovesData); // Added state initialization
  
  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [isDarkMode, setIsDarkMode] = useState(theme === 'dark');
  
  // Selected move for detail view
  const [selectedMove, setSelectedMove] = useState<typeof defaultTaekwondoMovesData[0] | null>(null); // Use renamed type
  
  // Developer mode states
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [developerPassword, setDeveloperPassword] = useState('');
  const [showDeveloperDialog, setShowDeveloperDialog] = useState(false);
  const [showDeveloperTools, setShowDeveloperTools] = useState(false);
  
  // Practice mode states
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [practiceActive, setPracticeActive] = useState(false);
  const [practiceResults, setPracticeResults] = useState<{ score: number; feedback: string } | null>(null);
  // Add userAngles state for storing user's joint angles
  const [userAngles, setUserAngles] = useState<Record<string, number> | null>(null);
  
  // Reference image upload states
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [referenceJointAngles, setReferenceJointAngles] = useState<Record<string, number> | null>(null);
  
  // DOM References
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const snapshotCanvasRef = useRef<HTMLCanvasElement>(null);
  const referenceCanvasRef = useRef<HTMLCanvasElement>(null);
  const practiceCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Add state for the video element
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  
  // Add state for captured image
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processed, setProcessed] = useState(false);
  const [comparisonScore, setComparisonScore] = useState<number | null>(null);
  const [comparisonFeedback, setComparisonFeedback] = useState<string>("");
  
  // Add state for comparison dialog
  const [showComparisonDialog, setShowComparisonDialog] = useState(false);
  const [comparisonDetails, setComparisonDetails] = useState<{ differences: Array<{ joint: string, userAngle?: number, refAngle: number, diff?: number }>, missingJoints: string[], score: number }>({ differences: [], missingJoints: [], score: 0 });
  
  // Define initial joint positions for the interactive sketch
  const initialSketchJointPositions = {
    head: { x: 300, y: 100 },
    neck: { x: 300, y: 150 },
    left_shoulder: { x: 250, y: 180 },
    right_shoulder: { x: 350, y: 180 },
    left_elbow: { x: 220, y: 250 },
    right_elbow: { x: 380, y: 250 },
    left_wrist: { x: 190, y: 320 },
    right_wrist: { x: 410, y: 320 },
    left_hip: { x: 270, y: 300 },
    right_hip: { x: 330, y: 300 },
    left_knee: { x: 250, y: 380 },
    right_knee: { x: 350, y: 380 },
    left_ankle: { x: 230, y: 460 },
    right_ankle: { x: 370, y: 460 },
  };

  // Define connections for the stick figure
  const stickFigureConnections: Array<[keyof typeof initialSketchJointPositions, keyof typeof initialSketchJointPositions]> = [
    ["head", "neck"],
    ["neck", "left_shoulder"],
    ["neck", "right_shoulder"],
    ["left_shoulder", "left_elbow"],
    ["left_elbow", "left_wrist"],
    ["right_shoulder", "right_elbow"],
    ["right_elbow", "right_wrist"],
    ["neck", "left_hip"], // Connect neck to hips for torso
    ["neck", "right_hip"],
    ["left_hip", "left_knee"],
    ["left_knee", "left_ankle"],
    ["right_hip", "right_knee"],
    ["right_knee", "right_ankle"],
  ];

  // Helper to calculate angle between three points
  function calculateAngle(p1: {x:number, y:number}, p2: {x:number, y:number}, p3: {x:number, y:number}) {
    const angle = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
    let degrees = angle * (180 / Math.PI);
    degrees = degrees < 0 ? degrees + 360 : degrees; // Normalize to 0-360
    return Math.round(degrees);
  }
  
  // Add state for developer sketch mode
  const [isSketchMode, setIsSketchMode] = useState(false);
  const [sketchAngles, setSketchAngles] = useState<Record<string, number>>({});
  const [sketchJointPositions, setSketchJointPositions] = useState(initialSketchJointPositions);
  const [draggingJoint, setDraggingJoint] = useState<keyof typeof initialSketchJointPositions | null>(null);
  const [activeJointForSlider, setActiveJointForSlider] = useState<string | null>(null); // Renamed from activeJoint
  const sketchCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // List of key joints for the sketch
  const keyJoints = [
    'left_shoulder', 'right_shoulder', 
    'left_elbow', 'right_elbow', 
    'left_hip', 'right_hip', 
    'left_knee', 'right_knee'
  ];
  
  // Toggle dark/light mode
  const toggleDarkMode = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    setIsDarkMode(newTheme === 'dark');
  };
  
  // Handle developer login
  const handleDeveloperLogin = () => {
    if (developerPassword === 'ojaskandy') {
      setIsDeveloperMode(true);
      setShowDeveloperTools(true);
      setShowDeveloperDialog(false);
    } else {
      alert('Incorrect password');
    }
  };
  
  // Handle reference image upload
  const handleReferenceImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setUploadedImage(result);
    };
    reader.readAsDataURL(file);
  };
  
  // Save the reference move to the database
  const saveReferenceMoveToDatabase = async () => {
    if (!selectedMove?.referencePose?.processed) {
      alert('Please process the reference image first.');
      return;
    }

    try {
      // Prepare data for API call
      const referenceMoveData = {
        moveId: selectedMove.id,
        name: selectedMove.name,
        category: selectedMove.category,
        imageUrl: developerImageUrl || selectedMove.referencePose.imageUrl,
        jointAngles: selectedMove.referencePose.angles
      };
      
      // Show loading indicator
      const saveButtons = Array.from(document.querySelectorAll('button'));
      let saveButton: HTMLButtonElement | null = null;
      
      saveButtons.forEach(btn => {
        if (btn.textContent?.includes('Save to Database')) {
          saveButton = btn as HTMLButtonElement;
        }
      });
      
      if (saveButton) {
        (saveButton as HTMLButtonElement).innerHTML = '<span class="material-icons animate-spin text-sm mr-1">refresh</span> Saving...';
        (saveButton as HTMLButtonElement).disabled = true;
      }
      
      // Save reference move to database
      const response = await fetch('/api/reference-moves', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(referenceMoveData),
      });
      
      if (response.ok) {
        console.log("Reference move saved to database successfully");
        alert('Reference move saved to database successfully!');
      } else {
        console.error("Failed to save reference move to database:", await response.text());
        alert('Failed to save reference move to database!');
      }
    } catch (err) {
      console.error("Error saving reference move to database:", err);
      alert('Error saving reference move to database!');
    } finally {
      // Reset button state
      const saveButtons = Array.from(document.querySelectorAll('button'));
      let saveButton: HTMLButtonElement | null = null;
      
      saveButtons.forEach(btn => {
        if (btn.textContent?.includes('Save to Database') || btn.textContent?.includes('Saving')) {
          saveButton = btn as HTMLButtonElement;
        }
      });
      
      if (saveButton) {
        (saveButton as HTMLButtonElement).innerHTML = '<span class="material-icons text-sm mr-1">save</span> Save to Database';
        (saveButton as HTMLButtonElement).disabled = false;
      }
    }
  };

  // Process reference image to detect poses and calculate angles
  const processReferenceImage = async () => {
    if (!uploadedImage || !selectedMove) return;
    // Prevent processing if angles already exist
    if (selectedMove.referencePose && selectedMove.referencePose.angles) {
      alert('Angles already exist for this reference pose.');
      return;
    }
    
    setIsProcessingImage(true);
    try {
      console.log("Starting reference image processing...");
      
      // Initialize pose detection if not already done
      console.log("Initializing pose detection with thunder model...");
      await initPoseDetection('thunder'); // Use the most accurate model for static images
      
      // Load the image
      console.log("Loading image...");
      const img = new Image();
      img.crossOrigin = "anonymous"; // Allow cross-origin image loading
      img.src = uploadedImage;
      
      // Wait for the image to fully load
      await new Promise((resolve, reject) => {
        img.onload = () => {
          console.log(`Image loaded successfully: ${img.width}x${img.height}`);
          resolve(null);
        };
        img.onerror = (err) => {
          console.error("Error loading image:", err);
          reject(new Error("Failed to load image"));
        };
        // If image is already loaded, resolve immediately
        if (img.complete) {
          console.log("Image was already loaded");
          resolve(null);
        }
      });
      
      // Create a canvas and draw the image
      const canvas = canvasRef.current;
      if (!canvas) {
        throw new Error('Canvas reference not available');
      }
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      // Set canvas dimensions to match image
      canvas.width = img.width || 640;  // Fallback width
      canvas.height = img.height || 480; // Fallback height
      
      console.log(`Canvas dimensions set to: ${canvas.width}x${canvas.height}`);
      
      // Draw image on canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Show the initial image for debugging
      let debugUrl = canvas.toDataURL('image/png');
      console.log("Image drawn on canvas, proceeding to pose detection");
      
      // PERFORMANCE OPTIMIZATION: Run pose detection in a Web Worker or use a lighter model
      // Detect poses with a higher confidence threshold for better quality
      console.log('Detecting poses in reference image...');
      const poses = await detectPoses(img, 1, 0.1); // maxPoses=1, lowered confidence for better detection
      
      console.log(`Pose detection complete. Found ${poses?.length || 0} poses.`);
      if (poses && poses.length > 0) {
        console.log(`First pose has ${poses[0].keypoints.length} keypoints`);
      }
      
      if (poses && poses.length > 0 && poses[0].keypoints.length > 0) {
        const pose = poses[0];
        
        // Calculate joint angles - OPTIMIZED by pre-computing all angles at once
        const angles = calculateJointAngles(pose);
        console.log('Reference pose angles:', angles);
        setReferenceJointAngles(angles);
        
        // Draw skeleton on canvas
        console.log("Drawing skeleton overlay...");
        canvas.style.display = 'block'; // Make canvas visible
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // PERFORMANCE OPTIMIZATION: Batch the canvas drawing operations
        // Start a single path for all drawing operations
        ctx.beginPath();
        
        // Draw keypoints with larger circles for better visibility
        pose.keypoints.forEach(keypoint => {
          if (keypoint.score && keypoint.score > 0.1) {
            ctx.beginPath();
            ctx.arc(keypoint.x, keypoint.y, 6, 0, 2 * Math.PI);
            ctx.fillStyle = '#00ff00';
            ctx.fill();
            
            // Add a border to the circles
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Only draw keypoint names in developer mode
            if (keypoint.name && isDeveloperMode) {
              ctx.font = '10px Arial';
              ctx.fillStyle = '#ffffff';
              ctx.fillText(keypoint.name, keypoint.x + 8, keypoint.y);
            }
          }
        });
        
        // Draw connections with thicker lines for better visibility
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 4;
        
        const connections = getJointConnections();
        ctx.beginPath(); // Start a single path for all connections
        
        // Explicitly iterate through connections with their proper type
        connections.forEach((connection) => {
          const [start, end] = connection;
          const startPoint = pose.keypoints.find(kp => kp.name === start);
          const endPoint = pose.keypoints.find(kp => kp.name === end);
          
          if (
            startPoint && endPoint &&
            typeof startPoint.score === 'number' && startPoint.score > 0.1 &&
            typeof endPoint.score === 'number' && endPoint.score > 0.1
          ) {
            ctx.moveTo(startPoint.x, startPoint.y);
            ctx.lineTo(endPoint.x, endPoint.y);
          }
        });
        ctx.stroke(); // Draw all lines at once
        
        // Convert canvas to data URL for display
        const processedImageUrl = canvas.toDataURL('image/png');
        console.log("Skeleton overlay complete, saving results");
        
        // Save the reference pose for the selected move
        const updatedMoves = [...taekwondoMoves];
        const moveIndex = updatedMoves.findIndex(m => m.id === selectedMove.id);
        
        if (moveIndex > -1) {
          updatedMoves[moveIndex] = {
            ...updatedMoves[moveIndex],
            referencePose: {
              imageUrl: processedImageUrl, // Use the processed image with skeleton
              angles: angles,
              processed: true
            }
          };
          
          // Update the selected move state
          setSelectedMove(updatedMoves[moveIndex]);
          
          // Save the reference pose to the database
          try {
            // Prepare data for API call
            const referenceMoveData = {
              moveId: selectedMove.id,
              name: selectedMove.name,
              category: selectedMove.category,
              imageUrl: processedImageUrl,
              jointAngles: angles
            };
            
            // Save reference move to database
            const response = await fetch('/api/reference-moves', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(referenceMoveData),
            });
            
            if (response.ok) {
              console.log("Reference move saved to database successfully");
            } else {
              console.error("Failed to save reference move to database:", await response.text());
            }
          } catch (err) {
            console.error("Error saving reference move to database:", err);
          }
          
          // Show success message
          console.log("Reference pose processed successfully");
          alert('Reference pose processed successfully and saved for all users!');
        }
      } else {
        throw new Error('No pose detected in the image');
      }
    } catch (error: any) {
      console.error('Error processing reference image:', error);
      alert(`Failed to process reference image: ${error?.message || 'Please try another image'}`);
    } finally {
      setIsProcessingImage(false);
    }
  };
  
  // Modify the startPractice function to properly handle countdown and image capture
  const startPractice = async () => {
    if (!selectedMove?.referencePose?.processed) {
      alert('Reference pose is not available for this move. Please ask a developer to add one.');
      return;
    }
    
    try {
      await initPoseDetection('lightning');
    } catch (error) {
      console.error("Error initializing pose detection:", error);
      alert("Failed to initialize pose detection. Please try again.");
      return;
    }
    
    setIsPracticeMode(true);
    setPracticeResults(null);
    setCapturedImage(null);
    setProcessed(false);
    setUserAngles(null);
    setPracticeActive(true);
  };
  
  // Add a new helper function to process and compare the image
  const processAndCompareImage = async (imageData: string) => {
    console.log("Processing captured image");
    const img = new window.Image();
    img.src = imageData;
    await new Promise(resolve => { img.onload = resolve; });
    
    if (!practiceCanvasRef.current) return;
    const canvas = practiceCanvasRef.current;
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, img.width, img.height);
    
    // Try multiple pose detection models for better results
    try {
      // First attempt with Thunder model (more accurate)
      console.log("Attempting detection with Thunder model");
      await initPoseDetection('thunder');
      const poses = await detectPoses(img, 1, 0.15);
      
      if (poses && poses.length > 0 && poses[0].keypoints.length > 10) {
        console.log(`Thunder model detected ${poses[0].keypoints.length} keypoints`);
        await drawPoseAndCalculateAngles(poses[0], ctx, canvas);
      } else {
        // Fall back to Lightning model
        console.log("Thunder model failed, trying Lightning model");
        await initPoseDetection('lightning');
        const lightningPoses = await detectPoses(img, 1, 0.1);
        
        if (lightningPoses && lightningPoses.length > 0) {
          console.log(`Lightning model detected ${lightningPoses[0].keypoints.length} keypoints`);
          await drawPoseAndCalculateAngles(lightningPoses[0], ctx, canvas);
        } else {
          console.error("No poses detected with either model");
        }
      }
    } catch (error) {
      console.error("Error in pose detection:", error);
    }
    
    // After processing, compare the results
    console.log("Proceeding to compare angles");
    handleCompareImage();
  };
  
  // Helper to draw pose and calculate angles
  const drawPoseAndCalculateAngles = async (pose: any, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    // Calculate joint angles from pose
    const angles = calculateJointAngles(pose);
    console.log("Calculated angles:", angles);
    
    // IMPORTANT: Set these angles in state for comparison
    setUserAngles(angles);
    setProcessed(true);
    
    // Draw keypoints
    pose.keypoints.forEach((keypoint: any) => {
      if (keypoint.score && keypoint.score > 0.1) {
        ctx.beginPath();
        ctx.arc(keypoint.x, keypoint.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#00ff00';
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Label keypoints
        if (keypoint.name) {
          ctx.font = '10px Arial';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(keypoint.name, keypoint.x + 8, keypoint.y);
        }
      }
    });
    
    // Draw connections
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 4;
    const connections = getJointConnections();
    connections.forEach((connection) => {
      const [start, end] = connection;
      const startPoint = pose.keypoints.find((kp: any) => kp.name === start);
      const endPoint = pose.keypoints.find((kp: any) => kp.name === end);
      
      if (
        startPoint && endPoint &&
        typeof startPoint.score === 'number' && startPoint.score > 0.1 &&
        typeof endPoint.score === 'number' && endPoint.score > 0.1
      ) {
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();
      }
    });
    
    // Draw angle bubbles on the key joints
    angleJoints.forEach(joint => {
      const jointKeypoint = pose.keypoints.find((kp: any) => kp.name === joint);
      const angle = angles[joint];
      if (jointKeypoint && jointKeypoint.score && jointKeypoint.score > 0.1 && angle !== undefined) {
        // Determine color based on comparison to reference
        let bubbleColor = '#6b7280'; // gray by default
        let diff: number | undefined = undefined;
        if (selectedMove?.referencePose?.angles && selectedMove.referencePose.angles[joint] !== undefined) {
          diff = Math.abs(angle - selectedMove.referencePose.angles[joint]);
          if (diff <= 10) bubbleColor = '#10b981'; // green
          else if (diff <= 20) bubbleColor = '#facc15'; // yellow
          else bubbleColor = '#ef4444'; // red
        }
        const bubbleRadius = 20;
        ctx.beginPath();
        ctx.fillStyle = bubbleColor;
        ctx.arc(jointKeypoint.x + 25, jointKeypoint.y - 5, bubbleRadius, 0, 2 * Math.PI);
        ctx.fill();
        // Draw angle text
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.round(angle)}°`, jointKeypoint.x + 25, jointKeypoint.y - 5);
        // Draw joint name text
        ctx.font = '10px Arial';
        ctx.fillText(joint.replace(/_/g, ' '), jointKeypoint.x + 25, jointKeypoint.y - 22);
        // Connect bubble to joint
        ctx.beginPath();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.moveTo(jointKeypoint.x, jointKeypoint.y);
        ctx.lineTo(jointKeypoint.x + 15, jointKeypoint.y - 3);
        ctx.stroke();
      }
    });
    
    setProcessed(true);
    
    // Log all detected angles for debugging
    console.log("All detected angles:", angles);
    console.log("All keypoints:", pose.keypoints.map((kp: any) => `${kp.name}: score=${kp.score}`));
    
    // Let drawPoseAndCalculateAngles handle the comparison
    await drawPoseAndCalculateAngles(pose, ctx, canvas);
  };
  
  // Update handleCompareImage to better handle missing joints
  const handleCompareImage = () => {
    if (!selectedMove?.referencePose?.angles) {
      console.error("No reference angles available for comparison");
      return;
    }
    
    // Get user angles with a default empty object if null
    const currentUserAngles = userAngles || {};
    console.log("USER ANGLES FOR COMPARISON:", currentUserAngles);
    console.log("REFERENCE ANGLES:", selectedMove.referencePose.angles);
    
    const refAngles = selectedMove.referencePose.angles;
    const differences: Array<{ joint: string, userAngle?: number, refAngle: number, diff?: number }> = [];
    const missingJoints: string[] = [];
    
    // Calculate score based on visible joints
    let totalDiff = 0;
    let count = 0;
    
    // Check all reference joints
    Object.entries(refAngles).forEach(([joint, refAngle]) => {
      if (currentUserAngles[joint] !== undefined) {
        const userAngle = currentUserAngles[joint];
        const diff = Math.abs(userAngle - refAngle);
        differences.push({ joint, userAngle, refAngle, diff });
        
        totalDiff += diff;
        count++;
      } else {
        differences.push({ joint, refAngle });
        missingJoints.push(joint);
      }
    });
    
    // Calculate score
    let score = 0;
    if (count > 0) {
      const avgDiff = totalDiff / count;
      score = Math.max(0, 100 - (avgDiff * 100 / 45));
      score = Math.round(score);
    }
    
    // Generate feedback
    let feedback = "";
    if (missingJoints.length === 0 && count > 0) {
      if (score >= 90) {
        feedback = "Excellent form! Your pose is nearly perfect.";
      } else if (score >= 70) {
        feedback = "Good job! Your form is mostly correct.";
      } else if (score >= 50) {
        feedback = "You're on the right track, but your form needs some adjustment.";
      } else {
        feedback = "Your pose needs significant improvement. Focus on matching the reference angles.";
      }
      
      // Add specific joint feedback
      const worstJoints = differences
        .filter(d => d.diff !== undefined && d.diff > 15)
        .sort((a, b) => (b.diff || 0) - (a.diff || 0))
        .slice(0, 2);
      
      if (worstJoints.length > 0) {
        const jointFeedback = worstJoints.map(d => {
          const jointName = d.joint.replace(/_/g, ' ');
          const userAngle = d.userAngle || 0;
          const refAngle = d.refAngle;
          const direction = userAngle > refAngle ? "decrease" : "increase";
          return `${jointName} (${direction} angle by ${Math.round(Math.abs(userAngle - refAngle))}°)`;
        }).join(' and ');
        
        feedback += ` Focus on improving your ${jointFeedback}.`;
      }
    } else if (missingJoints.length > 0) {
      feedback = `Some key joints are not visible: ${missingJoints.map(j => j.replace(/_/g, ' ')).join(', ')}. Try adjusting your position.`;
    }
    
    // Update performance history
    if (selectedMove) {
      setPerformanceHistory(prev => {
        const moveHistory = prev[selectedMove.id] || [];
        if (moveHistory.length >= 3) return prev; // Do not add more than 3
        const safeAngles = userAngles ?? undefined;
        // Append new attempt (chronological order)
        const newHistory = [...moveHistory, { score, timestamp: Date.now(), feedback, angles: safeAngles }];
        return {
          ...prev,
          [selectedMove.id]: newHistory
        };
      });
    }
    
    // Set the comparison details and force UI update
    setComparisonDetails({
      differences,
      missingJoints,
      score
    });
    
    // Update UI state with results
    setComparisonScore(score);
    setComparisonFeedback(feedback);
    
    // Show the comparison dialog
    setShowComparisonDialog(true);
  };
  
  // Capture a snapshot of the user's pose for evaluation
  const captureUserPose = async () => {
    console.log("Capturing user pose...");
    if (!videoElement || !snapshotCanvasRef.current) {
      console.error("Video or snapshot canvas not available");
      return false;
    }
    
    try {
      const video = videoElement;
      const canvas = snapshotCanvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        console.error("Could not get canvas context");
        return false;
      }
      
      // Set canvas size to match video
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      // Make sure the canvas is visible
      canvas.style.display = "block";
      
      // First just draw the video frame to show the captured image
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Show "Processing..." text on the captured image
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
      ctx.font = 'bold 16px Arial';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.fillText('Processing pose...', canvas.width / 2, canvas.height - 15);
      
      // Let the UI update to show the captured image before processing
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Detect poses in the snapshot
      const poses = await detectPoses(video, 1, 0.3);
      
      if (poses && poses.length > 0) {
        const pose = poses[0];
        
        // Calculate joint angles
        const angles = calculateJointAngles(pose);
        console.log("User pose angles:", angles);
        setUserAngles(angles);
        
        // Redraw the video frame first (to clear the processing message)
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Add semi-transparent overlay for better angle visibility
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw skeleton on the snapshot
        ctx.strokeStyle = '#ff0000'; // Red skeleton
        ctx.lineWidth = 4;
        
        // Draw connections first (so they're behind the points)
        const connections = getJointConnections();
        connections.forEach(connection => {
          const [start, end] = connection;
          const startPoint = pose.keypoints.find(kp => kp.name === start);
          const endPoint = pose.keypoints.find(kp => kp.name === end);
          
          if (
            startPoint && endPoint &&
            typeof startPoint.score === 'number' && startPoint.score > 0.3 &&
            typeof endPoint.score === 'number' && endPoint.score > 0.3
          ) {
            ctx.beginPath();
            ctx.moveTo(startPoint.x, startPoint.y);
            ctx.lineTo(endPoint.x, endPoint.y);
            ctx.stroke();
          }
        });
        
        // Draw keypoints
        pose.keypoints.forEach(keypoint => {
          if (keypoint.score && keypoint.score > 0.3) {
            ctx.beginPath();
            ctx.arc(keypoint.x, keypoint.y, 8, 0, 2 * Math.PI);
            ctx.fillStyle = '#ff3333';
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });
        
        // Draw angle labels in prominent, easy-to-read bubbles
        Object.entries(angles).forEach(([joint, angle]) => {
          // Find the relevant keypoint at the angle vertex
          const jointName = joint.split('_')[0];
          const keypoint = pose.keypoints.find(kp => kp.name === jointName);
          
          if (keypoint && keypoint.score && keypoint.score > 0.3) {
            const angleText = `${Math.round(angle)}°`;
            const bubbleRadius = 20;
            const textWidth = ctx.measureText(angleText).width;
            
            // Draw bubble
            ctx.beginPath();
            ctx.fillStyle = '#ff5555';
            // Position the bubble near but not directly on the joint
            ctx.arc(keypoint.x + 25, keypoint.y - 5, bubbleRadius, 0, 2 * Math.PI);
            ctx.fill();
            
            // Draw text
            ctx.font = 'bold 14px Arial';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle'; 
            ctx.fillText(angleText, keypoint.x + 25, keypoint.y - 5);
            
            // Draw a line connecting the bubble to the joint
            ctx.beginPath();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.moveTo(keypoint.x, keypoint.y);
            ctx.lineTo(keypoint.x + 15, keypoint.y - 3);
            ctx.stroke();
            
            // Label the joint name in smaller text
            ctx.font = '10px Arial';
            ctx.fillStyle = 'white';
            ctx.fillText(joint.replace(/_/g, ' '), keypoint.x + 25, keypoint.y - 22);
          }
        });
        
        // Calculate score based on angle similarity with reference pose
        if (selectedMove?.referencePose?.angles) {
          const referenceAngles = selectedMove.referencePose.angles;
          const score = calculatePoseScore(angles, referenceAngles);
          
          let feedback = "";
          if (score >= 90) {
            feedback = "Perfect form! Your positioning matches the reference pose exceptionally well.";
          } else if (score >= 80) {
            feedback = "Great job! Your form is very close to the reference. Minor adjustments needed.";
          } else if (score >= 70) {
            feedback = "Good effort! Work on your alignment and balance to improve your form.";
          } else {
            feedback = "Keep practicing! Focus on matching your body position with the reference image.";
          }
          
          // Add specific feedback about which joints need improvement
          const jointFeedback = getJointFeedback(angles, referenceAngles);
          if (jointFeedback) {
            feedback += " " + jointFeedback;
          }
          
          // Show results
          setPracticeResults({ score, feedback });
        }
        
        return true;
      } else {
        console.error("No poses detected in snapshot");
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, canvas.width, 80);
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('Could not detect pose. Please try again', canvas.width / 2, 40);
        return false;
      }
    } catch (error) {
      console.error("Error capturing user pose:", error);
      return false;
    }
  };
  
  // Calculate score based on angle similarity
  const calculatePoseScore = (userAngles: Record<string, number>, referenceAngles: Record<string, number>): number => {
    let totalDiff = 0;
    let count = 0;
    
    // Compare common angles between user and reference
    Object.entries(userAngles).forEach(([joint, angle]) => {
      if (joint in referenceAngles) {
        const refAngle = referenceAngles[joint];
        const diff = Math.abs(angle - refAngle);
        totalDiff += diff;
        count++;
      }
    });
    
    if (count === 0) return 0;
    
    // Calculate average difference and convert to a score (0-100)
    const avgDiff = totalDiff / count;
    // Lower difference is better - max acceptable difference is 45 degrees
    const score = Math.max(0, 100 - (avgDiff * 100 / 45));
    
    return Math.round(score);
  };
  
  // Generate feedback about specific joints that need improvement
  const getJointFeedback = (userAngles: Record<string, number>, referenceAngles: Record<string, number>): string => {
    const jointIssues: string[] = [];
    
    Object.entries(userAngles).forEach(([joint, angle]) => {
      if (joint in referenceAngles) {
        const refAngle = referenceAngles[joint];
        const diff = Math.abs(angle - refAngle);
        const jointName = joint.replace(/_/g, ' ');
        
        // If angle difference is significant, add feedback
        if (diff > 15) {
          const direction = angle > refAngle ? "decrease" : "increase";
          jointIssues.push(`${jointName} (${direction} angle by ${Math.round(diff)}°)`);
        }
      }
    });
    
    if (jointIssues.length === 0) return "";
    
    if (jointIssues.length === 1) {
      return `Focus on improving your ${jointIssues[0]}.`;
    } else {
      const lastIssue = jointIssues.pop();
      return `Focus on improving: ${jointIssues.join(', ')} and ${lastIssue}.`;
    }
  };
  
  // Fetch reference moves from the database
  useEffect(() => {
    // Function to fetch reference moves
    const fetchReferenceMoves = async () => {
      try {
        const response = await fetch('/api/reference-moves');
        if (response.ok) {
          const fetchedReferenceData = await response.json();
          console.log("Fetched reference moves:", fetchedReferenceData);
          
          if (fetchedReferenceData && fetchedReferenceData.length > 0) {
            const hydratedMoves = defaultTaekwondoMovesData.map(defaultMove => {
              const matchingRefData = fetchedReferenceData.find((refData: any) => refData.moveId === defaultMove.id);
              if (matchingRefData) {
                return {
                  ...defaultMove,
                  referencePose: {
                    imageUrl: matchingRefData.imageUrl,
                    angles: matchingRefData.jointAngles || {},
                    processed: true
                  }
                };
              }
              return defaultMove;
            });
            
            setTaekwondoMoves(hydratedMoves); // Update the main list of moves

            // If we have a selected move, update its state from the newly hydrated list
            if (selectedMove) {
              const updatedSelectedMove = hydratedMoves.find(m => m.id === selectedMove.id);
              if (updatedSelectedMove) {
                setSelectedMove(updatedSelectedMove);
              } else {
                // If the previously selected move is no longer in the list (e.g., filtered out or removed)
                // or its data changed such that it's effectively a new object,
                // it might be safer to clear it or re-evaluate.
                // For now, this ensures `selectedMove` refers to an item from `hydratedMoves`.
                setSelectedMove(null); // Or find by ID again if critical
              }
            }
          }
        } else {
          console.error("Failed to fetch reference moves:", await response.text());
        }
      } catch (err) {
        console.error("Error fetching reference moves:", err);
      }
    };
    
    fetchReferenceMoves();
  }, []); // Keep dependency array empty to run once on mount. selectedMove updates will re-render.
  
  // Filter moves based on search and filters
  const filteredMoves = taekwondoMoves.filter(move => { // Uses the state taekwondoMoves
    const matchesSearch = move.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          move.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || move.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'All' || move.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  });
  
  // Move camera initialization to a useEffect that depends on isPracticeMode and videoElement
  useEffect(() => {
    if (isPracticeMode && videoElement) {
      (async () => {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
          });
          videoElement.srcObject = mediaStream;
          videoElement.onloadedmetadata = () => {
            videoElement.play().catch(e => console.error("Error playing video:", e));
          };
          videoElement.style.display = "block";
        } catch (error) {
          alert('Could not access camera. Please ensure camera permissions are granted.');
        }
      })();
    }
    return () => {
      if (videoElement && videoElement.srcObject) {
        (videoElement.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        videoElement.srcObject = null;
      }
    };
  }, [isPracticeMode, videoElement]);
  
  // Add new state for countdown
  const [takeImageCountdown, setTakeImageCountdown] = useState<number | null>(null);

  // Modify handleTakeImage to use 5 second countdown
  const handleTakeImage = () => {
    if (!videoElement) return;
    setTakeImageCountdown(5);
    const countdownInterval = setInterval(() => {
      setTakeImageCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownInterval);
          playShutter(); // Play shutter sound
          // Take the image when countdown reaches 0
          const canvas = document.createElement('canvas');
          canvas.width = videoElement.videoWidth || 640;
          canvas.height = videoElement.videoHeight || 480;
          const ctx = canvas.getContext('2d');
          if (!ctx) return null;
          ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          const imgData = canvas.toDataURL('image/png');
          setCapturedImage(imgData);
          setProcessed(false);
          setComparisonScore(null);
          setComparisonFeedback("");
          // Automatically process and compare
          setTimeout(async () => {
            await handleProcessImageAuto(imgData);
            if (selectedMove?.referencePose?.angles) {
              handleCompareImage();
            }
          }, 100); // slight delay to ensure state updates
          return null;
        }
        playBeep(); // Play beep sound
        return prev - 1;
      });
    }, 1000);
  };

  // Improve handleProcessImage for better angle detection
  const handleProcessImage = async () => {
    if (!capturedImage) return;
    const img = new window.Image();
    img.src = capturedImage;
    await new Promise(resolve => { img.onload = resolve; });
    if (!practiceCanvasRef.current) return;
    const canvas = practiceCanvasRef.current;
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, img.width, img.height);
    
    // Try multiple models for better detection
    let poses;
    try {
      // First try with Thunder model (more accurate but slower)
      await initPoseDetection('thunder');
      poses = await detectPoses(img, 1, 0.15);
      
      // If no poses, fallback to Lightning
      if (!poses || poses.length === 0 || !poses[0].keypoints || poses[0].keypoints.length < 5) {
        await initPoseDetection('lightning');
        poses = await detectPoses(img, 1, 0.1);
      }
    } catch (error) {
      console.error("Error in pose detection:", error);
      await initPoseDetection('lightning');
      poses = await detectPoses(img, 1, 0.1);
    }
    
    if (poses && poses.length > 0) {
      const pose = poses[0];
      
      // Calculate angles with more accuracy
      const angles = calculateJointAngles(pose);
      console.log("Detected user angles:", angles);
      setUserAngles(angles);
      
      // Draw keypoints with better visibility
      pose.keypoints.forEach(keypoint => {
        if (keypoint.score && keypoint.score > 0.1) {
          ctx.beginPath();
          ctx.arc(keypoint.x, keypoint.y, 6, 0, 2 * Math.PI);
          ctx.fillStyle = '#00ff00';
          ctx.fill();
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.stroke();
          
          // Add keypoint names for easier identification
          if (keypoint.name) {
            ctx.font = '10px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(keypoint.name, keypoint.x + 8, keypoint.y);
          }
        }
      });
      
      // Draw connections with better visibility
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 4;
      const connections = getJointConnections();
      connections.forEach((connection) => {
        const [start, end] = connection;
        const startPoint = pose.keypoints.find(kp => kp.name === start);
        const endPoint = pose.keypoints.find(kp => kp.name === end);
        
        if (
          startPoint && endPoint &&
          typeof startPoint.score === 'number' && startPoint.score > 0.1 &&
          typeof endPoint.score === 'number' && endPoint.score > 0.1
        ) {
          ctx.beginPath();
          ctx.moveTo(startPoint.x, startPoint.y);
          ctx.lineTo(endPoint.x, endPoint.y);
          ctx.stroke();
        }
      });
      
      // Draw angle bubbles on key joints
      angleJoints.forEach(joint => {
        const jointKeypoint = pose.keypoints.find((kp: any) => kp.name === joint);
        const angle = angles[joint];
        if (jointKeypoint && jointKeypoint.score && jointKeypoint.score > 0.1 && angle !== undefined) {
          // Determine color based on comparison to reference
          let bubbleColor = '#6b7280'; // gray by default
          let diff: number | undefined = undefined;
          if (selectedMove?.referencePose?.angles && selectedMove.referencePose.angles[joint] !== undefined) {
            diff = Math.abs(angle - selectedMove.referencePose.angles[joint]);
            if (diff <= 10) bubbleColor = '#10b981'; // green
            else if (diff <= 20) bubbleColor = '#facc15'; // yellow
            else bubbleColor = '#ef4444'; // red
          }
          const bubbleRadius = 20;
          ctx.beginPath();
          ctx.fillStyle = bubbleColor;
          ctx.arc(jointKeypoint.x + 25, jointKeypoint.y - 5, bubbleRadius, 0, 2 * Math.PI);
          ctx.fill();
          // Draw angle text
          ctx.font = 'bold 14px Arial';
          ctx.fillStyle = 'white';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${Math.round(angle)}°`, jointKeypoint.x + 25, jointKeypoint.y - 5);
          // Draw joint name text
          ctx.font = '10px Arial';
          ctx.fillText(joint.replace(/_/g, ' '), jointKeypoint.x + 25, jointKeypoint.y - 22);
          // Connect bubble to joint
          ctx.beginPath();
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 1;
          ctx.moveTo(jointKeypoint.x, jointKeypoint.y);
          ctx.lineTo(jointKeypoint.x + 15, jointKeypoint.y - 3);
          ctx.stroke();
        }
      });
      
      setProcessed(true);
      
      // Log all detected angles for debugging
      console.log("All detected angles:", angles);
      console.log("All keypoints:", pose.keypoints.map((kp: any) => `${kp.name}: score=${kp.score}`));
      
      // Automatically compare after processing if reference angles exist
      if (selectedMove?.referencePose?.angles) {
        handleCompareImage();
      }
    } else {
      console.error("No poses detected");
    }
  };

  // Add sketch mode functionality for developers
  const startSketchMode = () => {
    setIsSketchMode(true);
    setSketchJointPositions(initialSketchJointPositions); // Reset to default positions
    // Calculate initial angles from default positions
    const initialAngles = calculateAnglesFromPositions(initialSketchJointPositions);
    setSketchAngles(initialAngles);
    setActiveJointForSlider(null);
    setDraggingJoint(null);
  };

  const handleSketchJointClickForSlider = (joint: string) => { // Renamed from handleSketchJointClick
    setActiveJointForSlider(joint);
  };

  const handleAngleChangeViaSlider = (joint: string, angle: number) => { // Renamed from handleAngleChange
    setSketchAngles(prev => ({
      ...prev,
      [joint]: angle
    }));
    // Future: Optionally adjust joint positions based on slider change (complex inverse kinematics)
  };

  // Function to calculate all relevant angles from current joint positions
  const calculateAnglesFromPositions = (positions: typeof initialSketchJointPositions): Record<string, number> => {
    const angles: Record<string, number> = {};
    // Left Arm
    angles['left_shoulder'] = calculateAngle(positions.neck, positions.left_shoulder, positions.left_elbow);
    angles['left_elbow'] = calculateAngle(positions.left_shoulder, positions.left_elbow, positions.left_wrist);
    // Right Arm
    angles['right_shoulder'] = calculateAngle(positions.neck, positions.right_shoulder, positions.right_elbow);
    angles['right_elbow'] = calculateAngle(positions.right_shoulder, positions.right_elbow, positions.right_wrist);
    // Left Leg
    angles['left_hip'] = calculateAngle(positions.neck, positions.left_hip, positions.left_knee); // Using neck as a torso point
    angles['left_knee'] = calculateAngle(positions.left_hip, positions.left_knee, positions.left_ankle);
    // Right Leg
    angles['right_hip'] = calculateAngle(positions.neck, positions.right_hip, positions.right_knee); // Using neck as a torso point
    angles['right_knee'] = calculateAngle(positions.right_hip, positions.right_knee, positions.right_ankle);
    
    // Filter out NaN or invalid angles
    for (const key in angles) {
      if (isNaN(angles[key])) {
        angles[key] = 0; // Default to 0 if calculation fails
      }
    }
    return angles;
  };

  // Canvas interaction handlers
  const getCanvasMousePosition = (event: React.MouseEvent<HTMLCanvasElement>): { x: number, y: number } | null => {
    const canvas = sketchCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  };

  const handleMouseDownOnSketchCanvas = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasMousePosition(event);
    if (!pos) return;

    for (const jointName in sketchJointPositions) {
      const jointPos = sketchJointPositions[jointName as keyof typeof sketchJointPositions];
      const distance = Math.sqrt(Math.pow(pos.x - jointPos.x, 2) + Math.pow(pos.y - jointPos.y, 2));
      if (distance < 15) { // 15px draggable radius
        setDraggingJoint(jointName as keyof typeof sketchJointPositions);
        return;
      }
    }
  };

  const handleMouseMoveOnSketchCanvas = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggingJoint) return;
    const pos = getCanvasMousePosition(event);
    if (!pos) return;

    setSketchJointPositions(prev => {
      const newPositions = { ...prev, [draggingJoint]: { x: pos.x, y: pos.y } };
      // Recalculate angles based on new positions
      const newAngles = calculateAnglesFromPositions(newPositions);
      setSketchAngles(newAngles);
      return newPositions;
    });
  };

  const handleMouseUpOnSketchCanvas = () => {
    setDraggingJoint(null);
  };

  const handleMouseLeaveSketchCanvas = () => {
    setDraggingJoint(null); // Stop dragging if mouse leaves canvas
  };

  // useEffect to draw on sketch canvas when joint positions or angles change
  useEffect(() => {
    const canvas = sketchCanvasRef.current;
    if (!canvas || !isSketchMode) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#18181b'; // Dark background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw connections
    ctx.strokeStyle = '#4ade80'; // Light green for limbs
    ctx.lineWidth = 5;
    stickFigureConnections.forEach(([startJoint, endJoint]) => {
      const p1 = sketchJointPositions[startJoint];
      const p2 = sketchJointPositions[endJoint];
      if (p1 && p2) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    });

    // Draw joints and angle bubbles
    Object.entries(sketchJointPositions).forEach(([name, pos]) => {
      // Draw joint circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 10, 0, 2 * Math.PI); // Joint radius 10px
      ctx.fillStyle = draggingJoint === name ? '#f87171' : '#a3e635'; // Highlight if dragging
      ctx.fill();
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 2;
      ctx.stroke();


      // Display angle if it's a major joint for angles (shoulders, elbows, hips, knees)
      const angleKey = name as string;
      if (sketchAngles[angleKey] !== undefined && keyJoints.includes(angleKey)) {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.85)'; // Bubble color
        ctx.beginPath();
        ctx.arc(pos.x, pos.y - 25, 20, 0, 2 * Math.PI); // Bubble above joint
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.round(sketchAngles[angleKey])}°`, pos.x, pos.y - 25);
        
        ctx.font = '10px Arial';
        ctx.fillText(angleKey.replace(/_/g, ' '), pos.x, pos.y - 40);
      }
    });

  }, [sketchJointPositions, sketchAngles, draggingJoint, isSketchMode]);

  const saveSketchAsReferencePose = () => {
    if (!selectedMove || Object.keys(sketchAngles).length === 0) {
      alert('Please adjust the pose or define angles before saving.');
      return;
    }
    
    const canvas = sketchCanvasRef.current;
    if (!canvas) {
        alert('Sketch canvas not available.');
        return;
    }
    
    // Create a clean image for saving (redraw without interactive highlights)
    const saveCanvas = document.createElement('canvas');
    saveCanvas.width = canvas.width;
    saveCanvas.height = canvas.height;
    const saveCtx = saveCanvas.getContext('2d');
    if (!saveCtx) return;
    
    saveCtx.fillStyle = '#18181b';
    saveCtx.fillRect(0, 0, saveCanvas.width, saveCanvas.height);
    
    saveCtx.strokeStyle = '#4ade80';
    saveCtx.lineWidth = 5;
    stickFigureConnections.forEach(([startJoint, endJoint]) => {
      const p1 = sketchJointPositions[startJoint];
      const p2 = sketchJointPositions[endJoint];
      if (p1 && p2) {
        saveCtx.beginPath();
        saveCtx.moveTo(p1.x, p1.y);
        saveCtx.lineTo(p2.x, p2.y);
        saveCtx.stroke();
      }
    });
    Object.entries(sketchJointPositions).forEach(([name, pos]) => {
      saveCtx.beginPath();
      saveCtx.arc(pos.x, pos.y, 8, 0, 2 * Math.PI); // Smaller joint circles for saved image
      saveCtx.fillStyle = '#a3e635'; 
      saveCtx.fill();

      const angleKey = name as string;
      if (sketchAngles[angleKey] !== undefined && keyJoints.includes(angleKey)) {
          saveCtx.fillStyle = 'rgba(16, 185, 129, 0.85)';
          saveCtx.beginPath();
          saveCtx.arc(pos.x, pos.y - 25, 20, 0, 2 * Math.PI);
          saveCtx.fill();
          saveCtx.fillStyle = 'white';
          saveCtx.font = 'bold 12px Arial';
          saveCtx.textAlign = 'center';
          saveCtx.textBaseline = 'middle';
          saveCtx.fillText(`${Math.round(sketchAngles[angleKey])}°`, pos.x, pos.y - 25);
          saveCtx.font = '10px Arial';
          saveCtx.fillText(angleKey.replace(/_/g, ' '), pos.x, pos.y - 40);
      }
    });
    
    const imageUrl = saveCanvas.toDataURL('image/png');
    // ... rest of saveSketchAsReferencePose logic is the same

    // Create updated reference pose
    const updatedReferencePose = {
      imageUrl,
      angles: sketchAngles,
      processed: true
    };
    
    // Update the move
    const updatedMove = {
      ...selectedMove,
      referencePose: updatedReferencePose
    };
    
    setSelectedMove(updatedMove);
    
    // Save to database
    saveReferenceMoveToDatabase();
    
    // Exit sketch mode
    setIsSketchMode(false);
  };

  // Add a new helper for auto-processing the captured image
  const handleProcessImageAuto = async (imgData: string) => {
    const img = new window.Image();
    img.src = imgData;
    await new Promise(resolve => { img.onload = resolve; });
    if (!practiceCanvasRef.current) return;
    const canvas = practiceCanvasRef.current;
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, img.width, img.height);
    let poses;
    try {
      await initPoseDetection('thunder');
      poses = await detectPoses(img, 1, 0.15);
      if (!poses || poses.length === 0 || !poses[0].keypoints || poses[0].keypoints.length < 5) {
        await initPoseDetection('lightning');
        poses = await detectPoses(img, 1, 0.1);
      }
    } catch (error) {
      await initPoseDetection('lightning');
      poses = await detectPoses(img, 1, 0.1);
    }
    if (poses && poses.length > 0) {
      const pose = poses[0];
      const angles = calculateJointAngles(pose);
      setUserAngles(angles);
      // Draw keypoints and connections as before...
      pose.keypoints.forEach(keypoint => {
        if (keypoint.score && keypoint.score > 0.1) {
          ctx.beginPath();
          ctx.arc(keypoint.x, keypoint.y, 6, 0, 2 * Math.PI);
          ctx.fillStyle = '#00ff00';
          ctx.fill();
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.stroke();
          if (keypoint.name) {
            ctx.font = '10px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(keypoint.name, keypoint.x + 8, keypoint.y);
          }
        }
      });
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 4;
      const connections = getJointConnections();
      connections.forEach((connection) => {
        const [start, end] = connection;
        const startPoint = pose.keypoints.find(kp => kp.name === start);
        const endPoint = pose.keypoints.find(kp => kp.name === end);
        if (
          startPoint && endPoint &&
          typeof startPoint.score === 'number' && startPoint.score > 0.1 &&
          typeof endPoint.score === 'number' && endPoint.score > 0.1
        ) {
          ctx.beginPath();
          ctx.moveTo(startPoint.x, startPoint.y);
          ctx.lineTo(endPoint.x, endPoint.y);
          ctx.stroke();
    }
      });
      Object.entries(angles).forEach(([joint, angle]) => {
        const jointName = joint.split('_')[0];
        const keypoint = pose.keypoints.find(kp => kp.name === jointName);
        if (keypoint && keypoint.score && keypoint.score > 0.1) {
          const angleText = `${Math.round(angle)}°`;
          const bubbleRadius = 20;
          ctx.beginPath();
          ctx.fillStyle = '#10b981';
          ctx.arc(keypoint.x + 25, keypoint.y - 5, bubbleRadius, 0, 2 * Math.PI);
          ctx.fill();
          ctx.font = 'bold 14px Arial';
          ctx.fillStyle = 'white';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(angleText, keypoint.x + 25, keypoint.y - 5);
          ctx.font = '10px Arial';
          ctx.fillText(joint.replace(/_/g, ' '), keypoint.x + 25, keypoint.y - 22);
          ctx.beginPath();
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 1;
          ctx.moveTo(keypoint.x, keypoint.y);
          ctx.lineTo(keypoint.x + 15, keypoint.y - 3);
          ctx.stroke();
        }
      });
      setProcessed(true);
    }
  };
  
  // Add new state for performance tracking
  const [performanceHistory, setPerformanceHistory] = useState<Record<number, Array<{ score: number, timestamp: number, feedback: string, angles?: Record<string, number> }>>>({});
  
  // Helper to get glow color based on practice count
  function getGlowColor(moveId: number) {
    const count = performanceHistory[moveId]?.length || 0;
    if (count === 0) return '0 0 16px 2px rgba(239,68,68,0.6)'; // Red
    if (count < 5) return '0 0 16px 2px rgba(250,204,21,0.6)'; // Yellow
    return '0 0 16px 2px rgba(16,185,129,0.7)'; // Green
  }
  
  // Add this useEffect after all state declarations in the component:
  useEffect(() => {
    if (processed && capturedImage && userAngles && selectedMove?.referencePose?.angles) {
      handleCompareImage();
    }
    // eslint-disable-next-line
  }, [userAngles, processed, capturedImage, selectedMove]);
  
  // Add state for disabling Try Again after 3 attempts
  const [tryAgainDisabled, setTryAgainDisabled] = useState(false);
  
  // In the Comparison Dialog, after three attempts, gray out Try Again and only re-enable after Close:
  useEffect(() => {
    if (selectedMove && performanceHistory[selectedMove.id]?.length === 3) {
      setTryAgainDisabled(true);
    }
  }, [performanceHistory, selectedMove]);
  
  // Helper to calculate total difference for best attempt (missing = reference - 0)
  function getTotalDifference(
    attempt: { angles?: Record<string, number> },
    refAngles: Record<string, number>
  ): number {
    let total = 0;
    for (const joint in refAngles) {
      const ref = refAngles[joint];
      const user = attempt.angles && attempt.angles[joint] !== undefined ? attempt.angles[joint] : 0;
      total += Math.abs((user ?? 0) - ref);
    }
    return total;
  }
  
  // Add state for developer image URL
  const [developerImageUrl, setDeveloperImageUrl] = useState<string>("");
  
  // When loading a move in developer mode, prefill developerImageUrl if available:
  useEffect(() => {
    if (isDeveloperMode && selectedMove?.referencePose?.imageUrl) {
      setDeveloperImageUrl(selectedMove.referencePose.imageUrl);
    }
  }, [isDeveloperMode, selectedMove]);
  
  // Handle feedback submission by opening email client
  const handleFeedbackSubmit = () => {
    const username = user?.username || 'User';
    const subject = encodeURIComponent(`Feedback on CoachT (Practice Page) by ${username}`);
    const body = encodeURIComponent("Please type your feedback here:\n\n"); // Default body
    window.location.href = `mailto:ojaskandy@gmail.com?subject=${subject}&body=${body}`;
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Header with app title and user menu */}
      <header className="bg-black border-b border-red-900/30 p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center">
          <Link to="/" className="cursor-pointer">
            <h1 className="text-2xl font-bold gradient-heading flex items-center">
              <span className="material-icons text-red-600 mr-2">sports_martial_arts</span>
              CoachT
            </h1>
          </Link>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={toggleDarkMode} 
            className="h-8 w-8 rounded-full border-red-600 bg-transparent hover:bg-red-700/20"
          >
            {isDarkMode ? 
              <Sun className="h-4 w-4 text-white" /> : 
              <Moon className="h-4 w-4 text-white" />
            }
          </Button>
          
          {/* Developer Mode Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowDeveloperDialog(true)}
            className="h-8 w-8 rounded-full border-red-600 bg-transparent hover:bg-red-700/20"
          >
            <Shield className="h-4 w-4 text-white" />
          </Button>
          
          {/* Profile button */}
          <Link href="/profile">
            <Button 
              variant="outline" 
              className="h-8 rounded-full border-red-600 bg-transparent hover:bg-red-700/20 flex items-center px-3 transition-all duration-300 hover:shadow-red-500/30 hover:shadow-sm"
            >
              <User className="h-4 w-4 text-white mr-2" />
              <span className="text-sm text-white font-medium">Profile</span>
            </Button>
          </Link>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-8 rounded-full border-red-600 bg-transparent hover:bg-red-700/20 flex items-center px-3">
                <User className="h-4 w-4 text-white mr-2" />
                <span className="text-sm text-white font-medium">{user?.username}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 border border-red-600 bg-gray-900">
              <DropdownMenuItem 
                className="cursor-pointer flex items-center text-white hover:bg-red-700/30" 
                onClick={() => logoutMutation.mutate()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      
      {/* Developer Login Dialog */}
      <Dialog open={showDeveloperDialog} onOpenChange={setShowDeveloperDialog}>
        <DialogContent className="bg-gray-900 border border-red-900 text-white">
          <DialogHeader>
            <DialogTitle>Developer Access</DialogTitle>
            <DialogDescription className="text-gray-400">
              Enter developer password to access developer tools.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Input
              type="password"
              placeholder="Enter password"
              value={developerPassword}
              onChange={(e) => setDeveloperPassword(e.target.value)}
              className="bg-gray-800 border-red-900/30 text-white"
            />
          </div>
          
          <DialogFooter>
            <Button
              onClick={handleDeveloperLogin}
              className="bg-red-700 hover:bg-red-600 text-white"
            >
              Login
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Practice Mode Dialog */}
      <Dialog 
        open={isPracticeMode} 
        onOpenChange={(open) => {
          if (!open) {
            setIsPracticeMode(false);
            setPracticeActive(false);
            setPracticeResults(null);
            if (selectedMove) {
              setPerformanceHistory(prev => ({ ...prev, [selectedMove.id]: [] }));
            }
          }
        }}
      >
        <DialogContent className="bg-gray-900 border border-red-900 text-white max-w-5xl w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <span className="material-icons text-red-500 mr-2">sports_martial_arts</span>
              Practice: {selectedMove?.name}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Follow the instructions and match the reference pose.
            </DialogDescription>
          </DialogHeader>
          {/* Hidden canvas for snapshots when not in review mode */}
          <canvas 
            ref={snapshotCanvasRef}
            style={{ display: "none", position: "absolute" }}
          />
          {/* Remove the initial countdown overlay. Always show split view unless showing results. */}
          {practiceResults ? (
            <div className="py-8">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Left side - Score and feedback */}
                <div className="flex-1">
                  <div className="text-3xl font-bold mb-2 text-center md:text-left">
                    {practiceResults.score >= 80 ? (
                      <span className="text-green-500">Excellent Form!</span>
                    ) : practiceResults.score >= 60 ? (
                      <span className="text-yellow-500">Good Effort!</span>
                    ) : (
                      <span className="text-red-500">Keep Practicing!</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-5xl font-bold text-red-500">{practiceResults.score}%</div>
                    <div className="bg-gray-700 h-2 flex-1 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          practiceResults.score >= 80 ? 'bg-green-500' : 
                          practiceResults.score >= 60 ? 'bg-yellow-500' : 
                          'bg-red-500'
                        }`}
                        style={{ width: `${practiceResults.score}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <p className="text-white text-lg mb-6">{practiceResults.feedback}</p>
                  
                  {/* Angle comparison table */}
                  {selectedMove?.referencePose?.angles && (
                    <div className="mb-4">
                      <h4 className="text-sm font-bold text-white mb-2">Angle Comparison</h4>
                      <div className="bg-gray-900/70 rounded overflow-hidden">
                        <div className="grid grid-cols-3 gap-1 p-2 text-xs font-medium text-gray-300">
                          <div>Joint</div>
                          <div>Your Angle</div>
                          <div>Reference</div>
                        </div>
                        {Object.entries(selectedMove.referencePose.angles).map(([joint, refAngle]) => {
                          const userAngle = (userAngles ?? {})[joint];
                          const diff = userAngle !== undefined ? Math.abs(userAngle - refAngle) : undefined;
                          return (
                            <div
                              key={joint}
                              className={`grid grid-cols-3 gap-1 p-2 text-xs border-t border-gray-800 ${
                                userAngle === undefined
                                  ? 'bg-red-900/20'
                                  : diff !== undefined && diff <= 10
                                  ? 'bg-green-900/20'
                                  : diff !== undefined && diff <= 20
                                  ? 'bg-yellow-900/20'
                                  : 'bg-red-900/20'
                              }`}
                            >
                              <div>{joint.replace(/_/g, ' ')}</div>
                              <div>
                                {userAngle !== undefined ? `${Math.round(userAngle)}°` : <span className="text-red-500">Missing</span>}
                              </div>
                              <div className="flex items-center">
                                {Math.round(refAngle)}°
                                {diff !== undefined && userAngle !== undefined ? (
                                  <span
                                    className={`ml-2 text-xs ${
                                      diff <= 10
                                        ? 'text-green-500'
                                        : diff <= 20
                                        ? 'text-yellow-500'
                                        : 'text-red-500'
                                    }`}
                                  >
                                    ({diff <= 10 ? '✓' : `${Math.round(diff)}° off`})
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Right side - Snapshot with skeleton */}
                <div className="w-full md:w-80 bg-black rounded-lg overflow-hidden border border-gray-700">
                  <canvas 
                    ref={snapshotCanvasRef}
                    className="w-full h-full object-contain"
                    style={{ display: "block", minHeight: "320px" }}
                  />
                </div>
              </div>
              
              <div className="flex gap-4 justify-center mt-6">
                <Button 
                  onClick={() => {
                    setIsPracticeMode(false);
                    setPracticeResults(null);
                  }}
                  className="bg-gray-800 hover:bg-gray-700 text-white"
                >
                  Close
                </Button>
                
                <Button 
                  onClick={() => {
                    setPracticeResults(null);
                    setCountdown(3);
                    
                    const countdownTimer = setInterval(() => {
                      setCountdown(prev => {
                        if (prev <= 1) {
                          clearInterval(countdownTimer);
                          setPracticeActive(true);
                          return 0;
                        }
                        return prev - 1;
                      });
                    }, 1000);
                  }}
                  className="bg-red-700 hover:bg-red-600 text-white"
                >
                  Try Again
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-4 h-[60vh]">
              {/* Reference Image with angle visualization */}
              <div className="flex-1 md:w-1/2 relative border border-gray-800 rounded-lg overflow-hidden">
                <div className="relative pt-[56.25%] bg-black rounded overflow-hidden mb-6">
                  {/* Reference image logic */}
                  {(() => {
                    if (!selectedMove) return null;
                    const imageUrl = selectedMove?.referencePose?.imageUrl;
                    if (imageUrl) {
                      return <img src={imageUrl} alt={`Reference pose for ${selectedMove.name}`} className="absolute inset-0 w-full h-full object-contain" />;
                    }
                    if (selectedMove?.referencePose?.jointAngles || selectedMove?.referencePose?.angles) {
                      return <StickFigure angles={(selectedMove.referencePose.jointAngles || selectedMove.referencePose.angles) as Record<string, number>} />;
                    }
                    return (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                        <span className="material-icons text-6xl">sports_martial_arts</span>
                        <span className="absolute text-sm mt-16">Reference pose not available</span>
                      </div>
                    );
                  })()}
                </div>
                
                {/* Reference Pose Canvas Overlay for Angles */}
                <canvas 
                  ref={referenceCanvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />
                
                {/* Angle labels with better styling */}
                {selectedMove?.referencePose?.angles && 
                  Object.entries(selectedMove.referencePose.angles).map(([joint, angle]) => {
                    // Calculate positions more intelligently based on joint types
                    let left = '50%', top = '50%';
                    
                    // Position bubbles in logical places based on joint name
                    if (joint.includes('left_elbow')) {
                      left = '35%'; top = '45%';
                    } else if (joint.includes('right_elbow')) {
                      left = '25%'; top = '45%';
                    } else if (joint.includes('left_shoulder')) {
                      left = '35%'; top = '30%';
                    } else if (joint.includes('right_shoulder')) {
                      left = '25%'; top = '30%';
                    } else if (joint.includes('left_hip')) {
                      left = '35%'; top = '55%';
                    } else if (joint.includes('right_hip')) {
                      left = '26%'; top = '55%';
                    } else if (joint.includes('left_knee')) {
                      left = '35%'; top = '70%';
                    } else if (joint.includes('right_knee')) {
                      left = '25%'; top = '70%';
                    }
                    
                    return (
                      <div 
                        key={joint} 
                        className="absolute flex items-center justify-center w-12 h-12 -ml-6 -mt-6 text-white font-bold rounded-full"
                        style={{
                          left,
                          top,
                          background: 'rgba(16, 185, 129, 0.85)',
                          boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.4), 0 4px 8px rgba(0, 0, 0, 0.3)'
                        }}
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] opacity-80 -mt-5 bg-black/70 px-1 rounded">
                            {joint.replace(/_/g, ' ')}
                          </span>
                          <span className="text-sm leading-none">
                            {Math.round(angle)}°
                          </span>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
              
              {/* Camera Feed/Result */}
              <div className="flex-1 md:w-1/2 relative border border-gray-800 rounded-lg overflow-hidden bg-black">
                {/* Show video only if no image has been taken yet */}
                {!capturedImage && !practiceResults && (
                  <video
                    ref={el => {
                      setVideoElement(el);
                    }}
                    autoPlay
                    muted
                    playsInline
                    className="object-contain w-full h-full"
                  />
                )}
                {/* Show captured image if available */}
                {capturedImage && (
                  <img
                    src={capturedImage}
                    alt="Captured pose"
                    className="object-contain w-full h-full"
                  />
                )}
                {/* Canvas overlay for drawing skeletons during live view */}
                <canvas
                  ref={practiceCanvasRef}
                  className="absolute top-0 left-0 w-full h-full"
                />
                {/* Buttons for manual workflow */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4 z-10">
                  <button
                    onClick={handleTakeImage}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!!capturedImage}
                  >
                    <span className="material-icons text-sm">camera</span>
                    {takeImageCountdown !== null ? `Taking in ${takeImageCountdown}s...` : 'Take Image'}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            {!countdown && !practiceResults && (
              <Button
                onClick={() => {
                  setIsPracticeMode(false);
                  setPracticeActive(false);
                }}
                className="bg-gray-800 hover:bg-gray-700 text-white"
              >
                Cancel Practice
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Comparison Dialog */}
      <Dialog open={showComparisonDialog} onOpenChange={setShowComparisonDialog}>
        <DialogContent className="bg-gray-900 border border-red-900 text-white max-w-lg w-full">
          <DialogHeader>
            <DialogTitle>Angle Comparison Results</DialogTitle>
            <DialogDescription className="text-gray-400">
              Detailed comparison of your pose vs. the reference.
            </DialogDescription>
          </DialogHeader>
          <div className="mb-4">
            <h4 className="text-sm font-bold text-white mb-2">Joint Differences</h4>
            <div className="bg-gray-900/70 rounded overflow-hidden">
              <div className="grid grid-cols-3 gap-1 p-2 text-xs font-medium text-gray-300">
                <div>Joint</div>
                <div>Your Angle</div>
                <div>Reference</div>
              </div>
              {comparisonDetails.differences.map(({ joint, userAngle, refAngle, diff }) => (
                <div key={joint} className={`grid grid-cols-3 gap-1 p-2 text-xs border-t border-gray-800 ${userAngle === undefined ? 'bg-red-900/20' : diff !== undefined && diff <= 10 ? 'bg-green-900/20' : diff !== undefined && diff <= 20 ? 'bg-yellow-900/20' : 'bg-red-900/20'}`}>
                  <div>{joint.replace(/_/g, ' ')}</div>
                  <div>{userAngle !== undefined ? `${Math.round(userAngle)}°` : <span className="text-red-500">Missing</span>}</div>
                  <div>{Math.round(refAngle)}°{diff !== undefined && userAngle !== undefined ? <span className={`ml-2 text-xs ${diff <= 10 ? 'text-green-500' : diff <= 20 ? 'text-yellow-500' : 'text-red-500'}`}>({diff <= 10 ? '✓' : `${Math.round(diff)}° off`})</span> : null}</div>
                </div>
              ))}
            </div>
          </div>
          {comparisonDetails.missingJoints.length > 0 && (
            <div className="mb-2 text-red-400 text-sm">
              <strong>Missing joints:</strong> {comparisonDetails.missingJoints.map(j => j.replace(/_/g, ' ')).join(', ')}
            </div>
          )}
          {/* Feedback section */}
          <div className="mb-4 mt-6">
            <h4 className="text-sm font-bold text-white mb-2">Feedback</h4>
            <div className="bg-gray-900/70 rounded p-3 text-gray-200 text-sm">
              {(() => {
                const feedbacks: string[] = [];
                comparisonDetails.differences.forEach(({ joint, userAngle, refAngle, diff }) => {
                  if (userAngle === undefined) return;
                  if (diff !== undefined && diff > 10) {
                    if (joint.includes('shoulder')) {
                      feedbacks.push(userAngle < refAngle ? 'Flare arms out more (increase ' + joint.replace(/_/g, ' ') + ' angle)' : 'Bring arms in (decrease ' + joint.replace(/_/g, ' ') + ' angle)');
                    } else if (joint.includes('elbow')) {
                      feedbacks.push(userAngle < refAngle ? 'Straighten your ' + joint.replace(/_/g, ' ') : 'Bend your ' + joint.replace(/_/g, ' '));
                    } else if (joint.includes('hip')) {
                      feedbacks.push(userAngle < refAngle ? 'Open your hips more (' + joint.replace(/_/g, ' ') + ')' : 'Close your hips a bit (' + joint.replace(/_/g, ' ') + ')');
                    } else if (joint.includes('knee')) {
                      feedbacks.push(userAngle < refAngle ? 'Straighten your ' + joint.replace(/_/g, ' ') : 'Bend your ' + joint.replace(/_/g, ' '));
                    } else {
                      feedbacks.push((userAngle < refAngle ? 'Increase ' : 'Decrease ') + joint.replace(/_/g, ' ') + ' angle');
                    }
                  }
                });
                if (feedbacks.length === 0) return <span className="text-green-400">Great job! Your form is close to the reference.</span>;
                return <ul className="list-disc pl-5">{feedbacks.map((f, i) => <li key={i}>{f}</li>)}</ul>;
              })()}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowComparisonDialog(false)} className="bg-red-700 hover:bg-red-600 text-white">Close</Button>
            <Button
              onClick={() => {
                setShowComparisonDialog(false);
                setPracticeResults(null);
                setCapturedImage(null);
                setProcessed(false);
                setComparisonScore(null);
                setComparisonFeedback("");
                setTimeout(() => handleTakeImage(), 100); // Start countdown again
              }}
              className="bg-yellow-600 hover:bg-yellow-500 text-white ml-2"
              disabled={(selectedMove && performanceHistory[selectedMove.id]?.length === 3) || tryAgainDisabled}
            >
              Try Again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Sketch Mode Dialog */}
      <Dialog open={isSketchMode} onOpenChange={(open) => !open && setIsSketchMode(false)}>
        <DialogContent className="bg-gray-900 border border-red-900 text-white max-w-5xl w-full"> {/* Increased max-width */}
          <DialogHeader>
            <DialogTitle>Interactive Pose Sketch Tool</DialogTitle>
            <DialogDescription className="text-gray-400">
              Drag joints to create a pose. Angles are calculated automatically. Use sliders to fine-tune.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ minHeight: '60vh' }}> {/* Ensure enough height */}
            {/* Left side - Interactive Canvas */}
            <div className="md:col-span-2 p-2 border border-gray-700 rounded-lg bg-black/50 flex items-center justify-center">
              <canvas 
                ref={sketchCanvasRef}
                width={600} // Fixed canvas size
                height={500}
                className="cursor-grab active:cursor-grabbing rounded"
                onMouseDown={handleMouseDownOnSketchCanvas}
                onMouseMove={handleMouseMoveOnSketchCanvas}
                onMouseUp={handleMouseUpOnSketchCanvas}
                onMouseLeave={handleMouseLeaveSketchCanvas} // Add mouse leave handler
              />
            </div>
            
            {/* Right side - Controls */}
            <div className="p-4 border border-gray-700 rounded-lg bg-black/50">
              <h3 className="text-white font-bold mb-4">Joint Angles</h3>
              
              <div className="mb-4">
                <label className="block text-gray-400 mb-2 text-sm">Select Joint for Slider</label>
                <div className="grid grid-cols-2 gap-2">
                  {keyJoints.map(joint => ( // keyJoints defines which joints have sliders
                    <button
                      key={joint}
                      onClick={() => handleSketchJointClickForSlider(joint)}
                      className={`px-3 py-2 text-sm rounded ${activeJointForSlider === joint ? 'bg-red-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                    >
                      {joint.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
              
              {activeJointForSlider && (
                <div className="mb-6">
                  <label className="block text-gray-400 mb-2 text-sm">
                    {activeJointForSlider.replace(/_/g, ' ')} angle: {Math.round(sketchAngles[activeJointForSlider] || 0)}°
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="1" // Finer control
                    value={sketchAngles[activeJointForSlider] || 0}
                    onChange={(e) => handleAngleChangeViaSlider(activeJointForSlider, parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0°</span><span>90°</span><span>180°</span><span>270°</span><span>360°</span>
                  </div>
                </div>
              )}
              
              <div className="bg-gray-800/60 border border-red-900/20 rounded p-3 mb-6">
                <h3 className="text-sm font-bold text-white mb-1 flex items-center">
                  <span className="material-icons text-red-500 text-sm mr-1">info</span>
                  How to Use
                </h3>
                <ol className="text-gray-300 text-sm list-decimal pl-5 space-y-1">
                  <li>Drag the green joint circles on the canvas to pose the stick figure.</li>
                  <li>Angles are calculated and displayed automatically.</li>
                  <li>Select a joint from the list on the right to fine-tune its angle with the slider.</li>
                  <li>Click "Save as Reference Pose" to use this pose.</li>
                </ol>
              </div>
            </div>
          </div>
          
          <DialogFooter className="space-x-2 pt-4"> {/* Added padding top */}
            <Button
              onClick={() => setIsSketchMode(false)}
              className="bg-gray-800 hover:bg-gray-700 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={saveSketchAsReferencePose}
              className="bg-red-700 hover:bg-red-600 text-white"
              disabled={Object.keys(sketchAngles).length === 0}
            >
              Save as Reference Pose
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <main className="flex-1 flex flex-col p-6">
        {/* Back to home link */}
        <Link href="/">
          <button className="flex items-center text-red-400 hover:text-red-300 mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span>Back to Home</span>
          </button>
        </Link>
        
        {selectedMove ? (
          /* Detail view for a selected move */
          <div className="bg-gray-900/70 border border-red-900/30 rounded-lg p-6 max-w-4xl mx-auto w-full">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <Button variant="ghost" size="icon" onClick={() => setSelectedMove(null)} className="text-red-500 hover:bg-red-900/20">
                  <ArrowLeft className="h-6 w-6" />
                </Button>
                <h1 className="text-2xl font-bold text-red-500 truncate max-w-md">{selectedMove.name}</h1>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button variant="outline" size="icon" onClick={toggleDarkMode} className="h-10 w-10 rounded-full border-red-600 bg-transparent hover:bg-red-700/20">
                  {isDarkMode ? 
                    <Sun className="h-5 w-5 text-white" /> : 
                    <Moon className="h-5 w-5 text-white" />
                  }
                </Button>

                {/* Added Feedback Button */}
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleFeedbackSubmit}
                  className="h-10 w-10 rounded-full border-red-600 bg-transparent hover:bg-red-700/20"
                >
                  <MessageSquare className="h-5 w-5 text-white" />
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-8 rounded-full border-red-600 bg-transparent hover:bg-red-700/20 flex items-center px-3">
                      <User className="h-4 w-4 text-white mr-2" />
                      <span className="text-sm text-white font-medium">{user?.username}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 border border-red-600 bg-gray-900">
                    <DropdownMenuItem 
                      className="cursor-pointer flex items-center text-white hover:bg-red-700/30" 
                      onClick={() => logoutMutation.mutate()}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            <div className="badge-container flex gap-2 mb-4">
              <span className="bg-red-700/60 text-white text-xs px-2 py-1 rounded">
                {selectedMove.category}
              </span>
              <span className="bg-red-900/60 text-white text-xs px-2 py-1 rounded">
                {selectedMove.difficulty}
              </span>
              {selectedMove && selectedMove.referencePose?.processed && (
                <span className="bg-green-700/60 text-white text-xs px-2 py-1 rounded flex items-center">
                  <span className="material-icons text-xs mr-1">check_circle</span>
                  Reference Available
                </span>
              )}
            </div>
            
            <p className="text-gray-300 mb-3">
              {selectedMove.description}
            </p>
            
            {selectedMove && selectedMove.tip && (
              <div className="bg-gray-800/60 border border-red-900/20 rounded p-3 mb-6">
                <h3 className="text-sm font-bold text-white mb-1 flex items-center">
                  <span className="material-icons text-red-500 text-sm mr-1">tips_and_updates</span>
                  Coach Tip
                </h3>
                <p className="text-gray-300 text-sm">{selectedMove.tip}</p>
              </div>
            )}
            
            <div className="relative pt-[56.25%] bg-black rounded overflow-hidden mb-6">
              {/* Reference image logic */}
              {(() => {
                if (!selectedMove) return null;
                const imageUrl = selectedMove?.referencePose?.imageUrl;
                if (imageUrl) {
                  return <img src={imageUrl} alt={`Reference pose for ${selectedMove.name}`} className="absolute inset-0 w-full h-full object-contain" />;
                }
                if (selectedMove?.referencePose?.jointAngles || selectedMove?.referencePose?.angles) {
                  return <StickFigure angles={(selectedMove.referencePose.jointAngles || selectedMove.referencePose.angles) as Record<string, number>} />;
                }
                return (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                    <span className="material-icons text-6xl">sports_martial_arts</span>
                    <span className="absolute text-sm mt-16">Reference pose not available</span>
                  </div>
                );
              })()}
            </div>
            
            {/* Developer tools section */}
            {isDeveloperMode && (
              <div className="border border-red-900/40 rounded-lg mb-6 p-4 bg-gray-800/40">
                <h3 className="text-white font-bold mb-3 flex items-center">
                  <Shield className="h-4 w-4 mr-2 text-red-500" />
                  Developer Tools
                </h3>
                
                <div className="mb-4">
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleReferenceImageUpload}
                  />
                  
                  <div className="flex flex-wrap gap-3 mb-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded flex items-center"
                      disabled={isProcessingImage}
                    >
                      <span className="material-icons text-sm mr-1">upload</span>
                      Upload Reference Image
                    </button>
                    
                    <button
                      onClick={startSketchMode}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded flex items-center"
                    >
                      <span className="material-icons text-sm mr-1">gesture</span>
                      Sketch Reference Pose
                    </button>
                    
                    {uploadedImage && (
                      <button
                        onClick={processReferenceImage}
                        className="px-3 py-2 bg-green-700 hover:bg-green-600 text-white text-sm rounded flex items-center"
                        disabled={isProcessingImage}
                      >
                        {isProcessingImage ? (
                          <>
                            <span className="material-icons animate-spin text-sm mr-1">refresh</span>
                            Processing...
                          </>
                        ) : (
                          <>
                            <span className="material-icons text-sm mr-1">fitness_center</span>
                            Process Reference Image
                          </>
                        )}
                      </button>
                    )}
                    
                    {selectedMove?.referencePose?.processed && (
                      <button
                        onClick={saveReferenceMoveToDatabase}
                        className="px-3 py-2 bg-red-700 hover:bg-red-600 text-white text-sm rounded flex items-center"
                      >
                        <span className="material-icons text-sm mr-1">save</span>
                        Save to Database
                      </button>
                    )}
                  </div>
                  
                  {uploadedImage && (
                    <div className="relative pt-[40%] bg-black rounded overflow-hidden mb-3">
                      <img 
                        src={uploadedImage} 
                        alt="Uploaded reference" 
                        className="absolute inset-0 w-full h-full object-contain"
                      />
                      <canvas 
                        ref={canvasRef} 
                        className="absolute inset-0 w-full h-full"
                        style={{ display: 'none' }}
                      />
                    </div>
                  )}
                </div>
                {isDeveloperMode && (
                  <div className="mb-3">
                    <label className="block text-gray-400 mb-1 text-sm">Reference Image URL</label>
                    <input
                      type="text"
                      placeholder="Paste image URL here (for persistence)"
                      value={developerImageUrl}
                      onChange={e => setDeveloperImageUrl(e.target.value)}
                      className="bg-gray-800 border border-red-900/30 text-white px-2 py-1 rounded w-full"
                    />
                    <span className="text-xs text-gray-500">If you want this image to persist after refresh, paste a real image URL here.</span>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-between flex-wrap gap-3">
              <button 
                onClick={() => setSelectedMove(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded"
              >
                Back to Library
              </button>
              
              <button
                onClick={startPractice}
                className={`px-4 py-2 ${selectedMove?.referencePose && (selectedMove.referencePose.imageUrl || selectedMove.referencePose.jointAngles || selectedMove.referencePose.angles) ? 'bg-red-700 hover:bg-red-600' : 'bg-gray-700 cursor-not-allowed'} text-white rounded flex items-center`}
                disabled={!(selectedMove?.referencePose && (selectedMove.referencePose.imageUrl || selectedMove.referencePose.jointAngles || selectedMove.referencePose.angles))}
              >
                <span className="material-icons text-sm mr-1">fitness_center</span>
                Practice this move
              </button>
            </div>
          </div>
        ) : (
          /* Library view */
          <>
            <div className="flex flex-col md:flex-row justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-4 md:mb-0">
                Taekwondo Practice Library
              </h1>
              
              {/* Search input */}
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input 
                  type="text"
                  placeholder="Search moves..."
                  className="pl-10 bg-gray-900 border-red-900/30 text-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div>
                <label className="block text-gray-400 mb-2 text-sm">Category</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-3 py-1 text-sm rounded-full ${
                        selectedCategory === category 
                          ? 'bg-red-700 text-white' 
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-gray-400 mb-2 text-sm">Difficulty</label>
                <div className="flex flex-wrap gap-2">
                  {difficulties.map((difficulty) => (
                    <button
                      key={difficulty}
                      onClick={() => setSelectedDifficulty(difficulty)}
                      className={`px-3 py-1 text-sm rounded-full ${
                        selectedDifficulty === difficulty 
                          ? 'bg-red-700 text-white' 
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {difficulty}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Moves grid */}
            {filteredMoves.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {/* Test Box for Simulation */}
                <div 
                  onClick={() => setSelectedMove({
                    id: 0,
                    name: 'Test',
                    category: 'Testing',
                    difficulty: 'Beginner',
                    description: 'Simple test case for verifying basic functionality before implementing complex moves',
                    referencePose: {
                      imageUrl: '',
                      processed: true,
                      angles: {
                        left_shoulder: 90,
                        right_shoulder: 90,
                        left_elbow: 90,
                        right_elbow: 90,
                        left_hip: 90,
                        right_hip: 90,
                        left_knee: 90,
                        right_knee: 90
                      }
                    }
                  })}
                  className="bg-gray-900/70 border-2 border-blue-500 rounded-lg overflow-hidden cursor-pointer transform transition-transform hover:scale-105"
                >
                  <div className="aspect-video bg-black/60 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="material-icons text-blue-500 text-4xl">science</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-white font-medium line-clamp-1">Test</h3>
                    </div>
                    <div className="flex gap-2 mb-2">
                      <span className="bg-blue-900/40 text-white text-xs px-1.5 py-0.5 rounded">
                        Simulation
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm line-clamp-2">Simple test case for verifying basic functionality</p>
                  </div>
                </div>
                
                {filteredMoves.map((move) => (
                  <div 
                    key={move.id}
                    onClick={() => setSelectedMove(move)}
                    className="bg-gray-900/70 border border-red-900/30 rounded-lg overflow-hidden cursor-pointer transform transition-transform hover:scale-105"
                    style={{ boxShadow: getGlowColor(move.id), transition: 'box-shadow 0.4s' }}
                  >
                    <div className="aspect-video bg-black/60 relative">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="material-icons text-red-600 text-4xl">sports_martial_arts</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-white font-medium line-clamp-1">{move.name}</h3>
                      </div>
                      <div className="flex gap-2 mb-2">
                        <span className="bg-red-900/40 text-white text-xs px-1.5 py-0.5 rounded">
                          {move.difficulty}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm line-clamp-2">{move.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <span className="material-icons text-red-600 text-5xl mb-4">search_off</span>
                <h3 className="text-xl text-white mb-2">No moves found</h3>
                <p className="text-gray-400">Try adjusting your search or filters</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}