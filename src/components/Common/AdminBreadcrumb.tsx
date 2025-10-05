import React from 'react';

interface AdminBreadcrumbProps {
  currentSection?: string;
  onBackToDashboard: () => void;
  icon?: string;
}

const AdminBreadcrumb: React.FC<AdminBreadcrumbProps> = ({
  currentSection,
  onBackToDashboard,
  icon = "📊"
}) => {
  return (
    <div className="admin-breadcrumb-container-nightlife">
      <button
        onClick={onBackToDashboard}
        className="admin-breadcrumb-button-nightlife"
      >
        <span className="admin-breadcrumb-icon-nightlife">🏠</span>
        <span className="admin-breadcrumb-text-nightlife">Admin Dashboard</span>
      </button>
    </div>
  );
};

export default AdminBreadcrumb;