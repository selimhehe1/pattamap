import React from 'react';
import { Target, CheckCircle, RefreshCw, XOctagon } from 'lucide-react';

interface DragDropIndicatorProps {
  isEditMode: boolean;
  isDragging: boolean;
  mousePosition: { x: number; y: number } | null;
  dropAction: 'move' | 'swap' | 'blocked' | null;
  draggedBar: { name: string } | null;
  dragOverPosition: { row: number; col: number } | null;
  currentBarSize: number;
}

/**
 * Composant réutilisable pour afficher les indicateurs visuels de drag & drop
 * - Cercle coloré qui suit la souris (vert = MOVE, orange = SWAP, rouge = BLOCKED)
 * - Panneau d'instructions dynamique en haut à droite
 * - Animation de pulsation
 */
const DragDropIndicator: React.FC<DragDropIndicatorProps> = ({
  isEditMode,
  isDragging,
  mousePosition,
  dropAction,
  draggedBar,
  dragOverPosition,
  currentBarSize
}) => {
  if (!isEditMode || !isDragging) {
    return null;
  }

  return (
    <>
      {/* Unified Smart Drop zone indicator - Follows mouse with real-time color logic */}
      {mousePosition && (
        <div
          style={{
            position: 'absolute',
            left: `${mousePosition.x - currentBarSize/2}px`,
            top: `${mousePosition.y - currentBarSize/2}px`,
            width: `${currentBarSize}px`,
            height: `${currentBarSize}px`,
            borderRadius: '50%',
            border: (dropAction === 'move')
              ? '3px dashed #00FF00'  // ✅ Vert: Position libre
              : (dropAction === 'swap')
                ? '3px dashed #FFD700'  // 🔄 Orange: Swap possible
                : (dropAction === 'blocked')
                  ? '3px dashed #FF6B6B'  // ❌ Rouge: Zone interdite
                  : '2px solid rgba(255,255,255,0.6)',  // ⚪ Gris: En validation
            background: (dropAction === 'move')
              ? 'radial-gradient(circle, rgba(0,255,0,0.3), transparent)'
              : (dropAction === 'swap')
                ? 'radial-gradient(circle, rgba(255,215,0,0.3), transparent)'
                : (dropAction === 'blocked')
                  ? 'radial-gradient(circle, rgba(255,107,107,0.3), transparent)'
                  : 'radial-gradient(circle, rgba(255,255,255,0.1), transparent)',
            boxShadow: (dropAction === 'move')
              ? '0 0 20px rgba(0,255,0,0.6)'
              : (dropAction === 'swap')
                ? '0 0 20px rgba(255,215,0,0.6)'
                : (dropAction === 'blocked')
                  ? '0 0 20px rgba(255,107,107,0.6)'
                  : '0 0 15px rgba(255,255,255,0.4)',
            zIndex: 25,
            pointerEvents: 'none',
            transform: 'translate(0, 0)',
            animation: dropAction === 'blocked' ? 'none' : 'dropZonePulse 1s infinite'
          }}
        >
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: (dropAction === 'move')
              ? '#00FF00'
              : (dropAction === 'swap')
                ? '#FFD700'
                : (dropAction === 'blocked')
                  ? '#FF6B6B'
                  : '#FFF',
            fontSize: '9px',
            fontWeight: 'bold',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
          }}>
            {(dropAction === 'move') ? 'MOVE' : (dropAction === 'swap') ? 'SWAP' : (dropAction === 'blocked') ? 'BLOCKED' : '...'}
          </div>
        </div>
      )}

      {/* Dynamic Drag instructions */}
      <div style={{
        position: 'absolute',
        top: '70px',
        right: '20px',
        background: 'linear-gradient(135deg, rgba(0,0,0,0.9), rgba(20,20,40,0.9))',
        color: '#fff',
        padding: '12px 16px',
        borderRadius: '12px',
        fontSize: '12px',
        border: dropAction === 'move'
          ? '1px solid #00FF00'
          : dropAction === 'swap'
            ? '1px solid #FFD700'
            : '1px solid #FF6B6B',
        boxShadow: dropAction === 'move'
          ? '0 0 15px rgba(0,255,0,0.4)'
          : dropAction === 'swap'
            ? '0 0 15px rgba(255,215,0,0.4)'
            : '0 0 15px rgba(255,107,107,0.4)',
        zIndex: 30,
        textAlign: 'center',
        pointerEvents: 'none',
        minWidth: '180px'
      }}>
        <div style={{
          fontWeight: 'bold',
          color: dropAction === 'move'
            ? '#00FF00'
            : dropAction === 'swap'
              ? '#FFD700'
              : '#FF6B6B',
          marginBottom: '6px',
          fontSize: '11px'
        }}>
          <Target size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {draggedBar?.name}
        </div>

        {dragOverPosition && dropAction && (
          <>
            <div style={{
              fontSize: '10px',
              color: '#CCC',
              marginBottom: '4px'
            }}>
              Target: ({dragOverPosition.row}, {dragOverPosition.col})
            </div>

            <div style={{
              fontSize: '10px',
              fontWeight: 'bold',
              color: dropAction === 'move'
                ? '#00FF00'
                : dropAction === 'swap'
                  ? '#FFD700'
                  : '#FF6B6B'
            }}>
              {dropAction === 'move' && <><CheckCircle size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Drop to move to empty position</>}
              {dropAction === 'swap' && <><RefreshCw size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Drop to swap with existing bar</>}
              {dropAction === 'blocked' && <><XOctagon size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Cannot drop in blocked zone</>}
            </div>
          </>
        )}

        {(!dragOverPosition || !dropAction) && (
          <div style={{
            fontSize: '10px',
            color: '#CCC'
          }}>
            <Target size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Move to target position
          </div>
        )}
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes dropZonePulse {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.8;
          }
          50% {
            transform: translate(0, 0) scale(1.1);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
};

export default DragDropIndicator;
