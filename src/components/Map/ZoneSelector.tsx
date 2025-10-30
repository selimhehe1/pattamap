import React from 'react';
import { useTranslation } from 'react-i18next';

interface Zone {
  id: string;
  name: string;
  center: [number, number];
  zoom: number;
  bounds: [[number, number], [number, number]];
  color: string;
  icon: string;
}

interface ZoneSelectorProps {
  currentZone: string;
  onZoneChange: (zone: Zone) => void;
}

const ZONES: Zone[] = [
  {
    id: 'soi6',
    name: 'Soi 6',
    center: [12.9422, 100.8865],
    zoom: 25, // ZOOM GOOGLE MAPS STYLE - ultra détaillé
    bounds: [[12.9410, 100.8850], [12.9430, 100.8885]],
    color: '#C19A6B',
    icon: '🍺'
  },
  {
    id: 'walkingstreet',
    name: 'Walking Street',
    center: [12.9235, 100.8776],
    zoom: 18,
    bounds: [[12.9220, 100.8760], [12.9250, 100.8795]],
    color: '#9B5DE5',
    icon: '🌃'
  },
  {
    id: 'lkmetro',
    name: 'LK Metro',
    center: [12.9300, 100.8800],
    zoom: 17,
    bounds: [[12.9280, 100.8780], [12.9320, 100.8820]],
    color: '#00F5FF',
    icon: '🏢'
  },
  {
    id: 'treetown',
    name: 'Tree Town',
    center: [12.9276, 100.8776],
    zoom: 14,
    bounds: [[12.9000, 100.8500], [12.9500, 100.9000]],
    color: '#32CD32',
    icon: '🌳'
  },
  {
    id: 'soibuakhao',
    name: 'Soi Buakhao',
    center: [12.9350, 100.8830],
    zoom: 17,
    bounds: [[12.9330, 100.8810], [12.9370, 100.8850]],
    color: '#FFD700',
    icon: '🏙️'
  },
  {
    id: 'jomtiencomplex',
    name: 'Jomtien Complex',
    center: [12.9000, 100.8850],
    zoom: 17,
    bounds: [[12.8980, 100.8830], [12.9020, 100.8870]],
    color: '#BA55D3',
    icon: '🌈'
  },
  {
    id: 'boyztown',
    name: 'BoyzTown',
    center: [12.9230, 100.8770],
    zoom: 18,
    bounds: [[12.9220, 100.8760], [12.9240, 100.8780]],
    color: '#FF1493',
    icon: '🌈'
  },
  {
    id: 'soi78',
    name: 'Soi 7 & 8',
    center: [12.9420, 100.8860],
    zoom: 18,
    bounds: [[12.9410, 100.8850], [12.9430, 100.8870]],
    color: '#FFA500',
    icon: '🍻'
  },
  {
    id: 'beachroad',
    name: 'Beach Road',
    center: [12.9250, 100.8770],
    zoom: 16,
    bounds: [[12.9200, 100.8750], [12.9300, 100.8790]],
    color: '#00BFFF',
    icon: '🌊'
  }
];

const ZoneSelector: React.FC<ZoneSelectorProps> = ({ currentZone, onZoneChange }) => {
  const { t } = useTranslation();

  // Helper to map zone IDs to translation keys
  const getZoneTranslationKey = (zoneId: string): string => {
    const mapping: Record<string, string> = {
      'jomtiencomplex': 'jomtien',
      'soi78': 'soi7and8'
    };
    return mapping[zoneId] || zoneId;
  };

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '20px',
      zIndex: 1000,
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap'
    }}>
      {ZONES.map(zone => (
        <button
          key={zone.id}
          onClick={() => onZoneChange(zone)}
          style={{
            padding: '8px 12px',
            border: currentZone === zone.id ? `2px solid ${zone.color}` : '2px solid transparent',
            backgroundColor: currentZone === zone.id ? zone.color : 'rgba(0,0,0,0.8)',
            color: currentZone === zone.id ? 'white' : '#fff',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            transition: 'all 0.3s ease',
            transform: currentZone === zone.id ? 'scale(1.05)' : 'scale(1)'
          }}
          onMouseEnter={(e) => {
            if (currentZone !== zone.id) {
              e.currentTarget.style.backgroundColor = zone.color;
              e.currentTarget.style.opacity = '0.8';
            }
          }}
          onMouseLeave={(e) => {
            if (currentZone !== zone.id) {
              e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.8)';
              e.currentTarget.style.opacity = '1';
            }
          }}
        >
          <span>{zone.icon}</span>
          <span>{t(`map.zoneNames.${getZoneTranslationKey(zone.id)}`)}</span>
        </button>
      ))}
      
    </div>
  );
};

export { ZoneSelector, ZONES };
export type { Zone };