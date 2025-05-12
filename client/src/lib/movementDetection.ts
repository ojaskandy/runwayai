/**
 * Enhanced movement detection utility functions
 * This file contains improved algorithms for detecting movement patterns
 * in pose sequences, using chronological sequence detection with time windows
 */

// Helper function to calculate angle between 3 points
export const calculateAngle = (
  a: {x: number, y: number}, 
  b: {x: number, y: number}, 
  c: {x: number, y: number}
): number => {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  if (angle > 180.0) angle = 360.0 - angle;
  return angle;
};

/**
 * Improved significant movement detection algorithm that:
 * 1. Detects movements based on joint angle changes (more reliable for martial arts)
 * 2. Uses a more forgiving threshold to catch subtle movements
 * 3. Focuses on key martial arts joints (knees, elbows, etc.)
 */
export const detectSignificantMovements = (poseHistory: any[]): number[] => {
  if (poseHistory.length < 3) return [];
  
  const movementTimes: number[] = [];
  const threshold = 0.08; // Slightly more sensitive movement threshold for martial arts
  const significantAngleChange = 15; // Degrees threshold for angle-based detection
  
  // Process each frame (skip first 2 to have previous frames for comparison)
  for (let i = 2; i < poseHistory.length; i++) {
    const prevPose = poseHistory[i-2].pose;
    const currentPose = poseHistory[i].pose;
    let hasSignificantMovement = false;
    
    if (!prevPose?.keypoints || !currentPose?.keypoints) continue;
    
    // 1. POSITION-BASED MOVEMENT DETECTION (overall body movement)
    let totalMovement = 0;
    let validPoints = 0;
    
    currentPose.keypoints.forEach((kp: any) => {
      const prevKp = prevPose.keypoints.find((p: any) => p.name === kp.name);
      if (prevKp && kp.score > 0.4 && prevKp.score > 0.4) {
        const xDiff = kp.x - prevKp.x;
        const yDiff = kp.y - prevKp.y;
        totalMovement += Math.sqrt(xDiff * xDiff + yDiff * yDiff);
        validPoints++;
      }
    });
    
    const avgMovement = validPoints > 0 ? totalMovement / validPoints : 0;
    
    // If significant overall movement detected
    if (avgMovement > threshold) {
      hasSignificantMovement = true;
    }
    
    // 2. ANGLE-BASED MOVEMENT DETECTION (more reliable for martial arts)
    if (!hasSignificantMovement) {
      // Key joints for Taekwondo: shoulders, elbows, knees, ankles
      const keyJoints = [
        // Arms
        {joint: "right_elbow", points: ["right_shoulder", "right_elbow", "right_wrist"]},
        {joint: "left_elbow", points: ["left_shoulder", "left_elbow", "left_wrist"]},
        // Legs
        {joint: "right_knee", points: ["right_hip", "right_knee", "right_ankle"]},
        {joint: "left_knee", points: ["left_hip", "left_knee", "left_ankle"]}
      ];
      
      // Check each joint for significant angle changes
      for (const jointConfig of keyJoints) {
        const currentPoints = jointConfig.points.map(name => 
          currentPose.keypoints.find((kp: any) => kp.name === name)
        );
        
        const prevPoints = jointConfig.points.map(name => 
          prevPose.keypoints.find((kp: any) => kp.name === name)
        );
        
        // Only calculate if we have all points with good confidence
        if (currentPoints.every(p => p && p.score > 0.4) && 
            prevPoints.every(p => p && p.score > 0.4)) {
          
          // Calculate angles
          const currentAngle = calculateAngle(
            {x: currentPoints[0].x, y: currentPoints[0].y},
            {x: currentPoints[1].x, y: currentPoints[1].y},
            {x: currentPoints[2].x, y: currentPoints[2].y}
          );
          
          const prevAngle = calculateAngle(
            {x: prevPoints[0].x, y: prevPoints[0].y},
            {x: prevPoints[1].x, y: prevPoints[1].y},
            {x: prevPoints[2].x, y: prevPoints[2].y}
          );
          
          // Check if angle changed significantly
          const angleDiff = Math.abs(currentAngle - prevAngle);
          if (angleDiff > significantAngleChange) {
            hasSignificantMovement = true;
            break;
          }
        }
      }
    }
    
    // If we detected significant movement, record the timestamp
    if (hasSignificantMovement) {
      movementTimes.push(poseHistory[i].timestamp);
    }
  }
  
  return movementTimes;
};

