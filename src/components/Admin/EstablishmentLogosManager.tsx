import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { Establishment } from '../../types';
import EstablishmentLogo from './EstablishmentLogo';
import { logger } from '../../utils/logger';

interface EstablishmentLogosManagerProps {
  onClose: () => void;
}

const EstablishmentLogosManager: React.FC<EstablishmentLogosManagerProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedZone, setSelectedZone] = useState<string>('all');

  useEffect(() => {
    loadEstablishments();
  }, []);

  const loadEstablishments = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/establishments?status=approved&limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(t('establishmentLogosManager.errorLoadFailed'));
      }

      const data = await response.json();
      setEstablishments(data.establishments || []);

    } catch (error) {
      logger.error('Load establishments error:', error);
      setError(error instanceof Error ? error.message : t('establishmentLogosManager.errorLoadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpdated = (establishmentId: string, logoUrl: string) => {
    setEstablishments(prev =>
      prev.map(est =>
        est.id === establishmentId
          ? { ...est, logo_url: logoUrl || undefined }
          : est
      )
    );
  };

  // Filter establishments
  const filteredEstablishments = establishments.filter(est => {
    const matchesSearch = est.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesZone = selectedZone === 'all' || est.zone === selectedZone;
    return matchesSearch && matchesZone;
  });

  // Separate establishments with and without logos
  const withLogos = filteredEstablishments.filter(est => est.logo_url);
  const withoutLogos = filteredEstablishments.filter(est => !est.logo_url);

  const zones = establishments.map(est => est.zone).filter(Boolean).filter((zone, index, arr) => arr.indexOf(zone) === index);

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }} role="dialog" aria-modal="true">
        <div style={{
          color: '#C19A6B',
          fontSize: '18px',
          textAlign: 'center'
        }}>
          ⏳ {t('establishmentLogosManager.loadingEstablishments')}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }} role="dialog" aria-modal="true">
      <div style={{
        background: 'linear-gradient(135deg, rgba(15,15,15,0.95), rgba(30,30,30,0.95))',
        borderRadius: '20px',
        padding: '30px',
        width: '90%',
        maxWidth: '1000px',
        maxHeight: '90vh',
        overflow: 'hidden',
        border: '2px solid rgba(193, 154, 107,0.3)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.8)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '25px'
        }}>
          <h2 style={{
            color: '#C19A6B',
            fontSize: '24px',
            fontWeight: 'bold',
            margin: 0,
            textShadow: '0 0 10px rgba(193, 154, 107,0.5)'
          }}>
            🏢 {t('establishmentLogosManager.title')}
          </h2>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '5px',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
           aria-label="Close">
            ✖️
          </button>
        </div>

        {/* Filters */}
        <div style={{
          display: 'flex',
          gap: '15px',
          marginBottom: '20px',
          flexWrap: 'wrap'
        }}>
          <input
            type="text"
            placeholder={`🔍 ${t('establishmentLogosManager.searchPlaceholder')}`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid rgba(193, 154, 107,0.3)',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              fontSize: '14px'
            }}
          />

          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            style={{
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid rgba(193, 154, 107,0.3)',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              fontSize: '14px',
              minWidth: '120px'
            }}
          >
            <option value="all">{t('establishmentLogosManager.allZones')}</option>
            {zones.map(zone => (
              <option key={zone} value={zone}>{zone}</option>
            ))}
          </select>
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex',
          gap: '15px',
          marginBottom: '20px',
          flexWrap: 'wrap'
        }}>
          <div style={{
            background: 'rgba(0,255,127,0.1)',
            border: '1px solid rgba(0,255,127,0.3)',
            borderRadius: '8px',
            padding: '10px 15px',
            color: '#00FF7F',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            ✅ {t('establishmentLogosManager.withLogos', { count: withLogos.length })}
          </div>

          <div style={{
            background: 'rgba(255,215,0,0.1)',
            border: '1px solid rgba(255,215,0,0.3)',
            borderRadius: '8px',
            padding: '10px 15px',
            color: '#FFD700',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            ⚠️ {t('establishmentLogosManager.missingLogos', { count: withoutLogos.length })}
          </div>

          <div style={{
            background: 'rgba(193, 154, 107,0.1)',
            border: '1px solid rgba(193, 154, 107,0.3)',
            borderRadius: '8px',
            padding: '10px 15px',
            color: '#C19A6B',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            📊 {t('establishmentLogosManager.total', { count: filteredEstablishments.length })}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            color: '#FF4757',
            fontSize: '14px',
            marginBottom: '20px',
            padding: '10px',
            background: 'rgba(255,71,87,0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(255,71,87,0.3)'
          }}>
            ❌ {error}
          </div>
        )}

        {/* Establishments List */}
        <div style={{
          maxHeight: '50vh',
          overflowY: 'auto',
          paddingRight: '10px'
        }}>
          {/* Missing Logos Section */}
          {withoutLogos.length > 0 && (
            <div>
              <h3 style={{
                color: '#FFD700',
                fontSize: '16px',
                fontWeight: 'bold',
                marginBottom: '15px',
                marginTop: 0
              }}>
                ⚠️ {t('establishmentLogosManager.missingLogosSection', { count: withoutLogos.length })}
              </h3>

              {withoutLogos.map(establishment => (
                <EstablishmentLogo
                  key={establishment.id}
                  establishment={establishment}
                  onLogoUpdated={handleLogoUpdated}
                />
              ))}
            </div>
          )}

          {/* With Logos Section */}
          {withLogos.length > 0 && (
            <div>
              <h3 style={{
                color: '#00FF7F',
                fontSize: '16px',
                fontWeight: 'bold',
                marginBottom: '15px',
                marginTop: withoutLogos.length > 0 ? '25px' : 0
              }}>
                ✅ {t('establishmentLogosManager.withLogosSection', { count: withLogos.length })}
              </h3>

              {withLogos.map(establishment => (
                <EstablishmentLogo
                  key={establishment.id}
                  establishment={establishment}
                  onLogoUpdated={handleLogoUpdated}
                />
              ))}
            </div>
          )}

          {/* No Results */}
          {filteredEstablishments.length === 0 && !loading && (
            <div style={{
              textAlign: 'center',
              color: '#999',
              fontSize: '16px',
              padding: '40px'
            }}>
              {t('establishmentLogosManager.noResults')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EstablishmentLogosManager;