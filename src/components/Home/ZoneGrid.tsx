/**
 * ZoneGrid - Homepage component displaying zone cards
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Users, Sparkles, TreePine, Building2, Waves, Heart } from 'lucide-react';
import '../../styles/components/zone-grid.css';

interface ZoneInfo {
  id: string;
  nameKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
  gradient: string;
}

const zones: ZoneInfo[] = [
  {
    id: 'soi6',
    nameKey: 'zones.soi6',
    descriptionKey: 'zones.soi6Description',
    icon: <Users size={32} />,
    gradient: 'linear-gradient(135deg, #E879F9 0%, #9D4EDD 100%)'
  },
  {
    id: 'walkingstreet',
    nameKey: 'zones.walkingstreet',
    descriptionKey: 'zones.walkingstreetDescription',
    icon: <Sparkles size={32} />,
    gradient: 'linear-gradient(135deg, #F472B6 0%, #E879F9 100%)'
  },
  {
    id: 'lkmetro',
    nameKey: 'zones.lkmetro',
    descriptionKey: 'zones.lkmetroDescription',
    icon: <Building2 size={32} />,
    gradient: 'linear-gradient(135deg, #00E5FF 0%, #9D4EDD 100%)'
  },
  {
    id: 'treetown',
    nameKey: 'zones.treetown',
    descriptionKey: 'zones.treetownDescription',
    icon: <TreePine size={32} />,
    gradient: 'linear-gradient(135deg, #10B981 0%, #00E5FF 100%)'
  },
  {
    id: 'soibuakhao',
    nameKey: 'zones.soibuakhao',
    descriptionKey: 'zones.soibuakhaoDescription',
    icon: <MapPin size={32} />,
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #E879F9 100%)'
  },
  {
    id: 'beachroad',
    nameKey: 'zones.beachroad',
    descriptionKey: 'zones.beachroadDescription',
    icon: <Waves size={32} />,
    gradient: 'linear-gradient(135deg, #06B6D4 0%, #00E5FF 100%)'
  },
  {
    id: 'freelance',
    nameKey: 'zones.freelance',
    descriptionKey: 'zones.freelanceDescription',
    icon: <Heart size={32} />,
    gradient: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)'
  }
];

const ZoneGrid: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleZoneClick = (zoneId: string) => {
    // Freelance is a special case - shows employees via search
    // All other zones show establishments
    if (zoneId === 'freelance') {
      navigate(`/search?zone=${zoneId}`);
    } else {
      navigate(`/establishments?zone=${zoneId}`);
    }
  };

  return (
    <div className="zone-grid-container">
      <div className="zone-grid-header">
        <h1 className="zone-grid-title">
          {t('home.selectZone', 'Select a Zone')}
        </h1>
        <p className="zone-grid-subtitle">
          {t('home.exploreNightlife', 'Explore Pattaya nightlife by area')}
        </p>
      </div>

      <div className="zone-grid">
        {zones.map((zone) => (
          <button
            key={zone.id}
            className="zone-card"
            onClick={() => handleZoneClick(zone.id)}
            style={{ '--zone-gradient': zone.gradient } as React.CSSProperties}
          >
            <div className="zone-card-icon">
              {zone.icon}
            </div>
            <div className="zone-card-content">
              <h2 className="zone-card-name">
                {t(zone.nameKey, zone.id)}
              </h2>
              <p className="zone-card-description">
                {t(zone.descriptionKey, '')}
              </p>
            </div>
            <div className="zone-card-arrow">
              <MapPin size={20} />
            </div>
          </button>
        ))}
      </div>

      {/* Quick access to full search */}
      <div className="zone-grid-footer">
        <button
          className="zone-search-all-btn"
          onClick={() => navigate('/search')}
        >
          {t('home.searchAll', 'Search All Zones')}
        </button>
      </div>
    </div>
  );
};

export default ZoneGrid;
