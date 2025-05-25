/**
 * FastDTW - Faster implementation of Dynamic Time Warping 
 * Based on the paper "FastDTW: Toward Accurate Dynamic Time Warping in Linear Time and Space"
 * by Stan Salvador & Philip Chan
 */

/**
 * Calculate Euclidean distance between two vectors
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  
  return Math.sqrt(sum);
}

/**
 * Standard DTW implementation
 * @param seriesA First time series
 * @param seriesB Second time series
 * @param distFn Distance function to use
 * @returns Object containing minimum distance and warping path
 */
function dtw(
  seriesA: number[][],
  seriesB: number[][],
  distFn: (a: number[], b: number[]) => number
): { distance: number; path: Array<[number, number]> } {
  const m = seriesA.length;
  const n = seriesB.length;
  
  // Initialize cost matrix
  const cost: number[][] = Array(m + 1)
    .fill(0)
    .map(() => Array(n + 1).fill(Infinity));
  cost[0][0] = 0;
  
  // Fill the cost matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const d = distFn(seriesA[i-1], seriesB[j-1]);
      cost[i][j] = d + Math.min(
        cost[i-1][j],   // insertion
        cost[i][j-1],   // deletion
        cost[i-1][j-1]  // match
      );
    }
  }
  
  // Build the warping path
  const path: Array<[number, number]> = [];
  let i = m;
  let j = n;
  
  path.push([i-1, j-1]);
  
  while (i > 1 || j > 1) {
    const options = [];
    if (i > 1 && j > 1) options.push([cost[i-1][j-1], i-1, j-1]);
    if (i > 1) options.push([cost[i-1][j], i-1, j]);
    if (j > 1) options.push([cost[i][j-1], i, j-1]);
    
    const [_, nextI, nextJ] = options.reduce(
      (min, current) => current[0] < min[0] ? current : min,
      options[0]
    );
    
    i = nextI;
    j = nextJ;
    path.push([i-1, j-1]);
  }
  
  return {
    distance: cost[m][n],
    path: path.reverse()
  };
}

/**
 * Reduce a time series by a factor of 2
 * @param series The time series to reduce
 * @returns Reduced time series
 */
function reduceByHalf(series: number[][]): number[][] {
  if (series.length <= 2) return series;
  
  const result: number[][] = [];
  
  for (let i = 0; i < series.length - 1; i += 2) {
    const avgVector = series[i].map((val, idx) => {
      return (val + series[i+1][idx]) / 2;
    });
    result.push(avgVector);
  }
  
  // If odd length, add the last element
  if (series.length % 2 !== 0) {
    result.push(series[series.length - 1]);
  }
  
  return result;
}

/**
 * Expand a low-resolution warping path to a higher resolution
 * @param path The low-resolution path
 * @param m Length of first series at higher resolution
 * @param n Length of second series at higher resolution
 * @returns Expanded path
 */
