import React, { useMemo } from 'react';
import DTW from 'dtw';

interface AngleDataTableProps {
  timestamps: string[];
  angles: { [joint: string]: number[] };
}

const AngleDataTable: React.FC<AngleDataTableProps> = ({ timestamps, angles }) => {
  if (!timestamps || timestamps.length === 0) {
    return <p className="text-gray-400 text-center py-4">No angle data available.</p>;
  }

  const jointNames = Object.keys(angles);

  return (
    <div className="mb-6 overflow-x-auto">
      <h4 className="text-white font-medium mb-2">Joint Angle Data</h4>
      <div className="max-h-[400px] overflow-y-auto">
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
                    {angles[joint]?.[idx]?.toFixed(1) || '0'}°
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

interface TestResultsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  userAngleData: {
    timestamps: string[];
    angles: { [joint: string]: number[] };
  };
  referenceAngleData: {
    timestamps: string[];
    angles: { [joint: string]: number[] };
  };
}

const AngleComparisonTableDTW: React.FC<{
  timestamps: string[];
  userAngles: { [joint: string]: number[] };
  referenceAngles: { [joint: string]: number[] };
}> = ({ timestamps, userAngles, referenceAngles }) => {
  if (!timestamps || timestamps.length === 0) {
    return <p className="text-gray-400 text-center py-4">No timestamp data available for comparison.</p>;
  }
  const userJoints = Object.keys(userAngles);
  const refJoints = Object.keys(referenceAngles);
  const allJoints = Array.from(new Set([...userJoints, ...refJoints])).filter(joint =>
    userAngles[joint]?.length && referenceAngles[joint]?.length
  );
  if (allJoints.length === 0) {
    return <p className="text-gray-400 text-center py-4">No matching joint data available for comparison.</p>;
  }
  function computeDTWScore(userSeq: number[], refSeq: number[]) {
    const dtw = new DTW();
    const cost = dtw.compute(userSeq, refSeq);
    const maxPossible = Math.max(userSeq.length, refSeq.length) * 180;
    const score = Math.max(0, 100 - (cost / maxPossible) * 100);
    return { cost, score: Math.round(score) };
  }
  const jointResults = allJoints.map(joint => {
    const userSeq = userAngles[joint] || [];
    const refSeq = referenceAngles[joint] || [];
    return { joint, ...computeDTWScore(userSeq, refSeq) };
  });
  const overallScore = jointResults.length ? Math.round(jointResults.reduce((sum, j) => sum + j.score, 0) / jointResults.length) : 0;
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-white font-semibold text-lg">DTW Comparison Analysis</h4>
        <div className="bg-gray-800 px-3 py-1 rounded-full">
          <span className="text-gray-300 text-sm mr-2">Overall DTW Score:</span>
          <span className={`font-bold text-lg ${
            overallScore >= 85 ? 'text-green-500' : 
            overallScore >= 70 ? 'text-yellow-400' : 
            overallScore >= 50 ? 'text-orange-500' : 
            'text-red-500'
          }`}>{overallScore}%</span>
        </div>
      </div>
      <div className="text-xs text-gray-300 mb-3 flex flex-wrap gap-2">
        <span className="inline-block px-2 py-1 bg-gray-800 rounded">Excellent: ≥90%</span>
        <span className="inline-block px-2 py-1 bg-gray-800 rounded">Good: 70-89%</span>
        <span className="inline-block px-2 py-1 bg-gray-800 rounded">Fair: 50-69%</span>
        <span className="inline-block px-2 py-1 bg-gray-800 rounded">Poor: &lt;50%</span>
      </div>
      <div className="bg-gray-800/50 p-1 rounded-lg shadow-inner">
        <div className="max-h-[400px] overflow-y-auto styled-scrollbar">
          <table className="min-w-full text-sm text-left text-gray-300">
            <thead className="text-xs text-gray-400 uppercase bg-gray-800 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Joint</th>
                <th className="px-4 py-3 whitespace-nowrap">DTW Score</th>
                <th className="px-4 py-3 whitespace-nowrap">DTW Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {jointResults.map(({ joint, score, cost }) => {
                let scoreColor = '';
                if (score >= 90) scoreColor = 'text-green-500';
                else if (score >= 70) scoreColor = 'text-yellow-400';
                else if (score >= 50) scoreColor = 'text-orange-500';
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
    </div>
  );
};

const TestResultsPopup: React.FC<TestResultsPopupProps> = ({
  isOpen,
  onClose,
  userAngleData,
  referenceAngleData,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 p-6 rounded-xl shadow-2xl w-full max-w-4xl border border-red-600/50 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-semibold text-white">Test Results</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <span className="material-icons">close</span>
          </button>
        </div>
        {/* Your Angles Table */}
        <div className="mb-8">
          <h4 className="text-xl font-semibold text-white mb-4">Your Joint Angles</h4>
          <AngleDataTable
            timestamps={userAngleData.timestamps}
            angles={userAngleData.angles}
          />
        </div>
        {/* Reference Angles Table */}
        <div className="mb-8">
          <h4 className="text-xl font-semibold text-white mb-4">Instructor Joint Angles</h4>
          <AngleDataTable
            timestamps={referenceAngleData.timestamps}
            angles={referenceAngleData.angles}
          />
        </div>
        {/* Comparison Section */}
        <div className="mb-8">
          <h4 className="text-xl font-semibold text-white mb-4">Comparison Analysis (DTW)</h4>
          <p className="text-gray-300 mb-4">
            This analysis uses Dynamic Time Warping (DTW) to compare your movement with the instructor's, providing a robust score for each joint and overall. Lower DTW cost and higher score means your movement closely matches the instructor.
          </p>
          <AngleComparisonTableDTW
            timestamps={userAngleData.timestamps}
            userAngles={userAngleData.angles}
            referenceAngles={referenceAngleData.angles}
          />
        </div>
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestResultsPopup; 