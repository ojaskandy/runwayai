
/**
 * Dynamic Time Warping (DTW) algorithm implementation
 * Used for comparing movement sequences with timing variations
 */

// Calculate Euclidean distance between two numbers
const euclideanDistance = (a: number, b: number): number => {
  return Math.abs(a - b);
};

/**
 * Dynamic Time Warping (DTW) algorithm
 * Compares two sequences and returns the minimum 'warping distance'
 */
export const dtw = (seriesA: number[], seriesB: number[]): number => {
  if (seriesA.length === 0 || seriesB.length === 0) {
    return Infinity;
  }
  
  const costMatrix: number[][] = [];
  
  for (let i = 0; i <= seriesA.length; i++) {
    costMatrix[i] = [];
    for (let j = 0; j <= seriesB.length; j++) {
      costMatrix[i][j] = Infinity;
    }
  }
  
  costMatrix[0][0] = 0;
  
  for (let i = 1; i <= seriesA.length; i++) {
    for (let j = 1; j <= seriesB.length; j++) {
      const cost = euclideanDistance(seriesA[i-1], seriesB[j-1]);
      costMatrix[i][j] = cost + Math.min(
        costMatrix[i-1][j],
        costMatrix[i][j-1],
        costMatrix[i-1][j-1]
      );
    }
  }

  // Normalize by sequence length to make distances comparable
  return costMatrix[seriesA.length][seriesB.length] / Math.max(seriesA.length, seriesB.length);
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
 * Improved DTW comparison with better score mapping and logging
 */
export const compareAnglesWithDTW = (
  userSequence: number[], 
  referenceSequence: number[],
  jointName: string = "unknown" // Added parameter for logging
): {score: number, distance: number} => {
  if (userSequence.length < 3 || referenceSequence.length < 3) {
    console.log(`${jointName}: Insufficient data points`);
    return {score: 0, distance: Infinity};
  }

  // Filter out invalid values and normalize
  const validUser = userSequence.filter(x => !isNaN(x) && isFinite(x));
  const validRef = referenceSequence.filter(x => !isNaN(x) && isFinite(x));

  if (validUser.length < 3 || validRef.length < 3) {
    console.log(`${jointName}: Invalid angle values filtered out`);
    return {score: 0, distance: Infinity};
  }

  const normalizedUser = normalizeSequence(validUser);
  const normalizedRef = normalizeSequence(validRef);
  
  // Calculate DTW distance
  const distance = dtw(normalizedUser, normalizedRef);
  
  // Improved score mapping using sigmoid function
  const score = Math.round(100 / (1 + Math.exp((distance - 0.3) * 10)));
  
  // Log detailed comparison results
  console.log(`DTW Comparison for ${jointName}:`, {
    sequenceLengths: {
      user: userSequence.length,
      reference: referenceSequence.length,
      validUser: validUser.length,
      validRef: validRef.length
    },
    distance,
    score
  });

  return {score, distance};
};
