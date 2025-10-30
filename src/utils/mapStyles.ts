/**
 * Generate responsive map container style
 * @param isMobile - Whether the device is mobile
 * @param screenHeight - Current screen height in pixels
 * @param customBackground - Optional custom background gradient
 * @returns CSS style object for map container
 */
export const getMapContainerStyle = (
  isMobile: boolean,
  screenHeight: number,
  customBackground?: string
): React.CSSProperties => {
  return {
    position: 'relative',
    width: '100%',
    height: isMobile ? `${screenHeight}px` : 'auto',
    minHeight: isMobile ? `${screenHeight}px` : '600px',
    background: customBackground || 'linear-gradient(135deg, rgba(13,0,25,0.95), rgba(26,0,51,0.95))',
    overflow: 'hidden'
  };
};
