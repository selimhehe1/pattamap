import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Employee } from '../../types';
import { logger } from '../../utils/logger';
import EmployeeCard from '../Common/EmployeeCard';
import '../../styles/components/employees-grid-view.css';

interface EmployeesGridViewProps {
  zoneId: string;
  zoneName?: string;
  onEmployeeClick?: (employee: Employee) => void;
}

/**
 * EmployeesGridView - Display employees working in a zone (grid layout)
 *
 * Features:
 * - Grid layout (2-3 columns based on viewport)
 * - Search by name/nickname
 * - Fetches employees filtered by zone
 * - Click card → opens employee profile modal
 * - Loading and empty states
 * - Nightlife theme consistency
 *
 * @component
 */
const EmployeesGridView: React.FC<EmployeesGridViewProps> = ({
  zoneId,
  zoneName,
  onEmployeeClick
}) => {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch employees for the zone
  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      try {
        // Fetch all employees
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/employees`);
        if (!response.ok) throw new Error('Failed to fetch employees');

        const data = await response.json();
        const allEmployees = data.employees || [];

        // Filter employees by zone (check current employment establishment's zone OR freelance zone)
        // 🆕 v10.x: Include simple freelances (is_freelance=true) who work in this zone
        const zoneEmployees = allEmployees.filter((emp: Employee) => {
          // Check if employee has current employment in this zone
          // ⚠️ IMPORTANT: Only include CURRENT employment (is_current=true)
          const hasEmploymentInZone = emp.current_employment?.some(
            (employment) => employment.is_current === true && employment.establishment?.zone === zoneId
          );

          // Check if employee is freelance in this zone
          // Normalize zones for comparison: lowercase, remove spaces
          const isFreelanceInZone = emp.is_freelance === true &&
            emp.freelance_zone?.toLowerCase().replace(/\s+/g, '') === zoneId.toLowerCase().replace(/\s+/g, '');

          // Include if EITHER condition is true
          return hasEmploymentInZone || isFreelanceInZone;
        });

        setEmployees(zoneEmployees);
        logger.debug('Employees fetched for zone', { zone: zoneName || zoneId, count: zoneEmployees.length });
      } catch (error) {
        logger.error('Error fetching employees for zone', error);
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [zoneId, zoneName]);

  // Filter employees by search term + VIP sorting
  const filteredEmployees = useMemo(() => {
    let filtered = employees.filter((employee) => {
      if (!searchTerm) return true;

      const search = searchTerm.toLowerCase();
      const nameMatch = employee.name.toLowerCase().includes(search);
      const nicknameMatch = employee.nickname?.toLowerCase().includes(search);
      const establishmentMatch = employee.current_employment?.some(
        (emp) => emp.establishment?.name.toLowerCase().includes(search)
      );

      return nameMatch || nicknameMatch || establishmentMatch;
    });

    // 🆕 v10.3 Phase 4 - Verified Priority Sorting (VIP system disabled in UI)
    // Priority order: Verified+VIP > Verified > VIP > Others
    filtered.sort((a, b) => {
      const isVIPActiveA = a.is_vip && a.vip_expires_at && new Date(a.vip_expires_at) > new Date();
      const isVIPActiveB = b.is_vip && b.vip_expires_at && new Date(b.vip_expires_at) > new Date();
      const isVerifiedA = a.is_verified;
      const isVerifiedB = b.is_verified;

      // Priority 1: Verified + VIP (both) come first
      const isPremiumA = isVerifiedA && isVIPActiveA;
      const isPremiumB = isVerifiedB && isVIPActiveB;
      if (isPremiumA && !isPremiumB) return -1;
      if (!isPremiumA && isPremiumB) return 1;

      // Priority 2: Verified alone (takes priority over VIP since VIP is hidden in UI)
      if (isVerifiedA && !isVerifiedB) return -1;
      if (!isVerifiedA && isVerifiedB) return 1;

      // Priority 3: VIP alone (lower priority since VIP UI is disabled)
      if (isVIPActiveA && !isVIPActiveB) return -1;
      if (!isVIPActiveA && isVIPActiveB) return 1;

      // If both same status, maintain current order
      return 0;
    });

    return filtered;
  }, [employees, searchTerm]);

  return (
    <div className="employees-grid-view">
      {/* Header with search */}
      <div className="employees-grid-view__header">
        <h2 className="employees-grid-view__title">
          👥 {t('map.zoneLineup')}
        </h2>
        <div className="employees-grid-view__search">
          <input
            type="text"
            placeholder={t('search.searchEmployees', { defaultValue: 'Search employees...' })}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="employees-grid-view__search-input"
          />
          <span className="employees-grid-view__search-icon">🔍</span>
        </div>
      </div>

      {/* Results count */}
      {!loading && (
        <div className="employees-grid-view__count">
          <span className="employees-grid-view__count-icon">📊</span>
          <span className="employees-grid-view__count-text">
            {filteredEmployees.length} {filteredEmployees.length === 1 ? t('map.employee') : t('map.employees')}
            {searchTerm && ` (${t('search.filtered')})`}
          </span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="employees-grid-view__loading">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="employees-grid-view__skeleton">
              <div className="skeleton-shimmer"></div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredEmployees.length === 0 && (
        <div className="employees-grid-view__empty">
          <div className="employees-grid-view__empty-icon">
            {searchTerm ? '🔍' : '👥'}
          </div>
          <h3 className="employees-grid-view__empty-title">
            {searchTerm ? t('search.noResults') : t('map.noEmployeesInZone')}
          </h3>
          <p className="employees-grid-view__empty-description">
            {searchTerm
              ? t('search.tryDifferentSearch')
              : t('map.noEmployeesInZoneDescription')}
          </p>
        </div>
      )}

      {/* Employees Grid - Tinder Style */}
      {!loading && filteredEmployees.length > 0 && (
        <div className="employees-grid-view__grid">
          {filteredEmployees.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              onClick={onEmployeeClick}
              showEstablishment={true}
              showRatingBadge={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployeesGridView;
