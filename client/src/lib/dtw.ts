/**
 * Enhanced Dynamic Time Warping (DTW) algorithm implementation
 * Used for comparing movement sequences with timing variations and generating scores
 */

// Calculate Euclidean distance between two numbers
const euclideanDistance = (a: number, b: number): number => {
  return Math.abs(a - b);
};

/**
 * Advanced Dynamic Time Warping (DTW) algorithm
 * Compares two sequences and returns the minimum 'warping distance'
 * Also returns the warping path for visualization purposes
 */
export const dtw = (
  seriesA: number[], 
  seriesB: number[]
): { distance: number; path: Array<[number, number]>; normalizedDistance: number } => {
  if (seriesA.length === 0 || seriesB.length === 0) {
    return { 
      distance: Infinity, 
      path: [], 
      normalizedDistance: Infinity 
    };
  }
  
  const costMatrix: number[][] = [];
  const pathMatrix: Array<[number, number]>[][] = [];
  
  // Initialize cost matrix and path matrix
  for (let i = 0; i <= seriesA.length; i++) {
    costMatrix[i] = [];
    pathMatrix[i] = [];
    for (let j = 0; j <= seriesB.length; j++) {
      costMatrix[i][j] = Infinity;
      pathMatrix[i][j] = [];
    }
  }
  
  costMatrix[0][0] = 0;
  pathMatrix[0][0] = [];
  
  // Fill the cost matrix and track paths
  for (let i = 1; i <= seriesA.length; i++) {
    for (let j = 1; j <= seriesB.length; j++) {
      const cost = euclideanDistance(seriesA[i-1], seriesB[j-1]);
      
      // Find minimum cost step and get its path
      const options = [
        { cost: costMatrix[i-1][j], idx: [i-1, j] as [number, number] },     // Vertical move
        { cost: costMatrix[i][j-1], idx: [i, j-1] as [number, number] },     // Horizontal move
        { cost: costMatrix[i-1][j-1], idx: [i-1, j-1] as [number, number] }  // Diagonal move
      ];
      
      const minOption = options.reduce(
        (min, curr) => curr.cost < min.cost ? curr : min, 
        options[0]
      );
      
      // Update cost and path
      costMatrix[i][j] = cost + minOption.cost;
      
      // Copy the path from the minimum cost cell and add current position
      const newPath = [...pathMatrix[minOption.idx[0]][minOption.idx[1]]];
      newPath.push([i-1, j-1] as [number, number]);
      pathMatrix[i][j] = newPath;
    }
  }
  
  // Final path
  const optimalPath = pathMatrix[seriesA.length][seriesB.length];
  
  // Normalize by sequence length to make distances comparable
  const normalizedDistance = costMatrix[seriesA.length][seriesB.length] / 
                             Math.max(seriesA.length, seriesB.length);
  
  return {
    distance: costMatrix[seriesA.length][seriesB.length],
    path: optimalPath,
    normalizedDistance
  };
};

/**
 * Improved normalization with better edge case handling
 */
export const normalizeSequence = (sequence: number[]): number[] => {
  if (sequence.length === 0) return [];
  
  const validValues = sequence.filter(x => !isNaN(x) && isFinite(x));
  if (validValues.length === 0) return sequence.map(() => 0.5);
  
  const min = Math.min(...validValues);
  const max = Math.max(...validValues);
  
  // Handle edge cases better
  if (max === min) {
    const mid = max === 0 ? 0.5 : (max < 0 ? 0.25 : 0.75);
    return sequence.map(() => mid);
  }
  
  return sequence.map(value => {
    if (isNaN(value) || !isFinite(value)) return 0.5;
    return (value - min) / (max - min);
  });
};

/**
 * Advanced DTW comparison for angle sequences
 * Returns comprehensive analysis results for better visualization and understanding
 */
export const compareAnglesWithDTW = (
  userSequence: number[], 
  referenceSequence: number[],
  jointName: string = "unknown"
): {
  score: number;
  distance: number;
  path: Array<[number, number]>;
  alignment: { user: number; reference: number; distance: number }[];
  errorWindows: { start: number; end: number; avgError: number }[];
} => {
  if (userSequence.length < 3 || referenceSequence.length < 3) {
    console.log(`${jointName}: Insufficient data points`);
    return {
      score: 0, 
      distance: Infinity,
      path: [],
      alignment: [],
      errorWindows: []
    };
  }

  // Filter out invalid values and normalize
  const validUser = userSequence.filter(x => !isNaN(x) && isFinite(x));
  const validRef = referenceSequence.filter(x => !isNaN(x) && isFinite(x));

  if (validUser.length < 3 || validRef.length < 3) {
    console.log(`${jointName}: Invalid angle values filtered out`);
    return {
      score: 0, 
      distance: Infinity,
      path: [],
      alignment: [],
      errorWindows: []
    };
  }

  const normalizedUser = normalizeSequence(validUser);
  const normalizedRef = normalizeSequence(validRef);
  
  // Calculate DTW distance and get warping path
  const dtwResult = dtw(normalizedUser, normalizedRef);
  const { distance, path, normalizedDistance } = dtwResult;
  
  // Create alignment data for visualization
  const alignment = path.map(([userIdx, refIdx]) => ({
    user: validUser[userIdx],
    reference: validRef[refIdx],
    distance: Math.abs(validUser[userIdx] - validRef[refIdx])
  }));
  
  // Identify error windows (consecutive segments with high error)
  const errorThreshold = 15; // Degrees difference
  const minWindowSize = 3;   // Minimum consecutive points
  const errorWindows: { start: number; end: number; avgError: number }[] = [];
  
  let currentWindow: number[] = [];
  let windowStart = -1;
  
  alignment.forEach((point, idx) => {
    if (point.distance > errorThreshold) {
      if (windowStart === -1) windowStart = idx;
      currentWindow.push(point.distance);
    } else if (windowStart !== -1) {
      // Check if window is large enough
      if (currentWindow.length >= minWindowSize) {
        const avgError = currentWindow.reduce((sum, val) => sum + val, 0) / currentWindow.length;
        errorWindows.push({
          start: windowStart,
          end: idx - 1,
          avgError
        });
      }
      // Reset window
      currentWindow = [];
      windowStart = -1;
    }
  });
  
  // Handle case where error window ends at the end of the sequence
  if (windowStart !== -1 && currentWindow.length >= minWindowSize) {
    const avgError = currentWindow.reduce((sum, val) => sum + val, 0) / currentWindow.length;
    errorWindows.push({
      start: windowStart,
      end: alignment.length - 1,
      avgError
    });
  }
  
  // Improved score mapping using sigmoid function with adjusted parameters
  // for more sensitive scoring (lower distances result in higher scores)
  const score = Math.round(100 / (1 + Math.exp((normalizedDistance - 0.25) * 12)));
  
  // Log detailed comparison results
  console.log(`DTW Comparison for ${jointName}:`, {
    sequenceLengths: {
      user: userSequence.length,
      reference: referenceSequence.length,
      validUser: validUser.length,
      validRef: validRef.length
    },
    distance: normalizedDistance,
    score,
    errorWindows: errorWindows.length
  });

  return {
    score, 
    distance: normalizedDistance,
    path,
    alignment,
    errorWindows
  };
};
