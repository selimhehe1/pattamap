import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Search, Users, Star, BarChart3, Cake, Globe, Building2, Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Employee } from '../../types';
import { logger } from '../../utils/logger';
import '../../styles/utils/overlays.css';
import '../../styles/features/map/employees-list-modal.css';

interface EmployeesListModalProps {
  isOpen: boolean;
  onClose: () => void;
  zoneName: string;
  zoneId: string;
  onEmployeeClick?: (employee: Employee) => void;
}

/**
 * EmployeesListModal - Full-screen modal listing employees for a specific zone
 *
 * Features:
 * - Lists all employees working in the current zone
 * - Search by name/nickname
 * - Filter by current establishment
 * - Click to view employee profile
 * - Empty state for no results
 * - Loading state
 * - Nightlife theme consistency
 *
 * @component
 */
const EmployeesListModal: React.FC<EmployeesListModalProps> = ({
  isOpen,
  onClose,
  zoneName,
  zoneId,
  onEmployeeClick
}) => {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Helper to map zone IDs to translation keys
  const getZoneTranslationKey = (id: string): string => {
    return id;
  };

  // Fetch employees for the zone
  useEffect(() => {
    if (!isOpen) return;

    const fetchEmployees = async () => {
      setLoading(true);
      try {
        // Fetch all employees
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/employees`);
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
        logger.debug('Employees fetched for zone', { zone: zoneName, count: zoneEmployees.length });
      } catch (error) {
        logger.error('Error fetching employees for zone', error);
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [isOpen, zoneId, zoneName]);

  // Filter employees by search term
  const filteredEmployees = employees.filter((employee) => {
    if (!searchTerm) return true;

    const search = searchTerm.toLowerCase();
    const nameMatch = employee.name.toLowerCase().includes(search);
    const nicknameMatch = employee.nickname?.toLowerCase().includes(search);
    const establishmentMatch = employee.current_employment?.some(
      (emp) => emp.establishment?.name.toLowerCase().includes(search)
    );

    return nameMatch || nicknameMatch || establishmentMatch;
  });

  if (!isOpen) return null;

  // Render in portal
  return ReactDOM.createPortal(
    <>
      {/* Overlay */}
      <div
        className="overlay overlay--dark"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="menu menu--fullscreen is-open employees-modal">
        {/* Header */}
        <div className="menu__header">
          <div className="menu__header-content">
            <span className="employees-modal__header-icon"><Users size={20} /></span>
            <div>
              <h2 className="menu__title">{t('map.zoneLineup')}</h2>
              <p className="menu__subtitle">{t(`map.zoneNames.${getZoneTranslationKey(zoneId)}`)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="menu__close"
            aria-label={t('common.close')}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="menu__content">
          {/* Search Bar */}
          <div className="employees-modal__search">
            <input
              type="text"
              placeholder={t('search.searchEmployees', { defaultValue: 'Search employees...' })}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="employees-modal__search-input"
              autoFocus
            />
            <span className="employees-modal__search-icon"><Search size={16} /></span>
          </div>

          {/* Results Count */}
          {!loading && (
            <div className="employees-modal__count">
              <span className="employees-modal__count-icon"><BarChart3 size={14} /></span>
              <span className="employees-modal__count-text">
                {filteredEmployees.length} {filteredEmployees.length === 1 ? t('map.employee') : t('map.employees')}
                {searchTerm && ` (${t('search.filtered')})`}
              </span>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="employees-modal__loading">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="employees-modal__skeleton">
                  <div className="skeleton-shimmer"></div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredEmployees.length === 0 && (
            <div className="employees-modal__empty">
              <div className="employees-modal__empty-icon">
                {searchTerm ? <Search size={40} /> : <Users size={40} />}
              </div>
              <h3 className="employees-modal__empty-title">
                {searchTerm ? t('search.noResults') : t('map.noEmployeesInZone')}
              </h3>
              <p className="employees-modal__empty-description">
                {searchTerm
                  ? t('search.tryDifferentSearch')
                  : t('map.noEmployeesInZoneDescription')}
              </p>
            </div>
          )}

          {/* Employees Grid */}
          {!loading && filteredEmployees.length > 0 && (
            <div className="employees-modal__grid">
              {filteredEmployees.map((employee) => {
                const currentEstablishment = employee.current_employment?.[0]?.establishment;
                const photoUrl = employee.photos?.[0] || '/placeholder-employee.png';

                return (
                  <div
                    key={employee.id}
                    className="employees-modal__card"
                    onClick={() => {
                      onEmployeeClick?.(employee);
                      onClose();
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onEmployeeClick?.(employee);
                        onClose();
                      }
                    }}
                  >
                    {/* Photo */}
                    <div className="employees-modal__card-photo">
                      <img
                        src={photoUrl}
                        alt={employee.name}
                        className="employees-modal__card-img"
                        loading="lazy"
                      />
                    </div>

                    {/* Info */}
                    <div className="employees-modal__card-body">
                      <h3 className="employees-modal__card-name">
                        {employee.name}
                      </h3>
                      {employee.nickname && (
                        <p className="employees-modal__card-nickname">
                          "{employee.nickname}"
                        </p>
                      )}

                      {/* Details */}
                      <div className="employees-modal__card-details">
                        {employee.age && (
                          <span className="employees-modal__card-detail">
                            <Cake size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {employee.age}
                          </span>
                        )}
                        {employee.nationality && (
                          <span className="employees-modal__card-detail">
                            <Globe size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {employee.nationality}
                          </span>
                        )}
                      </div>

                      {/* Current Establishment */}
                      {currentEstablishment && (
                        <div className="employees-modal__card-establishment">
                          <span className="employees-modal__card-establishment-icon"><Building2 size={12} /></span>
                          <span className="employees-modal__card-establishment-name">
                            {currentEstablishment.name}
                          </span>
                        </div>
                      )}

                      {/* Rating */}
                      {employee.average_rating !== undefined && employee.average_rating > 0 && (
                        <div className="employees-modal__card-rating">
                          <span className="employees-modal__card-rating-stars">
                            {[...Array(Math.round(employee.average_rating))].map((_, i) => <Star key={i} size={12} fill="#FFD700" color="#FFD700" />)}
                          </span>
                          <span className="employees-modal__card-rating-value">
                            {employee.average_rating.toFixed(1)}
                          </span>
                          {employee.comment_count !== undefined && employee.comment_count > 0 && (
                            <span className="employees-modal__card-rating-count">
                              ({employee.comment_count})
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Indicator */}
                    <div className="employees-modal__card-arrow">
                      →
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="menu__footer">
          <p className="employees-modal__footer-text">
            <Lightbulb size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('map.clickToViewProfile', { defaultValue: 'Click on any employee to view their profile' })}
          </p>
        </div>
      </div>
    </>,
    document.body
  );
};

export default EmployeesListModal;
