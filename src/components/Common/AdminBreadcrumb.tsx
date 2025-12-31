import React from 'react';
import { Home, ChevronRight } from 'lucide-react';
import '../../styles/admin/admin-components.css';

interface AdminBreadcrumbProps {
  currentSection?: string;
  onBackToDashboard: () => void;
  icon?: React.ReactNode;
}

const AdminBreadcrumb: React.FC<AdminBreadcrumbProps> = ({
  currentSection,
  onBackToDashboard,
  icon
}) => {
  return (
    <div className="admin-breadcrumb-container-nightlife">
      {/* Home Button */}
      <button
        onClick={onBackToDashboard}
        className="admin-breadcrumb-button-nightlife"
        aria-label="Return to Admin Dashboard"
      >
        <span className="admin-breadcrumb-icon-nightlife">
          <Home size={16} />
        </span>
        <span className="admin-breadcrumb-text-nightlife">Dashboard</span>
      </button>

      {/* Separator + Current Section */}
      {currentSection && (
        <>
          <span className="admin-breadcrumb-separator-nightlife">
            <ChevronRight size={18} />
          </span>
          <span className="admin-breadcrumb-current-nightlife">
            {icon && (
              <span className="admin-breadcrumb-current-icon-nightlife">
                {icon}
              </span>
            )}
            <span className="admin-breadcrumb-current-text-nightlife">
              {currentSection}
            </span>
          </span>
        </>
      )}
    </div>
  );
};

export default AdminBreadcrumb;