export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  // Basic check for mobile user agent or touch screen with small width
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  const isMobileUA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
  
  // Consider very small screen widths as potentially mobile, even if UA is not explicitly mobile (e.g., some tablets in portrait)
  // However, primary reliance is on UA, then refine with screen width if needed.
  // For this specific request, we are targeting phones primarily.
  // Tablets might be okay, so we won't be too aggressive with screen width alone.
  const isSmallScreen = window.innerWidth < 768; // Common breakpoint for tablets

  // If it's an iPad, we consider it a tablet, not a "mobile device" for this warning's purpose
  if (/ipad/i.test(userAgent.toLowerCase())) {
    return false;
  }

  // If it has a mobile UA AND is a small screen, it's very likely a phone.
  // If it's just a mobile UA (could be a tablet), we still flag it.
  // If it's just a small screen (could be a small laptop window), we don't flag it unless UA also suggests mobile.
  return isMobileUA;
}; 