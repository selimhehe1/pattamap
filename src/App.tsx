import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useSecureFetch } from './hooks/useSecureFetch';
import { ModalProvider } from './contexts/ModalContext';
import { CSRFProvider } from './contexts/CSRFContext';
import ModalRenderer from './components/Common/ModalRenderer';
import PattayaMap from './components/Map/PattayaMap';
import Header from './components/Layout/Header';
import LoginForm from './components/Auth/LoginForm';
import RegisterForm from './components/Auth/RegisterForm';
import EmployeeForm from './components/Forms/EmployeeForm';
import EstablishmentForm from './components/Forms/EstablishmentForm';
import BarDetailPage from './components/Bar/BarDetailPage';
import AdminPanel from './components/Admin/AdminPanel';
import SearchPage from './components/Search/SearchPage';
import UserDashboard from './components/User/UserDashboard';
import { Establishment } from './types';
import { logger } from './utils/logger';
import './App.css';
import './styles/nightlife-theme.css';

const HomePage: React.FC = () => {
  logger.debug('HomePage rendering');
  const { token } = useAuth();
  const navigate = useNavigate();

  // States pour les données
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [filteredEstablishments, setFilteredEstablishments] = useState<Establishment[]>([]);
  const [freelances, setFreelances] = useState<any[]>([]); // Independent position employees
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['cat-001', 'cat-002', 'cat-003', 'cat-004', 'cat-005', 'cat-006']);
  const [searchTerm] = useState('');
  const [selectedEstablishment, setSelectedEstablishment] = useState<string | null>(null);

  logger.debug('HomePage initial state', {
    establishmentsCount: establishments.length,
    filteredCount: filteredEstablishments.length,
    selectedCategories
  });

  // State pour le modal register (le seul restant local à HomePage)
  const [showRegisterForm, setShowRegisterForm] = useState(false);

  // Fetch real data from API
  useEffect(() => {
    logger.debug('Fetching establishments and freelances');
    fetchEstablishments();
    fetchFreelances();
  }, []);

  const fetchEstablishments = async () => {
    try {
      // Use pagination API with page=1 and limit=50 (backend handles pagination)
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/establishments?limit=50&page=1`);
      const data = await response.json();

      if (data.establishments) {
        logger.debug('Establishments loaded from API', {
          count: data.establishments.length,
          pagination: data.pagination
        });

        // Log unique zone values from API
        const uniqueZones = Array.from(new Set(data.establishments.map((e: any) => e.zone)));
        logger.debug('Unique zones', { zones: uniqueZones });

        // Backend always transforms category_id to STRING format ('cat-001', 'cat-002', etc.)
        logger.debug('Establishments loaded', {
          total: data.establishments.length,
          soi6Count: data.establishments.filter((e: any) => e.zone === 'soi6').length
        });

        // Show establishments by zone
        const zoneStats = uniqueZones.map((zone: any) => ({
          zone,
          count: data.establishments.filter((e: any) => e.zone === zone).length
        }));
        logger.debug('Establishments by zone', { zones: zoneStats });

        setEstablishments(data.establishments);
        setFilteredEstablishments(data.establishments);
      }
    } catch (error) {
      logger.error('Failed to fetch establishments', error);
      // Keep using sample data if API fails
    }
  };

  const fetchFreelances = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/independent-positions/map`);
      const data = await response.json();

      if (data.data) {
        logger.debug('Freelances loaded from API', { count: data.data.length });
        setFreelances(data.data);
      }
    } catch (error) {
      logger.error('Failed to fetch freelances', error);
    }
  };

  // Filter establishments based on search and categories
  useEffect(() => {
    logger.debug('Filtering establishments', { selectedCategories });
    let filtered = establishments.filter(est => {
      const isIncluded = selectedCategories.includes(String(est.category_id));

      return isIncluded &&
        (est.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         est.address.toLowerCase().includes(searchTerm.toLowerCase()));
    });
    logger.debug('Establishments filtered', {
      total: filtered.length,
      soi6Count: filtered.filter(e => e.zone === 'soi6').length
    });
    setFilteredEstablishments(filtered);
  }, [establishments, selectedCategories, searchTerm]);

  // Handlers
  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleEstablishmentClick = (establishment: Establishment) => {
    setSelectedEstablishment(establishment.id);
    navigate(`/bar/${establishment.id}`);
  };


  return (
    <div className="App" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a2e, #16213e, #240046)',
      color: '#ffffff'
    }}>

      <main className="page-content-with-header-nightlife" style={{
        overflow: 'hidden'
      }}>
        <PattayaMap
          establishments={filteredEstablishments}
          freelances={freelances}
          onEstablishmentClick={handleEstablishmentClick}
          selectedEstablishment={selectedEstablishment || undefined}
          onEstablishmentUpdate={fetchEstablishments}
        />
      </main>

      {/* Register Form Modal */}
      {showRegisterForm && (
        <div className="modal-app-overlay">
          <div className="modal-app-register-container">
            <RegisterForm
              onClose={() => setShowRegisterForm(false)}
              onSwitchToLogin={() => {
                setShowRegisterForm(false);
                // Le login sera géré par le header global
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const AppContent: React.FC = () => {
  const { secureFetch } = useSecureFetch();
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showEstablishmentForm, setShowEstablishmentForm] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitEmployee = async (employeeData: any) => {
    setIsSubmitting(true);
    try {
      const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/employees`, {
        method: 'POST',
        body: JSON.stringify(employeeData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit employee');
      }

      setShowEmployeeForm(false);
    } catch (error) {
      logger.error('Failed to submit employee', error);
      alert(error instanceof Error ? error.message : 'Failed to submit employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEstablishment = async (establishmentData: any) => {
    setIsSubmitting(true);
    try {
      const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/establishments`, {
        method: 'POST',
        body: JSON.stringify(establishmentData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit establishment');
      }

      setShowEstablishmentForm(false);
    } catch (error) {
      logger.error('Failed to submit establishment', error);
      alert(error instanceof Error ? error.message : 'Failed to submit establishment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Router>
          {/* Header global présent sur toutes les pages */}
          <Header
            onAddEmployee={() => setShowEmployeeForm(true)}
            onAddEstablishment={() => setShowEstablishmentForm(true)}
            onShowLogin={() => setShowLoginForm(true)}
          />

          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/bar/:id" element={<BarDetailPage />} />
            <Route path="/admin/*" element={<AdminPanel />} />
          </Routes>

          {/* Login Form Modal */}
          {showLoginForm && (
            <div className="modal-app-overlay">
              <div className="modal-app-login-container">
                <LoginForm
                  onClose={() => setShowLoginForm(false)}
                  onSwitchToRegister={() => {
                    setShowLoginForm(false);
                    // Register sera géré par HomePage si nécessaire
                  }}
                />
              </div>
            </div>
          )}

          {/* Employee Form Modal */}
          {showEmployeeForm && (
            <div className="modal-app-overlay">
              <div className="modal-app-employee-container">
                <EmployeeForm
                  onSubmit={handleSubmitEmployee}
                  onCancel={() => setShowEmployeeForm(false)}
                  isLoading={isSubmitting}
                />
              </div>
            </div>
          )}

          {/* Establishment Form Modal */}
          {showEstablishmentForm && (
            <div className="modal-app-overlay">
              <div className="modal-app-establishment-container">
                <EstablishmentForm
                  onSubmit={handleSubmitEstablishment}
                  onCancel={() => setShowEstablishmentForm(false)}
                />
              </div>
            </div>
          )}

          <ModalRenderer />
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <CSRFProvider>
        <ModalProvider>
          <AppContent />
        </ModalProvider>
      </CSRFProvider>
    </AuthProvider>
  );
};

export default App;