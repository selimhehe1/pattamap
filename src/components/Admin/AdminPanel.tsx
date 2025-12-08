import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import EstablishmentsAdmin from './EstablishmentsAdmin';
import EmployeesAdmin from './EmployeesAdmin';
import CommentsAdmin from './CommentsAdmin';
import UsersAdmin from './UsersAdmin';
import ConsumablesAdmin from './ConsumablesAdmin';
import EmployeeClaimsAdmin from './EmployeeClaimsAdmin'; // 🆕 v10.0
import EstablishmentOwnersAdmin from './EstablishmentOwnersAdmin'; // 🆕 v10.1 - Establishment Ownership Management
import VerificationsAdmin from './VerificationsAdmin'; // 🆕 v10.2 - Verifications Management
import VIPVerificationAdmin from './VIPVerificationAdmin'; // 🆕 v10.3 Phase 2 - VIP Payment Verification
import { isFeatureEnabled, FEATURES } from '../../utils/featureFlags';

// Feature flag check
const VIP_ENABLED = isFeatureEnabled(FEATURES.VIP_SYSTEM);

// Map URL paths to tab IDs
const pathToTab: Record<string, string> = {
  'vip-verification': 'vip-verifications',
  'establishments': 'establishments',
  'employees': 'employees',
  'comments': 'comments',
  'users': 'users',
  'consumables': 'consumables',
  'employee-claims': 'employee-claims',
  'establishment-owners': 'establishment-owners',
  'verifications': 'verifications',
};

const AdminPanel: React.FC = () => {
  const location = useLocation();
  const _navigate = useNavigate(); // Prefixed with _ - reserved for future navigation

  // Get initial tab from URL path
  const getTabFromPath = (): string => {
    const pathParts = location.pathname.split('/');
    const adminIndex = pathParts.indexOf('admin');
    if (adminIndex !== -1 && pathParts[adminIndex + 1]) {
      const subPath = pathParts[adminIndex + 1];
      return pathToTab[subPath] || 'overview';
    }
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState<string>(getTabFromPath());

  // Update tab when URL changes
  useEffect(() => {
    const newTab = getTabFromPath();
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  }, [location.pathname]);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'overview':
        return <AdminDashboard activeTab={activeTab} onTabChange={setActiveTab} />;
      case 'establishments':
        return <EstablishmentsAdmin onTabChange={setActiveTab} />;
      case 'employees':
        return <EmployeesAdmin onTabChange={setActiveTab} />;
      case 'comments':
        return <CommentsAdmin onTabChange={setActiveTab} />;
      case 'users':
        return <UsersAdmin onTabChange={setActiveTab} />;
      case 'consumables':
        return <ConsumablesAdmin activeTab={activeTab} onTabChange={setActiveTab} />;
      case 'employee-claims': // 🆕 v10.0 - Employee Claims Management
        return <EmployeeClaimsAdmin onTabChange={setActiveTab} />;
      case 'establishment-owners': // 🆕 v10.1 - Establishment Ownership Management
        return <EstablishmentOwnersAdmin onTabChange={setActiveTab} />;
      case 'verifications': // 🆕 v10.2 - Verifications Management
        return <VerificationsAdmin onTabChange={setActiveTab} />;
      case 'vip-verifications': // 🆕 v10.3 Phase 2 - VIP Payment Verification
        return VIP_ENABLED ? <VIPVerificationAdmin /> : <AdminDashboard activeTab={activeTab} onTabChange={setActiveTab} />;
      default:
        return <AdminDashboard activeTab={activeTab} onTabChange={setActiveTab} />;
    }
  };

  return (
    <div
      id="main-content"
      className="bg-nightlife-gradient-main page-content-with-header-nightlife admin-panel"
      data-testid="admin-panel"
      tabIndex={-1}
    >
      {renderActiveTab()}
    </div>
  );
};

export default AdminPanel;