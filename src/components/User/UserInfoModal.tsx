import React from 'react';
import { User } from '../../types';
import AnimatedButton from '../Common/AnimatedButton';
import {
  Crown,
  Zap,
  User as UserIcon,
  ClipboardList,
  BarChart3,
  Star,
  MessageCircle,
  FileEdit
} from 'lucide-react';
import '../../styles/components/modals.css';

interface UserInfoModalProps {
  user: User;
  onClose: () => void;
}

/**
 * UserInfoModal - Display user profile information
 *
 * Shows user details for regular users (non-employees):
 * - Avatar/icon
 * - Pseudonym
 * - Email
 * - Role badge
 * - Account creation date
 * - Statistics (favorites, comments, contributions)
 */
const UserInfoModal: React.FC<UserInfoModalProps> = ({ user, onClose }) => {
  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get role icon
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown size={24} />;
      case 'moderator': return <Zap size={24} />;
      default: return <UserIcon size={24} />;
    }
  };

  // Get role color
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#FFD700';
      case 'moderator': return '#00E5FF';
      default: return '#9B5DE5';
    }
  };

  return (
    <div className="modal-overlay-unified" onClick={onClose} role="dialog" aria-modal="true">
      {/* Modal Container */}
      <div
        className="modal-content-unified modal--small user-info-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button onClick={onClose} className="modal-close-btn" aria-label="Close user info modal">
          ×
        </button>

        {/* Header */}
        <div className="modal-header">
          <h2 className="header-title-nightlife">
            <UserIcon size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />User Profile
          </h2>
        </div>

        {/* Content */}
        <div className="modal-content-nightlife">
          {/* Avatar Section */}
          <div className="user-info-avatar-section">
            <div className="user-info-avatar-large">
              {getRoleIcon(user.role)}
            </div>
            <h3 className="user-info-name-large">{user.pseudonym}</h3>
            <p className="user-info-email-large">{user.email}</p>
            <span
              className="user-info-role-badge-large"
              style={{
                borderColor: getRoleColor(user.role),
                color: getRoleColor(user.role),
                background: `linear-gradient(135deg, ${getRoleColor(user.role)}20, ${getRoleColor(user.role)}10)`
              }}
            >
              {getRoleIcon(user.role)} {user.role.toUpperCase()}
            </span>
          </div>

          {/* Separator */}
          <div className="user-info-separator" />

          {/* Account Info */}
          <div className="user-info-section">
            <h4 className="user-info-section-title"><ClipboardList size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Account Information</h4>
            <div className="user-info-grid">
              <div className="user-info-item">
                <span className="user-info-label">Member Since:</span>
                <span className="user-info-value">{formatDate(user.created_at)}</span>
              </div>
              <div className="user-info-item">
                <span className="user-info-label">Account Type:</span>
                <span className="user-info-value">{user.account_type || 'user'}</span>
              </div>
            </div>
          </div>

          {/* Separator */}
          <div className="user-info-separator" />

          {/* Statistics Section */}
          <div className="user-info-section">
            <h4 className="user-info-section-title"><BarChart3 size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Activity</h4>
            <div className="user-info-stats-grid">
              <div className="user-info-stat-card">
                <div className="user-info-stat-icon"><Star size={24} /></div>
                <div className="user-info-stat-value">0</div>
                <div className="user-info-stat-label">Favorites</div>
              </div>
              <div className="user-info-stat-card">
                <div className="user-info-stat-icon"><MessageCircle size={24} /></div>
                <div className="user-info-stat-value">0</div>
                <div className="user-info-stat-label">Comments</div>
              </div>
              <div className="user-info-stat-card">
                <div className="user-info-stat-icon"><FileEdit size={24} /></div>
                <div className="user-info-stat-value">0</div>
                <div className="user-info-stat-label">Contributions</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 'var(--spacing-6)' }}>
          <AnimatedButton
            onClick={onClose}
            ariaLabel="Close modal"
            className="btn btn--secondary btn--pill"
            style={{ width: '100%' }}
          >
            Close
          </AnimatedButton>
        </div>

        {/* Custom Styles */}
        <style>{`
        .user-info-modal {
          max-width: 500px;
        }

        .user-info-avatar-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          padding: 1.5rem 1rem;
        }

        .user-info-avatar-large {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 4rem;
          background: linear-gradient(135deg, rgba(193, 154, 107, 0.15), rgba(155, 93, 229, 0.15));
          border: 3px solid rgba(193, 154, 107, 0.3);
          box-shadow: 0 8px 24px rgba(193, 154, 107, 0.25);
        }

        .user-info-name-large {
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
          margin: 0;
          text-align: center;
        }

        .user-info-email-large {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
          text-align: center;
        }

        .user-info-role-badge-large {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border: 2px solid;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          box-shadow: 0 0 15px currentColor;
        }

        .user-info-separator {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(193, 154, 107, 0.3) 50%, transparent);
          margin: 1rem 0;
        }

        .user-info-section {
          padding: 0 1rem;
        }

        .user-info-section-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #C19A6B;
          margin: 0 0 1rem 0;
          text-align: center;
        }

        .user-info-grid {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .user-info-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: rgba(193, 154, 107, 0.05);
          border: 1px solid rgba(193, 154, 107, 0.15);
          border-radius: 8px;
        }

        .user-info-label {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.7);
          font-weight: 600;
        }

        .user-info-value {
          font-size: 0.875rem;
          color: white;
          font-weight: 700;
        }

        .user-info-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
        }

        .user-info-stat-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          background: rgba(193, 154, 107, 0.05);
          border: 1px solid rgba(193, 154, 107, 0.15);
          border-radius: 8px;
          transition: all 0.3s ease;
        }

        .user-info-stat-card:hover {
          background: rgba(193, 154, 107, 0.1);
          border-color: rgba(193, 154, 107, 0.3);
          transform: translateY(-2px);
        }

        .user-info-stat-icon {
          font-size: 1.5rem;
        }

        .user-info-stat-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: #C19A6B;
        }

        .user-info-stat-label {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.7);
          text-align: center;
        }

        @media (max-width: 480px) {
          .user-info-stats-grid {
            grid-template-columns: 1fr;
          }
          .user-info-avatar-large {
            width: 100px;
            height: 100px;
            font-size: 3rem;
          }
          .user-info-name-large {
            font-size: 1.25rem;
          }
        }
        `}</style>
      </div>
    </div>
  );
};

export default UserInfoModal;
