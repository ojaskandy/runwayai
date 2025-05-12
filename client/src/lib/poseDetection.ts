// Import TensorFlow.js and the pose-detection library
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

// Store detector instance
let detector: poseDetection.PoseDetector | null = null;
let modelConfig: poseDetection.MoveNetModelConfig = {
  modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
  enableSmoothing: true,
};

/**
 * Initialize the pose detection models
 */
export async function initPoseDetection(modelName: string = 'lightning') {
  try {
    console.log('Initializing pose detection with model:', modelName);
    
    // Clean up existing detector
    if (detector) {
      detector.dispose();
      detector = null;
    }
    
    // Make sure TensorFlow backend is initialized
    await tf.ready();
    
    // Ensure WebGL backend is set
    if (tf.getBackend() !== 'webgl') {
      console.log('Setting backend to WebGL');
      await tf.setBackend('webgl');
    }
    
    console.log('Current backend:', tf.getBackend());
    
    // Select model based on user preference
    switch (modelName) {
      case 'lightning':
        modelConfig.modelType = poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING;
        break;
      case 'thunder':
        modelConfig.modelType = poseDetection.movenet.modelType.SINGLEPOSE_THUNDER;
        break;
      case 'heavy':
        modelConfig.modelType = poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING;
        break;
      default:
        modelConfig.modelType = poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING;
    }
    
    console.log('Creating detector with model config:', modelConfig);
    
    // Create detector
    detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      modelConfig
    );
    
    console.log('Detector created successfully');
    return detector;
  } catch (error) {
    console.error('Error initializing pose detection:', error);
    throw error;
  }
}

/**
 * Get available models
 */
export function getModels() {
  return [
    { id: 'lightning', name: 'Lightning (Fast)' },
    { id: 'thunder', name: 'Thunder (Accurate)' },
    { id: 'heavy', name: 'Heavy (Most Accurate)' }
  ];
}

/**
 * Detect poses in an image/video frame
 */
export async function detectPoses(
  image: HTMLVideoElement | HTMLImageElement,
  maxPoses: number = 1,
  minConfidence: number = 0.5
) {
  if (!detector) {
    console.error('Detector not initialized. Call initPoseDetection first.');
    throw new Error('Detector not initialized. Call initPoseDetection first.');
  }
  
  // Check if the element is ready and has proper dimensions
  let isSourceReady = false;
  let sourceWidth = 0;
  let sourceHeight = 0;
  
  if (image instanceof HTMLVideoElement) {
    // For video, check readyState and dimensions
    isSourceReady = image.readyState >= 2;
    sourceWidth = image.videoWidth;
    sourceHeight = image.videoHeight;
    
    if (!isSourceReady) {
      console.log('Video not ready yet, waiting for metadata');
      return [];
    }
    
    if (sourceWidth === 0 || sourceHeight === 0) {
      console.log('Video dimensions are zero, cannot detect poses');
      return [];
    }
  } else if (image instanceof HTMLImageElement) {
    // For image, check if it's loaded and has dimensions
    isSourceReady = image.complete && image.naturalWidth > 0;
    sourceWidth = image.naturalWidth;
    sourceHeight = image.naturalHeight;
    
    if (!isSourceReady) {
      console.log('Image not fully loaded yet, waiting to complete');
      return [];
    }
    
    if (sourceWidth === 0 || sourceHeight === 0) {
      console.log('Image dimensions are zero, cannot detect poses');
      return [];
    }
  }
  
  try {
    // Log source dimensions for debugging
    console.log(`Source dimensions: ${sourceWidth}x${sourceHeight}`);
    
    // Run inference with enhanced settings for better detection
    console.log(`Running pose detection with maxPoses: ${maxPoses}, confidence: ${minConfidence}`);
    
    // Adjust estimation options based on source type
    const estimationOptions = {
      maxPoses,
      flipHorizontal: false,
      scoreThreshold: minConfidence * 0.7, // Lower internal threshold to get more keypoints
    };
    
    const poses = await detector.estimatePoses(image, estimationOptions);
    
    console.log(`Detected ${poses.length} poses with ${poses[0]?.keypoints.length || 0} keypoints`);
    
    // Apply more advanced filtering for better detection quality
    const filteredPoses = poses.map(pose => {
      // Keep more keypoints initially but with confidence scores
      const keypoints = pose.keypoints.filter(kp => 
        typeof kp.score === 'number' && kp.score > minConfidence * 0.8
      );
      
      // Log keypoint counts for debugging
      if (keypoints.length > 0) {
        const avgConfidence = keypoints.reduce((sum, kp) => sum + (kp.score || 0), 0) / keypoints.length;
        console.log(`Kept ${keypoints.length} keypoints with avg confidence: ${avgConfidence.toFixed(2)}`);
      }
      
      return {
        ...pose,
        keypoints
      };
    });
    
    return filteredPoses;
  } catch (error) {
    console.error('Error estimating poses:', error);
    throw error;
  }
}

/**
 * Get joint connections for visualization
 * @returns {Array<[string, string]>} An array of joint connections represented as [start, end] pairs
 */
export function getJointConnections(): Array<[string, string]> {
  return [
    // Torso
    ['left_shoulder', 'right_shoulder'],
    ['left_shoulder', 'left_hip'],
    ['right_shoulder', 'right_hip'],
    ['left_hip', 'right_hip'],
    // Arms
    ['left_shoulder', 'left_elbow'],
    ['left_elbow', 'left_wrist'],
    ['right_shoulder', 'right_elbow'],
    ['right_elbow', 'right_wrist'],
    // Legs
    ['left_hip', 'left_knee'],
    ['left_knee', 'left_ankle'],
    ['right_hip', 'right_knee'],
    ['right_knee', 'right_ankle'],
    // Face
    ['nose', 'left_eye'],
    ['nose', 'right_eye'],
    ['left_eye', 'left_ear'],
    ['right_eye', 'right_ear'],
  ] as Array<[string, string]>;
}
