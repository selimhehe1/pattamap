import React from 'react';

interface CentralRoadProps {
  isEditMode: boolean;
  isVertical?: boolean; // true for mobile vertical layout
}

const CentralRoad: React.FC<CentralRoadProps> = ({ isEditMode, isVertical = false }) => {
  return (
    <div
      className="central-road"
      style={{
        position: 'absolute',
        zIndex: 5,
        // Responsive positioning
        ...(isVertical ? {
          // Mobile - Vertical road
          left: '50%',
          top: '100px',
          transform: 'translateX(-50%)',
          width: '80px',
          height: 'calc(100% - 200px)',
          background: 'linear-gradient(0deg, #2d2d2d 0%, #404040 50%, #2d2d2d 100%)',
        } : {
          // PC - Horizontal road (Walking Street - main road)
          top: '50%',
          left: '10px',
          transform: 'translateY(-50%)',
          width: 'calc(100% - 20px)',
          height: '200px',
          background: `
            linear-gradient(180deg,
              rgba(40,40,40,0.9) 0%,
              rgba(25,25,25,0.95) 20%,
              rgba(15,15,15,1) 50%,
              rgba(25,25,25,0.95) 80%,
              rgba(40,40,40,0.9) 100%
            )
          `,
        }),
        border: isEditMode ? '1px dashed rgba(0,255,0,0.3)' : 'none',
        borderRadius: '4px',
        overflow: 'hidden'
      }}
    >
      {/* Asphalt texture overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: isVertical
            ? `
                repeating-linear-gradient(
                  0deg,
                  rgba(35,35,35,0.8) 0px,
                  rgba(35,35,35,0.8) 3px,
                  rgba(45,45,45,0.6) 3px,
                  rgba(45,45,45,0.6) 6px,
                  rgba(25,25,25,0.9) 6px,
                  rgba(25,25,25,0.9) 9px
                ),
                repeating-linear-gradient(
                  45deg,
                  transparent 0px,
                  transparent 8px,
                  rgba(0,0,0,0.1) 8px,
                  rgba(0,0,0,0.1) 12px
                )
              `
            : `
                repeating-linear-gradient(
                  90deg,
                  rgba(35,35,35,0.8) 0px,
                  rgba(35,35,35,0.8) 4px,
                  rgba(45,45,45,0.6) 4px,
                  rgba(45,45,45,0.6) 8px,
                  rgba(25,25,25,0.9) 8px,
                  rgba(25,25,25,0.9) 12px
                ),
                repeating-linear-gradient(
                  30deg,
                  transparent 0px,
                  transparent 10px,
                  rgba(0,0,0,0.1) 10px,
                  rgba(0,0,0,0.1) 15px
                )
              `,
          opacity: 0.7
        }}
      />

      {/* Center line markings */}
      <div
        style={{
          position: 'absolute',
          ...(isVertical ? {
            // Vertical center line
            left: '50%',
            top: 0,
            bottom: 0,
            width: '3px',
            transform: 'translateX(-50%)',
            background: `repeating-linear-gradient(
              0deg,
              #FFD700 0px,
              #FFD700 15px,
              transparent 15px,
              transparent 25px
            )`
          } : {
            // Horizontal center line
            top: '50%',
            left: 0,
            right: 0,
            height: '3px',
            transform: 'translateY(-50%)',
            background: `repeating-linear-gradient(
              90deg,
              #FFD700 0px,
              #FFD700 15px,
              transparent 15px,
              transparent 25px
            )`
          })
        }}
      />

      {/* Road edges */}
      <div
        style={{
          position: 'absolute',
          ...(isVertical ? {
            // Vertical edges
            left: '5px',
            top: 0,
            bottom: 0,
            width: '2px',
            background: '#FFD700'
          } : {
            // Horizontal top edge
            top: '5px',
            left: 0,
            right: 0,
            height: '2px',
            background: '#FFD700'
          })
        }}
      />
      <div
        style={{
          position: 'absolute',
          ...(isVertical ? {
            // Vertical right edge
            right: '5px',
            top: 0,
            bottom: 0,
            width: '2px',
            background: '#FFD700'
          } : {
            // Horizontal bottom edge
            bottom: '5px',
            left: 0,
            right: 0,
            height: '2px',
            background: '#FFD700'
          })
        }}
      />

      {/* Traffic animation particles */}
      <div
        className="traffic-particles"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none'
        }}
      >
        {/* Particle 1 */}
        <div
          style={{
            position: 'absolute',
            width: '4px',
            height: '4px',
            background: '#00E5FF',
            borderRadius: '50%',
            boxShadow: '0 0 8px #00E5FF',
            ...(isVertical ? {
              left: '20px',
              animation: 'trafficVertical1 8s linear infinite'
            } : {
              top: '30px',
              animation: 'trafficHorizontal1 12s linear infinite'
            })
          }}
        />

        {/* Particle 2 */}
        <div
          style={{
            position: 'absolute',
            width: '3px',
            height: '3px',
            background: '#C19A6B',
            borderRadius: '50%',
            boxShadow: '0 0 6px #C19A6B',
            ...(isVertical ? {
              right: '20px',
              animation: 'trafficVertical2 10s linear infinite'
            } : {
              bottom: '30px',
              animation: 'trafficHorizontal2 15s linear infinite'
            })
          }}
        />

        {/* Particle 3 */}
        <div
          style={{
            position: 'absolute',
            width: '2px',
            height: '2px',
            background: '#FFD700',
            borderRadius: '50%',
            boxShadow: '0 0 4px #FFD700',
            ...(isVertical ? {
              left: '50%',
              transform: 'translateX(-50%)',
              animation: 'trafficVertical3 6s linear infinite'
            } : {
              top: '50%',
              transform: 'translateY(-50%)',
              animation: 'trafficHorizontal3 9s linear infinite'
            })
          }}
        />
      </div>


      <style>{`
        @keyframes trafficHorizontal1 {
          0% { left: -10px; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: calc(100% + 10px); opacity: 0; }
        }

        @keyframes trafficHorizontal2 {
          0% { right: -10px; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { right: calc(100% + 10px); opacity: 0; }
        }

        @keyframes trafficHorizontal3 {
          0% { left: -10px; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { left: calc(100% + 10px); opacity: 0; }
        }

        @keyframes trafficVertical1 {
          0% { top: -10px; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: calc(100% + 10px); opacity: 0; }
        }

        @keyframes trafficVertical2 {
          0% { bottom: -10px; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { bottom: calc(100% + 10px); opacity: 0; }
        }

        @keyframes trafficVertical3 {
          0% { top: -10px; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: calc(100% + 10px); opacity: 0; }
        }

        /* Reduce animations on low-performance devices */
        @media (prefers-reduced-motion: reduce) {
          .traffic-particles > div {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default CentralRoad;