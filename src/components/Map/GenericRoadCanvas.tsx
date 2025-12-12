import React, { useRef, useEffect, useMemo } from 'react';

/**
 * Configuration for road shape and positioning
 */
export interface RoadConfig {
  shape: 'horizontal' | 'vertical' | 'u-shape' | 'l-shape';
  width: number;  // Road width in pixels

  // Position percentages (0-100)
  startX?: number;  // For horizontal/u-shape
  endX?: number;
  startY?: number;  // For vertical/l-shape
  endY?: number;

  // For U-shape specific positioning
  leftX?: number;   // Left vertical position %
  rightX?: number;  // Right vertical position %
  topY?: number;    // Top horizontal position %
  bottomY?: number; // Bottom position %

  // For L-shape
  cornerX?: number; // Corner X position %
  cornerY?: number; // Corner Y position %
}

export interface RoadStyle {
  baseColor: string;       // Main road color
  overlayColor: string;    // Asphalt overlay color
  edgeColor: string;       // Border line color
  centerLineColor: string; // Center line color
  edgeOpacity?: number;    // Border opacity (default 0.6)
  centerLineOpacity?: number; // Center line opacity (default 0.9)
}

export interface GenericRoadCanvasProps {
  config: RoadConfig;
  style?: Partial<RoadStyle>;
  isEditMode?: boolean;
  grainCount?: number;  // Number of asphalt grain particles (default 1500)
}

const DEFAULT_STYLE: RoadStyle = {
  baseColor: '#2d2d2d',
  overlayColor: '#1a1a1a',
  edgeColor: '#FFD700',
  centerLineColor: '#FFD700',
  edgeOpacity: 0.6,
  centerLineOpacity: 0.9
};

/**
 * GenericRoadCanvas - Reusable HTML5 Canvas Road Renderer
 *
 * Supports multiple road shapes:
 * - horizontal: Single horizontal road
 * - vertical: Single vertical road
 * - u-shape: U-shaped road (like Tree Town)
 * - l-shape: L-shaped road
 *
 * Features:
 * - Professional asphalt texture with random grains
 * - Automatic rounded junctions (lineJoin='round')
 * - Responsive with ResizeObserver
 * - High resolution rendering (2x)
 * - Customizable colors and styles
 */
