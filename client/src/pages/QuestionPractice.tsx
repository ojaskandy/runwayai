import { useState, useRef, useEffect } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { 
  Mic, 
  MicOff, 
  Type, 
  RefreshCw, 
  Home, 
  Clock,
  Send,
  Play,
  Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Textarea } from '@/components/ui/textarea';

// Add TypeScript interface for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

type InputMode = 'voice' | 'text';

const QUESTIONS = [
  "What would you do if you won this pageant?",
  "Why do you want to win this title?",
  "What qualities should a titleholder have?",
  "Tell me about yourself.",
  "What causes are you passionate about?",
  "How would you use your platform to make a difference?",
  "What makes you unique?",
  "Describe a challenge you've overcome.",
  "What are your future goals?",
  "How do you handle criticism?"
];

export default function QuestionPractice() {
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>('voice');
  const [timeLimit] = useState<number>(60);
  const [remainingTime, setRemainingTime] = useState<number>(60);
  const [textResponse, setTextResponse] = useState<string>('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const recognition = useRef<any>(null);
  const timerRef = useRef<number>();
  const countdownRef = useRef<number>();

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognition.current = new SpeechRecognition();
        recognition.current.continuous = true;
        recognition.current.interimResults = true;
        recognition.current.lang = 'en-US';
        
        recognition.current.onresult = (event: any) => {
          let finalTranscript = '';
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }
          
          if (finalTranscript) {
            setTranscription(prev => prev + finalTranscript);
          }
        };
        
        recognition.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setError(`Speech recognition error: ${event.error}`);
          setIsRecording(false);
        };
        
        recognition.current.onend = () => {
          if (isRecording) {
            try {
              recognition.current?.start();
            } catch (err) {
              console.error('Error restarting recognition:', err);
            }
          }
        };
      } else {
        setError('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      }
    }
    
    getRandomQuestion();
    
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      if (countdownRef.current) {
        window.clearInterval(countdownRef.current);
      }
      if (recognition.current) {
        recognition.current.stop();
      }
    };
  }, []);

  const getRandomQuestion = () => {
    const randomIndex = Math.floor(Math.random() * QUESTIONS.length);
    setCurrentQuestion(QUESTIONS[randomIndex]);
    resetResponse();
  };
  
  const resetResponse = () => {
    setTranscription('');
    setTextResponse('');
    setHasRecorded(false);
    setHasSubmitted(false);
    setError('');
    setRemainingTime(timeLimit);
    setRecordingTime(0);
    
    if (countdownRef.current) {
      window.clearInterval(countdownRef.current);
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }
  };

  const startCountdown = () => {
    if (countdownRef.current) {
      window.clearInterval(countdownRef.current);
    }
    
    setRemainingTime(timeLimit);
    
    countdownRef.current = window.setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          window.clearInterval(countdownRef.current);
          if (inputMode === 'voice' && isRecording) {
            stopRecording();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startRecording = async () => {
    try {
      setError('');
      setIsRecording(true);
      setRecordingTime(0);
      setTranscription('');
      
      // Start speech recognition
      if (recognition.current) {
        recognition.current.start();
      }
      
      // Start recording timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Start countdown
      startCountdown();
      
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Could not start recording. Please ensure microphone access is granted.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (isRecording) {
      if (recognition.current) {
        recognition.current.stop();
      }
      
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      if (countdownRef.current) {
        window.clearInterval(countdownRef.current);
      }
      
      setIsRecording(false);
      setHasRecorded(true);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const response = inputMode === 'voice' ? transcription : textResponse;
      
      if (!response.trim()) {
        throw new Error('Please provide a response before submitting');
      }
      
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setHasSubmitted(true);
      
    } catch (err) {
      console.error('Error submitting response:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit response');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleInputMode = (mode: InputMode) => {
    if (isRecording) return;
    setInputMode(mode);
    resetResponse();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-white">
      {/* Dark Pink Header */}
      <div className="bg-gradient-to-r from-pink-700 to-pink-600 text-white p-6 shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Question Practice</h1>
            <p className="text-pink-100 mt-1">Practice your pageant interview responses</p>
          </div>
          <Link href="/app">
            <Button 
              variant="outline" 
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Home className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {!hasSubmitted ? (
          <div className="bg-white rounded-2xl shadow-xl p-8 mt-8">
            {/* Current Question */}
            <div className="text-center mb-8">
              <div className="inline-block bg-pink-100 text-pink-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
                Current Question
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                {currentQuestion}
              </h2>
              
              {/* Timer */}
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                remainingTime <= 10 
                  ? 'bg-red-100 text-red-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                <Clock className={`h-4 w-4 mr-2 ${
                  remainingTime <= 10 ? 'text-red-500' : 'text-blue-500'
                }`} />
                Time remaining: <span className="font-bold ml-1">{formatTime(remainingTime)}</span>
              </div>
            </div>

            {/* Input Mode Toggle */}
            <div className="flex justify-center gap-4 mb-8">
              <Button
                variant={inputMode === 'voice' ? 'default' : 'outline'}
                className={`px-6 py-3 ${inputMode === 'voice' ? 'bg-pink-600 hover:bg-pink-700' : ''}`}
                onClick={() => toggleInputMode('voice')}
                disabled={isRecording}
              >
                <Mic className="h-5 w-5 mr-2" />
                Voice Response
              </Button>
              <Button
                variant={inputMode === 'text' ? 'default' : 'outline'}
                className={`px-6 py-3 ${inputMode === 'text' ? 'bg-pink-600 hover:bg-pink-700' : ''}`}
                onClick={() => toggleInputMode('text')}
                disabled={isRecording}
              >
                <Type className="h-5 w-5 mr-2" />
                Text Response
              </Button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Recording/Input Area */}
            <div className="flex flex-col items-center justify-center py-8">
              {inputMode === 'voice' ? (
                <div className="text-center">
                  <motion.button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`w-24 h-24 rounded-full flex items-center justify-center text-white focus:outline-none focus:ring-4 focus:ring-opacity-50 transition-all duration-200 ${
                      isRecording 
                        ? 'bg-red-500 hover:bg-red-600 focus:ring-red-300' 
                        : 'bg-pink-600 hover:bg-pink-700 focus:ring-pink-300'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={isSubmitting}
                  >
                    {isRecording ? (
                      <Square className="h-8 w-8" />
                    ) : (
                      <Mic className="h-8 w-8" />
                    )}
                  </motion.button>
                  
                  <div className="mt-4">
                    {isRecording ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-gray-700">
                          Recording: {formatTime(recordingTime)}
                        </span>
                      </div>
                    ) : (
                      <p className="text-gray-600">
                        {hasRecorded ? 'Recording complete!' : 'Click to start recording'}
                      </p>
                    )}
                  </div>
                  
                  {/* Transcription Display */}
                  {transcription && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg max-w-2xl">
                      <p className="text-gray-700 text-left">{transcription}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full max-w-2xl">
                  <Textarea
                    value={textResponse}
                    onChange={(e) => setTextResponse(e.target.value)}
                    placeholder="Type your response here..."
                    className="min-h-40 text-base p-4 border-2 border-pink-200 focus:border-pink-500"
                    onFocus={() => !countdownRef.current && startCountdown()}
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            {((inputMode === 'voice' && transcription) || (inputMode === 'text' && textResponse)) && (
              <div className="flex justify-center mt-8">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || isRecording}
                  className="bg-pink-600 hover:bg-pink-700 px-8 py-3 text-lg"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5 mr-2" />
                      Submit Response
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Success State */
          <div className="bg-white rounded-2xl shadow-xl p-8 mt-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Response Submitted!</h3>
              <p className="text-gray-600">Great job practicing your interview skills.</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h4 className="font-semibold text-gray-800 mb-2">Your Response:</h4>
              <p className="text-gray-700 text-left">
                {inputMode === 'voice' ? transcription : textResponse}
              </p>
            </div>

            <Button
              onClick={getRandomQuestion}
              className="bg-pink-600 hover:bg-pink-700 px-8 py-3"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Practice Another Question
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}