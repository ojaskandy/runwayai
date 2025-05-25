import React, { useState } from 'react';
import TestResultsPopup from './TestResultsPopup';

interface AngleDataTableProps {
  timestamps: string[];
  angles: { [joint: string]: number[] };
  title: string;
}

const AngleDataTable: React.FC<AngleDataTableProps> = ({ timestamps, angles, title }) => {
  if (!timestamps || timestamps.length === 0) {
    return <p className="text-gray-400">No {title.toLowerCase()} data available.</p>;
  }

  const jointNames = Object.keys(angles);

  return (
    <div className="mb-6 overflow-x-auto">
      <h4 className="text-white font-medium mb-2 text-lg">{title}</h4>
      <div className="max-h-60 overflow-y-auto">
        <table className="min-w-full text-sm text-left text-gray-300">
          <thead className="text-xs text-gray-400 uppercase bg-gray-800 sticky top-0">
            <tr>
              <th scope="col" className="px-4 py-3">Time</th>
              {jointNames.map(joint => (
                <th scope="col" className="px-4 py-3" key={joint}>
                  {joint.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timestamps.map((time, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}>
                <td className="px-4 py-2">{time}</td>
                {jointNames.map(joint => (
                  <td className="px-4 py-2" key={`${joint}-${idx}`}>
                    {angles[joint]?.[idx]?.toFixed(1) || 'N/A'}°
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

interface StopTestIntermediatePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  userAngleData?: {
    timestamps: string[];
    angles: { [joint: string]: number[] };
  };
  referenceAngleData?: {
    timestamps: string[];
    angles: { [joint: string]: number[] };
  };
}

const StopTestIntermediatePopup: React.FC<StopTestIntermediatePopupProps> = ({
  isOpen,
  onClose,
  onContinue,
  userAngleData,
  referenceAngleData,
}) => {
  const [showRoutineResults, setShowRoutineResults] = useState(false);
  const [showTestResults, setShowTestResults] = useState(false);
  
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 p-6 rounded-xl shadow-2xl w-full max-w-md border border-blue-600/50">
        <h3 className="text-2xl font-semibold text-white mb-6 text-center">Test Stopped</h3>
        
        {!showRoutineResults && !showTestResults ? (
          <div className="flex flex-col gap-4">
            <button
              onClick={() => setShowRoutineResults(true)}
              className="py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 transition-colors"
            >
              <span className="material-icons">format_list_bulleted</span>
              Open Routine Results
            </button>
            
            <button
              onClick={() => setShowTestResults(true)}
              className="py-4 bg-green-600 hover:bg-green-700 text-white text-lg font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 transition-colors"
            >
              <span className="material-icons">assessment</span>
              Open Test Results
            </button>
            
            <button
              onClick={onClose}
              className="py-4 bg-gray-700 hover:bg-gray-600 text-white text-lg font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 transition-colors mt-2"
            >
              <span className="material-icons">close</span>
              Close
            </button>
          </div>
        ) :
          showTestResults ? (
            <TestResultsPopup
              isOpen={showTestResults}
              onClose={() => setShowTestResults(false)}
              userAngleData={userAngleData!}
              referenceAngleData={referenceAngleData!}
            />
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-white">Routine Results</h3>
                <button 
                  onClick={() => setShowRoutineResults(false)} 
                  className="text-gray-400 hover:text-white"
                >
                  <span className="material-icons">arrow_back</span>
                </button>
              </div>
              
              {userAngleData && (
                <AngleDataTable
                  timestamps={userAngleData.timestamps}
                  angles={userAngleData.angles}
                  title="Your Captured Angles"
                />
              )}
              
              {referenceAngleData && (
                <AngleDataTable
                  timestamps={referenceAngleData.timestamps}
                  angles={referenceAngleData.angles}
                  title="Reference Angles (Expected)"
                />
              )}
              
              {!userAngleData && !referenceAngleData && (
                <p className="text-gray-400 text-center py-8">Angle data is being processed or is not available.</p>
              )}
            </div>
          )
        }
      </div>
    </div>
  );
};

export default StopTestIntermediatePopup; 