import React, { useState } from 'react';
import { MapPin, Check, AlertTriangle, XCircle, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGamification } from '../../contexts/GamificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useOnline } from '../../hooks/useOnline';
import { addToQueue, isOfflineQueueSupported } from '../../utils/offlineQueue';
import './CheckInButton.css';

interface CheckInButtonProps {
  establishmentId: string;
  establishmentName: string;
  establishmentLat: number;
  establishmentLng: number;
  compact?: boolean;
}

interface CheckInResult {
  verified: boolean;
  distance?: number;
  xpAwarded?: number;
  message: string;
}

const CheckInButton: React.FC<CheckInButtonProps> = ({
  establishmentId,
  establishmentName,
  establishmentLat,
  establishmentLng,
  compact = false
}) => {
  const { t } = useTranslation();
  const { awardXP } = useGamification();
  const { user } = useAuth();
  const { isOnline } = useOnline();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Haversine formula to calculate distance (for preview)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const handleCheckIn = async () => {
    if (!user) {
      setError(t('gamification.checkIn.loginRequired'));
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Request geolocation permission
      if (!navigator.geolocation) {
        throw new Error(t('gamification.checkIn.geolocationNotSupported'));
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const _distance = calculateDistance(latitude, longitude, establishmentLat, establishmentLng); // For debug

          // 🆕 Offline queue support - queue check-in if offline
          if (!isOnline && isOfflineQueueSupported()) {
            try {
              await addToQueue(
                `${import.meta.env.VITE_API_URL}/api/gamification/check-in`,
                'POST',
                { establishmentId, latitude, longitude },
                { description: `Check-in: ${establishmentName}` }
              );

              setResult({
                verified: false,
                message: t('gamification.checkIn.queuedOffline')
              });
              setLoading(false);
              return;
            } catch (queueError) {
              console.error('[CheckIn] Failed to queue offline:', queueError);
              // Continue to try online request as fallback
            }
          }

          try {
            // Call check-in API
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/gamification/check-in`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                establishmentId,
                latitude,
                longitude
              })
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || t('gamification.checkIn.failed'));
            }

            const data = await response.json();

            setResult({
              verified: data.verified,
              distance: data.distance,
              xpAwarded: data.xpAwarded,
              message: data.message
            });

            // Award XP via context (triggers toast notification)
            if (data.verified && data.xpAwarded) {
              await awardXP(data.xpAwarded, 'check_in', 'establishment', establishmentId);
            }
          } catch (apiError: unknown) {
            const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown error';
            setError(errorMessage || t('gamification.checkIn.verificationFailed'));
          } finally {
            setLoading(false);
          }
        },
        (geoError) => {
          setLoading(false);
          switch (geoError.code) {
            case geoError.PERMISSION_DENIED:
              setError(t('gamification.checkIn.permissionDenied'));
              break;
            case geoError.POSITION_UNAVAILABLE:
              setError(t('gamification.checkIn.positionUnavailable'));
              break;
            case geoError.TIMEOUT:
              setError(t('gamification.checkIn.timeout'));
              break;
            default:
              setError(t('gamification.checkIn.unknownError'));
              break;
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } catch (error: unknown) {
      setLoading(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage || t('gamification.checkIn.locationFailed'));
    }
  };

  return (
    <div className={`checkin-button-container ${compact ? 'checkin-compact' : ''}`}>
      <button
        onClick={handleCheckIn}
        disabled={loading || !user}
        className={`checkin-button ${loading ? 'checkin-loading' : ''}`}
      >
        {loading ? (
          <>
            <span className="checkin-spinner" />
            <span>{t('gamification.checkIn.verifying')}</span>
          </>
        ) : (
          <>
            <span className="checkin-icon"><MapPin size={16} /></span>
            <span>{compact ? t('gamification.checkIn.button') : t('gamification.checkIn.buttonFull')}</span>
          </>
        )}
      </button>

      {/* Result Message */}
      {result && (
        <div className={`checkin-result ${result.verified ? 'checkin-success' : 'checkin-warning'}`}>
          {result.verified ? (
            <>
              <span className="checkin-result-icon"><Check size={16} /></span>
              <div className="checkin-result-content">
                <div className="checkin-result-title">{t('gamification.checkIn.verified')}</div>
                <div className="checkin-result-message">
                  +{result.xpAwarded} {t('gamification.xp.points')} · {Math.round(result.distance || 0)}m {t('gamification.checkIn.away')}
                </div>
              </div>
            </>
          ) : (
            <>
              <span className="checkin-result-icon"><AlertTriangle size={16} /></span>
              <div className="checkin-result-content">
                <div className="checkin-result-title">{t('gamification.checkIn.tooFar')}</div>
                <div className="checkin-result-message">
                  {t('gamification.checkIn.withinRange', { distance: Math.round(result.distance || 0) })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="checkin-error">
          <span className="checkin-error-icon"><XCircle size={16} /></span>
          <div className="checkin-error-message">{error}</div>
        </div>
      )}

      {/* Info Hint */}
      {!user && (
        <div className="checkin-hint">
          <span><Lock size={14} /></span>
          <span>{t('gamification.checkIn.loginRequired')}</span>
        </div>
      )}
    </div>
  );
};

export default CheckInButton;
