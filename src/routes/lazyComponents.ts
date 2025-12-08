/**
 * Lazy-loaded Route Components
 *
 * Centralized lazy component definitions for code splitting.
 * These components are loaded on-demand to reduce initial bundle size.
 */

import { lazy } from 'react';

// Main route components with code splitting
export const AdminPanel = lazy(() => import('../components/Admin/AdminPanel'));
export const SearchPage = lazy(() => import('../components/Search/SearchPage'));
export const FreelancesPage = lazy(() => import('../pages/FreelancesPage')); // 🆕 v10.3 - Freelances List
export const BarDetailPage = lazy(() => import('../components/Bar/BarDetailPage'));
export const UserDashboard = lazy(() => import('../components/User/UserDashboard'));
export const MyEstablishmentsPage = lazy(() => import('../pages/MyEstablishmentsPage')); // 🆕 v10.1 - Owner Dashboard
export const EmployeeDashboard = lazy(() => import('../components/Employee/EmployeeDashboard')); // 🆕 v10.2 - Employee Dashboard
export const MyOwnershipRequests = lazy(() => import('../components/Owner/MyOwnershipRequests')); // 🆕 v10.2 - Ownership Requests
export const MyAchievementsPage = lazy(() => import('../pages/MyAchievementsPage')); // 🆕 v10.3 - Gamification

// Heavy modal/form components with code splitting
export const EmployeeForm = lazy(() => import('../components/Forms/EmployeeForm'));
export const EstablishmentForm = lazy(() => import('../components/Forms/EstablishmentForm'));
export const GirlProfile = lazy(() => import('../components/Bar/GirlProfile'));

// Import functions for preloading
export const importAdminPanel = (): Promise<typeof import('../components/Admin/AdminPanel')> => import('../components/Admin/AdminPanel');
export const importSearchPage = (): Promise<typeof import('../components/Search/SearchPage')> => import('../components/Search/SearchPage');
export const importFreelancesPage = (): Promise<typeof import('../pages/FreelancesPage')> => import('../pages/FreelancesPage'); // 🆕 v10.3
export const importBarDetailPage = (): Promise<typeof import('../components/Bar/BarDetailPage')> => import('../components/Bar/BarDetailPage');
export const importUserDashboard = (): Promise<typeof import('../components/User/UserDashboard')> => import('../components/User/UserDashboard');
export const importMyEstablishmentsPage = (): Promise<typeof import('../pages/MyEstablishmentsPage')> => import('../pages/MyEstablishmentsPage'); // 🆕 v10.1
export const importEmployeeDashboard = (): Promise<typeof import('../components/Employee/EmployeeDashboard')> => import('../components/Employee/EmployeeDashboard'); // 🆕 v10.2
export const importMyOwnershipRequests = (): Promise<typeof import('../components/Owner/MyOwnershipRequests')> => import('../components/Owner/MyOwnershipRequests'); // 🆕 v10.2
export const importMyAchievementsPage = (): Promise<typeof import('../pages/MyAchievementsPage')> => import('../pages/MyAchievementsPage'); // 🆕 v10.3
export const importEmployeeForm = (): Promise<typeof import('../components/Forms/EmployeeForm')> => import('../components/Forms/EmployeeForm');
export const importEstablishmentForm = (): Promise<typeof import('../components/Forms/EstablishmentForm')> => import('../components/Forms/EstablishmentForm');
export const importGirlProfile = (): Promise<typeof import('../components/Bar/GirlProfile')> => import('../components/Bar/GirlProfile');
