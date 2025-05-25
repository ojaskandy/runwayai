import React, { useState, useEffect, useRef } from 'react';
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
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import DTW from 'dtw';
// import 'react-tabs/style/react-tabs.css'; // Using custom styles

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

interface ErrorWindow {
  start: number | string; // Assuming start/end could be string representations of time/frames or numbers
  end: number | string;
  avgError: number;
}

interface AngleDataTableProps { // Replicated from StopTestIntermediatePopup for now
  timestamps: string[];
  angles: { [joint: string]: number[] };
  title: string;
  isLoading?: boolean;
}

// Add new interface for comparison table
interface AngleComparisonTableProps {
  timestamps: string[];
  userAngles: { [joint: string]: number[] };
  referenceAngles: { [joint: string]: number[] };
  isLoading?: boolean;
}

const AngleDataTable: React.FC<AngleDataTableProps> = ({ timestamps, angles, title, isLoading }) => {
  if (isLoading) {
    return <p className="text-gray-400 text-center py-4">Loading angle data...</p>;
  }
  if (!timestamps || timestamps.length === 0) {
    return <p className="text-gray-400 text-center py-4">No {title.toLowerCase()} data available.</p>;
  }

  const jointNames = Object.keys(angles);
  if (jointNames.length === 0) {
    return <p className="text-gray-400 text-center py-4">No joint data found for {title.toLowerCase()}.</p>;
  }
  
  // Ensure all angle arrays have the same length as timestamps for consistency
  const consistentAngles: { [joint: string]: (number | null)[] } = {};
  jointNames.forEach(joint => {
    consistentAngles[joint] = timestamps.map((_, idx) => angles[joint]?.[idx] ?? null);
  });


  return (
    <div className="my-4 rounded-lg bg-gray-800/50 p-1 shadow-inner">
      <h4 className="text-white font-semibold mb-2 text-lg px-3 pt-2">{title}</h4>
      <div className="max-h-72 overflow-y-auto styled-scrollbar"> {/* Increased max-h and added scrollbar styling */}
        <table className="min-w-full text-sm text-left text-gray-300">
          <thead className="text-xs text-gray-400 uppercase bg-gray-700/60 sticky top-0 z-10">
            <tr>
              <th scope="col" className="px-4 py-3 whitespace-nowrap">Time</th>
              {jointNames.map(joint => (
                <th scope="col" className="px-4 py-3 whitespace-nowrap" key={joint}>
                  {joint.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {timestamps.map((time, idx) => (
              <tr key={idx} className={`${idx % 2 === 0 ? 'bg-gray-800/70' : 'bg-gray-900/70'} hover:bg-gray-700/80 transition-colors duration-150 ease-in-out`}>
                <td className="px-4 py-2 whitespace-nowrap">{time}</td>
                {jointNames.map(joint => (
                  <td className="px-4 py-2 whitespace-nowrap" key={`${joint}-${idx}`}>
                    {consistentAngles[joint][idx] !== null ? `${consistentAngles[joint][idx]?.toFixed(1)}°` : 'N/A'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// New component for showing angle differences with scoring
const AngleComparisonTable: React.FC<AngleComparisonTableProps> = ({ 
  timestamps, 
  userAngles, 
  referenceAngles, 
  isLoading 
}) => {
  if (isLoading) {
    return <p className="text-gray-400 text-center py-4">Loading comparison data...</p>;
  }
  
  if (!timestamps || timestamps.length === 0) {
    return <p className="text-gray-400 text-center py-4">No timestamp data available for comparison.</p>;
  }

  // Get all joint names from both user and reference angles
  const userJoints = Object.keys(userAngles);
  const refJoints = Object.keys(referenceAngles);
  const allJoints = Array.from(new Set([...userJoints, ...refJoints])).filter(joint => 
    userAngles[joint]?.some(v => v !== undefined) && 
    referenceAngles[joint]?.some(v => v !== undefined)
  );

  if (allJoints.length === 0) {
    return <p className="text-gray-400 text-center py-4">No matching joint data available for comparison.</p>;
  }

  // Helper function to calculate DTW score
  function computeDTWScore(userSeq: number[], refSeq: number[]) {
    const dtw = new DTW();
    const cost = dtw.compute(userSeq, refSeq);
    // Normalize: lower cost = better, scale to 0-100
    const maxPossible = Math.max(userSeq.length, refSeq.length) * 180; // max angle diff per frame
    const score = Math.max(0, 100 - (cost / maxPossible) * 100);
    return { cost, score: Math.round(score) };
  }

  return (
    <div className="my-4 rounded-lg bg-gray-800/50 p-1 shadow-inner">
      <h4 className="text-white font-semibold mb-2 text-lg px-3 pt-2">Angle Comparison Analysis (DTW)</h4>
      <div className="text-xs text-gray-400 mb-3 flex flex-wrap gap-2">
        <span className="inline-block px-2 py-1 bg-gray-700 rounded mr-2">Excellent: 0-5°</span>
        <span className="inline-block px-2 py-1 bg-gray-700 rounded mr-2">Good: 6-15°</span>
        <span className="inline-block px-2 py-1 bg-gray-700 rounded mr-2">Fair: 16-30°</span>
        <span className="inline-block px-2 py-1 bg-gray-700 rounded">Poor: &gt;30°</span>
      </div>
      <div className="max-h-72 overflow-y-auto styled-scrollbar"> 
        <table className="min-w-full text-sm text-left text-gray-300">
          <thead className="text-xs text-gray-400 uppercase bg-gray-700/60 sticky top-0 z-10">
            <tr>
              <th scope="col" className="px-4 py-3 whitespace-nowrap">Joint</th>
              <th scope="col" className="px-4 py-3 whitespace-nowrap">DTW Score</th>
              <th scope="col" className="px-4 py-3 whitespace-nowrap">DTW Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {allJoints.map(joint => {
              const userSeq = userAngles[joint] || [];
              const refSeq = referenceAngles[joint] || [];
              const { cost, score } = computeDTWScore(userSeq, refSeq);
              let scoreColor = '';
              if (score >= 90) scoreColor = 'text-green-500';
              else if (score >= 80) scoreColor = 'text-green-400';
              else if (score >= 70) scoreColor = 'text-yellow-400';
              else if (score >= 60) scoreColor = 'text-orange-400';
              else scoreColor = 'text-red-500';
              return (
                <tr key={joint}>
                  <td className="px-4 py-2 whitespace-nowrap">{joint.replace(/_/g, ' ')}</td>
                  <td className={`px-4 py-2 whitespace-nowrap font-semibold ${scoreColor}`}>{score}%</td>
                  <td className="px-4 py-2 whitespace-nowrap">{cost.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Add new interface for FastDTW comparison results
interface FastDTWComparisonProps {
  overallScore: number;
  detailedJointScores: Array<{ name: string; score: number; cost: number }>;
  isLoading?: boolean;
}

// New component for showing FastDTW comparison results
const FastDTWComparisonTable: React.FC<FastDTWComparisonProps> = ({
  overallScore,
  detailedJointScores,
  isLoading
}) => {
  if (isLoading) {
    return <p className="text-gray-400 text-center py-4">Loading comparison data...</p>;
  }
  
  if (!detailedJointScores || detailedJointScores.length === 0) {
    return <p className="text-gray-400 text-center py-4">No comparison data available.</p>;
  }

  // Helper function to get severity level based on score (0-100)
  const getScoreSeverity = (score: number): { label: string; color: string } => {
    if (score >= 90) return { label: 'Excellent', color: 'text-green-500' };
    if (score >= 80) return { label: 'Good', color: 'text-green-300' };
    if (score >= 70) return { label: 'Fair', color: 'text-yellow-400' };
    if (score >= 50) return { label: 'Okay', color: 'text-orange-400' };
    return { label: 'Needs Improvement', color: 'text-red-500' };
  };

  // Sort joints by score (lowest first to highlight areas for improvement, or highest first)
  // Let's sort by score, lowest first
  const sortedJoints = [...detailedJointScores].sort((a, b) => a.score - b.score);

  return (
    <div className="my-4 rounded-lg bg-gray-800/50 p-1 shadow-inner">
      <h4 className="text-white font-semibold mb-2 text-lg px-3 pt-2">Routine Comparison Analysis</h4>
      <div className="text-xs text-gray-400 mb-3 flex flex-wrap gap-2">
        <span className="inline-block px-2 py-1 bg-gray-700 rounded mr-2">Excellent: 0-5°</span>
        <span className="inline-block px-2 py-1 bg-gray-700 rounded mr-2">Good: 6-15°</span>
        <span className="inline-block px-2 py-1 bg-gray-700 rounded mr-2">Fair: 16-30°</span>
        <span className="inline-block px-2 py-1 bg-gray-700 rounded">Poor: &gt;30°</span>
      </div>
      <div className="max-h-72 overflow-y-auto styled-scrollbar"> 
        <table className="min-w-full text-sm text-left text-gray-300">
          <thead className="text-xs text-gray-400 uppercase bg-gray-700/60 sticky top-0 z-10">
            <tr>
              <th scope="col" className="px-4 py-3 whitespace-nowrap">Joint</th>
              <th scope="col" className="px-4 py-3 whitespace-nowrap">Alignment Score (%)</th>
              <th scope="col" className="px-4 py-3 whitespace-nowrap">DTW Cost</th>
              <th scope="col" className="px-4 py-3 whitespace-nowrap">Quality</th>
              <th scope="col" className="px-4 py-3 whitespace-nowrap">Recommendation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {sortedJoints.map((jointData, idx) => {
              if (jointData.cost === -1) { // Skip joints that couldn't be processed
                return (
                  <tr 
                    key={jointData.name} 
                    className={`${idx % 2 === 0 ? 'bg-gray-800/40' : 'bg-gray-900/40'} hover:bg-gray-700/50 transition-colors duration-150 ease-in-out`}
                  >
                    <td className="px-4 py-2 whitespace-nowrap font-medium text-gray-500">
                      {jointData.name.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-500" colSpan={4}>
                      Not enough data to process for DTW.
                    </td>
                  </tr>
                );
              }

              const { label, color } = getScoreSeverity(jointData.score);
              
              const getRecommendation = (score: number) => {
                if (score >= 90) return 'Excellent form! Maintain consistency.';
                if (score >= 80) return 'Good alignment. Minor refinements possible.';
                if (score >= 70) return 'Fair. Focus on matching timing and angles more closely.';
                if (score >= 50) return 'Okay. Consider breaking down the movement.';
                return 'Significant practice needed. Review reference carefully.';
              };
              
              return (
                <tr 
                  key={jointData.name} 
                  className={`${idx % 2 === 0 ? 'bg-gray-800/70' : 'bg-gray-900/70'} hover:bg-gray-700/80 transition-colors duration-150 ease-in-out`}
                >
                  <td className="px-4 py-2 whitespace-nowrap font-medium">
                    {jointData.name.replace(/_/g, ' ')}
                  </td>
                  <td className={`px-4 py-2 whitespace-nowrap font-semibold ${color}`}>
                    {jointData.score}%
                  </td>
                  <td className={`px-4 py-2 whitespace-nowrap`}>
                    {jointData.cost.toFixed(2)}
                  </td>
                  <td className={`px-4 py-2 whitespace-nowrap ${color}`}>
                    {label}
                  </td>
                  <td className="px-4 py-2">
                    {getRecommendation(jointData.score)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Performance over time chart component
const PerformanceChart: React.FC<{ 
  perFrameScores: number[];
  timestamps?: string[];
}> = ({ perFrameScores, timestamps }) => {
  if (!perFrameScores || perFrameScores.length === 0) {
    return <p className="text-gray-400 text-center py-4">No performance data available.</p>;
  }

  // Generate default timestamps if none provided
  const labels = timestamps || Array.from({ length: perFrameScores.length }, (_, i) => `Frame ${i+1}`);
  
  const data = {
    labels,
    datasets: [
      {
        label: 'Performance',
        data: perFrameScores.map(score => score * 100), // Convert 0-1 to 0-100
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
        fill: true,
      }
    ]
  };
  
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'white',
          font: {
            size: 12
          }
        }
      },
      title: {
        display: true,
        text: 'Performance Throughout Routine',
        color: 'white',
        font: {
          size: 14
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        title: {
          display: true,
          text: 'Similarity (%)',
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
          text: 'Progress',
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
  
  return <Line data={data} options={options} />;
};

interface ResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  scores?: JointScore[];
  overallScore?: number;
  feedback?: string;
  timing?: TimingIssues;
  recordedVideo?: string;
  routineNotes?: string;
  angleData?: {
    timestamps: string[];
    userAngles: { [joint: string]: number[] };
    expectedAngles: { [joint: string]: number[] };
  };
  dtwResults?: Record<string, any>;
  userAngleTable?: { // Added prop
    timestamps: string[];
    angles: { [joint: string]: number[] };
  };
  instructorAngleTable?: { // Added prop
    timestamps:string[];
    angles: { [joint: string]: number[] };
  };
  // Add new prop for FastDTW comparison results
  fastDtwResults?: {
    overallScore: number;
    detailedJointScores: Array<{ name: string; score: number; cost: number }>;
  };
}

export default function ResultsModal({
  isOpen,
  onClose,
  scores = [],
  overallScore = 0,
  feedback = 'No feedback available.',
  timing,
  recordedVideo,
  routineNotes,
  angleData,
  dtwResults,
  userAngleTable, // Added prop
  instructorAngleTable, // Added prop
  fastDtwResults,
}: ResultsModalProps) {
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [activeTab, setActiveTab] = useState<'user' | 'instructor' | 'routine'>('user');
  const [routineAnalysisLoading, setRoutineAnalysisLoading] = useState(false);
  const [routineAnalysisResults, setRoutineAnalysisResults] = useState<any>(null);
  const [dtwProcessingClicked, setDtwProcessingClicked] = useState(false);

  // Helper functions first
  const generateImprovementSuggestions = () => {
    const suggestions: string[] = [];
    if (routineAnalysisResults && routineAnalysisResults.detailedJointScores) {
      const processableJointCount = routineAnalysisResults.detailedJointScores.filter((j: any) => j.cost !== -1).length;

      const jointsToImprove = routineAnalysisResults.detailedJointScores.filter((j: any) => j.score < 70 && j.cost !== -1); // Score < 70 and was processable
      if (jointsToImprove.length > 0) {
        suggestions.push(`Focus on improving: ${jointsToImprove.map((j: any) => j.name.replace('_', ' ')).join(', ')}. Aim for an alignment score of 70% or higher.`);
      }
      
      const excellentJoints = routineAnalysisResults.detailedJointScores.filter((j: any) => j.score >= 90 && j.cost !== -1);
      if (excellentJoints.length > 0 && jointsToImprove.length === 0 && processableJointCount === excellentJoints.length) {
        suggestions.push('Fantastic work! All joints show excellent alignment.');
      } else if (excellentJoints.length > 0 && jointsToImprove.length === 0) {
         suggestions.push('Great job on maintaining good to excellent form across all processable joints!');
      }

      if (processableJointCount === 0 && !routineAnalysisResults.error) {
        suggestions.push("Not enough data points for a reliable comparison for any joint.");
      }

    } else if (routineAnalysisResults && routineAnalysisResults.error) {
        suggestions.push(routineAnalysisResults.error);
    }
    
    if (suggestions.length === 0 && (!routineAnalysisResults || (!routineAnalysisResults.detailedJointScores && !routineAnalysisResults.error)) ) {
        suggestions.push('Click "Process Results" to analyze your routine alignment.');
    }
    return suggestions;
  };

  useEffect(() => {
    if (activeTab === 'routine' && dtwProcessingClicked && !routineAnalysisLoading) {
      // Use userAngleTable and instructorAngleTable as primary sources
      if (userAngleTable && userAngleTable.angles && userAngleTable.timestamps.length > 0 &&
          instructorAngleTable && instructorAngleTable.angles && instructorAngleTable.timestamps.length > 0) {
        
        setRoutineAnalysisLoading(true);
        setRoutineAnalysisResults(null);

        setTimeout(() => { 
          const userAnglesData = userAngleTable.angles;
          const refAnglesData = instructorAngleTable.angles;
          
          const commonJointNames = Object.keys(userAnglesData).filter(joint => 
            refAnglesData[joint] && 
            userAnglesData[joint]?.length > 0 && 
            refAnglesData[joint]?.length > 0
          );

          if (commonJointNames.length === 0) {
            setRoutineAnalysisResults({ error: "No common joint data with sufficient recordings found between user and instructor." });
            setRoutineAnalysisLoading(false);
            setDtwProcessingClicked(false);
            return;
          }

          const detailedJointScores: Array<{ name: string, score: number, cost: number }> = [];
          let totalScoreSum = 0;

          commonJointNames.forEach(joint => {
            const userSeq = userAnglesData[joint].filter(a => typeof a === 'number') as number[];
            const refSeq = refAnglesData[joint].filter(a => typeof a === 'number') as number[];

            if (userSeq.length < 2 || refSeq.length < 2) { // DTW usually needs at least 2 points
              detailedJointScores.push({ name: joint, score: 0, cost: -1 }); // Mark as not processable
              return;
            }
            
            const dtw = new DTW();
            const cost = dtw.compute(userSeq, refSeq);
            const maxLength = Math.max(userSeq.length, refSeq.length);
            const maxPossibleCost = maxLength * 180; // Max angle diff (180) per frame in the longer sequence
            
            // Score: 0-100, higher is better.
            // Normalize cost: 0 means perfect match, higher means more different.
            // (1 - (cost / maxPossibleCost)) gives a value where 1 is best.
            // Multiply by 100. Ensure score is not negative.
            let score = 0;
            if (maxPossibleCost > 0) {
                score = Math.max(0, (1 - (cost / maxPossibleCost)) * 100);
            }
            
            detailedJointScores.push({ name: joint, score: Math.round(score), cost: parseFloat(cost.toFixed(2)) });
            totalScoreSum += score;
          });

          const processableJoints = detailedJointScores.filter(j => j.cost !== -1);
          const overallRoutineScore = processableJoints.length > 0 
            ? Math.round(processableJoints.reduce((sum, j) => sum + j.score, 0) / processableJoints.length) 
            : 0;
          
          setRoutineAnalysisResults({
            overallScore: overallRoutineScore,
            detailedJointScores: detailedJointScores, // This will be used by FastDTWComparisonTable and suggestions
             // The following are for potential chart compatibility, may need adjustment
            jointErrors: detailedJointScores.map(j => j.cost), 
            jointNames: detailedJointScores.map(j => j.name.replace(/_/g, ' ')),
            perFrameScores: detailedJointScores.map(j => j.score / 100), // Example: individual joint scores (0-1)
          });

          setRoutineAnalysisLoading(false);
          setDtwProcessingClicked(false);
        }, 500); // Reduced simulation time
      } else {
        setRoutineAnalysisResults({ error: "User or Instructor angle data is not available for analysis. Ensure both have recorded data." });
        setRoutineAnalysisLoading(false);
        setDtwProcessingClicked(false);
      }
    }
  }, [activeTab, dtwProcessingClicked, userAngleTable, instructorAngleTable, routineAnalysisLoading]);

  const handleProcessDtw = () => {
    setDtwProcessingClicked(true);
  };

  if (!isOpen) return null;

  // const improvements = scores.length > 0 ? generateImprovementSuggestions() : ['Complete a test to get feedback.']; // Old usage
  
  const hasUserAngleTableData = userAngleTable && userAngleTable.timestamps && userAngleTable.timestamps.length > 0;
  const hasInstructorAngleTableData = instructorAngleTable && instructorAngleTable.timestamps && instructorAngleTable.timestamps.length > 0;

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
          {/* Score and Feedback section removed as per new flow, feedback comes from DTW analysis now */}

          {/* Areas to Improve - now based on DTW */}
          <div className="bg-black/30 p-4 rounded-lg mb-6">
              <h4 className="text-white font-medium mb-2">Feedback</h4>
              <ul className="list-disc list-inside text-gray-300">
                {generateImprovementSuggestions().map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
          </div>

          {/* Tab navigation for charts/tables */}
          <div className="mb-6">
            <div className="flex border-b border-gray-700 overflow-x-auto">
              <button
                onClick={() => setActiveTab('user')}
                className={`py-2 px-4 font-medium whitespace-nowrap ${activeTab === 'user' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-400 hover:text-white'}`}
              >
                Your Angles
              </button>
              <button
                onClick={() => setActiveTab('instructor')}
                className={`py-2 px-4 font-medium whitespace-nowrap ${activeTab === 'instructor' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-400 hover:text-white'}`}
              >
                Instructor Angles
              </button>
              <button
                onClick={() => setActiveTab('routine')}
                className={`py-2 px-4 font-medium whitespace-nowrap ${activeTab === 'routine' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-400 hover:text-white'}`}
              >
                Routine Analysis
              </button>
            </div>
          </div>

          {/* User Angle Table Section */}
          {activeTab === 'user' && (
            <AngleDataTable
              timestamps={userAngleTable?.timestamps || []}
              angles={userAngleTable?.angles || {}}
              title="Your Joint Angles"
              isLoading={!hasUserAngleTableData}
            />
          )}

          {/* Instructor Angle Table Section */}
          {activeTab === 'instructor' && (
            <AngleDataTable
              timestamps={instructorAngleTable?.timestamps || []}
              angles={instructorAngleTable?.angles || {}}
              title="Instructor Joint Angles"
              isLoading={!hasInstructorAngleTableData}
            />
          )}

          {/* Routine Comparison Analysis Section */}
          {activeTab === 'routine' && (
            <div>
              <div className="bg-black/30 p-3 rounded mb-4">
                <h4 className="text-white font-medium mb-2">Routine DTW Analysis</h4>
                <p className="text-gray-300 text-sm">
                  Compare your entire movement sequence against the instructor using Dynamic Time Warping (DTW) for each joint.
                  Lower DTW cost signifies better alignment. Scores are normalized (0-100).
                </p>
              </div>

              {!routineAnalysisResults && !routineAnalysisLoading && (
                <div className="text-center py-10">
                  <button 
                    onClick={handleProcessDtw}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg text-lg transition-all duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 glow-on-hover"
                  >
                    Process Results
                  </button>
                   <p className="text-gray-400 text-xs mt-2">Click to perform DTW analysis on recorded angle data.</p>
                </div>
              )}

              {routineAnalysisLoading && (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <svg className="animate-spin h-8 w-8 mb-4 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <p className="text-lg mb-2">Processing DTW Analysis...</p>
                  <p className="text-sm">This may take a moment.</p>
                </div>
              )}

              {routineAnalysisResults && !routineAnalysisLoading && (
                routineAnalysisResults.error ? (
                  <div className="text-center py-10 text-red-400">
                    <p className="text-lg mb-2">Error during analysis:</p>
                    <p className="text-sm">{routineAnalysisResults.error}</p>
                  </div>
                ) : (
                  <>
                    <FastDTWComparisonTable 
                      overallScore={routineAnalysisResults.overallScore}
                      detailedJointScores={routineAnalysisResults.detailedJointScores}
                      isLoading={routineAnalysisLoading}
                    />
                     <div className="mt-2 text-xs text-gray-400 px-3">
                        <p><strong>How scoring works:</strong></p>
                        <ul className="list-disc list-inside ml-4">
                            <li>DTW (Dynamic Time Warping) calculates a 'cost' for aligning your joint movements with the instructor's. Lower cost is better.</li>
                            <li>This cost is normalized to a score from 0 to 100 for each joint.</li>
                            <li>The overall score is the average of these individual joint scores.</li>
                            <li>'Joint Errors' in the table above represent the raw DTW cost for that joint.</li>
                        </ul>
                    </div>
                    {/* Performance chart might be less relevant here unless perFrameScores are truly frame-by-frame alignment scores */}
                    {/* <div className="mt-4 bg-black/30 p-3 rounded">
                      <h4 className="text-white font-medium mb-2">Performance Throughout Routine</h4>
                      <div className="h-64">
                        <PerformanceChart 
                          perFrameScores={routineAnalysisResults.perFrameScores}
                          timestamps={angleData?.timestamps}
                        />
                      </div>
                    </div> */}
                  </>
                )
              )}
            </div>
          )}

          {/* Video Recording - Kept as it's independent */}
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
${generateImprovementSuggestions().map(i => `- ${i}`).join('\n')}
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
