import { useState, useRef, useEffect } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { 
  Mic, 
  MicOff, 
  Type, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Home, 
  Volume2, 
  Clock,
  Save,
  Sparkles,
  MessageSquare,
  Star,
  Lightbulb,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Add TypeScript interface for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

type InputMode = 'voice' | 'text';

interface Feedback {
  score: number;
  strengths: string[];
  improvements: string[];
  overall: string;
}

const QUESTIONS = [
  "Why do you want to win this title?",
  "What would you do if you won this pageant?",
  "What qualities should a titleholder have?",
  "Why are you competing in this pageant?",
  "Tell me about yourself.",
  // Add all other questions here...
];

export default function QuestionPractice() {
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('voice');
  const [timeLimit, setTimeLimit] = useState<number>(60);
  const [remainingTime, setRemainingTime] = useState<number>(60);
  const [showTimeLimitModal, setShowTimeLimitModal] = useState<boolean>(false);
  const [textResponse, setTextResponse] = useState<string>('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recognition = useRef<any>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerRef = useRef<number>();
  const countdownRef = useRef<number>();
  const silenceTimerRef = useRef<number>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognition.current = new SpeechRecognition();
        recognition.current.continuous = true;
        recognition.current.interimResults = true;
        
        recognition.current.onresult = (event: any) => {
          let finalTranscript = '';
          let interimTranscript = '';
          
          // Process all results
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }
          
          // Update the transcription state
          if (finalTranscript) {
            setTranscription(prev => prev + finalTranscript);
          } else if (interimTranscript) {
            // Show interim results in gray
            setTranscription(prev => {
              // Remove any previous interim results
              const cleanPrev = prev.replace(/<span class="interim">[^<]*<\/span>/, '');
              return cleanPrev + `<span class="interim">${interimTranscript}</span>`;
            });
          }
          
          // Reset silence timer whenever we get results
          if (isRecording) {
            if (silenceTimerRef.current) {
              window.clearTimeout(silenceTimerRef.current);
            }
            // Auto-stop after 3 seconds of silence
            silenceTimerRef.current = window.setTimeout(() => {
              if (isRecording) {
                stopRecording();
              }
            }, 3000);
          }
        };
        
        recognition.current.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setError(`Speech recognition error: ${event.error}`);
          setIsTranscribing(false);
        };
        
        recognition.current.onend = () => {
          if (isRecording) {
            // Restart recognition if we're still supposed to be recording
            recognition.current?.start();
          }
        };
      } else {
        setError('Speech recognition is not supported in your browser. Please try Chrome, Edge, or Safari.');
      }
    }
    
    // Get initial question
    getRandomQuestion();
    
    // Cleanup
    return () => {
      if (mediaRecorder.current) {
        mediaRecorder.current.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      if (silenceTimerRef.current) {
        window.clearTimeout(silenceTimerRef.current);
      }
      if (recognition.current) {
        recognition.current.stop();
      }
    };
  }, [isRecording]);

  const generateMockFeedback = (response: string): Feedback => {
    // This is a mock feedback generator - in a real app, you would call an LLM API here
    const strengths = [
      'Great use of specific examples',
      'Clear and concise delivery',
      'Good structure with a clear beginning, middle, and end',
      'Excellent use of personal experiences',
      'Strong opening statement that captures attention'
    ];
    
    const improvements = [
      'Try to elaborate more on your points',
      'Consider adding more personal experiences',
      'Work on varying your tone for emphasis',
      'Try to be more concise in your delivery',
      'Consider adding a stronger conclusion'
    ];
    
    const score = 7 + Math.floor(Math.random() * 3); // Random score between 7-9
    
    return {
      score,
      strengths: strengths.sort(() => 0.5 - Math.random()).slice(0, 2),
      improvements: improvements.sort(() => 0.5 - Math.random()).slice(0, 2),
      overall: `Your response was well-structured and showed good understanding of the question. With a bit more practice on ${improvements[Math.floor(Math.random() * improvements.length)]}, you'll be even more effective.`
    };
  };

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
    setFeedback(null);
    setError('');
    setRemainingTime(timeLimit);
    
    // Clear any ongoing timers
    if (countdownRef.current) {
      window.clearInterval(countdownRef.current);
    }
    
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }
    
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
    }
    
    // Reset input focus if in text mode
    if (inputMode === 'text' && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
        startCountdown();
      }, 100);
    }
  };

  const startCountdown = () => {
    // Clear any existing countdown
    if (countdownRef.current) {
      window.clearInterval(countdownRef.current);
    }
    
    setRemainingTime(timeLimit);
    
    // Start new countdown
    countdownRef.current = window.setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          window.clearInterval(countdownRef.current);
          if (inputMode === 'voice' && isRecording) {
            stopRecording();
          } else if (inputMode === 'text' && !isSubmitting) {
            handleSubmit();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startRecording = async () => {
    try {
      // Reset previous state
      resetResponse();
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up media recorder (for potential audio saving later)
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      
      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.start();
      
      // Start speech recognition
      if (recognition.current) {
        recognition.current.start();
        setIsTranscribing(true);
      }
      
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer for recording duration
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Start countdown timer
      startCountdown();
      
      // Auto-stop after time limit
      setTimeout(() => {
        if (isRecording) {
          stopRecording();
        }
      }, timeLimit * 1000);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Could not access microphone. Please ensure you have granted microphone permissions.');
      setIsRecording(false);
      setIsTranscribing(false);
    }
  };

  const stopRecording = () => {
    if (isRecording) {
      // Stop media recorder if it exists
      if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
        mediaRecorder.current.stop();
      }
      
      // Stop speech recognition
      if (recognition.current) {
        recognition.current.stop();
        setIsTranscribing(false);
      }
      
      // Stop all tracks in the stream
      if (mediaRecorder.current?.stream) {
        mediaRecorder.current.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
      
      // Clear timers
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      if (silenceTimerRef.current) {
        window.clearTimeout(silenceTimerRef.current);
      }
      if (countdownRef.current) {
        window.clearInterval(countdownRef.current);
      }
      
      // Update state
      setIsRecording(false);
      setHasRecorded(true);
      
      // Clean up any interim results
      setTranscription(prev => prev.replace(/<span class="interim">[^<]*<\/span>/, ''));
      
      // Start submission process
      handleSubmit();
    }
  };
  
  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setIsGeneratingFeedback(true);
    setError('');
    
    try {
      // Process the response based on input mode
      const response = inputMode === 'voice' ? transcription : textResponse;
      
      if (!response.trim()) {
        throw new Error('Please provide a response before submitting');
      }
      
      console.log('Submitting response:', response);
      
      // In a real app, you would call your API here
      // const response = await fetch('/api/analyze-response', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     question: currentQuestion,
      //     response,
      //     timeTaken: timeLimit - remainingTime
      // })
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate mock feedback (replace with actual API call)
      const feedback = generateMockFeedback(response);
      setFeedback(feedback);
      setHasSubmitted(true);
      
    } catch (err) {
      console.error('Error submitting response:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit response');
    } finally {
      setIsSubmitting(false);
      setIsGeneratingFeedback(false);
    }
  };

  const toggleInputMode = (mode: InputMode) => {
    if (isRecording) return; // Don't allow changing mode while recording
    setInputMode(mode);
    resetResponse();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const formatTimeLimit = (value: number) => {
    return `${value} second${value !== 1 ? 's' : ''}`;
  };

  const renderFeedback = () => {
    if (!feedback) return null;
    
    return (
      <div className="mt-8 bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-pink-600 to-pink-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold flex items-center">
                <Sparkles className="h-6 w-6 mr-2" />
                AI Feedback
              </h3>
              <p className="text-pink-100 mt-1">Here's how you did with your response</p>
            </div>
            <div className="bg-white/20 px-4 py-2 rounded-full flex items-center">
              <Star className="h-5 w-5 text-yellow-300 mr-1 fill-yellow-300" />
              <span className="font-bold text-lg">{feedback.score}/10</span>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-pink-600" />
              Overall Feedback
            </h4>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-gray-700">{feedback.overall}</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-semibold text-green-700 mb-3 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                Strengths
              </h4>
              <ul className="space-y-2">
                {feedback.strengths.map((strength, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold text-amber-600 mb-3 flex items-center">
                <Lightbulb className="h-5 w-5 mr-2 text-amber-500" />
                Areas for Improvement
              </h4>
              <ul className="space-y-2">
                {feedback.improvements.map((improvement, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="h-5 w-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="text-gray-700">{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h4 className="text-lg font-semibold text-gray-800 mb-3">Your Response</h4>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-gray-700 whitespace-pre-wrap">
                {inputMode === 'voice' ? transcription : textResponse}
              </p>
            </div>
          </div>
          
          <div className="mt-6 flex justify-center">
            <Button 
              onClick={resetResponse}
              className="bg-pink-600 hover:bg-pink-700 px-6 py-3 text-base"
            >
              <RefreshCw className="mr-2 h-5 w-5" />
              Try Another Question
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Question Practice</h1>
            <div className="flex items-center mt-1 sm:mt-2 text-sm text-gray-600">
              <Clock className="h-4 w-4 mr-1 flex-shrink-0" />
              <span>Time limit: {formatTimeLimit(timeLimit)}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-1 h-6 px-2 text-xs"
                onClick={() => setShowTimeLimitModal(true)}
              >
                Change
              </Button>
            </div>
          </div>
          <Link href="/" className="w-full sm:w-auto">
            <Button 
              variant="outline" 
              className="w-full sm:w-auto flex items-center gap-2 justify-center"
            >
              <Home className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>

        {!hasSubmitted ? (
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-8">
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-3 sm:mb-4">
                <span className="inline-block bg-pink-100 text-pink-700 text-xs font-medium px-2.5 py-0.5 rounded-full mb-2">
                  Current Question
                </span>
                <div className="mt-1">{currentQuestion}</div>
              </h2>
              
              {/* Countdown Timer */}
              <div className="mt-4">
                <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                  remainingTime <= 10 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  <Clock className={`h-4 w-4 mr-1.5 ${
                    remainingTime <= 10 ? 'text-red-500' : 'text-blue-500'
                  }`} />
                  {remainingTime > 0 ? (
                    <span>Time remaining: <span className="font-bold">{formatTime(remainingTime)}</span></span>
                  ) : (
                    <span className="font-medium">Time's up! Submitting...</span>
                  )}
                </div>
              </div>
              
              {/* Input Mode Toggle */}
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button
                  variant={inputMode === 'voice' ? 'default' : 'outline'}
                  className={`flex items-center gap-2 ${inputMode === 'voice' ? 'bg-pink-600 hover:bg-pink-700' : ''}`}
                  onClick={() => toggleInputMode('voice')}
                  disabled={isRecording}
                >
                  {inputMode === 'voice' ? (
                    <Mic className="h-5 w-5" />
                  ) : (
                    <MicOff className="h-5 w-5" />
                  )}
                  Voice Response
                </Button>
                <Button
                  variant={inputMode === 'text' ? 'default' : 'outline'}
                  className={`flex items-center gap-2 ${inputMode === 'text' ? 'bg-pink-600 hover:bg-pink-700' : ''}`}
                  onClick={() => toggleInputMode('text')}
                >
                  <Type className="h-5 w-5" />
                  Text Response
                </Button>
              </div>
            </div>
            
            <div className="flex flex-col items-center justify-center py-4">
              {!hasRecorded ? (
                inputMode === 'voice' ? (
                  <>
                    <motion.button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-white focus:outline-none focus:ring-4 focus:ring-opacity-50 transition-all duration-200 ${
                        isRecording 
                          ? 'bg-red-600 hover:bg-red-700 focus:ring-red-300 shadow-lg shadow-red-200' 
                          : 'bg-gradient-to-br from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 focus:ring-pink-300 shadow-lg shadow-pink-200'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      disabled={isSubmitting}
                    >
                      {isRecording ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-full mx-1 animate-pulse"></div>
                          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-full mx-1 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-full mx-1 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      ) : (
                        <Mic className="h-8 w-8 sm:h-10 sm:w-10" />
                      )}
                    </motion.button>
                    
                    <div className="mt-4 sm:mt-6 text-center">
                      {isRecording ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></div>
                          <span className="text-sm sm:text-base font-medium text-gray-700">
                            Recording: <span className="font-bold">{formatTime(recordingTime)}</span>
                          </span>
                        </div>
                      ) : (
                        <p className="text-sm sm:text-base text-gray-600">
                          Click the microphone to start recording
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="w-full max-w-2xl">
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <Label htmlFor="response" className="block text-sm font-medium text-gray-700">
                          Your Response
                        </Label>
                        <span className="text-xs text-gray-500">
                          Auto-submits in {formatTime(remainingTime)}
                        </span>
                      </div>
                      <div className="relative">
                        <textarea
                          ref={textareaRef}
                          id="response"
                          rows={5}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-150"
                          value={textResponse}
                          onChange={(e) => setTextResponse(e.target.value)}
                          placeholder="Type your response here..."
                          disabled={isSubmitting}
                          autoFocus
                        />
                        <div className="absolute bottom-3 right-3 flex items-center space-x-2">
                          <span className="text-xs text-gray-500">
                            {textResponse.length} characters
                          </span>
                          <Button 
                            onClick={handleSubmit} 
                            disabled={!textResponse.trim() || isSubmitting}
                            size="sm"
                            className="bg-pink-600 hover:bg-pink-700 h-8 px-4"
                          >
                            {isSubmitting ? (
                              <>
                                <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                                Submitting...
                              </>
                            ) : (
                              <>
                                <Send className="mr-1 h-3.5 w-3.5" />
                                Submit
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="w-full max-w-2xl mx-auto">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6 shadow-sm">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 mb-2">Response Recorded!</h3>
                      <p className="text-gray-600 mb-6">We're analyzing your response...</p>
                      
                      <div className="w-full max-w-md bg-white rounded-lg p-4 border border-gray-200">
                        <h4 className="font-medium text-gray-800 mb-2 text-left">Your Response:</h4>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 max-h-40 overflow-y-auto">
                          {transcription || textResponse ? (
                            <p className="text-gray-700 whitespace-pre-wrap text-sm">
                              {inputMode === 'voice' ? transcription : textResponse}
                            </p>
                          ) : (
                            <p className="text-gray-400 italic">No response recorded</p>
                          )}
                        </div>
                      </div>
                      
                      {isGeneratingFeedback && (
                        <div className="mt-6 flex flex-col items-center">
                          <div className="flex items-center justify-center space-x-2 mb-2">
                            <RefreshCw className="h-5 w-5 text-pink-600 animate-spin" />
                            <span className="text-gray-600 font-medium">Generating feedback...</span>
                          </div>
                          <p className="text-sm text-gray-500">This may take a moment</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center">
                  <XCircle className="h-5 w-5 mr-2" />
                  {error}
                </div>
              )}
            </div>
          </div>
        ) : (
          renderFeedback()
        )}
        
        {!hasSubmitted && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4">Tips for Great Responses</h2>
            <ul className="space-y-3 list-disc pl-5 text-gray-700">
              <li>Take a moment to think before you start speaking</li>
              <li>Structure your response with a clear beginning, middle, and end</li>
              <li>Be concise and stay on topic</li>
              <li>Speak clearly and at a moderate pace</li>
              <li>Use specific examples to support your points</li>
              <li>Be authentic and let your personality shine through</li>
            </ul>
          </div>
        )}
        
        {/* Time Limit Modal */}
        <Dialog open={showTimeLimitModal} onOpenChange={setShowTimeLimitModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Set Time Limit</DialogTitle>
              <DialogDescription>
                Adjust the time limit for responses (15-60 seconds)
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-700">
                  {formatTimeLimit(timeLimit)}
                </span>
              </div>
              <Slider
                value={[timeLimit]}
                min={15}
                max={60}
                step={5}
                onValueChange={(value) => setTimeLimit(value[0])}
                className="w-full"
              />
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>15s</span>
                <span>60s</span>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                onClick={() => {
                  setShowTimeLimitModal(false);
                  resetResponse();
                }}
                className="bg-pink-600 hover:bg-pink-700"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
