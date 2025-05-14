import { useState } from 'react';
import type { JointScore } from './JointScoringEngine';
import type { TimingIssues } from './TimingAnalyzer';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  scores: JointScore[];
  overallScore: number;
  feedback: string;
  timing?: TimingIssues;
  recordedVideo?: string;
  routineNotes?: string;
  angleData?: {
    timestamps: string[];
    userAngles: { [joint: string]: number[] };
    expectedAngles: { [joint: string]: number[] };
  };
  dtwResults?: {
    [joint: string]: {
      score: number;
      distance: number;
      path: Array<[number, number]>;
      alignment: { user: number; reference: number; distance: number }[];
      errorWindows: { start: number; end: number; avgError: number }[];
    }
  };
}

export default function ResultsModal({
  isOpen,
  onClose,
  scores,
  overallScore,
  feedback,
  timing,
  recordedVideo,
  routineNotes,
  angleData,
  dtwResults
}: ResultsModalProps) {
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [selectedJoint, setSelectedJoint] = useState<string | null>(null);
  const [showAllJoints, setShowAllJoints] = useState(false);

  if (!isOpen) return null;

  // Generate improvement suggestions based on scores and timing
  const generateImprovementSuggestions = () => {
    const suggestions: string[] = [];
    
    // Add suggestions based on joint scores
    const poorJoints = scores.filter(score => score.score < 70);
    if (poorJoints.length > 0) {
      suggestions.push(`Work on improving ${poorJoints.map(j => j.joint.replace('_', ' ')).join(', ')} movement.`);
    }
    
    // Add DTW-based suggestions
    if (dtwResults) {
      const poorDtwJoints = Object.entries(dtwResults)
        .filter(([_, result]) => result.score < 70)
        .map(([joint, _]) => joint);
      
      if (poorDtwJoints.length > 0) {
        suggestions.push(`Focus on matching the expected motion pattern for ${poorDtwJoints.map(j => j.replace('_', ' ')).join(', ')}.`);
      }
    }
    
    // Add suggestions based on timing
    if (timing) {
      if (timing.delays) {
        suggestions.push('Try to reduce delays between movements for better flow.');
      }
      if (timing.gaps) {
        suggestions.push('Avoid pausing during the routine for smoother execution.');
      }
      if (timing.speed === 'slow') {
        suggestions.push('Increase your speed to match the expected timing.');
      } else if (timing.speed === 'fast') {
        suggestions.push('Slow down slightly to maintain proper form.');
      }
    }
    
    return suggestions.length > 0 ? suggestions : ['Great job! Keep practicing to maintain your performance.'];
  };

  const getChartData = (joint: string) => {
    if (!angleData || !joint) {
      console.warn("Missing angle data or joint for chart");
      return null;
    }
    
    console.log(`Getting chart data for joint ${joint}`);
    console.log(`User angles: ${angleData.userAngles[joint]?.length || 0} points`);
    console.log(`Expected angles: ${angleData.expectedAngles[joint]?.length || 0} points`);
    
    // Check if we have meaningful data
    const hasUserData = angleData.userAngles[joint]?.length > 0;
    const hasExpectedData = angleData.expectedAngles[joint]?.length > 0;
    
    if (!hasUserData || !hasExpectedData) {
      console.warn(`Missing angle data for joint ${joint}`);
      return {
        labels: angleData.timestamps || [],
        datasets: [
          {
            label: 'Your Movement',
            data: hasUserData ? angleData.userAngles[joint] : [0, 0],
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            tension: 0.2,
          },
          {
            label: 'Expected Movement',
            data: hasExpectedData ? angleData.expectedAngles[joint] : [0, 0],
            borderColor: 'rgba(54, 162, 235, 1)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            tension: 0.2,
          }
        ]
      };
    }
    
    const data = {
      labels: angleData.timestamps,
      datasets: [
        {
          label: 'Your Movement',
          data: angleData.userAngles[joint] || [],
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.2,
        },
        {
          label: 'Expected Movement',
          data: angleData.expectedAngles[joint] || [],
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.2,
        }
      ]
    };
    
    // Add error highlights from DTW analysis if available
    if (dtwResults && dtwResults[joint]?.errorWindows?.length > 0) {
      // Create background colors for error regions
      const errorRegions = dtwResults[joint].errorWindows.map(window => {
        return {
          type: 'box',
          xMin: window.start,
          xMax: window.end,
          backgroundColor: 'rgba(255, 0, 0, 0.1)',
          borderColor: 'rgba(255, 0, 0, 0.2)',
          borderWidth: 1
        };
      });
      
      // Add error annotations
      data.datasets.push({
        label: 'Error Regions',
        data: [],
        backgroundColor: 'rgba(255, 0, 0, 0.2)',
        borderColor: 'rgba(255, 0, 0, 0)',
        pointRadius: 0,
        annotations: errorRegions
      } as any);
    }
    
    return data;
  };

  const getAllJointsChartData = () => {
    if (!angleData) return null;
    
    const datasets: any[] = [];
    
    // Get all joints that have data
    const joints = Object.keys(angleData.userAngles).filter(
      joint => angleData.userAngles[joint].length > 0 && angleData.expectedAngles[joint].length > 0
    );
    
    // Create a dataset for each joint
    joints.forEach(joint => {
      // Generate random colors for each joint
      const hue = Math.floor(Math.random() * 360);
      const userColor = `hsla(${hue}, 80%, 60%, 1)`;
      const refColor = `hsla(${hue}, 80%, 80%, 0.7)`;
      
      datasets.push({
        label: `Your ${joint.replace('_', ' ')}`,
        data: angleData.userAngles[joint] || [],
        borderColor: userColor,
        backgroundColor: `${userColor}22`,
        tension: 0.2,
        borderWidth: 2,
        pointRadius: 0,
      });
      
      datasets.push({
        label: `Expected ${joint.replace('_', ' ')}`,
        data: angleData.expectedAngles[joint] || [],
        borderColor: refColor,
        backgroundColor: `${refColor}22`,
        tension: 0.2,
        borderWidth: 1.5,
        borderDash: [5, 5],
        pointRadius: 0,
      });
    });
    
    return {
      labels: angleData.timestamps,
      datasets
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'white',
          font: {
            size: 11
          },
          boxWidth: 15
        }
      },
      title: {
        display: true,
        text: selectedJoint 
          ? `${selectedJoint.replace('_', ' ')} Angle Comparison`
          : 'All Joints Angle Comparison',
        color: 'white',
        font: {
          size: 14
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y?.toFixed(1);
            return `${label}: ${value}°`;
          }
        }
      }
    },
    scales: {
      y: {
        title: {
          display: true,
          text: 'Angle (degrees)',
          color: 'white'
        },
        ticks: {
          color: 'white'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Time',
          color: 'white'
        },
        ticks: {
          color: 'white',
          maxRotation: 45,
          minRotation: 45,
          autoSkip: true,
          maxTicksLimit: 20
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    },
    animation: {
      duration: 500
    }
  };

  const improvements = generateImprovementSuggestions();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 modal-overlay" onClick={onClose}></div>
      <div className="relative bg-gray-900 rounded-lg shadow-xl border border-red-900/30 w-full max-w-4xl h-[90vh] overflow-y-auto modal-content">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-900 to-red-700 p-6 sticky top-0 z-10">
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
            {/* Only show the score if we have a valid overallScore and feedback */}
            {overallScore > 0 && feedback && feedback !== "Test in progress..." ? (
              <>
                <div className="text-4xl font-bold text-red-500 mb-4">{overallScore}</div>
                <p className="text-white">{feedback}</p>
              </>
            ) : (
              <>
                <div className="text-4xl font-bold text-red-500 mb-4">
                  {overallScore > 0 ? overallScore : 'N/A'}
                </div>
                <p className="text-white">
                  {feedback && feedback !== "Test in progress..." 
                    ? feedback 
                    : "Analysis complete. Check the details below."}
                </p>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Joint Scores */}
            <div className="bg-black/30 p-4 rounded-lg md:col-span-2">
              <h4 className="text-white font-medium mb-3 text-lg">Reference Movement - Joint Angles</h4>
              {angleData && angleData.timestamps && angleData.expectedAngles ? (
                <div className="overflow-y-auto max-h-[400px] relative">
                  <table className="w-full text-sm text-left text-gray-300 table-fixed">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-700/50 sticky top-0">
                      <tr>
                        <th scope="col" className="px-4 py-3 w-[25%]">Time</th>
                        <th scope="col" className="px-4 py-3 w-[45%]">Joint</th>
                        <th scope="col" className="px-4 py-3 w-[30%] text-center">Reference Angle (°)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // Use expectedAngles to determine the list of joints
                        const allJoints = Object.keys(angleData.expectedAngles);
                        
                        if (!angleData.timestamps || angleData.timestamps.length === 0) {
                          return (
                            <tr>
                              <td colSpan={3} className="px-4 py-4 text-center text-gray-500">
                                No timestamp data available.
                              </td>
                            </tr>
                          );
                        }

                        if (allJoints.length === 0) {
                          return (
                            <tr>
                              <td colSpan={3} className="px-4 py-4 text-center text-gray-500">
                                No reference joint angle data available.
                              </td>
                            </tr>
                          );
                        }

                        return angleData.timestamps.flatMap((timestamp, timeIndex) =>
                          allJoints.map((jointName, jointIndex) => {
                            const expectedAngle = angleData.expectedAngles[jointName]?.[timeIndex];

                            return (
                              <tr key={`${timestamp}-${jointName}`} className={`border-b border-gray-700 ${jointIndex % 2 === 0 ? 'bg-black/20' : 'bg-black/30'} hover:bg-gray-700/70`}>
                                <td className="px-4 py-2 font-medium whitespace-nowrap text-white">
                                  {/* Display timestamp only for the first joint in a time block for cleaner look */}
                                  {jointIndex === 0 ? parseFloat(timestamp).toFixed(1) + 's' : ''}
                                </td>
                                <td className="px-4 py-2 capitalize">{jointName.replace(/_/g, ' ')}</td>
                                <td className="px-4 py-2 text-center">
                                  {expectedAngle !== undefined ? expectedAngle.toFixed(1) : 'N/A'}
                                </td>
                              </tr>
                            );
                          })
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-4">
                  Reference angle data is not available for this test.
                </div>
              )}
            </div>

            {/* Improvement Suggestions */}
            <div className="bg-black/30 p-4 rounded-lg">
              <h4 className="text-white font-medium mb-2">Areas to Improve</h4>
              <ul className="list-disc list-inside text-gray-300">
                {improvements.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Movement Data Visualization */}
          <div className="bg-black/30 p-4 rounded-lg mt-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-white font-medium">Movement Analysis</h4>
              <div className="flex space-x-2">
                <button 
                  className={`px-3 py-1 rounded text-sm ${showAllJoints ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                  onClick={() => {
                    setShowAllJoints(true);
                    setSelectedJoint(null);
                  }}
                >
                  Show All Joints
                </button>
                <button 
                  className={`px-3 py-1 rounded text-sm ${!showAllJoints && selectedJoint ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                  onClick={() => {
                    setShowAllJoints(false);
                    if (!selectedJoint && scores.length > 0) {
                      setSelectedJoint(scores[0].joint);
                    }
                  }}
                  disabled={!selectedJoint && scores.length === 0}
                >
                  Show Selected Joint
                </button>
              </div>
            </div>
            
            <p className="text-gray-300 text-sm mb-3">
              This graph shows your movement compared to the expected movement over time.
              Areas where the lines diverge indicate where your form needs improvement.
            </p>
            
            <div className="h-64 mb-4">
              {showAllJoints && angleData ? (
                angleData.timestamps?.length > 0 ? (
                  <Line data={getAllJointsChartData()!} options={chartOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-red-400">
                    No angle data available for visualization
                  </div>
                )
              ) : (
                selectedJoint && angleData ? (
                  angleData.timestamps?.length > 0 ? (
                    <Line data={getChartData(selectedJoint)!} options={chartOptions} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-red-400">
                      No angle data available for {selectedJoint.replace('_', ' ')}
                    </div>
                  )
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    Select a joint from the analysis above to see detailed comparison
                  </div>
                )
              )}
            </div>
            
            {/* DTW Results */}
            {dtwResults && selectedJoint && dtwResults[selectedJoint] && (
              <div className="bg-black/40 p-3 rounded mt-2">
                <h5 className="text-white text-sm font-medium mb-2">Dynamic Time Warping Analysis</h5>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-black/30 p-2 rounded">
                    <p className="text-gray-400">Match Score</p>
                    <p className={`text-lg font-bold ${
                      dtwResults[selectedJoint].score >= 85 ? 'text-green-500' : 
                      dtwResults[selectedJoint].score >= 70 ? 'text-yellow-500' : 
                      dtwResults[selectedJoint].score >= 50 ? 'text-orange-500' : 
                      'text-red-500'
                    }`}>{dtwResults[selectedJoint].score}%</p>
                  </div>
                  <div className="bg-black/30 p-2 rounded">
                    <p className="text-gray-400">Error Regions</p>
                    <p className="text-lg font-bold text-white">
                      {dtwResults[selectedJoint].errorWindows.length}
                    </p>
                  </div>
                </div>
                
                {dtwResults[selectedJoint].errorWindows.length > 0 && (
                  <div className="mt-2">
                    <p className="text-gray-400 text-xs">Regions needing improvement:</p>
                    <div className="text-xs text-gray-300 mt-1">
                      {dtwResults[selectedJoint].errorWindows.map((window, idx) => (
                        <div key={idx} className="py-1 border-b border-gray-800 flex justify-between">
                          <span>Region {idx+1}: {window.start} - {window.end}</span>
                          <span className="text-red-400">Avg Error: {window.avgError.toFixed(1)}°</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Video Recording */}
          {recordedVideo && (
            <div className="mt-4">
              <h4 className="text-white font-medium mb-2">Your Performance</h4>
              <video 
                src={recordedVideo} 
                controls 
                className="w-full rounded shadow-lg border border-red-900/30" 
              />
              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = recordedVideo;
                    a.download = `CoachT-Training-${new Date().toISOString().slice(0,10)}.webm`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-full flex items-center"
                  title="Download video"
                >
                  <span className="material-icons mr-1">download</span>
                  Download Recording
                </button>
              </div>
            </div>
          )}
          
          {/* Share Buttons */}
          <div className="bg-black/30 p-4 rounded-lg mt-4">
            <h4 className="text-white font-medium mb-2">Share Your Progress</h4>
            <div className="flex justify-center space-x-4">
              <button 
                onClick={() => {
                  // Generate a text summary
                  const summary = `
My CoachT Training Score: ${overallScore}%
Joint Scores: ${scores.map(s => `${s.joint.replace('_', ' ')}: ${s.score}%`).join(', ')}
Feedback: ${feedback}
                  `.trim();
                  
                  navigator.clipboard.writeText(summary).then(() => {
                    setShowCopyToast(true);
                    setTimeout(() => setShowCopyToast(false), 3000);
                  });
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full flex items-center justify-center w-12 h-12"
                title="Share"
              >
                <span className="material-icons">share</span>
              </button>
              
              <button 
                onClick={() => {
                  // Copy the complete results to clipboard
                  const summary = `
CoachT Training Results:
Overall Score: ${overallScore}%
Joint Analysis:
${scores.map(s => `- ${s.joint.replace('_', ' ')}: ${s.score}%`).join('\n')}
${dtwResults ? `\nDTW Analysis:\n${Object.entries(dtwResults).map(([joint, result]) => `- ${joint.replace('_', ' ')}: ${result.score}%`).join('\n')}` : ''}
Areas to Improve:
${improvements.map(i => `- ${i}`).join('\n')}
                  `.trim();
                  
                  navigator.clipboard.writeText(summary).then(() => {
                    setShowCopyToast(true);
                    setTimeout(() => setShowCopyToast(false), 3000);
                  });
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white p-3 rounded-full flex items-center justify-center w-12 h-12"
                title="Copy to clipboard"
              >
                <span className="material-icons">content_copy</span>
              </button>
            </div>
          </div>
          
          {/* Close Button */}
          <div className="mt-6">
            <button 
              onClick={onClose}
              className="w-full py-3 bg-gradient-to-r from-red-800 to-red-700 hover:from-red-700 hover:to-red-600 text-white font-bold rounded-md shadow-lg transition-all hover:shadow-red-900/30"
            >
              Close
            </button>
          </div>
        </div>
      </div>
      
      {/* Copy to clipboard toast notification */}
      {showCopyToast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg border border-green-500 z-50 modal-content flex items-center">
          <span className="material-icons text-green-500 mr-2">check_circle</span>
          Results copied to clipboard!
        </div>
      )}
    </div>
  );
}