const GenericRoadCanvas: React.FC<GenericRoadCanvasProps> = ({
  config,
  style = {},
  isEditMode = false,
  grainCount = 1500
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Merge default and custom styles - memoized to prevent dependency issues
  const roadStyle = useMemo<RoadStyle>(() => ({ ...DEFAULT_STYLE, ...style }), [style]);

  // ✅ PERFORMANCE OPTIMIZATION: Memoize asphalt grains
  // Grains are calculated ONCE and reused on every resize
  // Each grain stores relative position (0-1) to scale with canvas
  const grains = useMemo(() => {
    return Array.from({ length: grainCount }, () => ({
      x: Math.random(),  // 0-1 relative position
      y: Math.random(),
      size: Math.random() * 3 + 1,
      color: Math.random() > 0.5 ? 'rgba(70,70,70,0.9)' : 'rgba(40,40,40,1.0)'
    }));
  }, [grainCount]); // Only recalculate if grainCount changes

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    // ✅ PERFORMANCE: Use RequestAnimationFrame for smooth 60 FPS rendering
    const drawRoad = () => {
      if (!canvas || !ctx || !parent) return;

      requestAnimationFrame(() => {
        if (!canvas || !ctx || !parent) return;

      const width = parent.clientWidth;
      const height = parent.clientHeight;

      // Set canvas size (high resolution for crisp rendering)
      canvas.width = width * 2;
      canvas.height = height * 2;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(2, 2);

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Calculate positions based on config and shape
      const roadWidth = config.width;

      // Draw based on shape
      ctx.lineWidth = roadWidth;
      ctx.strokeStyle = roadStyle.baseColor;
      ctx.lineJoin = 'round';  // MAGIC: Automatic rounded junctions!
      ctx.lineCap = 'butt';

      ctx.beginPath();

      switch (config.shape) {
        case 'horizontal': {
          const y = height * 0.5;
          const startX = width * (config.startX || 0) / 100;
          const endX = width * (config.endX || 100) / 100;

          ctx.moveTo(startX, y);
          ctx.lineTo(endX, y);
          break;
        }

        case 'vertical': {
          const x = width * 0.5;
          const startY = height * (config.startY || 0) / 100;
          const endY = height * (config.endY || 100) / 100;

          ctx.moveTo(x, startY);
          ctx.lineTo(x, endY);
          break;
        }

        case 'u-shape': {
          const topY = height * (config.topY || 22) / 100;
          const leftX = width * (config.leftX || 20) / 100;
          const rightX = width * (config.rightX || 80) / 100;
          const bottomY = height * (config.bottomY || 92) / 100;

          // Draw U-shaped road in one continuous path
          ctx.moveTo(leftX, bottomY);
          ctx.lineTo(leftX, topY);
          ctx.lineTo(rightX, topY);
          ctx.lineTo(rightX, bottomY);
          break;
        }

        case 'l-shape': {
          const cornerX = width * (config.cornerX || 50) / 100;
          const cornerY = height * (config.cornerY || 50) / 100;
          const startX = width * (config.startX || 10) / 100;
          const endY = height * (config.endY || 90) / 100;

          // Draw L-shaped road
          ctx.moveTo(startX, cornerY);
          ctx.lineTo(cornerX, cornerY);
          ctx.lineTo(cornerX, endY);
          break;
        }
      }

      ctx.stroke();

      // === ASPHALT TEXTURE OVERLAY ===
      ctx.lineWidth = roadWidth - 4;
      ctx.strokeStyle = roadStyle.overlayColor;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'butt';

      ctx.beginPath();

      // Redraw same path for overlay
      switch (config.shape) {
        case 'horizontal': {
          const y = height * 0.5;
          const startX = width * (config.startX || 0) / 100;
          const endX = width * (config.endX || 100) / 100;
          ctx.moveTo(startX, y);
          ctx.lineTo(endX, y);
          break;
        }
        case 'vertical': {
          const x = width * 0.5;
          const startY = height * (config.startY || 0) / 100;
          const endY = height * (config.endY || 100) / 100;
          ctx.moveTo(x, startY);
          ctx.lineTo(x, endY);
          break;
        }
        case 'u-shape': {
          const topY = height * (config.topY || 22) / 100;
          const leftX = width * (config.leftX || 20) / 100;
          const rightX = width * (config.rightX || 80) / 100;
          const bottomY = height * (config.bottomY || 92) / 100;
          ctx.moveTo(leftX, bottomY);
          ctx.lineTo(leftX, topY);
          ctx.lineTo(rightX, topY);
          ctx.lineTo(rightX, bottomY);
          break;
        }
        case 'l-shape': {
          const cornerX = width * (config.cornerX || 50) / 100;
          const cornerY = height * (config.cornerY || 50) / 100;
          const startX = width * (config.startX || 10) / 100;
          const endY = height * (config.endY || 90) / 100;
          ctx.moveTo(startX, cornerY);
          ctx.lineTo(cornerX, cornerY);
          ctx.lineTo(cornerX, endY);
          break;
        }
      }

      ctx.stroke();

      // === ASPHALT GRAIN TEXTURE ===
      // ✅ PERFORMANCE: Use memoized grains, convert relative → absolute positions
      ctx.globalAlpha = 0.7;
      grains.forEach(grain => {
        // Convert relative position (0-1) to absolute canvas coordinates
        const grainX = grain.x * width;
        const grainY = grain.y * height;

        // Check if grain is within road boundaries
        let isOnRoad = false;

        if (config.shape === 'horizontal') {
          const y = height * 0.5;
          const startX = width * (config.startX || 0) / 100;
          const endX = width * (config.endX || 100) / 100;
          isOnRoad = grainY >= y - roadWidth/2 && grainY <= y + roadWidth/2 &&
                     grainX >= startX && grainX <= endX;
        } else if (config.shape === 'vertical') {
          const x = width * 0.5;
          const startY = height * (config.startY || 0) / 100;
          const endY = height * (config.endY || 100) / 100;
          isOnRoad = grainX >= x - roadWidth/2 && grainX <= x + roadWidth/2 &&
                     grainY >= startY && grainY <= endY;
        } else if (config.shape === 'u-shape') {
          const topY = height * (config.topY || 22) / 100;
          const leftX = width * (config.leftX || 20) / 100;
          const rightX = width * (config.rightX || 80) / 100;
          const bottomY = height * (config.bottomY || 92) / 100;

          const isOnTopRoad = grainY >= topY - roadWidth/2 && grainY <= topY + roadWidth/2 &&
                              grainX >= leftX && grainX <= rightX;
          const isOnLeftRoad = grainX >= leftX - roadWidth/2 && grainX <= leftX + roadWidth/2 &&
                               grainY >= topY && grainY <= bottomY;
          const isOnRightRoad = grainX >= rightX - roadWidth/2 && grainX <= rightX + roadWidth/2 &&
                                grainY >= topY && grainY <= bottomY;

          isOnRoad = isOnTopRoad || isOnLeftRoad || isOnRightRoad;
        } else if (config.shape === 'l-shape') {
          const cornerX = width * (config.cornerX || 50) / 100;
          const cornerY = height * (config.cornerY || 50) / 100;
          const startX = width * (config.startX || 10) / 100;
          const endY = height * (config.endY || 90) / 100;

          const isOnHorizontal = grainY >= cornerY - roadWidth/2 && grainY <= cornerY + roadWidth/2 &&
                                 grainX >= startX && grainX <= cornerX;
          const isOnVertical = grainX >= cornerX - roadWidth/2 && grainX <= cornerX + roadWidth/2 &&
                               grainY >= cornerY && grainY <= endY;

          isOnRoad = isOnHorizontal || isOnVertical;
        }

        if (isOnRoad) {
          ctx.fillStyle = grain.color;
          ctx.fillRect(grainX, grainY, grain.size, grain.size);
        }
      });
      ctx.globalAlpha = 1.0;

      // === ROAD EDGES (Solid Lines) ===
      ctx.setLineDash([]);
      ctx.globalAlpha = roadStyle.edgeOpacity || 0.6;
      ctx.lineWidth = roadWidth + 3;
      ctx.strokeStyle = roadStyle.edgeColor;
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'butt';

      ctx.beginPath();
      // Redraw same path for edges
      switch (config.shape) {
        case 'horizontal': {
          const y = height * 0.5;
          const startX = width * (config.startX || 0) / 100;
          const endX = width * (config.endX || 100) / 100;
          ctx.moveTo(startX, y);
          ctx.lineTo(endX, y);
          break;
        }
        case 'vertical': {
          const x = width * 0.5;
          const startY = height * (config.startY || 0) / 100;
          const endY = height * (config.endY || 100) / 100;
          ctx.moveTo(x, startY);
          ctx.lineTo(x, endY);
          break;
        }
        case 'u-shape': {
          const topY = height * (config.topY || 22) / 100;
          const leftX = width * (config.leftX || 20) / 100;
          const rightX = width * (config.rightX || 80) / 100;
          const bottomY = height * (config.bottomY || 92) / 100;
          ctx.moveTo(leftX, bottomY);
          ctx.lineTo(leftX, topY);
          ctx.lineTo(rightX, topY);
          ctx.lineTo(rightX, bottomY);
          break;
        }
        case 'l-shape': {
          const cornerX = width * (config.cornerX || 50) / 100;
          const cornerY = height * (config.cornerY || 50) / 100;
          const startX = width * (config.startX || 10) / 100;
          const endY = height * (config.endY || 90) / 100;
          ctx.moveTo(startX, cornerY);
          ctx.lineTo(cornerX, cornerY);
          ctx.lineTo(cornerX, endY);
          break;
        }
      }
      ctx.stroke();

      // Draw road again on top to create border effect
      ctx.lineWidth = roadWidth - 4;
      ctx.strokeStyle = roadStyle.overlayColor;
      ctx.globalAlpha = 1.0;

      ctx.beginPath();
      // Redraw same path
      switch (config.shape) {
        case 'horizontal': {
          const y = height * 0.5;
          const startX = width * (config.startX || 0) / 100;
          const endX = width * (config.endX || 100) / 100;
          ctx.moveTo(startX, y);
          ctx.lineTo(endX, y);
          break;
        }
        case 'vertical': {
          const x = width * 0.5;
          const startY = height * (config.startY || 0) / 100;
          const endY = height * (config.endY || 100) / 100;
          ctx.moveTo(x, startY);
          ctx.lineTo(x, endY);
          break;
        }
        case 'u-shape': {
          const topY = height * (config.topY || 22) / 100;
          const leftX = width * (config.leftX || 20) / 100;
          const rightX = width * (config.rightX || 80) / 100;
          const bottomY = height * (config.bottomY || 92) / 100;
          ctx.moveTo(leftX, bottomY);
          ctx.lineTo(leftX, topY);
          ctx.lineTo(rightX, topY);
          ctx.lineTo(rightX, bottomY);
          break;
        }
        case 'l-shape': {
          const cornerX = width * (config.cornerX || 50) / 100;
          const cornerY = height * (config.cornerY || 50) / 100;
          const startX = width * (config.startX || 10) / 100;
          const endY = height * (config.endY || 90) / 100;
          ctx.moveTo(startX, cornerY);
          ctx.lineTo(cornerX, cornerY);
          ctx.lineTo(cornerX, endY);
          break;
        }
      }
      ctx.stroke();

      ctx.globalAlpha = 1.0;

      // === CENTER LINE (Dashed) ===
      ctx.setLineDash([20, 12]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = roadStyle.centerLineColor;
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'butt';
      ctx.globalAlpha = roadStyle.centerLineOpacity || 0.9;

      ctx.beginPath();
      // Redraw same path for center line
      switch (config.shape) {
        case 'horizontal': {
          const y = height * 0.5;
          const startX = width * (config.startX || 0) / 100;
          const endX = width * (config.endX || 100) / 100;
          ctx.moveTo(startX, y);
          ctx.lineTo(endX, y);
          break;
        }
        case 'vertical': {
          const x = width * 0.5;
          const startY = height * (config.startY || 0) / 100;
          const endY = height * (config.endY || 100) / 100;
          ctx.moveTo(x, startY);
          ctx.lineTo(x, endY);
          break;
        }
        case 'u-shape': {
          const topY = height * (config.topY || 22) / 100;
          const leftX = width * (config.leftX || 20) / 100;
          const rightX = width * (config.rightX || 80) / 100;
          const bottomY = height * (config.bottomY || 92) / 100;
          ctx.moveTo(leftX, bottomY);
          ctx.lineTo(leftX, topY);
          ctx.lineTo(rightX, topY);
          ctx.lineTo(rightX, bottomY);
          break;
        }
        case 'l-shape': {
          const cornerX = width * (config.cornerX || 50) / 100;
          const cornerY = height * (config.cornerY || 50) / 100;
          const startX = width * (config.startX || 10) / 100;
          const endY = height * (config.endY || 90) / 100;
          ctx.moveTo(startX, cornerY);
          ctx.lineTo(cornerX, cornerY);
          ctx.lineTo(cornerX, endY);
          break;
        }
      }
      ctx.stroke();

      // Reset
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.setLineDash([]);
      ctx.globalAlpha = 1.0;

        // Edit mode indicator
        if (isEditMode) {
          ctx.fillStyle = 'rgba(0,255,0,0.6)';
          ctx.font = '14px monospace';
          ctx.fillText(`🗺️ ${config.shape.toUpperCase()} Road (Edit Mode)`, width * 0.05, 20);
        }
      }); // End requestAnimationFrame
    };

    // Initial draw
    drawRoad();

    // ✅ PERFORMANCE: Debounced ResizeObserver (300ms throttle)
    // Prevents excessive redraws during window resize
    let resizeTimeout: NodeJS.Timeout;
    const debouncedDraw = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        drawRoad();
      }, 300); // Wait 300ms after last resize event
    };

    const resizeObserver = new ResizeObserver(debouncedDraw);
    resizeObserver.observe(parent);

    // Cleanup
    return () => {
      clearTimeout(resizeTimeout);
      resizeObserver.disconnect();
    };

  }, [config, roadStyle, isEditMode, grainCount, grains]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 6,
        pointerEvents: 'none'
      }}
    />
  );
};

export default GenericRoadCanvas;
