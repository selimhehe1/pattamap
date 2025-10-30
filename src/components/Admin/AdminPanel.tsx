import React, { useState } from 'react';
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

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');

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
        return <VIPVerificationAdmin />;
      default:
        return <AdminDashboard activeTab={activeTab} onTabChange={setActiveTab} />;
    }
  };

  return (
    <div id="main-content" className="bg-nightlife-gradient-main page-content-with-header-nightlife" tabIndex={-1}>
      {renderActiveTab()}
    </div>
  );
};

export default AdminPanel;