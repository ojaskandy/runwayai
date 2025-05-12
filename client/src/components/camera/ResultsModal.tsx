
import { useState } from 'react';
import type { JointScore } from './JointScoringEngine';
import type { TimingIssues } from './TimingAnalyzer';

interface ResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  scores: JointScore[];
  overallScore: number;
  feedback: string;
  timing?: TimingIssues;
  recordedVideo?: string;
  routineNotes?: string;
}

export default function ResultsModal({
  isOpen,
  onClose,
  scores,
  overallScore,
  feedback,
  timing,
  recordedVideo,
  routineNotes
}: ResultsModalProps) {
  const [showCopyToast, setShowCopyToast] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 modal-overlay" onClick={onClose}></div>
      <div className="relative bg-gray-900 rounded-lg shadow-xl border border-red-900/30 w-full max-w-md overflow-hidden modal-content">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-900 to-red-700 p-6">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold text-white">Test Results</h3>
            <button onClick={onClose} className="text-white hover:text-red-200">
              <span className="material-icons">close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Score and Feedback */}
          <div className="text-center mb-6">
            <div className="text-4xl font-bold text-red-500 mb-4">{overallScore}</div>
            <p className="text-white">{feedback}</p>
          </div>

          {/* Joint Scores */}
          <div className="bg-black/30 p-4 rounded-lg mb-4">
            <h4 className="text-white font-medium mb-2">Joint Analysis</h4>
            <div className="grid grid-cols-2 gap-2">
              {scores.map((score, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-gray-300 capitalize">{score.joint.replace('_', ' ')}</span>
                  <span className={`font-medium ${
                    score.score >= 85 ? 'text-green-500' : 
                    score.score >= 70 ? 'text-yellow-500' : 
                    score.score >= 50 ? 'text-orange-500' : 
                    'text-red-500'
                  }`}>{score.score}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Video Recording */}
          {recordedVideo && (
            <div className="mb-4">
              <video src={recordedVideo} controls className="w-full rounded" />
            </div>
          )}
          
          {/* Share Buttons */}
          <div className="bg-black/30 p-4 rounded-lg mb-4">
            <h4 className="text-white font-medium mb-2">Share Your Progress</h4>
            <div className="flex space-x-2 justify-center">
              <button 
                onClick={() => {
                  const text = `I scored ${overallScore}% in my Taekwondo training with CoachT! ${feedback}`;
                  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full"
                title="Share on Twitter"
              >
                <span className="material-icons">share</span>
              </button>
              <button 
                onClick={() => {
                  const text = `I scored ${overallScore}% in my Taekwondo training with CoachT!\n${feedback}`;
                  navigator.clipboard.writeText(text);
                  setShowCopyToast(true);
                  setTimeout(() => setShowCopyToast(false), 2000);
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white p-2 rounded-full"
                title="Copy to clipboard"
              >
                <span className="material-icons">content_copy</span>
              </button>
              {recordedVideo && (
                <button 
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = recordedVideo;
                    a.download = `CoachT-Training-${new Date().toISOString().slice(0,10)}.webm`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-full"
                  title="Download video"
                >
                  <span className="material-icons">download</span>
                </button>
              )}
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded"
          >
            Close
          </button>
        </div>
      </div>

      {/* Copy Toast */}
      {showCopyToast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg">
          Results copied to clipboard!
        </div>
      )}
    </div>
  );
}
