import { useRef, useCallback, useEffect } from 'react';

interface Use3DTiltOptions {
  maxTilt?: number;
  scale?: number;
  speed?: number;
  glowColor?: string;
  disabled?: boolean;
  /** Enable touch support with press effect (default: true) */
  enableTouch?: boolean;
}

/**
 * Detect if device supports touch
 */
const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

interface TiltValues {
  tiltX: number;
  tiltY: number;
  percentX: number;
  percentY: number;
}

/**
 * Hook for 3D tilt effect with dynamic glow
 * Creates a premium parallax effect that follows mouse movement
 */
export function use3DTilt<T extends HTMLElement = HTMLDivElement>(
  options: Use3DTiltOptions = {}
) {
  const {
    maxTilt = 15,
    scale = 1.02,
    speed = 400,
    glowColor = 'rgba(232, 121, 249, 0.4)',
    disabled = false,
    enableTouch = true,
  } = options;

  const isTouch = isTouchDevice();

  const ref = useRef<T>(null);
  const animationRef = useRef<number | null>(null);

  const updateTransform = useCallback(
    (element: T, values: TiltValues) => {
      const { tiltX, tiltY, percentX, percentY } = values;

      // Apply 3D transform
      element.style.transform = `
        perspective(1000px)
        rotateX(${tiltX}deg)
        rotateY(${tiltY}deg)
        scale3d(${scale}, ${scale}, ${scale})
      `;

      // Dynamic glow position based on mouse
      const glowX = 50 + (percentX - 50) * 0.5;
      const glowY = 50 + (percentY - 50) * 0.5;

      element.style.setProperty('--glow-x', `${glowX}%`);
      element.style.setProperty('--glow-y', `${glowY}%`);
      element.style.setProperty('--glow-color', glowColor);
    },
    [scale, glowColor]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (disabled || !ref.current) return;

      const element = ref.current;
      const rect = element.getBoundingClientRect();

      // Calculate mouse position relative to element (0-100%)
      const percentX = ((e.clientX - rect.left) / rect.width) * 100;
      const percentY = ((e.clientY - rect.top) / rect.height) * 100;

      // Calculate tilt angles
      const tiltX = ((percentY - 50) / 50) * -maxTilt;
      const tiltY = ((percentX - 50) / 50) * maxTilt;

      // Cancel previous animation frame
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      // Schedule transform update
      animationRef.current = requestAnimationFrame(() => {
        updateTransform(element, { tiltX, tiltY, percentX, percentY });
      });
    },
    [disabled, maxTilt, updateTransform]
  );

  const handleMouseEnter = useCallback(() => {
    if (disabled || !ref.current) return;

    const element = ref.current;
    element.style.transition = `transform ${speed}ms cubic-bezier(0.03, 0.98, 0.52, 0.99)`;
    element.classList.add('card-tilt-active');
  }, [disabled, speed]);

  const handleMouseLeave = useCallback(() => {
    if (disabled || !ref.current) return;

    const element = ref.current;

    // Reset transform smoothly
    element.style.transform = `
      perspective(1000px)
      rotateX(0deg)
      rotateY(0deg)
      scale3d(1, 1, 1)
    `;

    element.style.setProperty('--glow-x', '50%');
    element.style.setProperty('--glow-y', '50%');
    element.classList.remove('card-tilt-active');

    // Cancel any pending animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, [disabled]);

  // Touch handlers for mobile
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || !ref.current || !enableTouch) return;

      const element = ref.current;
      const touch = e.touches[0];
      const rect = element.getBoundingClientRect();

      // Calculate touch position relative to element (0-100%)
      const percentX = ((touch.clientX - rect.left) / rect.width) * 100;
      const percentY = ((touch.clientY - rect.top) / rect.height) * 100;

      // Apply subtle tilt based on touch position (reduced for touch)
      const tiltX = ((percentY - 50) / 50) * -(maxTilt * 0.5);
      const tiltY = ((percentX - 50) / 50) * (maxTilt * 0.5);

      element.style.transition = `transform ${speed * 0.5}ms cubic-bezier(0.03, 0.98, 0.52, 0.99)`;
      element.classList.add('card-tilt-active');

      // Apply transform with subtle tilt
      element.style.transform = `
        perspective(1000px)
        rotateX(${tiltX}deg)
        rotateY(${tiltY}deg)
        scale3d(${scale}, ${scale}, ${scale})
      `;

      // Set glow position
      const glowX = 50 + (percentX - 50) * 0.5;
      const glowY = 50 + (percentY - 50) * 0.5;
      element.style.setProperty('--glow-x', `${glowX}%`);
      element.style.setProperty('--glow-y', `${glowY}%`);
      element.style.setProperty('--glow-color', glowColor);
    },
    [disabled, enableTouch, maxTilt, scale, speed, glowColor]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (disabled || !ref.current || !enableTouch) return;

      const element = ref.current;
      const touch = e.touches[0];
      const rect = element.getBoundingClientRect();

      // Calculate touch position relative to element
      const percentX = ((touch.clientX - rect.left) / rect.width) * 100;
      const percentY = ((touch.clientY - rect.top) / rect.height) * 100;

      // Apply subtle tilt based on touch position
      const tiltX = ((percentY - 50) / 50) * -(maxTilt * 0.5);
      const tiltY = ((percentX - 50) / 50) * (maxTilt * 0.5);

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      animationRef.current = requestAnimationFrame(() => {
        element.style.transform = `
          perspective(1000px)
          rotateX(${tiltX}deg)
          rotateY(${tiltY}deg)
          scale3d(${scale}, ${scale}, ${scale})
        `;

        const glowX = 50 + (percentX - 50) * 0.5;
        const glowY = 50 + (percentY - 50) * 0.5;
        element.style.setProperty('--glow-x', `${glowX}%`);
        element.style.setProperty('--glow-y', `${glowY}%`);
      });
    },
    [disabled, enableTouch, maxTilt, scale]
  );

  const handleTouchEnd = useCallback(() => {
    if (disabled || !ref.current || !enableTouch) return;

    const element = ref.current;

    // Reset transform smoothly
    element.style.transform = `
      perspective(1000px)
      rotateX(0deg)
      rotateY(0deg)
      scale3d(1, 1, 1)
    `;

    element.style.setProperty('--glow-x', '50%');
    element.style.setProperty('--glow-y', '50%');
    element.classList.remove('card-tilt-active');

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, [disabled, enableTouch]);

  useEffect(() => {
    const element = ref.current;
    if (!element || disabled) return;

    // Set initial styles
    element.style.transformStyle = 'preserve-3d';
    element.style.willChange = 'transform';

    // Add mouse event listeners (for desktop)
    if (!isTouch) {
      element.addEventListener('mousemove', handleMouseMove);
      element.addEventListener('mouseenter', handleMouseEnter);
      element.addEventListener('mouseleave', handleMouseLeave);
    }

    // Add touch event listeners (for mobile)
    if (isTouch && enableTouch) {
      element.addEventListener('touchstart', handleTouchStart, { passive: true });
      element.addEventListener('touchmove', handleTouchMove, { passive: true });
      element.addEventListener('touchend', handleTouchEnd);
      element.addEventListener('touchcancel', handleTouchEnd);
    }

    return () => {
      // Remove mouse listeners
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);

      // Remove touch listeners
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [disabled, isTouch, enableTouch, handleMouseMove, handleMouseEnter, handleMouseLeave, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return ref;
}

export default use3DTilt;