function expandPath(
  path: Array<[number, number]>,
  m: number,
  n: number
): Array<[number, number]> {
  const expanded: Array<[number, number]> = [];
  
  for (let i = 0; i < path.length; i++) {
    const [lowI, lowJ] = path[i];
    const highI = lowI * 2;
    const highJ = lowJ * 2;
    
    expanded.push([Math.min(highI, m-1), Math.min(highJ, n-1)]);
    
    // Add additional points if we're not at the boundaries
    if (highI + 1 < m && highJ + 1 < n) {
      expanded.push([highI + 1, highJ + 1]);
    } else if (highI + 1 < m) {
      expanded.push([highI + 1, Math.min(highJ + 1, n-1)]);
    } else if (highJ + 1 < n) {
      expanded.push([Math.min(highI + 1, m-1), highJ + 1]);
    }
  }
  
  // Remove duplicates
  const uniquePath: Array<[number, number]> = [];
  const seen = new Set<string>();
  
  for (const point of expanded) {
    const key = `${point[0]},${point[1]}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniquePath.push(point);
    }
  }
  
  return uniquePath.sort((a, b) => {
    if (a[0] !== b[0]) return a[0] - b[0];
    return a[1] - b[1];
  });
}

/**
 * Limit a window of search by path constraints
 * @param path The expanded path
 * @param radius The radius constraint
 * @param m Length of first series
 * @param n Length of second series
 * @returns Window of cells to search
 */
function constrainWindow(
  path: Array<[number, number]>,
  radius: number,
  m: number,
  n: number
): Set<string> {
  const window = new Set<string>();
  
  for (const [i, j] of path) {
    for (let ii = Math.max(0, i - radius); ii <= Math.min(m - 1, i + radius); ii++) {
      for (let jj = Math.max(0, j - radius); jj <= Math.min(n - 1, j + radius); jj++) {
        window.add(`${ii},${jj}`);
      }
    }
  }
  
  return window;
}

/**
 * FastDTW algorithm implementation
 * @param seriesA First time series (2D array where each element is a vector)
 * @param seriesB Second time series (2D array where each element is a vector)
 * @param distFn Distance function to compare two vectors
 * @param radius Radius for approximation window (larger values = more accurate but slower)
 * @returns Object with distance and warping path
 */
export function fastdtw(
  seriesA: number[][],
  seriesB: number[][],
  distFn: (a: number[], b: number[]) => number = euclideanDistance,
  radius: number = 1
): { distance: number; path: Array<[number, number]> } {
  const m = seriesA.length;
  const n = seriesB.length;
  
  // Base case: if series are very short, use standard DTW
  if (m <= radius + 2 || n <= radius + 2) {
    return dtw(seriesA, seriesB, distFn);
  }
  
  // Recursive case: reduce resolution, solve the smaller problem
  const reducedA = reduceByHalf(seriesA);
  const reducedB = reduceByHalf(seriesB);
  
  // Get low-resolution path
  const { path: lowResPath } = fastdtw(reducedA, reducedB, distFn, radius);
  
  // Expand path to higher resolution
  const expandedPath = expandPath(lowResPath, m, n);
  
  // Create constrained window
  const window = constrainWindow(expandedPath, radius, m, n);
  
  // Run constrained DTW on the window
  const cost: number[][] = Array(m + 1)
    .fill(0)
    .map(() => Array(n + 1).fill(Infinity));
  cost[0][0] = 0;
  
  // Fill the cost matrix for cells in the window
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (!window.has(`${i-1},${j-1}`)) continue;
      
      const d = distFn(seriesA[i-1], seriesB[j-1]);
      cost[i][j] = d + Math.min(
        cost[i-1][j],   // insertion
        cost[i][j-1],   // deletion
        cost[i-1][j-1]  // match
      );
    }
  }
  
  // Build the warping path
  const path: Array<[number, number]> = [];
  let i = m;
  let j = n;
  
  path.push([i-1, j-1]);
  
  while (i > 1 || j > 1) {
    const options = [];
    if (i > 1 && j > 1) options.push([cost[i-1][j-1], i-1, j-1]);
    if (i > 1) options.push([cost[i-1][j], i-1, j]);
    if (j > 1) options.push([cost[i][j-1], i, j-1]);
    
    const [_, nextI, nextJ] = options.reduce(
      (min, current) => current[0] < min[0] ? current : min,
      options[0]
    );
    
    i = nextI;
    j = nextJ;
    path.push([i-1, j-1]);
  }
  
  return {
    distance: cost[m][n],
    path: path.reverse()
  };
}

/**
 * Compare two angle sequences using FastDTW and compute a similarity score
 * @param instructorAngles Array of instructor angle vectors
 * @param userAngles Array of user angle vectors
 * @returns Object with overall score and per-frame scores
 */
export function compareRoutines(
  instructorAngles: number[][],
  userAngles: number[][],
  radius: number = 5
): {
  overallScore: number;
  perFrameScores: number[];
  jointErrors: number[];
  alignmentPath: Array<[number, number]>;
} {
  // If either array is empty, return default values
  if (instructorAngles.length === 0 || userAngles.length === 0) {
    return {
      overallScore: 0,
      perFrameScores: [],
      jointErrors: [],
      alignmentPath: []
    };
  }

  // Compute FastDTW alignment
  const { path, distance } = fastdtw(instructorAngles, userAngles, euclideanDistance, radius);
  
  const numJoints = instructorAngles[0]?.length || 0;
  const jointErrors = Array(numJoints).fill(0);
  const similarityScores: number[] = [];
  
  // Calculate per-frame similarity scores and joint errors
  for (const [i, j] of path) {
    const instructorVector = instructorAngles[i];
    const userVector = userAngles[j];
    
    // Calculate average error across all joints for this frame
    let totalError = 0;
    
    for (let k = 0; k < numJoints; k++) {
      const error = Math.abs(instructorVector[k] - userVector[k]);
      totalError += error;
      jointErrors[k] += error;
    }
    
    const avgError = totalError / numJoints;
    
    // Convert to similarity score (0-1 range)
    // Angle differences up to 180 degrees, but typically much less in practical scenarios
    const similarity = 1 - Math.min(avgError / 180, 1);
    similarityScores.push(similarity);
  }
  
  // Normalize joint errors by the path length
  for (let i = 0; i < numJoints; i++) {
    jointErrors[i] = jointErrors[i] / path.length;
  }
  
  // Calculate overall score (average of per-frame scores, converted to 0-100 range)
  const avgSimilarity = similarityScores.reduce((sum, score) => sum + score, 0) / similarityScores.length;
  const overallScore = Math.round(avgSimilarity * 100);
  
  return {
    overallScore,
    perFrameScores: similarityScores,
    jointErrors,
    alignmentPath: path
  };
} 