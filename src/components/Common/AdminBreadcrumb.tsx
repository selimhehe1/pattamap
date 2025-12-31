import React from 'react';
import { Home, ChevronRight } from 'lucide-react';
import '../../styles/admin/admin-breadcrumb-premium.css';

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
    <nav className="breadcrumb-premium" aria-label="Admin navigation">
      {/* Animated background glow */}
      <div className="breadcrumb-premium__glow" />

      {/* Glass container */}
      <div className="breadcrumb-premium__glass">
        {/* Dashboard pill */}
        <button
          onClick={onBackToDashboard}
          className="breadcrumb-premium__pill breadcrumb-premium__pill--home"
          aria-label="Return to Admin Dashboard"
        >
          <span className="breadcrumb-premium__pill-icon">
            <Home size={14} />
          </span>
          <span className="breadcrumb-premium__pill-text">Dashboard</span>
          <span className="breadcrumb-premium__pill-shine" />
        </button>

        {/* Animated separator */}
        {currentSection && (
          <>
            <div className="breadcrumb-premium__separator">
              <span className="breadcrumb-premium__separator-line" />
              <ChevronRight size={16} className="breadcrumb-premium__separator-icon" />
              <span className="breadcrumb-premium__separator-line" />
            </div>

            {/* Current section pill */}
            <div className="breadcrumb-premium__pill breadcrumb-premium__pill--current">
              {icon && (
                <span className="breadcrumb-premium__pill-icon breadcrumb-premium__pill-icon--glow">
                  {icon}
                </span>
              )}
              <span className="breadcrumb-premium__pill-text">{currentSection}</span>
              <span className="breadcrumb-premium__pill-pulse" />
            </div>
          </>
        )}
      </div>

      {/* Decorative neon border */}
      <div className="breadcrumb-premium__border" />
    </nav>
  );
};

export default AdminBreadcrumb;
