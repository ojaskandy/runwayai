import { useState, useEffect } from 'react';

interface NotesEditorProps {
  initialNotes?: string;
  onChange: (notes: string) => void;
  onStartRoutine?: () => void;
  onStopRoutine?: () => void;
  onStartTest?: () => void;
  onStopTest?: () => void;
  onShowResults?: () => void;
  isTracking?: boolean;
  hasReferenceMedia?: boolean;
  hasCompletedTest?: boolean;
  onRecord?: () => void;
  isRecording?: boolean;
  onToggleScreenRecording?: () => void;
  isScreenRecording?: boolean;
  isTestRunning?: boolean;
}

export default function NotesEditor({ 
  initialNotes = '', 
  onChange, 
  onStartRoutine, 
  onStopRoutine,
  onStartTest,
  onStopTest,
  onShowResults,
  isTracking = false,
  hasReferenceMedia = false,
  hasCompletedTest = false,
  onRecord,
  isRecording = false,
  onToggleScreenRecording,
  isScreenRecording = false,
  isTestRunning = false
}: NotesEditorProps) {
  const [notes, setNotes] = useState(initialNotes);

  useEffect(() => {
    onChange(notes);
  }, [notes, onChange]);

  const applyFormat = (format: 'bold' | 'italic' | 'heading' | 'subheading') => {
    const textarea = document.getElementById('routineNotesTextarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = notes.substring(start, end);

    let newText = notes;
    switch (format) {
      case 'bold':
        newText = notes.substring(0, start) + `**${selectedText}**` + notes.substring(end);
        break;
      case 'italic':
        newText = notes.substring(0, start) + `*${selectedText}*` + notes.substring(end);
        break;
      case 'heading':
        newText = notes.substring(0, start) + `# ${selectedText}` + notes.substring(end);
        break;
      case 'subheading':
        newText = notes.substring(0, start) + `### ${selectedText}` + notes.substring(end);
        break;
    }

    setNotes(newText);
  };

  return (
    <div className="bg-black border-t border-red-900/50 py-1 px-3 mt-0 w-full">
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center">
          <span className="material-icons text-red-600 mr-2">edit_note</span>
          <h3 className="text-red-100 font-semibold">Routine Notes</h3>
        </div>
        <div className="flex gap-1">
          <button onClick={() => applyFormat('bold')} className="bg-gray-800 hover:bg-gray-700 text-gray-300 rounded p-1">
            <span className="material-icons text-xs">format_bold</span>
          </button>
          <button onClick={() => applyFormat('italic')} className="bg-gray-800 hover:bg-gray-700 text-gray-300 rounded p-1">
            <span className="material-icons text-xs">format_italic</span>
          </button>
          <button onClick={() => applyFormat('heading')} className="bg-gray-800 hover:bg-gray-700 text-gray-300 rounded p-1">
            <span className="material-icons text-xs">format_size</span>
          </button>
          <button onClick={() => applyFormat('subheading')} className="bg-gray-800 hover:bg-gray-700 text-gray-300 rounded p-1">
            <span className="material-icons text-xs">text_fields</span>
          </button>
        </div>
      </div>
      <textarea
        id="routineNotesTextarea"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="w-full bg-gray-900 border border-red-900/30 rounded-md p-2 text-white min-h-[70px] focus:ring-1 focus:ring-red-500"
        placeholder="Enter your notes about this routine here..."
      />
      
      {/* Action Buttons */}
      <div className="flex justify-center space-x-2 sm:space-x-4 mt-3 mb-1 flex-wrap">
        {isTestRunning ? (
          <button
            onClick={onStopTest}
            className="px-5 sm:px-6 py-3 rounded-md font-medium shadow-lg flex items-center justify-center transition-colors text-sm sm:text-base bg-gradient-to-r from-orange-600 to-orange-500 text-white hover:from-orange-700 hover:to-orange-600 animate-pulse"
          >
            <span className="material-icons mr-1 sm:mr-2 text-base sm:text-lg">stop</span>
            Stop Test
          </button>
        ) : (
          <>
            {!isTracking ? (
              <button
                onClick={onStartRoutine}
                className="px-3 sm:px-4 py-2 rounded-md font-medium shadow-lg flex items-center justify-center transition-colors text-xs sm:text-sm bg-gradient-to-r from-red-700 to-red-600 text-white hover:from-red-800 hover:to-red-700"
              >
                <span className="material-icons mr-1 sm:mr-2 text-sm sm:text-base">play_arrow</span>
                Start Routine
              </button>
            ) : (
              <button
                onClick={onStopRoutine}
                className="px-3 sm:px-4 py-2 rounded-md font-medium shadow-lg flex items-center justify-center transition-colors text-xs sm:text-sm bg-gradient-to-r from-orange-600 to-orange-500 text-white hover:from-orange-700 hover:to-orange-600"
              >
                <span className="material-icons mr-1 sm:mr-2 text-sm sm:text-base">stop</span>
                Stop Routine
              </button>
            )}

            {/* Record Button */}
            {onRecord && (
              <button
                onClick={onRecord}
                className={`px-3 sm:px-4 py-2 rounded-md font-medium shadow-lg flex items-center justify-center transition-colors text-xs sm:text-sm ${
                  isRecording
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
                title={isRecording ? 'Stop Recording' : 'Record Camera'}
              >
                <span className="material-icons mr-1 sm:mr-2 text-sm sm:text-base">{isRecording ? 'stop' : 'videocam'}</span>
                {isRecording ? 'Stop' : 'Record Camera'}
              </button>
            )}

            {/* Screen Recording Button */}
            {onToggleScreenRecording && (
              <button
                onClick={onToggleScreenRecording}
                className={`px-3 sm:px-4 py-2 rounded-md font-medium shadow-lg flex items-center justify-center transition-colors text-xs sm:text-sm ${
                  isScreenRecording
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                title={isScreenRecording ? 'Stop Screen Recording' : 'Record Entire Screen'}
              >
                <span className="material-icons mr-1 sm:mr-2 text-sm sm:text-base">{isScreenRecording ? 'stop_screen_share' : 'screen_share'}</span>
                {isScreenRecording ? 'Stop Record' : 'Record Screen'}
              </button>
            )}
            
            {/* Test Button - Light up when media is available */}
            <button
              onClick={onStartTest}
              className={`px-3 sm:px-4 py-2 rounded-md font-medium shadow-lg flex items-center justify-center transition-colors text-xs sm:text-sm ${
                !hasReferenceMedia
                  ? 'bg-gray-700 text-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-green-400 text-white hover:from-green-600 hover:to-green-500 border-2 border-green-300 shadow-xl'
              }`}
              disabled={!hasReferenceMedia || isRecording || isScreenRecording}
              title={
                !hasReferenceMedia 
                  ? 'Add reference media first' 
                  : isRecording || isScreenRecording 
                    ? 'Recording in progress' 
                    : 'Start test against reference media'
              }
            >
              <span className="material-icons mr-1 sm:mr-2 text-sm sm:text-base">fitness_center</span>
              Test
            </button>

            {hasCompletedTest && (
              <button
                onClick={onShowResults}
                className="px-3 sm:px-4 py-2 rounded-md font-medium shadow-lg flex items-center justify-center transition-colors bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-700 hover:to-green-600 text-xs sm:text-sm"
                title="View your test results"
                disabled={isRecording || isScreenRecording}
              >
                <span className="material-icons mr-1 sm:mr-2 text-sm sm:text-base">analytics</span>
                Test Results
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
