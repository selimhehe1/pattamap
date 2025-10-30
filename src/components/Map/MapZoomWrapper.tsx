import React, { ReactNode } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import AnimatedButton from '../Common/AnimatedButton';

/**
 * MapZoomWrapper - Zoom/Pan Functionality for Maps
 *
 * Provides zoom and pan controls for map components
 * - Wheel zoom
 * - Pinch-to-zoom (mobile)
 * - Pan by dragging
 * - Zoom controls UI
 * - Double-click to zoom
 *
 * Usage:
 * <MapZoomWrapper>
 *   <GenericRoadCanvas />
 *   <svg>...</svg>
 * </MapZoomWrapper>
 */

export interface MapZoomWrapperProps {
  /** Child elements to wrap (canvas, svg, etc.) */
  children: ReactNode;

  /** Initial zoom scale (default: 1) */
  initialScale?: number;

  /** Minimum zoom level (default: 0.5) */
  minScale?: number;

  /** Maximum zoom level (default: 3) */
  maxScale?: number;

  /** Enable/disable zoom controls UI (default: true) */
  showControls?: boolean;

  /** Custom className for wrapper */
  className?: string;

  /** Center content on initialization (default: true) */
  centerOnInit?: boolean;
}

const MapZoomWrapper: React.FC<MapZoomWrapperProps> = ({
  children,
  initialScale = 1,
  minScale = 0.5,
  maxScale = 3,
  showControls = true,
  className = '',
  centerOnInit = true
}) => {
  return (
    <div className={`map-zoom-wrapper ${className}`} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <TransformWrapper
        initialScale={initialScale}
        minScale={minScale}
        maxScale={maxScale}
        limitToBounds={true}
        centerOnInit={centerOnInit}
        wheel={{ step: 0.1 }}
        pinch={{ step: 5 }} // Mobile pinch-to-zoom
        panning={{ disabled: false }}
        doubleClick={{ mode: 'zoomIn' }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Zoom controls UI */}
            {showControls && (
              <div
                className="map-zoom-controls"
                role="toolbar"
                aria-label="Map zoom controls"
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  zIndex: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  background: 'rgba(0,0,0,0.7)',
                  borderRadius: '12px',
                  padding: '0.5rem',
                  border: '2px solid rgba(193, 154, 107,0.3)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                }}
              >
                <AnimatedButton
                  onClick={() => zoomIn()}
                  ariaLabel="Zoom in"
                  enableHaptic
                  hapticLevel="light"
                  className="zoom-btn zoom-in-btn"
                  style={{
                    width: '40px',
                    height: '40px',
                    background: 'linear-gradient(135deg, rgba(0,229,255,0.2), rgba(0,229,255,0.3))',
                    border: '2px solid #00E5FF',
                    borderRadius: '8px',
                    color: '#00E5FF',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease'
                  }}
                >
                  +
                </AnimatedButton>

                <AnimatedButton
                  onClick={() => zoomOut()}
                  ariaLabel="Zoom out"
                  enableHaptic
                  hapticLevel="light"
                  className="zoom-btn zoom-out-btn"
                  style={{
                    width: '40px',
                    height: '40px',
                    background: 'linear-gradient(135deg, rgba(0,229,255,0.2), rgba(0,229,255,0.3))',
                    border: '2px solid #00E5FF',
                    borderRadius: '8px',
                    color: '#00E5FF',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease'
                  }}
                >
                  −
                </AnimatedButton>

                <AnimatedButton
                  onClick={() => resetTransform()}
                  ariaLabel="Reset zoom"
                  enableHaptic
                  hapticLevel="medium"
                  className="zoom-btn zoom-reset-btn"
                  style={{
                    width: '40px',
                    height: '40px',
                    background: 'linear-gradient(135deg, rgba(193, 154, 107,0.2), rgba(193, 154, 107,0.3))',
                    border: '2px solid #C19A6B',
                    borderRadius: '8px',
                    color: '#C19A6B',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease'
                  }}
                >
                  ⟲
                </AnimatedButton>
              </div>
            )}

            {/* Zoomable/Pannable content */}
            <TransformComponent
              wrapperStyle={{
                width: '100%',
                height: '100%'
              }}
              contentStyle={{
                width: '100%',
                height: '100%'
              }}
            >
              {children}
            </TransformComponent>
          </>
        )}
      </TransformWrapper>

      {/* CSS for hover effects */}
      <style>{`
        .zoom-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 0 15px currentColor;
        }

        .zoom-btn:active {
          transform: scale(0.95);
        }

        /* Mobile responsive - smaller buttons */
        @media (max-width: 48rem) {
          .map-zoom-controls {
            top: 0.5rem !important;
            right: 0.5rem !important;
            padding: 0.375rem !important;
          }

          .zoom-btn {
            width: 36px !important;
            height: 36px !important;
            font-size: 18px !important;
          }
        }

        /* Very small screens - even smaller */
        @media (max-width: 30rem) {
          .zoom-btn {
            width: 32px !important;
            height: 32px !important;
            font-size: 16px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default MapZoomWrapper;
