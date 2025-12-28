import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Database,
  Server,
  Clock,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useSecureFetch } from '../hooks/useSecureFetch';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version?: string;
  services: {
    database: boolean;
    redis?: boolean;
    sentry?: boolean;
  };
  memory?: {
    used: number;
    total: number;
    percentage: number;
  };
}

const STATUS_COLORS = {
  healthy: '#22c55e',
  degraded: '#f59e0b',
  unhealthy: '#ef4444',
};

const STATUS_ICONS = {
  healthy: CheckCircle,
  degraded: AlertTriangle,
  unhealthy: XCircle,
};

/**
 * AdminHealthDashboard - System health monitoring
 *
 * Displays real-time health metrics for the PattaMap backend
 */
const AdminHealthDashboard: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const { secureFetch } = useSecureFetch();

  const fetchHealth = useCallback(async () => {
    try {
      const response = await secureFetch('/api/health', { requireAuth: false });

      if (!response.ok) {
        throw new Error('Health check failed');
      }

      const data = await response.json();
      setHealth(data);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health status');
    } finally {
      setLoading(false);
    }
  }, [secureFetch]);

  // Initial fetch
  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    return parts.join(' ') || '< 1m';
  };

  const StatusIcon = health ? STATUS_ICONS[health.status] : Loader2;

  return (
    <div className="health-dashboard">
      <header className="health-dashboard__header">
        <h1>
          <Activity size={24} />
          System Health
        </h1>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="health-dashboard__refresh"
          aria-label="Refresh health status"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </header>

      {error && (
        <div className="health-dashboard__error" role="alert">
          <XCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {loading && !health ? (
        <div className="health-dashboard__loading">
          <Loader2 size={32} className="animate-spin" />
          <span>Loading health status...</span>
        </div>
      ) : health ? (
        <div className="health-dashboard__content">
          {/* Overall Status */}
          <div
            className="health-card health-card--status"
            style={{ borderColor: STATUS_COLORS[health.status] }}
          >
            <StatusIcon
              size={48}
              style={{ color: STATUS_COLORS[health.status] }}
            />
            <div>
              <h2>Overall Status</h2>
              <p
                className="health-card__value"
                style={{ color: STATUS_COLORS[health.status] }}
              >
                {health.status.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Services Grid */}
          <div className="health-dashboard__grid">
            {/* Database */}
            <div className="health-card">
              <Database size={24} />
              <div>
                <h3>Database</h3>
                <p className={health.services.database ? 'text-green' : 'text-red'}>
                  {health.services.database ? 'Connected' : 'Disconnected'}
                </p>
              </div>
              {health.services.database ? (
                <CheckCircle size={20} className="text-green" />
              ) : (
                <XCircle size={20} className="text-red" />
              )}
            </div>

            {/* Redis */}
            {health.services.redis !== undefined && (
              <div className="health-card">
                <Server size={24} />
                <div>
                  <h3>Redis Cache</h3>
                  <p className={health.services.redis ? 'text-green' : 'text-yellow'}>
                    {health.services.redis ? 'Connected' : 'Fallback Mode'}
                  </p>
                </div>
                {health.services.redis ? (
                  <CheckCircle size={20} className="text-green" />
                ) : (
                  <AlertTriangle size={20} className="text-yellow" />
                )}
              </div>
            )}

            {/* Uptime */}
            <div className="health-card">
              <Clock size={24} />
              <div>
                <h3>Uptime</h3>
                <p className="health-card__value">{formatUptime(health.uptime)}</p>
              </div>
            </div>

            {/* Memory */}
            {health.memory && (
              <div className="health-card">
                <Activity size={24} />
                <div>
                  <h3>Memory Usage</h3>
                  <p className="health-card__value">
                    {health.memory.percentage.toFixed(1)}%
                  </p>
                  <p className="health-card__subtext">
                    {Math.round(health.memory.used / 1024 / 1024)}MB /{' '}
                    {Math.round(health.memory.total / 1024 / 1024)}MB
                  </p>
                </div>
                <div
                  className="health-card__progress"
                  style={{
                    '--progress': `${health.memory.percentage}%`,
                    '--color':
                      health.memory.percentage > 80
                        ? '#ef4444'
                        : health.memory.percentage > 60
                        ? '#f59e0b'
                        : '#22c55e',
                  } as React.CSSProperties}
                />
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="health-dashboard__meta">
            {health.version && <span>Version: {health.version}</span>}
            <span>Last checked: {lastRefresh.toLocaleTimeString()}</span>
          </div>
        </div>
      ) : null}

      <style>{`
        .health-dashboard {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .health-dashboard__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .health-dashboard__header h1 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.5rem;
          color: var(--text-primary, #fff);
        }

        .health-dashboard__refresh {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: var(--bg-secondary, rgba(255,255,255,0.1));
          border: none;
          border-radius: 0.5rem;
          color: var(--text-secondary, #d1d5db);
          cursor: pointer;
          transition: all 0.2s;
        }

        .health-dashboard__refresh:hover {
          background: var(--bg-tertiary, rgba(255,255,255,0.15));
          color: var(--text-primary, #fff);
        }

        .health-dashboard__error {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 0.5rem;
          color: #ef4444;
          margin-bottom: 1.5rem;
        }

        .health-dashboard__loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 4rem;
          color: var(--text-muted, #9ca3af);
        }

        .health-dashboard__grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .health-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          background: var(--bg-secondary, rgba(255,255,255,0.05));
          border: 1px solid var(--border-color, rgba(255,255,255,0.1));
          border-radius: 0.75rem;
        }

        .health-card--status {
          border-width: 2px;
          padding: 1.5rem;
        }

        .health-card h2, .health-card h3 {
          font-size: 0.875rem;
          color: var(--text-muted, #9ca3af);
          margin: 0;
        }

        .health-card__value {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary, #fff);
          margin: 0.25rem 0 0;
        }

        .health-card__subtext {
          font-size: 0.75rem;
          color: var(--text-muted, #9ca3af);
          margin: 0.25rem 0 0;
        }

        .health-card__progress {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          width: var(--progress, 0%);
          background: var(--color, #22c55e);
          border-radius: 0 0 0.75rem 0.75rem;
        }

        .health-dashboard__meta {
          display: flex;
          justify-content: center;
          gap: 2rem;
          margin-top: 2rem;
          font-size: 0.875rem;
          color: var(--text-muted, #9ca3af);
        }

        .text-green { color: #22c55e; }
        .text-yellow { color: #f59e0b; }
        .text-red { color: #ef4444; }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AdminHealthDashboard;
