import React from 'react';
import { Home } from 'lucide-react';
import '../../styles/admin/admin-components.css';

interface AdminBreadcrumbProps {
  currentSection?: string;
  onBackToDashboard: () => void;
  icon?: React.ReactNode;
}

const AdminBreadcrumb: React.FC<AdminBreadcrumbProps> = ({
  currentSection: _currentSection,
  onBackToDashboard,
  icon: _icon
}) => {
  return (
    <div className="admin-breadcrumb-container-nightlife">
      <button
        onClick={onBackToDashboard}
        className="admin-breadcrumb-button-nightlife"
        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        <span className="admin-breadcrumb-icon-nightlife"><Home size={16} /></span>
        <span className="admin-breadcrumb-text-nightlife">Admin Dashboard</span>
      </button>
    </div>
  );
};

export default AdminBreadcrumb;