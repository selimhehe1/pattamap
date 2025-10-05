import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onAddEmployee: () => void;
  onAddEstablishment: () => void;
  onShowLogin: () => void;
}

const Header: React.FC<HeaderProps> = ({ onAddEmployee, onAddEstablishment, onShowLogin }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header
      role="banner"
      aria-label="Main navigation"
      className="header-main-nightlife">
      {/* Section gauche avec bouton retour et titre */}
      <div className="header-logo-section-nightlife">
        {/* Bouton retour avec style cohérent */}
        <button
          onClick={() => navigate('/')}
          aria-label="Return to home page"
          tabIndex={0}
          className="btn-nightlife-base btn-secondary-nightlife btn-pill-nightlife"
          style={{ marginRight: '20px' }}
        >
          ← Home
        </button>

        <div>
          <h1 className="header-title-nightlife">
            PATTAMAP
          </h1>
          <p className="text-cyan-nightlife header-subtitle-nightlife">
            🎯 Premium Nightlife • Entertainment Directory
          </p>
        </div>
      </div>

      {/* Navigation avec style premium */}
      <nav role="navigation" aria-label="Main actions" className="header-nav-nightlife">
        {/* Search Button - Always visible */}
        <button
          onClick={() => navigate('/search')}
          aria-label="Search employees"
          tabIndex={0}
          className="btn-nightlife-base btn-secondary-nightlife btn-pill-nightlife"
        >
          🔍 Search
        </button>

        {user ? (
          <>
            {/* My Favorites Button */}
            <button
              onClick={() => navigate('/dashboard')}
              aria-label="My favorites"
              tabIndex={0}
              className="btn-pill-nightlife btn-favorites-nightlife"
            >
              ⭐ My Favorites
            </button>

            {/* Boutons d'action stylés */}
            <button
              onClick={onAddEmployee}
              aria-label="Add new employee to the directory"
              tabIndex={0}
              className="btn-pill-nightlife btn-add-employee-nightlife"
            >
              ✨ Add Employee
            </button>
            
            <button
              onClick={onAddEstablishment}
              aria-label="Add new establishment to the directory"
              tabIndex={0}
              className="btn-pill-nightlife btn-add-establishment-nightlife"
            >
              🏢 Add Establishment
            </button>

            {/* Menu utilisateur premium */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                aria-label={`User menu for ${user.pseudonym}. ${showUserMenu ? 'Close' : 'Open'} menu`}
                aria-expanded={showUserMenu}
                aria-haspopup="menu"
                tabIndex={0}
                className="btn-pill-nightlife btn-user-menu-nightlife"
              >
                👤 {user.pseudonym}
              </button>

              {showUserMenu && (
                <div className="user-menu-dropdown-nightlife">
                  <div className="user-info-section-nightlife">
                    <div className="user-info-name-nightlife">
                      {user.pseudonym}
                    </div>
                    <div className="user-info-email-nightlife">{user.email}</div>
                    <div className="user-info-role-nightlife">
                      Role: {user.role.toUpperCase()}
                    </div>
                  </div>
                  
                  {(user.role === 'admin' || user.role === 'moderator') && (
                    <button
                      aria-label="Navigate to admin dashboard"
                      role="menuitem"
                      tabIndex={0}
                      className="btn-admin-menu-nightlife"
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate('/admin');
                      }}
                    >
                      🛠️ Admin Dashboard
                    </button>
                  )}
                  
                  <button
                    aria-label="Logout from your account"
                    role="menuitem"
                    tabIndex={0}
                    className="btn-logout-menu-nightlife"
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                  >
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <button
            onClick={onShowLogin}
            aria-label="Login to your account"
            tabIndex={0}
            className="btn-pill-nightlife btn-login-nightlife"
          >
            🚀 Login / Register
          </button>
        )}
      </nav>

    </header>
  );
};

export default Header;