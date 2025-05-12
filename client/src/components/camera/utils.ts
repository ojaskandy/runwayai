
export const calculateAngle = (
  a: { x: number, y: number }, 
  b: { x: number, y: number }, 
  c: { x: number, y: number }
): number => {
  const vectorBA = {x: a.x - b.x, y: a.y - b.y};
  const vectorBC = {x: c.x - b.x, y: c.y - b.y};
  
  const dotProduct = (vectorBA.x * vectorBC.x) + (vectorBA.y * vectorBC.y);
  const magnitudeBA = Math.sqrt(vectorBA.x * vectorBA.x + vectorBA.y * vectorBA.y);
  const magnitudeBC = Math.sqrt(vectorBC.x * vectorBC.x + vectorBC.y * vectorBC.y);
  
  let angleRadians = Math.acos(dotProduct / (magnitudeBA * magnitudeBC));
  let angleDegrees = (angleRadians * 180) / Math.PI;
  
  return isNaN(angleDegrees) ? 0 : Math.round(angleDegrees);
};

export const isVideoUrl = (url: string): boolean => {
  if (url?.includes('#video')) return true;
  if (url?.startsWith('blob:') && url?.includes('video')) return true;
  if (url?.match(/\.(mp4|mov|webm|avi|wmv|flv|mkv)$/i)) return true;
  return false;
};
