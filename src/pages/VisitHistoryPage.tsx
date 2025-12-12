import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useSecureFetch } from '../hooks/useSecureFetch';
import SEOHead from '../components/Common/SEOHead';
import '../styles/pages/visit-history.css';

interface CheckIn {
  id: string;
  user_id: string;
  establishment_id: string;
  latitude: number;
  longitude: number;
  verified: boolean;
  distance_meters: number;
  created_at: string;
  establishment: {
    id: string;
    name: string;
    zone: string;
  };
}

interface GroupedCheckIns {
  label: string;
  key: string;
  checkIns: CheckIn[];
}

const VisitHistoryPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { secureFetch } = useSecureFetch();

  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [verifiedFilter, setVerifiedFilter] = useState<string>('all');

  // Fetch check-ins
  useEffect(() => {
    const fetchCheckIns = async () => {
      if (!user) return;

      setLoading(true);
      setError(null);

      try {
        const response = await secureFetch(
          `${import.meta.env.VITE_API_URL}/api/gamification/my-check-ins?limit=100`
        );

        if (response.ok) {
          const data = await response.json();
          setCheckIns(data.checkIns || []);
        } else {
          setError(t('visitHistory.fetchError', 'Failed to load visit history'));
        }
      } catch (err) {
        setError(t('visitHistory.fetchError', 'Failed to load visit history'));
      } finally {
        setLoading(false);
      }
    };

    fetchCheckIns();
  }, [user, secureFetch, t]);

  // Get unique zones for filter
  const uniqueZones = useMemo(() => {
    const zones = new Set(checkIns.map(c => c.establishment?.zone).filter(Boolean));
    return Array.from(zones).sort();
  }, [checkIns]);

  // Filter check-ins
  const filteredCheckIns = useMemo(() => {
    return checkIns.filter(checkIn => {
      if (zoneFilter !== 'all' && checkIn.establishment?.zone !== zoneFilter) {
        return false;
      }
      if (verifiedFilter === 'verified' && !checkIn.verified) {
        return false;
      }
      if (verifiedFilter === 'unverified' && checkIn.verified) {
        return false;
      }
      return true;
    });
  }, [checkIns, zoneFilter, verifiedFilter]);

  // Group check-ins by date
  const groupedCheckIns = useMemo((): GroupedCheckIns[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const groups: Record<string, CheckIn[]> = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: []
    };

    filteredCheckIns.forEach(checkIn => {
      const checkInDate = new Date(checkIn.created_at);
      const checkInDay = new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate());

      if (checkInDay.getTime() === today.getTime()) {
        groups.today.push(checkIn);
      } else if (checkInDay.getTime() === yesterday.getTime()) {
        groups.yesterday.push(checkIn);
      } else if (checkInDay >= weekAgo) {
        groups.thisWeek.push(checkIn);
      } else {
        groups.older.push(checkIn);
      }
    });

    const result: GroupedCheckIns[] = [];

    if (groups.today.length > 0) {
      result.push({
        label: t('visitHistory.today', 'Today'),
        key: 'today',
        checkIns: groups.today
      });
    }
    if (groups.yesterday.length > 0) {
      result.push({
        label: t('visitHistory.yesterday', 'Yesterday'),
        key: 'yesterday',
        checkIns: groups.yesterday
      });
    }
    if (groups.thisWeek.length > 0) {
      result.push({
        label: t('visitHistory.thisWeek', 'This Week'),
        key: 'thisWeek',
        checkIns: groups.thisWeek
      });
    }
    if (groups.older.length > 0) {
      result.push({
        label: t('visitHistory.older', 'Older'),
        key: 'older',
        checkIns: groups.older
      });
    }

    return result;
  }, [filteredCheckIns, t]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalVisits = checkIns.length;
    const uniqueZonesCount = new Set(checkIns.map(c => c.establishment?.zone).filter(Boolean)).size;
    const verifiedCount = checkIns.filter(c => c.verified).length;
    return { totalVisits, uniqueZonesCount, verifiedCount };
  }, [checkIns]);

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Not logged in
  if (!user) {
    return (
      <div className="visit-history-page">
        <div className="visit-history-container">
          <div className="visit-history-error">
            <h2>🔒 {t('visitHistory.loginRequired', 'Login Required')}</h2>
            <p>{t('visitHistory.loginMessage', 'Please log in to view your visit history.')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title={`${t('visitHistory.title', 'My Visit History')} - PattaMap`}
        description={t('visitHistory.description', 'Track your visits and check-ins across Pattaya')}
        canonical="/my-visits"
      />

      <div className="visit-history-page">
        <div className="visit-history-container">
          {/* Header */}
          <div className="visit-history-header">
            <h1>📍 {t('visitHistory.title', 'My Visit History')}</h1>
            <p className="visit-history-subtitle">
              {t('visitHistory.subtitle', 'Track your check-ins and verified visits')}
            </p>
          </div>

          {/* Stats Row */}
          <div className="visit-stats-row">
            <div className="visit-stat-card">
              <div className="visit-stat-icon">📍</div>
              <div className="visit-stat-value">{stats.totalVisits}</div>
              <div className="visit-stat-label">{t('visitHistory.totalVisits', 'Total Visits')}</div>
            </div>
            <div className="visit-stat-card">
              <div className="visit-stat-icon">🗺️</div>
              <div className="visit-stat-value">{stats.uniqueZonesCount}</div>
              <div className="visit-stat-label">{t('visitHistory.zonesVisited', 'Zones Visited')}</div>
            </div>
            <div className="visit-stat-card">
              <div className="visit-stat-icon">✓</div>
              <div className="visit-stat-value">{stats.verifiedCount}</div>
              <div className="visit-stat-label">{t('visitHistory.verified', 'Verified')}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="visit-filters">
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="visit-filter-select"
            >
              <option value="all">{t('visitHistory.allZones', 'All Zones')}</option>
              {uniqueZones.map(zone => (
                <option key={zone} value={zone}>{zone}</option>
              ))}
            </select>

            <select
              value={verifiedFilter}
              onChange={(e) => setVerifiedFilter(e.target.value)}
              className="visit-filter-select"
            >
              <option value="all">{t('visitHistory.allStatus', 'All Status')}</option>
              <option value="verified">{t('visitHistory.verifiedOnly', 'Verified Only')}</option>
              <option value="unverified">{t('visitHistory.unverifiedOnly', 'Unverified Only')}</option>
            </select>
          </div>

          {/* Content */}
          <div className="visit-history-content">
            {loading ? (
              <div className="visit-history-loading">
                <div className="visit-spinner"></div>
                <p>{t('visitHistory.loading', 'Loading your visits...')}</p>
              </div>
            ) : error ? (
              <div className="visit-history-error">
                <p>❌ {error}</p>
              </div>
            ) : filteredCheckIns.length === 0 ? (
              <div className="visit-history-empty">
                <div className="visit-empty-icon">📍</div>
                <h3>{t('visitHistory.noVisits', 'No visits yet')}</h3>
                <p>{t('visitHistory.noVisitsMessage', 'Start exploring and check in at establishments to track your visits!')}</p>
              </div>
            ) : (
              <div className="visit-timeline">
                {groupedCheckIns.map(group => (
                  <div key={group.key} className="visit-group">
                    <h3 className="visit-group-title">{group.label}</h3>
                    <div className="visit-group-cards">
                      {group.checkIns.map(checkIn => (
                        <div key={checkIn.id} className="visit-card">
                          <div className="visit-card-header">
                            <div className="visit-card-name">
                              🏢 {checkIn.establishment?.name || 'Unknown'}
                            </div>
                            {checkIn.verified && (
                              <div className="visit-verified-badge">
                                ✓ {t('visitHistory.verified', 'Verified')}
                              </div>
                            )}
                          </div>
                          <div className="visit-card-zone">
                            📍 {checkIn.establishment?.zone || 'Unknown Zone'}
                          </div>
                          <div className="visit-card-date">
                            📅 {formatDate(checkIn.created_at)}
                          </div>
                          <div className="visit-card-distance">
                            📏 {Math.round(checkIn.distance_meters || 0)}m {t('visitHistory.away', 'away')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default VisitHistoryPage;
