import React, { Suspense, lazy } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UseAppModalsReturn } from '../../hooks/useAppModals';
import LoadingFallback from '../Common/LoadingFallback';
import LoginForm from '../Auth/LoginForm';
import ForgotPasswordForm from '../Auth/ForgotPasswordForm'; // 🔧 FIX A4
import { EmployeeForm, EstablishmentForm } from '../../routes/lazyComponents';

// Lazy-loaded modal components
const MultiStepRegisterForm = lazy(() => import('../Auth/MultiStepRegisterForm'));
const EmployeeProfileWizard = lazy(() => import('../Employee/EmployeeProfileWizard'));
const EditMyProfileModal = lazy(() => import('../Employee/EditMyProfileModal'));
const UserInfoModal = lazy(() => import('../User/UserInfoModal'));

interface AppModalsProps {
  modals: UseAppModalsReturn;
}

const AppModals: React.FC<AppModalsProps> = ({ modals }) => {
  const { user, refreshLinkedProfile } = useAuth();

  return (
    <>
      {/* Login Form Modal */}
      {modals.showLoginForm && (
        <div className="modal-app-overlay">
          <div className="modal-app-login-container">
            <LoginForm
              onClose={modals.closeLoginForm}
              onSwitchToRegister={modals.switchLoginToRegister}
              onSwitchToForgotPassword={modals.switchLoginToForgotPassword}
            />
          </div>
        </div>
      )}

      {/* 🔧 FIX A4: Forgot Password Form Modal */}
      {modals.showForgotPasswordForm && (
        <div className="modal-app-overlay">
          <div className="modal-app-login-container">
            <ForgotPasswordForm
              onClose={modals.closeForgotPasswordForm}
              onSwitchToLogin={modals.switchForgotPasswordToLogin}
            />
          </div>
        </div>
      )}

      {/* Register Form Modal */}
      {modals.showRegisterForm && (
        <div className="modal-app-overlay">
          <div className="modal-app-register-container">
            <Suspense fallback={<LoadingFallback message="Loading registration..." variant="modal" />}>
              <MultiStepRegisterForm
                onClose={modals.closeRegisterForm}
                onSwitchToLogin={modals.switchRegisterToLogin}
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* Employee Profile Wizard Modal */}
      {modals.showEmployeeProfileWizard && (
        <Suspense fallback={<LoadingFallback message="Loading wizard..." variant="modal" />}>
          <EmployeeProfileWizard
            onClose={modals.closeEmployeeProfileWizard}
            onCreateProfile={modals.handleWizardCreateProfile}
          />
        </Suspense>
      )}

      {/* Employee Form Modal */}
      {modals.showEmployeeForm && (
        <div className="modal-app-overlay">
          <div className="modal-app-employee-container">
            <Suspense fallback={<LoadingFallback message="Loading form..." variant="modal" />}>
              <EmployeeForm
                onSubmit={modals.handleSubmitEmployee}
                onCancel={modals.closeEmployeeForm}
                isLoading={modals.isSubmitting}
                initialData={modals.editingEmployeeData || undefined}
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* Establishment Form Modal */}
      {modals.showEstablishmentForm && (
        <div className="modal-app-overlay">
          <div className="modal-app-establishment-container">
            <Suspense fallback={<LoadingFallback message="Loading form..." variant="modal" />}>
              <EstablishmentForm
                onSubmit={modals.handleSubmitEstablishment}
                onCancel={modals.closeEstablishmentForm}
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* Edit My Profile Modal */}
      {modals.showEditMyProfileModal && (
        <Suspense fallback={<LoadingFallback message="Loading profile editor..." variant="modal" />}>
          <EditMyProfileModal
            isOpen={modals.showEditMyProfileModal}
            onClose={modals.closeEditMyProfileModal}
            onProfileUpdated={async () => {
              if (refreshLinkedProfile) {
                await refreshLinkedProfile();
              }
            }}
          />
        </Suspense>
      )}

      {/* User Info Modal */}
      {modals.showUserInfoModal && user && (
        <Suspense fallback={<LoadingFallback message="Loading profile..." variant="modal" />}>
          <UserInfoModal
            user={user}
            onClose={modals.closeUserInfoModal}
          />
        </Suspense>
      )}
    </>
  );
};

export default AppModals;
