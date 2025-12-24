import React, { useState, useEffect } from 'react';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useNavigateWithTransition } from '../../hooks/useNavigateWithTransition';
import { useTranslation } from 'react-i18next';
import EmployeeCard from '../Common/EmployeeCard';
import VIPPurchaseModal from './VIPPurchaseModal';
import { Employee } from '../../types';
import { logger } from '../../utils/logger';
import { isFeatureEnabled, FEATURES } from '../../utils/featureFlags';
import './MyEmployeesList.css';

// Feature flag check
const VIP_ENABLED = isFeatureEnabled(FEATURES.VIP_SYSTEM);

interface Props {
  establishmentId: string;
  establishmentName: string;
  canEditEmployees: boolean;
}

const MyEmployeesList: React.FC<Props> = ({
  establishmentId,
  establishmentName,
  canEditEmployees
}) => {
  const { secureFetch } = useSecureFetch();
  const navigate = useNavigateWithTransition();
  const { t } = useTranslation();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployeeForVIP, setSelectedEmployeeForVIP] = useState<Employee | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Helper function to trigger refresh
  const refreshEmployees = () => setRefreshCounter(c => c + 1);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await secureFetch(
          `${import.meta.env.VITE_API_URL}/api/establishments/${establishmentId}/employees`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch employees');
        }

        const data = await response.json();
        setEmployees(data.employees || []);
      } catch (error) {
        logger.error('Failed to fetch employees:', error);
        setError('Failed to load employees. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, [establishmentId, secureFetch, refreshCounter]);

  const handleBuyVIP = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (employee) {
      setSelectedEmployeeForVIP(employee);
    }
  };

  const handleVIPPurchaseSuccess = () => {
    // Refresh employees list to show new VIP status
    refreshEmployees();
  };

  if (loading) {
    return (
      <div className="my-employees-list-loading">
        <div className="spinner"></div>
        <p>{t('myEmployees.loading', 'Loading employees...')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-employees-list-error">
        <p className="error-message">{error}</p>
        <button onClick={refreshEmployees} className="btn-retry">
          {t('common.retry', 'Retry')}
        </button>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="my-employees-list-empty">
        <p>{t('myEmployees.noEmployees', 'No employees found for {{name}}', { name: establishmentName })}</p>
        <p className="hint">{t('myEmployees.hint', 'Employees will appear here once they are linked to this establishment.')}</p>
      </div>
    );
  }

  return (
    <div className="my-employees-list">
      <h3>
        {t('myEmployees.title', 'Employees at {{name}}', { name: establishmentName })}
        {' '}
        <span className="employee-count">({employees.length})</span>
      </h3>

      {!canEditEmployees && (
        <div className="permission-warning">
          ⚠️ {t('myEmployees.readOnly', 'You have read-only access to employees')}
          <br />
          {t('myEmployees.contactAdmin', 'Contact admin to request can_edit_employees permission')}
        </div>
      )}

      <div className="employees-grid">
        {employees.map(employee => (
          <div key={employee.id} className="employee-item">
            <EmployeeCard
              employee={employee}
              onClick={() => navigate(`/employee/${employee.id}`)}
              showEstablishment={false}
            />

            {/* VIP Actions - Only show if VIP feature is enabled */}
            {VIP_ENABLED && (
              <div className="employee-actions">
                {employee.is_vip ? (
                  <div className="vip-status-badge">
                    👑 {t('myEmployees.vipActive', 'VIP Active')}
                    {employee.vip_expires_at && (
                      <span className="expiry">
                        {t('myEmployees.expires', 'Expires')}: {new Date(employee.vip_expires_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ) : (
                  canEditEmployees ? (
                    <button
                      className="btn-buy-vip"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBuyVIP(employee.id);
                      }}
                    >
                      👑 {t('myEmployees.buyVIP', 'Buy VIP')}
                    </button>
                  ) : (
                    <div className="no-permission-hint">
                      {t('myEmployees.contactAdminVIP', 'Contact admin to buy VIP')}
                    </div>
                  )
                )}
              </div>
            )}

            {/* Stats Summary */}
            <div className="employee-stats-summary">
              <span title={t('myEmployees.profileViews', 'Profile Views')}>
                👁️ {(employee as any).total_views || 0}
              </span>
              <span title={t('myEmployees.favorites', 'Favorites')}>
                ⭐ {(employee as any).total_favorites || 0}
              </span>
              <span title={t('myEmployees.rating', 'Rating')}>
                🌟 {employee.average_rating?.toFixed(1) || 'N/A'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* VIP Purchase Modal - Only render if VIP feature is enabled */}
      {VIP_ENABLED && selectedEmployeeForVIP && (
        <VIPPurchaseModal
          subscriptionType="employee"
          entity={selectedEmployeeForVIP}
          onClose={() => setSelectedEmployeeForVIP(null)}
          onSuccess={handleVIPPurchaseSuccess}
        />
      )}
    </div>
  );
};

export default MyEmployeesList;
