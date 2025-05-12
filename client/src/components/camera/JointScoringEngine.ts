import { calculateAngle } from './utils';

export type JointScore = {
  joint: string;
  score: number;
  severity?: 'good' | 'fair' | 'poor' | 'bad';
  direction?: {
    x: string;
    y: string;
    xMagnitude: number;
    yMagnitude: number;
  };
};

export const angleJoints = [
  'left_elbow', 'right_elbow',
  'left_shoulder', 'right_shoulder', 
  'left_wrist', 'right_wrist',
  'left_hip', 'right_hip',
  'left_knee', 'right_knee',
  'left_ankle', 'right_ankle'
];

export const getConnectedJoint = (jointName: string, position: 'start' | 'end'): string => {
  const jointMap: Record<string, { start: string; end: string }> = {
    'left_elbow': { start: 'left_shoulder', end: 'left_wrist' },
    'right_elbow': { start: 'right_shoulder', end: 'right_wrist' },
    'left_shoulder': { start: 'left_hip', end: 'left_elbow' },
    'right_shoulder': { start: 'right_hip', end: 'right_elbow' },
    'left_wrist': { start: 'left_elbow', end: 'left_index' },
    'right_wrist': { start: 'right_elbow', end: 'right_index' },
    'left_knee': { start: 'left_hip', end: 'left_ankle' },
    'right_knee': { start: 'right_hip', end: 'right_ankle' },
    'left_ankle': { start: 'left_knee', end: 'left_foot_index' },
    'right_ankle': { start: 'right_knee', end: 'right_foot_index' },
    'left_hip': { start: 'left_knee', end: 'left_shoulder' },
    'right_hip': { start: 'right_knee', end: 'right_shoulder' }
  };
  
  return jointMap[jointName]?.[position] || jointName;
};

export const calculateJointAngles = (pose: any) => {
  if (!pose || !pose.keypoints) return {};
  
  const keypointMap = new Map();
  pose.keypoints.forEach((kp: any) => {
    if (kp.score > 0.1) {
      keypointMap.set(kp.name, kp);
    }
  });
  
  const angles: Record<string, number> = {};
  
  angleJoints.forEach(jointName => {
    const joint = keypointMap.get(jointName);
    if (!joint) return;
    
    const startJointName = getConnectedJoint(jointName, 'start');
    const endJointName = getConnectedJoint(jointName, 'end');
    
    const startJoint = keypointMap.get(startJointName);
    const endJoint = keypointMap.get(endJointName);
    
    if (joint && startJoint && endJoint && 
        joint.score > 0.1 && startJoint.score > 0.1 && endJoint.score > 0.1) {
      const angle = calculateAngle(
        { x: startJoint.x, y: startJoint.y }, 
        { x: joint.x, y: joint.y }, 
        { x: endJoint.x, y: endJoint.y }
      );
      angles[jointName] = angle;
    }
  });
  
  return angles;
};
