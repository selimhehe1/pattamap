import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useSecureFetch } from '../hooks/useSecureFetch';
import { logger } from '../utils/logger';
import { isFeatureEnabled, FEATURES } from '../utils/featureFlags';
import OwnerEstablishmentEditModal from '../components/Owner/OwnerEstablishmentEditModal'; // 🆕 v10.1
import MyEmployeesList from '../components/Owner/MyEmployeesList'; // 🆕 v10.3 Phase 0
import VIPPurchaseModal from '../components/Owner/VIPPurchaseModal'; // 🆕 v10.3 Phase 5
import '../styles/pages/my-establishments.css';

// Feature flag check
const VIP_ENABLED = isFeatureEnabled(FEATURES.VIP_SYSTEM);

interface Permission {
  can_edit_info: boolean;
  can_edit_pricing: boolean;
  can_edit_photos: boolean;
  can_edit_employees: boolean;
  can_view_analytics: boolean;
}

interface OwnedEstablishment {
  id: string;
  name: string;
  address?: string;
  zone: string;
  grid_row?: number;
  grid_col?: number;
  category_id: string;
  description?: string;
  phone?: string;
  website?: string;
  location?: {
    lat: number;
    lng: number;
  };
  opening_hours?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  status: 'approved' | 'pending' | 'rejected';
  is_vip?: boolean; // 🆕 v10.3 Phase 5 - VIP status
  vip_expires_at?: string | null; // 🆕 v10.3 Phase 5 - VIP expiration
  logo_url?: string;
  ladydrink?: number;
  barfine?: number;
  rooms?: number;
  ownership_role: 'owner' | 'manager';
  permissions: Permission;
  owned_since: string;
  category?: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
  };
}

interface DashboardStats {
  totalEstablishments: number;
  totalViews: number;
  totalReviews: number;
  avgRating: number;
}

const MyEstablishmentsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { secureFetch } = useSecureFetch();

  const [establishments, setEstablishments] = useState<OwnedEstablishment[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalEstablishments: 0,
    totalViews: 0,
    totalReviews: 0,
    avgRating: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEstablishment, setSelectedEstablishment] = useState<OwnedEstablishment | null>(null);
  const [selectedEstablishmentForEmployees, setSelectedEstablishmentForEmployees] = useState<OwnedEstablishment | null>(null); // 🆕 v10.3 Phase 0
  const [selectedEstablishmentForVIP, setSelectedEstablishmentForVIP] = useState<OwnedEstablishment | null>(null); // 🆕 v10.3 Phase 5

  useEffect(() => {
    loadOwnedEstablishments();
  }, []);

  const loadOwnedEstablishments = async () => {
    setIsLoading(true);
    try {
      logger.debug('📊 Loading owned establishments...');
      const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/establishments/my-owned`);

      if (response.ok) {
        const data = await response.json();
        logger.debug('✅ Owned establishments loaded:', data);
        setEstablishments(data.establishments || []);

        // Calculate stats from establishment data
        const estList = data.establishments || [];
        setStats({
          totalEstablishments: estList.length,
          // Future: Add establishment_views table for tracking views
          totalViews: 0,
          // Future: Add establishment reviews system (currently only employee reviews)
          totalReviews: 0,
          avgRating: 0
        });
      } else {
        logger.error('Failed to load owned establishments:', response.statusText);
      }
    } catch (error) {
      logger.error('Error loading owned establishments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (establishment: OwnedEstablishment) => {
    logger.debug('🖊️ Opening edit modal for:', establishment.name);
    setSelectedEstablishment(establishment);
  };

  const handleCloseEditModal = () => {
    setSelectedEstablishment(null);
  };

  const _getRoleBadgeColor = (role: 'owner' | 'manager') => {
    return role === 'owner' ? '#FFD700' : '#00E5FF';
  };

  const getRoleBadgeIcon = (role: 'owner' | 'manager') => {
    return role === 'owner' ? '👑' : '⚙️';
  };

  const getPermissionBadges = (permissions: Permission) => {
    const badges = [];
    if (permissions.can_edit_info) badges.push({ label: 'Info', icon: '📝' });
    if (permissions.can_edit_pricing) badges.push({ label: 'Pricing', icon: '💰' });
    if (permissions.can_edit_photos) badges.push({ label: 'Photos', icon: '📸' });
    if (permissions.can_edit_employees) badges.push({ label: 'Employees', icon: '👥' });
    if (permissions.can_view_analytics) badges.push({ label: 'Analytics', icon: '📊' });
    return badges;
  };

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <div className="page-content-with-header-nightlife auth-message-container">
        <div>
          <h2 className="auth-message-title">
            🔒 Authentication Required
          </h2>
          <p className="auth-message-text">
            Please log in to access your establishments dashboard.
          </p>
        </div>
      </div>
    );
  }

  // Show message if user is not an establishment owner
  if (user.account_type !== 'establishment_owner') {
    return (
      <div className="page-content-with-header-nightlife auth-message-container">
        <div>
          <h2 className="auth-message-title">
            🚫 Access Denied
          </h2>
          <p className="auth-message-text">
            This section is only available for establishment owners.<br />
            Your current account type: <strong>{user.account_type}</strong>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      id="main-content"
      className="page-content-with-header-nightlife my-establishments-container"
      tabIndex={-1}
    >
      {/* Header Section */}
      <div className="my-establishments-header">
        <h1 className="page-title-gradient">
          🏆 My Establishments
        </h1>
        <p className="page-subtitle-cyan">
          Manage your venues • Update information • Track performance
        </p>

        {/* Quick Stats Row */}
        <div className="my-establishments-stats-row">
          <div className="stat-card-gold">
            <div className="stat-value stat-value-gold">
              {isLoading ? '...' : stats.totalEstablishments}
            </div>
            <div className="stat-label">
              🏢 Establishments
            </div>
          </div>

          <div className="stat-card-cyan">
            <div className="stat-value stat-value-cyan">
              {isLoading ? '...' : stats.totalViews.toLocaleString()}
            </div>
            <div className="stat-label">
              👁️ Total Views
            </div>
          </div>

          <div className="stat-card-yellow">
            <div className="stat-value stat-value-yellow">
              {isLoading ? '...' : stats.totalReviews}
            </div>
            <div className="stat-label">
              💬 Reviews
            </div>
          </div>
        </div>
      </div>

      {/* Establishments Grid */}
      <div className="my-establishments-content">
        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner">⏳</div>
            <div className="loading-text">Loading your establishments...</div>
          </div>
        ) : establishments.length === 0 ? (
          <div className="empty-state-container">
            <div className="empty-state-icon">🏢</div>
            <div className="empty-state-title">
              No Establishments Yet
            </div>
            <div className="empty-state-text">
              You don't own any establishments yet.<br />
              Contact an administrator to assign establishments to your account.
            </div>
          </div>
        ) : (
          <div className="establishments-grid">
            {/* 🆕 v10.3 Phase 5 - VIP Priority Sorting */}
            {[...establishments].sort((a, b) => {
              const isVIPActiveA = a.is_vip && a.vip_expires_at && new Date(a.vip_expires_at) > new Date();
              const isVIPActiveB = b.is_vip && b.vip_expires_at && new Date(b.vip_expires_at) > new Date();

              // VIP comes before non-VIP
              if (isVIPActiveA && !isVIPActiveB) return -1;
              if (!isVIPActiveA && isVIPActiveB) return 1;

              // If both VIP or both non-VIP, maintain current order (stable sort)
              return 0;
            }).map((establishment) => (
              <div
                key={establishment.id}
                className="establishment-card"
              >
                {/* Logo or Icon */}
                <div
                  className={`establishment-logo ${!establishment.logo_url ? 'establishment-logo-gradient' : ''}`}
                  style={establishment.logo_url ? { backgroundImage: `url(${establishment.logo_url})` } : {}}
                >
                  {!establishment.logo_url && (establishment.category?.icon || '🏢')}
                </div>

                {/* VIP Badge - v10.3 Phase 5 (only if VIP feature enabled) */}
                {VIP_ENABLED && establishment.is_vip && establishment.vip_expires_at && new Date(establishment.vip_expires_at) > new Date() && (
                  <div
                    className="vip-badge"
                    title={`VIP until ${new Date(establishment.vip_expires_at).toLocaleDateString()}`}
                  >
                    👑 VIP
                  </div>
                )}

                {/* Role Badge */}
                <div
                  className={`role-badge role-badge-${establishment.ownership_role} ${VIP_ENABLED && establishment.is_vip && establishment.vip_expires_at && new Date(establishment.vip_expires_at) > new Date() ? 'role-badge-with-vip' : ''}`}
                >
                  {getRoleBadgeIcon(establishment.ownership_role)} {establishment.ownership_role}
                </div>

                {/* Name */}
                <h3 className="establishment-name">
                  {establishment.name}
                </h3>

                {/* Zone & Category */}
                <div className="badges-container">
                  <span className="zone-badge">
                    📍 {establishment.zone}
                  </span>
                  {establishment.category && (
                    <span className="category-badge">
                      {establishment.category.icon} {establishment.category.name}
                    </span>
                  )}
                </div>

                {/* Permissions */}
                <div className="permissions-section">
                  <div className="permissions-title">
                    Permissions
                  </div>
                  <div className="permissions-badges">
                    {getPermissionBadges(establishment.permissions).map((badge, idx) => (
                      <span key={idx} className="permission-badge">
                        {badge.icon} {badge.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Owner Since */}
                <div className="owner-since">
                  📅 Owner since {new Date(establishment.owned_since).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>

                {/* Edit Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditClick(establishment);
                  }}
                  className="btn-primary-gradient"
                >
                  ✏️ Edit Establishment
                </button>

                {/* 🆕 v10.3 Phase 0 - View Employees Button */}
                <button
                  onClick={() => setSelectedEstablishmentForEmployees(establishment)}
                  className="btn-secondary-blue"
                >
                  👥 {t('myEmployees.viewEmployees', 'View Employees')}
                </button>

                {/* 🆕 v10.3 Phase 5 - Purchase VIP Button (only if VIP feature enabled) */}
                {VIP_ENABLED && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEstablishmentForVIP(establishment);
                    }}
                    className="btn-vip-gold"
                  >
                    👑 {t('vipPurchase.purchaseVIP', 'Purchase VIP')}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ✅ Edit Modal (Phase 2.2) */}
      {selectedEstablishment && (
        <OwnerEstablishmentEditModal
          establishment={selectedEstablishment as any}
          permissions={selectedEstablishment.permissions}
          onClose={handleCloseEditModal}
          onSuccess={() => {
            loadOwnedEstablishments(); // Reload to show updated data
          }}
        />
      )}

      {/* 🆕 v10.3 Phase 0 - Employees Modal */}
      {selectedEstablishmentForEmployees && (
        <div
          className="employees-modal-overlay"
          onClick={() => setSelectedEstablishmentForEmployees(null)}
        >
          <div
            className="employees-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-modal"
              onClick={() => setSelectedEstablishmentForEmployees(null)}
              aria-label="Close"
            >
              ✕
            </button>

            <MyEmployeesList
              establishmentId={selectedEstablishmentForEmployees.id}
              establishmentName={selectedEstablishmentForEmployees.name}
              canEditEmployees={selectedEstablishmentForEmployees.permissions.can_edit_employees}
            />
          </div>
        </div>
      )}

      {/* 🆕 v10.3 Phase 5 - VIP Purchase Modal (only if VIP feature enabled) */}
      {VIP_ENABLED && selectedEstablishmentForVIP && (
        <VIPPurchaseModal
          subscriptionType="establishment"
          entity={selectedEstablishmentForVIP as any}
          onClose={() => setSelectedEstablishmentForVIP(null)}
          onSuccess={() => {
            setSelectedEstablishmentForVIP(null);
            loadOwnedEstablishments(); // Reload to show updated VIP status
          }}
        />
      )}
    </div>
  );
};

export default MyEstablishmentsPage;