/**
 * Detect pauses/gaps in movement
 * Identifies periods where the user stopped moving for longer than 500ms
 */
export const detectMovementGaps = (poseHistory: any[]): {start: number, end: number}[] => {
  if (poseHistory.length < 5) return [];
  
  const gaps: {start: number, end: number}[] = [];
  const stillnessThreshold = 0.05;
  let gapStart = -1;
  
  for (let i = 2; i < poseHistory.length - 2; i++) {
    const prevPose = poseHistory[i-2].pose;
    const currentPose = poseHistory[i].pose;
    
    // Calculate movement magnitude
    let totalMovement = 0;
    let validPoints = 0;
    
    if (prevPose.keypoints && currentPose.keypoints) {
      currentPose.keypoints.forEach((kp: any) => {
        const prevKp = prevPose.keypoints.find((p: any) => p.name === kp.name);
        if (prevKp && kp.score > 0.5 && prevKp.score > 0.5) {
          const xDiff = kp.x - prevKp.x;
          const yDiff = kp.y - prevKp.y;
          totalMovement += Math.sqrt(xDiff * xDiff + yDiff * yDiff);
          validPoints++;
        }
      });
    }
    
    const avgMovement = validPoints > 0 ? totalMovement / validPoints : 0;
    
    // Detect start of a gap (stillness period)
    if (avgMovement < stillnessThreshold && gapStart === -1) {
      gapStart = poseHistory[i].timestamp;
    } 
    // Detect end of a gap
    else if (avgMovement >= stillnessThreshold && gapStart !== -1) {
      gaps.push({
        start: gapStart,
        end: poseHistory[i-1].timestamp
      });
      gapStart = -1;
    }
  }
  
  // Close any open gap at the end
  if (gapStart !== -1) {
    gaps.push({
      start: gapStart,
      end: poseHistory[poseHistory.length - 1].timestamp
    });
  }
  
  // Only count gaps longer than 500ms
  return gaps.filter(gap => gap.end - gap.start > 500);
};

/**
 * Sequence matching with time-tolerant window
 * Allows for more forgiving pose matching by looking at movements within a 300ms window
 */
export const matchSequenceWithTolerance = (
  userMovements: number[], 
  referenceMovements: number[],
  toleranceWindow = 300 // milliseconds
) => {
  let delaySum = 0;
  let matchedMovements = 0;
  const matchedDelays: number[] = [];
  
  // Process each user movement
  for (let i = 0; i < userMovements.length; i++) {
    // Find the closest reference movement time
    let closestRefIdx = -1;
    let minTimeDiff = Number.MAX_VALUE;
    
    for (let j = 0; j < referenceMovements.length; j++) {
      const timeDiff = Math.abs(userMovements[i] - referenceMovements[j]);
      
      // If this reference movement is closer than the current closest
      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        closestRefIdx = j;
      }
    }
    
    // Only count as matched if within our matching window
    if (closestRefIdx >= 0 && minTimeDiff <= toleranceWindow) {
      // Calculate actual delay (can be negative if user is ahead)
      const delay = userMovements[i] - referenceMovements[closestRefIdx];
      matchedDelays.push(delay);
      delaySum += delay;
      matchedMovements++;
    }
  }
  
  const avgDelay = matchedMovements > 0 ? delaySum / matchedMovements : 0;
  
  // Calculate consistency of delay direction
  let positiveDelayCount = 0;
  let negativeDelayCount = 0;
  
  matchedDelays.forEach(delay => {
    if (delay > 0) positiveDelayCount++;
    else if (delay < 0) negativeDelayCount++;
  });
  
  const delayPercentage = matchedDelays.length > 0 ? 
    Math.max(positiveDelayCount, negativeDelayCount) / matchedDelays.length : 0;
  
  const hasConsistentDirection = delayPercentage >= 0.7; // 70% threshold for consistency
  const significantDelay = Math.abs(avgDelay) > 300;
  
  return {
    avgDelay,
    matchedMovements,
    totalMovements: Math.max(userMovements.length, referenceMovements.length),
    matchQuality: matchedMovements / Math.max(userMovements.length, referenceMovements.length, 1),
    hasConsistentDirection,
    significantDelay,
    hasTimingIssue: significantDelay && hasConsistentDirection,
    direction: avgDelay > 0 ? 'behind' : 'ahead',
    matchedDelays
  };
};