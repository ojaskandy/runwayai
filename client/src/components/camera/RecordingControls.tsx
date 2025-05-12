
import { useState, useRef, useEffect } from 'react';

interface RecordingControlsProps {
  onRecordingComplete: (videoUrl: string) => void;
}

export default function RecordingControls({ onRecordingComplete }: RecordingControlsProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const recordingStartTime = useRef<number>(0);

  // Clean up function to handle any lingering MediaRecorder instances
  useEffect(() => {
    return () => {
      if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
        mediaRecorder.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      // Clear any previous recordings
      recordedChunks.current = [];
      
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        console.error('No canvas element found');
        return;
      }
      
      const stream = canvas.captureStream(30);
      
      // Use the most compatible options first, with fallbacks
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }
      }

      const recorder = new MediaRecorder(stream, { 
        mimeType: mimeType,
        videoBitsPerSecond: 2500000 // Slightly reduced for better performance
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunks.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        if (recordedChunks.current.length === 0) {
          console.error('No recorded data available');
          return;
        }
        
        try {
          const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          
          // Show recording duration
          const duration = Math.round((Date.now() - recordingStartTime.current) / 1000);
          console.log(`Recording completed: ${duration}s`);
          
          // Pass the URL to the parent component
          onRecordingComplete(url);
          
          // Show the recording modal with download option
          setShowRecordingModal(true);
        } catch (error) {
          console.error('Error creating recording blob:', error);
        }
      };

      // Start recording with data available events every 500ms for smoother experience
      recorder.start(500);
      mediaRecorder.current = recorder;
      recordingStartTime.current = Date.now();
      setIsRecording(true);
      console.log('Recording started successfully');
    } catch (err) {
      console.error('Error starting recording:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      console.log('Stopping recording...');
      mediaRecorder.current.stop();
      setIsRecording(false);
    } else {
      console.warn('No active recording to stop');
    }
  };

  return (
    <>
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`fixed top-1/3 right-4 z-[9999] w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all 
          ${isRecording 
            ? 'bg-red-600 animate-pulse shadow-red-500/50 border-4 border-white/70' 
            : 'bg-black border-4 border-red-600 hover:bg-red-900 hover:scale-110'
          }`}
      >
        <span className="material-icons text-white text-4xl mb-1">
          {isRecording ? 'stop' : 'videocam'}
        </span>
        <span className={`text-white text-xs font-bold ${isRecording ? 'animate-pulse' : ''}`}>
          {isRecording ? 'RECORDING' : 'RECORD'}
        </span>
        {isRecording && (
          <span className="absolute -top-3 -right-3 w-8 h-8 bg-red-600 rounded-full text-xs font-bold text-white flex items-center justify-center border-2 border-white animate-pulse">
            REC
          </span>
        )}
      </button>
      
      {/* Recording Complete Modal */}
      {showRecordingModal && (
        <div className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-red-600 rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Recording Complete</h3>
            <p className="text-gray-300 mb-6">Your recording is ready to be downloaded or shared.</p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <button
                onClick={() => setShowRecordingModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
