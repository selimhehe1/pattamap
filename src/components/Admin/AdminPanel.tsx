import React, { useState } from 'react';
import AdminDashboard from './AdminDashboard';
import EstablishmentsAdmin from './EstablishmentsAdmin';
import EmployeesAdmin from './EmployeesAdmin';
import CommentsAdmin from './CommentsAdmin';
import UsersAdmin from './UsersAdmin';
import ConsumablesAdmin from './ConsumablesAdmin';

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
      default:
        return <AdminDashboard activeTab={activeTab} onTabChange={setActiveTab} />;
    }
  };

  return (
    <div className="bg-nightlife-gradient-main page-content-with-header-nightlife">
      {renderActiveTab()}
    </div>
  );
};

export default AdminPanel;