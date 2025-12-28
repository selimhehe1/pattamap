import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { useXPHistory, XPDataPoint } from '../../hooks/useXPHistory';
import '../../styles/features/gamification/XPHistoryGraph.css';

interface XPHistoryGraphProps {
  compact?: boolean;
  className?: string;
}

type PeriodType = 7 | 30 | 90;

const XPHistoryGraph: React.FC<XPHistoryGraphProps> = ({
  compact = false,
  className = ''
}) => {
  const { t } = useTranslation();
  const [activePeriod, setActivePeriod] = useState<PeriodType>(30);
  const { data, loading, error, refetch } = useXPHistory(activePeriod);

  const handlePeriodChange = async (period: PeriodType) => {
    setActivePeriod(period);
    await refetch(period);
  };

  // Format date for display
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Format XP value
  const formatXP = (value: number): string => {
    return value.toLocaleString();
  };

  // Get color for source
  const getSourceColor = (source: string): string => {
    const colors: Record<string, string> = {
      check_in: '#10b981',     // Green
      review: '#3b82f6',       // Blue
      mission: '#f59e0b',      // Amber
      badge: '#8b5cf6',        // Purple
      daily_login: '#ec4899',  // Pink
      other: '#6b7280'         // Gray
    };
    return colors[source] || colors.other;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ value: number; payload: XPDataPoint }>;
    label?: string;
  }) => {
    if (!active || !payload || payload.length === 0) return null;

    const dataPoint = payload[0].payload;
    const sources = dataPoint.sources || {};

    return (
      <div className="xp-history-tooltip">
        <div className="tooltip-date">{formatDate(label || '')}</div>
        <div className="tooltip-total">+{formatXP(dataPoint.xp)} XP</div>
        {Object.keys(sources).length > 0 && (
          <div className="tooltip-breakdown">
            {Object.entries(sources).map(([source, amount]) => (
              <div key={source} className="tooltip-source">
                <span
                  className="source-dot"
                  style={{ backgroundColor: getSourceColor(source) }}
                />
                <span className="source-name">
                  {t(`gamification.xpHistory.sources.${source}`, source)}
                </span>
                <span className="source-amount">+{amount}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render breakdown bar
  const renderBreakdown = () => {
    if (!data?.breakdown) return null;

    const total = Object.values(data.breakdown).reduce((sum, val) => sum + val, 0);
    if (total === 0) return null;

    const sortedSources = Object.entries(data.breakdown)
      .sort(([, a], [, b]) => b - a);

    return (
      <div className="xp-breakdown">
        <h4 className="breakdown-title">{t('gamification.xpHistory.breakdown')}</h4>
        <div className="breakdown-bar">
          {sortedSources.map(([source, amount]) => {
            const percentage = (amount / total) * 100;
            return (
              <div
                key={source}
                className="breakdown-segment"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: getSourceColor(source)
                }}
                title={`${t(`gamification.xpHistory.sources.${source}`, source)}: ${amount} XP (${percentage.toFixed(1)}%)`}
              />
            );
          })}
        </div>
        <div className="breakdown-legend">
          {sortedSources.map(([source, amount]) => {
            const percentage = ((amount / total) * 100).toFixed(0);
            return (
              <div key={source} className="legend-item">
                <span
                  className="legend-dot"
                  style={{ backgroundColor: getSourceColor(source) }}
                />
                <span className="legend-name">
                  {t(`gamification.xpHistory.sources.${source}`, source)}
                </span>
                <span className="legend-value">
                  {formatXP(amount)} XP ({percentage}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`xp-history-graph xp-history-loading ${className}`}>
        <div className="xp-history-skeleton">
          <div className="skeleton-header" />
          <div className="skeleton-chart" />
          <div className="skeleton-breakdown" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`xp-history-graph xp-history-error ${className}`}>
        <div className="error-icon">!</div>
        <p>{t('gamification.xpHistory.error')}</p>
        <button onClick={() => refetch(activePeriod)} className="retry-btn">
          {t('common.retry')}
        </button>
      </div>
    );
  }

  const chartData = data?.dataPoints || [];
  const hasData = chartData.some(point => point.xp > 0);

  return (
    <div className={`xp-history-graph ${compact ? 'xp-history-compact' : ''} ${className}`}>
      {/* Header */}
      <div className="xp-history-header">
        <h3 className="xp-history-title">
          {t('gamification.xpHistory.title')}
        </h3>
        <div className="xp-history-period-tabs">
          <button
            className={`period-tab ${activePeriod === 7 ? 'active' : ''}`}
            onClick={() => handlePeriodChange(7)}
          >
            7{t('gamification.xpHistory.days')}
          </button>
          <button
            className={`period-tab ${activePeriod === 30 ? 'active' : ''}`}
            onClick={() => handlePeriodChange(30)}
          >
            30{t('gamification.xpHistory.days')}
          </button>
          <button
            className={`period-tab ${activePeriod === 90 ? 'active' : ''}`}
            onClick={() => handlePeriodChange(90)}
          >
            90{t('gamification.xpHistory.days')}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="xp-history-summary">
        <div className="summary-stat">
          <span className="stat-value">+{formatXP(data?.totalXPGained || 0)}</span>
          <span className="stat-label">
            {t('gamification.xpHistory.totalGained', { days: activePeriod })}
          </span>
        </div>
      </div>

      {/* Chart */}
      {!hasData ? (
        <div className="xp-history-empty">
          <div className="empty-icon">0</div>
          <p>{t('gamification.xpHistory.empty')}</p>
          <span className="empty-subtitle">{t('gamification.xpHistory.emptySubtitle')}</span>
        </div>
      ) : (
        <div className="xp-history-chart">
          <ResponsiveContainer width="100%" height={compact ? 150 : 250}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="xpGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="rgba(255,255,255,0.5)"
                tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                interval={activePeriod === 7 ? 0 : activePeriod === 30 ? 4 : 10}
              />
              <YAxis
                tickFormatter={formatXP}
                stroke="rgba(255,255,255,0.5)"
                tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="xp"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#xpGradient)"
                dot={{ fill: '#3b82f6', strokeWidth: 0, r: 3 }}
                activeDot={{ fill: '#60a5fa', strokeWidth: 2, stroke: '#fff', r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Breakdown */}
      {!compact && hasData && renderBreakdown()}
    </div>
  );
};

export default XPHistoryGraph;
