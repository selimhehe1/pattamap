/**
 * BarDetailContent
 * Main content area with mobile tabs vs desktop layout
 */
import React from 'react';
import { Check } from 'lucide-react';
import { Employee, Establishment } from '../../../types';
import GirlsGallery from '../GirlsGallery';
import BarInfoSidebar from '../BarInfoSidebar';
import TabNavigation from '../TabNavigation';
import { SkeletonGallery } from '../../Common/Skeleton';

interface BarDetailContentProps {
  bar: Establishment;
  girls: Employee[];
  girlsLoading: boolean;
  selectedGirl: Employee | null;
  setSelectedGirl: React.Dispatch<React.SetStateAction<Employee | null>>;
  activeTab: 'employees' | 'info';
  setActiveTab: React.Dispatch<React.SetStateAction<'employees' | 'info'>>;
  isMobile: boolean;
  showSuccessMessage: boolean;
}

export const BarDetailContent: React.FC<BarDetailContentProps> = ({
  bar,
  girls,
  girlsLoading,
  selectedGirl,
  setSelectedGirl,
  activeTab,
  setActiveTab,
  isMobile,
  showSuccessMessage,
}) => {
  // Employees gallery component
  const EmployeesGallery = (
    <div className="establishment-main-content-nightlife">
      {girlsLoading ? (
        <SkeletonGallery count={6} variant="employee" />
      ) : (
        <GirlsGallery
          girls={girls}
          onGirlClick={setSelectedGirl}
          selectedGirl={selectedGirl}
        />
      )}
    </div>
  );

  // Bar info sidebar component
  const InfoSidebar = (
    <div className="establishment-sidebar-nightlife" style={isMobile ? { position: 'static', top: 'auto' } : undefined}>
      <BarInfoSidebar
        bar={bar}
        employees={girls}
        isEditMode={false}
        editedBar={null}
        onUpdateField={undefined}
      />
    </div>
  );

  return (
    <>
      {/* Success message */}
      {showSuccessMessage && (
        <div className="establishment-success-message-nightlife">
          <Check size={16} className="text-success" /> Success!
        </div>
      )}

      {/* Tab Navigation - Mobile Only */}
      {isMobile && (
        <div style={{ padding: '0 var(--spacing-md)' }}>
          <TabNavigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            employeeCount={girls.length}
          />
        </div>
      )}

      {/* Main content */}
      {isMobile ? (
        // MOBILE: Show ONLY active tab content
        <div style={{ padding: '0 var(--spacing-md) var(--spacing-md)' }}>
          {activeTab === 'employees' ? EmployeesGallery : InfoSidebar}
        </div>
      ) : (
        // DESKTOP: Show both side by side
        <div className="establishment-layout-nightlife">
          {EmployeesGallery}
          {InfoSidebar}
        </div>
      )}
    </>
  );
};
