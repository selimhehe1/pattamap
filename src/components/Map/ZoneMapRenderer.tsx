import React from 'react';
import { Establishment } from '../../types';
import CustomSoi6Map from './CustomSoi6Map';
import CustomSoiBuakhaoMap from './CustomSoiBuakhaoMap';
import CustomJomtienComplexMap from './CustomJomtienComplexMap';
import CustomBoyzTownMap from './CustomBoyzTownMap';
import CustomSoi78Map from './CustomSoi78Map';
import CustomBeachRoadMap from './CustomBeachRoadMap';
import CustomWalkingStreetMap from './CustomWalkingStreetMap';
import CustomLKMetroMap from './CustomLKMetroMap';
import CustomTreetownMap from './CustomTreetownMap';

interface ZoneMapRendererProps {
  currentZone: string;
  establishments: Establishment[];
  freelances?: any[]; // Independent position employees
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

      case 'jomtiencomplex':
        return (
          <CustomJomtienComplexMap
            establishments={zoneEstablishments}
            onEstablishmentClick={onEstablishmentClick}
            selectedEstablishment={selectedEstablishment}
            onEstablishmentUpdate={onEstablishmentUpdate}
          />
        );

      case 'boyztown':
        return (
          <CustomBoyzTownMap
            establishments={zoneEstablishments}
            onEstablishmentClick={onEstablishmentClick}
            selectedEstablishment={selectedEstablishment}
            onEstablishmentUpdate={onEstablishmentUpdate}
          />
        );

      case 'soi78':
        return (
          <CustomSoi78Map
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
            🗺️ Zone non reconnue: {currentZone}
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
      {renderZoneMap()}
    </div>
  );
};

export default ZoneMapRenderer;