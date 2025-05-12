export type CameraFacing = 'user' | 'environment';

/**
 * Request camera permission from the user
 */
export async function requestCameraPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    // Stop the stream immediately after getting permission
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('Error requesting camera permission:', error);
    return false;
  }
}

/**
 * Get a camera stream with specified facing mode
 */
export async function getCameraStream(facingMode: CameraFacing = 'user'): Promise<MediaStream> {
  try {
    // First check if we can get the specific facing mode
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode
        }
      });
      return stream;
    } catch {
      // If specific facing mode fails, try to get any camera
      console.warn(`Couldn't get ${facingMode} camera, trying default camera`);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true
      });
      return stream;
    }
  } catch (error) {
    console.error('Error getting camera stream:', error);
    throw error;
  }
}

/**
 * Check if device has multiple cameras
 */
export async function hasMultipleCameras(): Promise<boolean> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    return false;
  }
  
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    return videoDevices.length > 1;
  } catch (error) {
    console.error('Error checking for multiple cameras:', error);
    return false;
  }
}
