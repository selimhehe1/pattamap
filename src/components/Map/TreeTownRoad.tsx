import React, { useRef, useEffect } from 'react';

interface TreeTownRoadProps {
  isEditMode?: boolean;
}

/**
 * TreeTownRoad Component - Professional HTML5 Canvas Approach with RESPONSIVE DESIGN
 * Uses Canvas lineJoin='round' for perfect automatic junctions
 * ResizeObserver ensures road redraws on container size changes
 */
const TreeTownRoad: React.FC<TreeTownRoadProps> = ({ isEditMode = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    // Function to draw the road - will be called on mount and resize
    const drawRoad = () => {
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

      // Calculate positions (percentage to pixels)
      const roadWidth = 120;
      const topY = height * 0.22;  // Lowered from 0.18 to 0.22 for title clearance
      const leftX = width * 0.20;
      const rightX = width * 0.80;
      const bottomY = height * 0.92;  // Extended to 0.92 to compensate

      // === MAIN ROAD BASE ===
      ctx.lineWidth = roadWidth;
      ctx.strokeStyle = '#2d2d2d';
      ctx.lineJoin = 'round';  // MAGIC: Automatic rounded junctions!
      ctx.lineCap = 'butt';  // Flat caps, no overflow at top

      // Draw U-shaped road in one continuous path (no moveTo to preserve rounded junction)
      ctx.beginPath();
      ctx.moveTo(leftX, bottomY);  // Start bottom left
      ctx.lineTo(leftX, topY);      // Go up left side
      ctx.lineTo(rightX, topY);     // Go across top
      ctx.lineTo(rightX, bottomY);  // Go down right side
      ctx.stroke();

      // === ASPHALT TEXTURE OVERLAY ===
      ctx.lineWidth = roadWidth - 4;
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineJoin = 'round';
      ctx.lineCap = 'butt';  // Flat caps, no overflow

      ctx.beginPath();
      ctx.moveTo(leftX, bottomY);
      ctx.lineTo(leftX, topY);
      ctx.lineTo(rightX, topY);
      ctx.lineTo(rightX, bottomY);
      ctx.stroke();

      // === ASPHALT GRAIN TEXTURE ===
      // Add realistic asphalt grain effect with random small rectangles
      ctx.globalAlpha = 0.7;  // Increased from 0.3 to 0.7 for better visibility
      for (let i = 0; i < 1500; i++) {  // Increased from 800 to 1500 grains
        const grainX = Math.random() * width;
        const grainY = Math.random() * height;

        // Check if grain is within road boundaries
        const isOnTopRoad = grainY >= topY - roadWidth/2 && grainY <= topY + roadWidth/2 &&
                            grainX >= leftX && grainX <= rightX;
        const isOnLeftRoad = grainX >= leftX - roadWidth/2 && grainX <= leftX + roadWidth/2 &&
                             grainY >= topY && grainY <= bottomY;
        const isOnRightRoad = grainX >= rightX - roadWidth/2 && grainX <= rightX + roadWidth/2 &&
                              grainY >= topY && grainY <= bottomY;

        if (isOnTopRoad || isOnLeftRoad || isOnRightRoad) {
          const grainSize = Math.random() * 3 + 1;  // Increased from 2+0.5 to 3+1
          ctx.fillStyle = Math.random() > 0.5 ? 'rgba(70,70,70,0.9)' : 'rgba(40,40,40,1.0)';  // More visible colors
          ctx.fillRect(grainX, grainY, grainSize, grainSize);
        }
      }
      ctx.globalAlpha = 1.0;

      // === ROAD EDGES (Solid Yellow Lines) - FINE BORDERS ===
      ctx.setLineDash([]);  // Reset to solid
      ctx.globalAlpha = 0.6;  // Semi-transparent like other maps
      ctx.lineWidth = roadWidth + 3;  // Fine border (reduced from +8)
      ctx.strokeStyle = '#FFD700';  // Gold
      ctx.shadowColor = 'transparent';  // No glow for finer look
      ctx.shadowBlur = 0;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'butt';  // Flat caps, no overflow

      // Draw outer golden border (larger line behind)
      ctx.beginPath();
      ctx.moveTo(leftX, bottomY);
      ctx.lineTo(leftX, topY);
      ctx.lineTo(rightX, topY);
      ctx.lineTo(rightX, bottomY);
      ctx.stroke();

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Draw road again on top to create border effect
      ctx.lineWidth = roadWidth - 4;
      ctx.strokeStyle = '#1a1a1a';
      ctx.globalAlpha = 1.0;

      ctx.beginPath();
      ctx.moveTo(leftX, bottomY);
      ctx.lineTo(leftX, topY);
      ctx.lineTo(rightX, topY);
      ctx.lineTo(rightX, bottomY);
      ctx.stroke();

      // Reset alpha
      ctx.globalAlpha = 1.0;

      // === CENTER LINE (Dashed Yellow) - DRAWN LAST FOR VISIBILITY ===
      ctx.setLineDash([20, 12]);  // Dashes: 20px dash, 12px gap
      ctx.lineWidth = 3;  // Fine line (reduced from 6)
      ctx.strokeStyle = '#FFD700';  // Bright gold
      ctx.shadowColor = 'transparent';  // No glow for cleaner look
      ctx.shadowBlur = 0;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'butt';  // Flat caps, no overflow
      ctx.globalAlpha = 0.9;  // Slightly transparent

      ctx.beginPath();
      ctx.moveTo(leftX, bottomY);
      ctx.lineTo(leftX, topY);
      ctx.lineTo(rightX, topY);
      ctx.lineTo(rightX, bottomY);
      ctx.stroke();

      // Reset shadow and lineDash
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.setLineDash([]);

      // Edit mode indicator
      if (isEditMode) {
        ctx.fillStyle = 'rgba(0,255,0,0.6)';
        ctx.font = '14px monospace';
        ctx.fillText('🌳 Tree Town Road System (Edit Mode)', width * 0.05, 20);
      }
    };

    // Initial draw
    drawRoad();

    // ResizeObserver for responsive redraw
    const resizeObserver = new ResizeObserver(() => {
      drawRoad();
    });

    resizeObserver.observe(parent);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
    };

  }, [isEditMode]);

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

export default TreeTownRoad;
