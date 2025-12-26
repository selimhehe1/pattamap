import React, { Suspense, lazy } from 'react';
import { MapIcon } from 'lucide-react';
import { Establishment } from '../../types';
import { IndependentPosition } from '../../hooks/useFreelances';

// Lazy load all zone maps for better performance (code splitting)
const CustomSoi6Map = lazy(() => import('./CustomSoi6Map'));
const CustomSoiBuakhaoMap = lazy(() => import('./CustomSoiBuakhaoMap'));
const CustomBeachRoadMap = lazy(() => import('./CustomBeachRoadMap'));
const CustomWalkingStreetMap = lazy(() => import('./CustomWalkingStreetMap'));
const CustomLKMetroMap = lazy(() => import('./CustomLKMetroMap'));
const CustomTreetownMap = lazy(() => import('./CustomTreetownMap'));

interface ZoneMapRendererProps {
  currentZone: string;
  establishments: Establishment[];
  freelances?: IndependentPosition[]; // Independent position employees
  onEstablishmentClick?: (establishment: Establishment) => void;
  selectedEstablishment?: string;
  onEstablishmentUpdate?: () => Promise<void>;
}

const ZoneMapRenderer: React.FC<ZoneMapRendererProps> = ({
  currentZone,
  establishments,
  freelances = [],
  onEstablishmentClick,
  selectedEstablishment,
  onEstablishmentUpdate
}) => {
  // Filter establishments by zone - now handled by the grid system
  const filterEstablishmentsByZone = (zone: string) => {
    // Filter by zone field from database
    return establishments.filter(est => est.zone === zone);
  };

  // Filter freelances by zone
  const filterFreelancesByZone = (zone: string) => {
    return freelances.filter(freelance => freelance.zone === zone);
  };

  const zoneEstablishments = filterEstablishmentsByZone(currentZone);
  const zoneFreelances = filterFreelancesByZone(currentZone);

  const renderZoneMap = () => {
    switch (currentZone) {
      case 'soi6':
        return (
          <CustomSoi6Map
            establishments={zoneEstablishments}
            onEstablishmentClick={onEstablishmentClick}
            selectedEstablishment={selectedEstablishment}
            onEstablishmentUpdate={onEstablishmentUpdate}
          />
        );

      case 'walkingstreet':
        return (
          <CustomWalkingStreetMap
            establishments={zoneEstablishments}
            onEstablishmentClick={onEstablishmentClick}
            selectedEstablishment={selectedEstablishment}
            onEstablishmentUpdate={onEstablishmentUpdate}
          />
        );

      case 'lkmetro':
        return (
          <CustomLKMetroMap
            establishments={zoneEstablishments}
            onEstablishmentClick={onEstablishmentClick}
            selectedEstablishment={selectedEstablishment}
            onEstablishmentUpdate={onEstablishmentUpdate}
          />
        );

      case 'soibuakhao':
        return (
          <CustomSoiBuakhaoMap
            establishments={zoneEstablishments}
            onEstablishmentClick={onEstablishmentClick}
            selectedEstablishment={selectedEstablishment}
            onEstablishmentUpdate={onEstablishmentUpdate}
          />
        );

      case 'beachroad':
        return (
          <CustomBeachRoadMap
            establishments={zoneEstablishments}
            freelances={zoneFreelances}
            onEstablishmentClick={onEstablishmentClick}
            selectedEstablishment={selectedEstablishment}
            onEstablishmentUpdate={onEstablishmentUpdate}
          />
        );

      case 'treetown':
        return (
          <CustomTreetownMap
            establishments={zoneEstablishments}
            onEstablishmentClick={onEstablishmentClick}
            selectedEstablishment={selectedEstablishment}
            onEstablishmentUpdate={onEstablishmentUpdate}
          />
        );

      default:
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontSize: '24px',
            fontWeight: 'bold'
          }}>
            <MapIcon size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Zone non reconnue: {currentZone}
            <div style={{ fontSize: '14px', marginTop: '10px', opacity: 0.8 }}>
              Sélectionnez une zone spécifique pour une vue détaillée
            </div>
          </div>
        );
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <Suspense
        fallback={
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            background: 'linear-gradient(135deg, #0a0a2e 0%, #16213e 100%)',
            color: '#C19A6B'
          }}>
            <div style={{
              fontSize: '48px',
              animation: 'pulse 1.5s ease-in-out infinite'
            }}>
              <MapIcon size={48} />
            </div>
            <div style={{
              fontSize: '18px',
              marginTop: '20px',
              color: '#FFD700'
            }}>
              Loading map...
            </div>
            <style>{`
              @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.8; }
              }
            `}</style>
          </div>
        }
      >
        {renderZoneMap()}
      </Suspense>
    </div>
  );
};

export default ZoneMapRenderer;