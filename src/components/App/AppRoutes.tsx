import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import ErrorBoundary from '../Common/ErrorBoundary';
import LoadingFallback from '../Common/LoadingFallback';
import PageTransition from '../Common/PageTransition';
import ProtectedRoute from '../Auth/ProtectedRoute';

// Lazy loaded components
import {
  AdminPanel,
  SearchPage,
  FreelancesPage,
  BarDetailPage,
  UserDashboard,
  MyEstablishmentsPage,
  EmployeeDashboard,
  MyOwnershipRequests,
  MyAchievementsPage,
  VisitHistoryPage,
  NotFoundPage
} from '../../routes/lazyComponents';

// Direct imports for critical path
import LoginPage from '../../pages/LoginPage';

interface AppRoutesProps {
  HomePage: React.ComponentType;
}

const AppRoutes: React.FC<AppRoutesProps> = ({ HomePage }) => {
  return (
    <ErrorBoundary boundaryName="MainRoutes">
      <Suspense fallback={<LoadingFallback message="Loading page..." variant="page" />}>
        <PageTransition>
          <Routes>
            {/* ========================================
                PUBLIC ROUTES
                ======================================== */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/freelances" element={<FreelancesPage />} />
            {/* SEO-friendly URL with zone and slug */}
            <Route path="/bar/:zone/:slug" element={<BarDetailPage />} />
            {/* Legacy redirect for old /bar/:id URLs */}
            <Route path="/bar/:id" element={<BarDetailPage />} />

            {/* ========================================
                PROTECTED ROUTES - Require Authentication
                ======================================== */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <UserDashboard />
              </ProtectedRoute>
            } />

            <Route path="/my-establishments" element={
              <ProtectedRoute requiredAccountTypes={['establishment_owner']}>
                <MyEstablishmentsPage />
              </ProtectedRoute>
            } />

            <Route path="/my-ownership-requests" element={
              <ProtectedRoute>
                <MyOwnershipRequests />
              </ProtectedRoute>
            } />

            <Route path="/employee/dashboard" element={
              <ProtectedRoute requiredAccountTypes={['employee']}>
                <EmployeeDashboard />
              </ProtectedRoute>
            } />

            <Route path="/achievements" element={
              <ProtectedRoute>
                <MyAchievementsPage />
              </ProtectedRoute>
            } />

            <Route path="/my-visits" element={
              <ProtectedRoute>
                <VisitHistoryPage />
              </ProtectedRoute>
            } />

            {/* ========================================
                ADMIN ROUTES - Require Admin/Moderator Role
                ======================================== */}
            <Route path="/admin/*" element={
              <ProtectedRoute requiredRoles={['admin', 'moderator']}>
                <AdminPanel />
              </ProtectedRoute>
            } />

            {/* ========================================
                404 CATCH-ALL - Must be last
                ======================================== */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </PageTransition>
      </Suspense>
    </ErrorBoundary>
  );
};

export default AppRoutes;
