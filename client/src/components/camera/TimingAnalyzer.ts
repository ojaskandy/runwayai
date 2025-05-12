
export type TimingIssues = {
  delays: boolean;
  gaps: boolean;
  speed: 'good' | 'slow' | 'fast';
};

export const detectSignificantMovements = (poseHistory: any[]): number[] => {
  if (poseHistory.length < 3) return [];
  
  const movementTimes: number[] = [];
  const threshold = 0.08;
  const angleHistory: {[joint: string]: number[]} = {};
  const significantAngleChange = 15;
  
  for (let i = 2; i < poseHistory.length; i++) {
    const prevPose = poseHistory[i-2].pose;
    const currentPose = poseHistory[i].pose;
    let significantMovement = false;
    
    if (prevPose?.keypoints && currentPose?.keypoints) {
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
      
      if (avgMovement > threshold) {
        significantMovement = true;
      }
    }
    
    if (significantMovement) {
      movementTimes.push(poseHistory[i].timestamp);
    }
  }
  
  return movementTimes;
};

export const detectMovementGaps = (poseHistory: any[]): {start: number, end: number}[] => {
  if (poseHistory.length < 5) return [];
  
  const gaps: {start: number, end: number}[] = [];
  const stillnessThreshold = 0.05;
  let gapStart = -1;
  
  for (let i = 2; i < poseHistory.length - 2; i++) {
    const prevPose = poseHistory[i-2].pose;
    const currentPose = poseHistory[i].pose;
    
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
    
    if (avgMovement < stillnessThreshold && gapStart === -1) {
      gapStart = poseHistory[i].timestamp;
    } else if (avgMovement >= stillnessThreshold && gapStart !== -1) {
      gaps.push({
        start: gapStart,
        end: poseHistory[i-1].timestamp
      });
      gapStart = -1;
    }
  }
  
  if (gapStart !== -1) {
    gaps.push({
      start: gapStart,
      end: poseHistory[poseHistory.length - 1].timestamp
    });
  }
  
  return gaps.filter(gap => gap.end - gap.start > 500);
};
