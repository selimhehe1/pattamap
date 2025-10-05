import React, { useRef, useEffect } from 'react';

interface WalkingStreetRoadProps {
  isEditMode?: boolean;
  isMobile?: boolean;
}

/**
 * WalkingStreetRoad Component - Specialized Canvas for Walking Street Topology
 *
 * Desktop Layout (Horizontal):
 * - Main Walking Street: Horizontal road (top to bottom: 45-55%)
 * - 5 Perpendicular Sois: Vertical streets crossing Walking Street
 *   - Soi JP (15%)
 *   - Soi Marine (35%)
 *   - Soi 15 (50%)
 *   - Soi 14 (65%)
 *   - Soi Diamond (85%)
 *
 * Mobile Layout (Vertical):
 * - Main Walking Street: Vertical road (left to right: 48-52%)
 * - 7 Perpendicular Sois: Horizontal streets crossing Walking Street
 *
 * Features:
 * - Professional asphalt texture with random grains
 * - Automatic rounded junctions (lineJoin='round')
 * - Responsive with ResizeObserver
 * - High resolution rendering (2x)
 */
const WalkingStreetRoad: React.FC<WalkingStreetRoadProps> = ({ isEditMode = false, isMobile = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    // Function to draw the road network - will be called on mount and resize
    const drawRoadNetwork = () => {
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

      if (isMobile) {
        // === MOBILE LAYOUT: Vertical Walking Street + Horizontal intersections ===
        const mainRoadWidth = 80;
        const intersectionWidth = 35;
        const centerX = width * 0.5;

        // Horizontal intersections positions (Y percentages)
        const intersections = [
          { y: 0.10, label: 'Soi JP' },
          { y: 0.22, label: 'Soi VC' },
          { y: 0.30, label: 'Soi 16' },
          { y: 0.45, label: 'Soi 15' },
          { y: 0.60, label: 'Soi Marine' },
          { y: 0.75, label: 'Soi Diamond' },
          { y: 0.90, label: 'Soi 13' }
        ];

        // Step 1: Draw all roads in one path (base layer)
        ctx.lineWidth = mainRoadWidth;
        ctx.strokeStyle = '#2d2d2d';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'butt';

        ctx.beginPath();
        // Main vertical Walking Street
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, height);

        // Horizontal intersections - split into segments that stop at Walking Street
        intersections.forEach(({ y }) => {
          const yPos = height * y;
          // Left segment (before Walking Street)
          ctx.moveTo(0, yPos);
          ctx.lineTo(centerX - mainRoadWidth/2, yPos);
          // Right segment (after Walking Street)
          ctx.moveTo(centerX + mainRoadWidth/2, yPos);
          ctx.lineTo(width, yPos);
        });
        ctx.stroke();

        // Step 2: Asphalt overlay
        ctx.lineWidth = mainRoadWidth - 4;
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, height);

        intersections.forEach(({ y }) => {
          const yPos = height * y;
          // Left segment
          ctx.moveTo(0, yPos);
          ctx.lineTo(centerX - mainRoadWidth/2, yPos);
          // Right segment
          ctx.moveTo(centerX + mainRoadWidth/2, yPos);
          ctx.lineTo(width, yPos);
        });
        ctx.stroke();

        // Step 3: Asphalt grain texture
        ctx.globalAlpha = 0.7;
        for (let i = 0; i < 1500; i++) {
          const grainX = Math.random() * width;
          const grainY = Math.random() * height;

          // Check if on vertical Walking Street
          const isOnMain = grainX >= centerX - mainRoadWidth/2 && grainX <= centerX + mainRoadWidth/2;

          // Check if on any horizontal intersection (split segments)
          const isOnIntersection = intersections.some(({ y }) => {
            const yPos = height * y;
            // Check if grain is on left segment OR right segment
            const leftSegment = grainX <= centerX - mainRoadWidth/2 && grainY >= yPos - intersectionWidth/2 && grainY <= yPos + intersectionWidth/2;
            const rightSegment = grainX >= centerX + mainRoadWidth/2 && grainY >= yPos - intersectionWidth/2 && grainY <= yPos + intersectionWidth/2;
            return leftSegment || rightSegment;
          });

          if (isOnMain || isOnIntersection) {
            const grainSize = Math.random() * 3 + 1;
            ctx.fillStyle = Math.random() > 0.5 ? 'rgba(70,70,70,0.9)' : 'rgba(40,40,40,1.0)';
            ctx.fillRect(grainX, grainY, grainSize, grainSize);
          }
        }
        ctx.globalAlpha = 1.0;

        // Step 4: Golden edges
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = mainRoadWidth + 3;
        ctx.strokeStyle = '#FFD700';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, height);

        intersections.forEach(({ y }) => {
          const yPos = height * y;
          // Left segment
          ctx.moveTo(0, yPos);
          ctx.lineTo(centerX - mainRoadWidth/2, yPos);
          // Right segment
          ctx.moveTo(centerX + mainRoadWidth/2, yPos);
          ctx.lineTo(width, yPos);
        });
        ctx.stroke();

        // Redraw roads on top
        ctx.lineWidth = mainRoadWidth - 4;
        ctx.strokeStyle = '#1a1a1a';
        ctx.globalAlpha = 1.0;

        ctx.beginPath();
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, height);

        intersections.forEach(({ y }) => {
          const yPos = height * y;
          // Left segment
          ctx.moveTo(0, yPos);
          ctx.lineTo(centerX - mainRoadWidth/2, yPos);
          // Right segment
          ctx.moveTo(centerX + mainRoadWidth/2, yPos);
          ctx.lineTo(width, yPos);
        });
        ctx.stroke();

        // Step 5: Center lines (dashed)
        ctx.setLineDash([20, 12]);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#FFD700';
        ctx.globalAlpha = 0.9;

        ctx.beginPath();
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, height);

        intersections.forEach(({ y }) => {
          const yPos = height * y;
          // Left segment
          ctx.moveTo(0, yPos);
          ctx.lineTo(centerX - mainRoadWidth/2, yPos);
          // Right segment
          ctx.moveTo(centerX + mainRoadWidth/2, yPos);
          ctx.lineTo(width, yPos);
        });
        ctx.stroke();

      } else {
        // === DESKTOP LAYOUT: Horizontal Walking Street + Vertical intersections ===
        const mainRoadWidth = 120; // Main Walking Street width
        const centerY = height * 0.5;

        // MAJOR ROADS - Real perpendicular streets with gogos/bars (normal width 35px)
        // Verified via web research: Soi Diamond (25+ gogos), Soi 15 (Sapphire + bars), Soi 16 (bars zone)
        const majorRoads = [
          { x: 0.12, label: 'Soi Diamond', width: 35 },  // ~200m from Beach Road, 25+ gogos confirmed
          { x: 0.52, label: 'Soi 15', width: 35 },       // Central position, Sapphire Club confirmed
          { x: 0.68, label: 'Soi 16', width: 35 }        // Bars zone confirmed
        ];

        // SECONDARY ROADS - Alleys with venues (medium width 25px)
        const secondaryRoads = [
          { x: 0.82, label: 'BJ Alley', width: 25 }      // Food vendors + nightlife confirmed
        ];

        // PATHWAYS - Access paths to establishments
        // Republic/Mixx: Real street with nightclub (wider 12px)
        // Myst: Narrow passage before Panda/Boho (thinner 6px)
        const pathways = [
          { x: 0.22, label: '⬆️ Republic', width: 12 },  // Republic Club + Mixx Discotheque confirmed
          { x: 0.28, label: '⬆️ Myst', width: 6 }         // Narrow passage to Panda/Boho area
        ];

        // Combine all intersections for rendering
        const allIntersections = [
          ...majorRoads.map(r => ({ ...r, type: 'major' as const })),
          ...secondaryRoads.map(r => ({ ...r, type: 'secondary' as const })),
          ...pathways.map(r => ({ ...r, type: 'pathway' as const }))
        ];

        // Step 1: Draw all roads base layer with NATURAL INTERSECTIONS
        ctx.lineJoin = 'round';  // Automatic rounded junctions
        ctx.lineCap = 'round';   // Rounded caps for natural look

        // Draw each vertical road WITH its T-intersection into Walking Street
        // This creates natural rounded junctions instead of simple overlays
        allIntersections.forEach(({ x, width: intersectionWidth, type }) => {
          const xPos = width * x;

          // Different base colors per type
          if (type === 'major') {
            ctx.strokeStyle = '#2d2d2d'; // Dark asphalt for major roads
          } else if (type === 'secondary') {
            ctx.strokeStyle = '#3a3a3a'; // Medium asphalt for secondary
          } else { // pathway
            ctx.strokeStyle = '#4a4a4a'; // Light asphalt/gravel for pathways
          }

          ctx.lineWidth = intersectionWidth;

          // Draw T-intersection as ONE continuous path for natural junction
          ctx.beginPath();
          // Vertical road from top
          ctx.moveTo(xPos, 0);
          ctx.lineTo(xPos, centerY);

          // Horizontal extension into Walking Street (creates T-junction)
          // Left extension
          ctx.moveTo(xPos - intersectionWidth * 0.8, centerY);
          ctx.lineTo(xPos, centerY);
          // Right extension
          ctx.lineTo(xPos + intersectionWidth * 0.8, centerY);

          ctx.stroke();
        });

        // Main horizontal Walking Street AFTER intersections (covers junction artifacts)
        ctx.lineWidth = mainRoadWidth;
        ctx.strokeStyle = '#2d2d2d';
        ctx.lineCap = 'butt';  // Flat caps for main road
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();

        // Step 2: Asphalt overlay with NATURAL INTERSECTIONS (darker layer for depth)
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // Draw T-intersections overlay for each vertical road
        allIntersections.forEach(({ x, width: intersectionWidth, type }) => {
          if (type === 'pathway') return; // Pathways stay lighter, no overlay

          const xPos = width * x;

          // Overlay color varies by type
          ctx.strokeStyle = type === 'major' ? '#1a1a1a' : '#2a2a2a';
          ctx.lineWidth = intersectionWidth - 4;

          // Draw T-intersection as ONE continuous path
          ctx.beginPath();
          // Vertical road from top
          ctx.moveTo(xPos, 0);
          ctx.lineTo(xPos, centerY);

          // Horizontal T-junction extensions
          ctx.moveTo(xPos - (intersectionWidth - 4) * 0.8, centerY);
          ctx.lineTo(xPos, centerY);
          ctx.lineTo(xPos + (intersectionWidth - 4) * 0.8, centerY);

          ctx.stroke();
        });

        // Main Walking Street overlay AFTER (covers artifacts)
        ctx.lineWidth = mainRoadWidth - 4;
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineCap = 'butt';
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();

        // Step 3: Asphalt grain texture (different densities per type)
        ctx.globalAlpha = 0.7;
        for (let i = 0; i < 2000; i++) {
          const grainX = Math.random() * width;
          const grainY = Math.random() * height;

          // Check if on horizontal Walking Street
          const isOnMain = grainY >= centerY - mainRoadWidth/2 && grainY <= centerY + mainRoadWidth/2;

          // Check which type of intersection (if any)
          let isOnRoad = false;
          let roadType: 'major' | 'secondary' | 'pathway' | null = null;

          allIntersections.some(({ x, width: intersectionWidth, type }) => {
            const xPos = width * x;
            const topSegment = grainY <= centerY - mainRoadWidth/2 && grainX >= xPos - intersectionWidth/2 && grainX <= xPos + intersectionWidth/2;
            const bottomSegment = grainY >= centerY + mainRoadWidth/2 && grainX >= xPos - intersectionWidth/2 && grainX <= xPos + intersectionWidth/2;

            if (topSegment || bottomSegment) {
              isOnRoad = true;
              roadType = type;
              return true;
            }
            return false;
          });

          if (isOnMain || isOnRoad) {
            const grainSize = Math.random() * 3 + 1;

            // Different grain colors per road type
            if (roadType === 'pathway') {
              // Lighter grains for pathways (gravel/earth effect)
              ctx.fillStyle = Math.random() > 0.5 ? 'rgba(110,100,90,0.7)' : 'rgba(90,85,75,0.8)';
            } else if (roadType === 'secondary') {
              // Medium grains for secondary roads
              ctx.fillStyle = Math.random() > 0.5 ? 'rgba(80,80,80,0.8)' : 'rgba(50,50,50,0.9)';
            } else {
              // Dark grains for main and major roads
              ctx.fillStyle = Math.random() > 0.5 ? 'rgba(70,70,70,0.9)' : 'rgba(40,40,40,1.0)';
            }

            ctx.fillRect(grainX, grainY, grainSize, grainSize);
          }
        }
        ctx.globalAlpha = 1.0;

        // Step 4: Golden edges with NATURAL T-INTERSECTIONS (only for major/secondary)
        ctx.setLineDash([]);
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // Draw golden T-intersections for each vertical road
        allIntersections.forEach(({ x, width: intersectionWidth, type }) => {
          if (type === 'pathway') return; // No golden edge for pathways

          const xPos = width * x;
          const edgeWidth = intersectionWidth + 3;

          // Less prominent edges for secondary roads
          ctx.globalAlpha = type === 'major' ? 0.6 : 0.4;
          ctx.lineWidth = edgeWidth;
          ctx.strokeStyle = '#FFD700';

          // Draw T-intersection golden edge
          ctx.beginPath();
          // Vertical road from top
          ctx.moveTo(xPos, 0);
          ctx.lineTo(xPos, centerY);

          // Horizontal T-junction extensions
          ctx.moveTo(xPos - edgeWidth * 0.8, centerY);
          ctx.lineTo(xPos, centerY);
          ctx.lineTo(xPos + edgeWidth * 0.8, centerY);

          ctx.stroke();
        });

        // Main Walking Street golden edge AFTER (covers T-junction artifacts)
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = mainRoadWidth + 3;
        ctx.strokeStyle = '#FFD700';
        ctx.lineCap = 'butt';
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();

        // Redraw roads on top with T-INTERSECTIONS (hide golden edges)
        ctx.globalAlpha = 1.0;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // Redraw T-intersections for each vertical road
        allIntersections.forEach(({ x, width: intersectionWidth, type }) => {
          if (type === 'pathway') return; // Pathways stay as-is

          const xPos = width * x;

          ctx.strokeStyle = type === 'major' ? '#1a1a1a' : '#2a2a2a';
          ctx.lineWidth = intersectionWidth - 4;

          // Draw T-intersection redraw
          ctx.beginPath();
          // Vertical road from top
          ctx.moveTo(xPos, 0);
          ctx.lineTo(xPos, centerY);

          // Horizontal T-junction extensions
          ctx.moveTo(xPos - (intersectionWidth - 4) * 0.8, centerY);
          ctx.lineTo(xPos, centerY);
          ctx.lineTo(xPos + (intersectionWidth - 4) * 0.8, centerY);

          ctx.stroke();
        });

        // Main Walking Street final redraw
        ctx.lineWidth = mainRoadWidth - 4;
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineCap = 'butt';
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();

        // Step 5: Center lines (different styles per type)
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#FFD700';

        // Main Walking Street - solid dashed line
        ctx.setLineDash([20, 12]);
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();

        // Intersections - different line styles per type
        allIntersections.forEach(({ x, width: intersectionWidth, type }) => {
          const xPos = width * x;

          if (type === 'pathway') {
            // Pathways: dotted line (smaller dots)
            ctx.setLineDash([5, 8]);
            ctx.globalAlpha = 0.6;
            ctx.strokeStyle = '#D4AF37'; // Darker gold for pathways
            ctx.lineWidth = 2;
          } else if (type === 'secondary') {
            // Secondary: less prominent dashed
            ctx.setLineDash([15, 10]);
            ctx.globalAlpha = 0.7;
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2.5;
          } else {
            // Major roads: solid dashed like main street
            ctx.setLineDash([20, 12]);
            ctx.globalAlpha = 0.9;
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
          }

          ctx.beginPath();
          // ONLY top segment - stops AT Walking Street
          ctx.moveTo(xPos, 0);
          ctx.lineTo(xPos, centerY - mainRoadWidth/2);
          ctx.stroke();
        });
      }

      // Reset
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.setLineDash([]);
      ctx.globalAlpha = 1.0;

      // Edit mode indicator
      if (isEditMode) {
        ctx.fillStyle = 'rgba(0,255,0,0.6)';
        ctx.font = '14px monospace';
        const layout = isMobile ? 'MOBILE' : 'DESKTOP';
        const soisCount = isMobile ? '7 Sois' : '7 Intersections';
        const detail = isMobile ? '7 Sois' : '3 Major + 2 Secondary + 2 Pathways';
        ctx.fillText(`🚶 Walking Street ${layout} (${detail} + Main Road)`, width * 0.05, 20);
      }
    };

    // Initial draw
    drawRoadNetwork();

    // ResizeObserver for responsive redraw
    const resizeObserver = new ResizeObserver(() => {
      drawRoadNetwork();
    });

    resizeObserver.observe(parent);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
    };

  }, [isEditMode, isMobile]);

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

export default WalkingStreetRoad;
