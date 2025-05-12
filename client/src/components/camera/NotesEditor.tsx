
import { useState, useEffect } from 'react';

interface NotesEditorProps {
  initialNotes?: string;
  onChange: (notes: string) => void;
  onStartRoutine?: () => void;
  onStartTest?: () => void;
  isTracking?: boolean;
  hasReferenceMedia?: boolean;
}

export default function NotesEditor({ 
  initialNotes = '', 
  onChange, 
  onStartRoutine, 
  onStartTest,
  isTracking = false,
  hasReferenceMedia = false
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
      <div className="flex justify-center space-x-4 mt-3 mb-1">
        <button
          onClick={onStartRoutine}
          className={`px-4 py-2 rounded-md font-medium shadow-lg flex items-center justify-center transition-colors ${
            isTracking 
              ? 'bg-gray-700 text-gray-300 cursor-default'
              : 'bg-gradient-to-r from-red-700 to-red-600 text-white hover:from-red-800 hover:to-red-700'
          }`}
          disabled={isTracking}
        >
          <span className="material-icons mr-2">{isTracking ? 'pause' : 'play_arrow'}</span>
          {isTracking ? 'Tracking Active' : 'Start Routine'}
        </button>
        
        <button
          onClick={onStartTest}
          className={`px-4 py-2 rounded-md font-medium shadow-lg flex items-center justify-center transition-colors ${
            !hasReferenceMedia
              ? 'bg-gray-700 text-gray-300 cursor-not-allowed'
              : 'bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-700 hover:to-red-600'
          }`}
          disabled={!hasReferenceMedia}
          title={!hasReferenceMedia ? 'Add reference media first' : 'Start test against reference media'}
        >
          <span className="material-icons mr-2">fitness_center</span>
          Test
        </button>
      </div>
    </div>
  );
}
