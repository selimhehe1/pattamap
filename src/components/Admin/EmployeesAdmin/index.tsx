/**
 * EmployeesAdmin - Main component for employee management in admin panel
 * Refactored from 1600+ lines to ~150 lines using modular architecture
 */

import React, { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, Loader2, Ban, CheckCircle, MailX, Users, UsersRound } from 'lucide-react';
import { GirlProfile } from '../../../routes/lazyComponents';
import AdminBreadcrumb from '../../Common/AdminBreadcrumb';
import LoadingFallback from '../../Common/LoadingFallback';
import { SkeletonGallery } from '../../Common/Skeleton';
import { useEmployeesAdmin } from './hooks/useEmployeesAdmin';
import { EmployeesFilterTabs } from './EmployeesFilterTabs';
import { EmployeeCard } from './EmployeeCard';
import { EditProposalCard } from './EditProposalCard';
import { EmployeeDetailModal } from './EmployeeDetailModal';
import EditEmployeeModal from '../../Employee/EditEmployeeModal';
import { logger as _logger } from '../../../utils/logger';
import '../../../styles/components/employee-profile.css';
import '../../../styles/components/social-icons.css';
import '../../../styles/pages/user-dashboard.css';

interface EmployeesAdminProps {
  onTabChange: (tab: string) => void;
}

const EmployeesAdmin: React.FC<EmployeesAdminProps> = ({ onTabChange }) => {
  const { t } = useTranslation();
  const {
    employees,
    editProposals,
    isLoading,
    filter,
    selectedEmployee,
    editingEmployee,
    selectedProposal,
    establishmentNames,
    showEmployeeProfile,
    profileEmployee,
    setFilter,
    setSelectedEmployee,
    setEditingEmployee,
    setSelectedProposal,
    setShowEmployeeProfile,
    setProfileEmployee,
    handleApprove,
    handleReject,
    handleApproveProposal,
    handleRejectProposal,
    handleSaveEmployee,
    handleVerifyEmployee,
    handleRevokeVerification,
    handleDeleteEmployee,
    selectedIds,
    isBulkProcessing,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
    handleBulkApprove,
    handleBulkReject,
    isProcessing,
    hasAccess,
  } = useEmployeesAdmin();

  // Access denied view
  if (!hasAccess) {
    return (
      <div className="command-content-section">
        <div className="cmd-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <Ban size={48} style={{ marginBottom: '20px', opacity: 0.5, color: 'var(--color-error)' }} />
          <h2 className="cmd-card__title">{t('admin.accessDenied')}</h2>
          <p className="cmd-card__subtitle">{t('admin.accessDeniedArea')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="command-content-section">
      <AdminBreadcrumb
        currentSection={t('admin.employeesManagement')}
        onBackToDashboard={() => onTabChange('overview')}
        icon={<Users size={20} />}
      />

      {/* Header */}
      <div className="cmd-section-header">
        <h1 className="cmd-section-title">
          <UsersRound size={28} /> {t('admin.employeesManagement')}
        </h1>
        <p className="cmd-section-subtitle">{t('admin.reviewApproveEmployees')}</p>
      </div>

      {/* Filter Tabs */}
      <EmployeesFilterTabs activeFilter={filter} onFilterChange={setFilter} />

      {/* Content */}
      {isLoading ? (
        <SkeletonGallery count={8} variant="employee" />
      ) : filter === 'pending-edits' ? (
        editProposals.length === 0 ? (
          <div className="empty-state-card">
            <h3><CheckCircle size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />{t('admin.noPendingEdits')}</h3>
            <p>{t('admin.allEditsReviewed')}</p>
          </div>
        ) : (
          <div className="proposals-list">
            {editProposals.map((proposal) => (
              <EditProposalCard
                key={proposal.id}
                proposal={proposal}
                isExpanded={selectedProposal?.id === proposal.id}
                isProcessing={isProcessing(proposal.id)}
                establishmentNames={establishmentNames}
                onToggleExpand={() =>
                  setSelectedProposal(selectedProposal?.id === proposal.id ? null : proposal)
                }
                onApprove={handleApproveProposal}
                onReject={handleRejectProposal}
              />
            ))}
          </div>
        )
      ) : employees.length === 0 ? (
        <div className="empty-state-card">
          <h3><MailX size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />{t('admin.noEmployeesFound')}</h3>
          <p>{t('admin.noEmployeesMatch')}</p>
        </div>
      ) : (
        <>
          {/* Bulk Action Bar */}
          <div className={`cmd-table__bulk-bar ${selectedIds.size > 0 ? 'cmd-table__bulk-bar--visible' : ''}`}>
            <div className="cmd-table__bulk-left">
              <label className="cmd-table__checkbox-label">
                <input
                  type="checkbox"
                  className="cmd-table__checkbox"
                  checked={selectedIds.size === employees.length && employees.length > 0}
                  onChange={toggleSelectAll}
                />
                {t('admin.selectAll', 'Select All')}
              </label>
              {selectedIds.size > 0 && (
                <span className="cmd-table__bulk-count">
                  ({selectedIds.size} {t('admin.selected', 'selected')})
                </span>
              )}
            </div>

            {selectedIds.size > 0 && (
              <div className="cmd-table__bulk-actions">
                <button
                  onClick={handleBulkApprove}
                  disabled={isBulkProcessing}
                  className="cmd-modal-btn cmd-modal-btn--success cmd-modal-btn--sm"
                >
                  {isBulkProcessing ? (
                    <Loader2 size={16} className="cmd-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  {t('admin.approveSelected', 'Approve')}
                </button>
                <button
                  onClick={handleBulkReject}
                  disabled={isBulkProcessing}
                  className="cmd-modal-btn cmd-modal-btn--danger cmd-modal-btn--sm"
                >
                  {isBulkProcessing ? (
                    <Loader2 size={16} className="cmd-spin" />
                  ) : (
                    <X size={16} />
                  )}
                  {t('admin.rejectSelected', 'Reject')}
                </button>
                <button
                  onClick={clearSelection}
                  disabled={isBulkProcessing}
                  className="cmd-modal-btn cmd-modal-btn--ghost cmd-modal-btn--sm"
                >
                  {t('admin.clearSelection', 'Clear')}
                </button>
              </div>
            )}
          </div>

          {/* Employee Grid */}
          <div className="grid-enhanced-nightlife">
            {employees.map((employee) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                isProcessing={isProcessing(employee.id)}
                isSelected={selectedIds.has(employee.id)}
                onToggleSelection={toggleSelection}
                onViewProfile={(emp) => {
                  setProfileEmployee(emp);
                  setShowEmployeeProfile(true);
                }}
                onEdit={setEditingEmployee}
                onApprove={handleApprove}
                onReject={handleReject}
                onVerify={handleVerifyEmployee}
                onRevokeVerification={handleRevokeVerification}
                onDelete={handleDeleteEmployee}
              />
            ))}
          </div>
        </>
      )}

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          isOpen={!!selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      {/* GirlProfile Modal */}
      {showEmployeeProfile && profileEmployee && (
        <div className="profile-overlay-nightlife">
          <Suspense fallback={<LoadingFallback message="Loading profile..." variant="modal" />}>
            <GirlProfile
              girl={{
                id: profileEmployee.id,
                name: profileEmployee.name,
                nickname: profileEmployee.nickname || undefined,
                age: profileEmployee.age,
                sex: profileEmployee.sex,
                nationality: profileEmployee.nationality,
                photos: profileEmployee.photos || [],
                description: profileEmployee.description || undefined,
                social_media: profileEmployee.social_media,
                status: profileEmployee.status,
                self_removal_requested: profileEmployee.self_removal_requested,
                created_by: profileEmployee.created_by,
                employment_history: profileEmployee.employment_history?.map((job) => ({
                  id: String(job.id || 0),
                  employee_id: profileEmployee.id,
                  establishment_id: String(job.establishment_id || 0),
                  establishment: job.establishment_name
                    ? {
                        id: String(job.establishment_id || 0),
                        name: job.establishment_name,
                        address: 'N/A',
                        category_id: '1',
                        category: {
                          id: '1',
                          name: 'Bar',
                          icon: '🍻',
                          color: '#C19A6B',
                          created_at: new Date().toISOString(),
                        },
                        status: 'approved' as const,
                        created_by: 'system',
                        created_at: job.start_date || new Date().toISOString(),
                        updated_at: job.start_date || new Date().toISOString(),
                      }
                    : undefined,
                  start_date: job.start_date,
                  end_date: job.end_date || undefined,
                  position: job.position || undefined,
                  notes: job.notes || undefined,
                  is_current: job.is_current,
                  created_by: profileEmployee.created_by,
                  created_at: job.start_date,
                  updated_at: job.start_date,
                })) || [],
                created_at: profileEmployee.created_at,
                updated_at: profileEmployee.updated_at || profileEmployee.created_at,
              }}
              onClose={() => {
                setShowEmployeeProfile(false);
                setProfileEmployee(null);
              }}
            />
          </Suspense>
        </div>
      )}

      {/* Edit Employee Modal - Always render to allow AnimatePresence exit animation */}
      <EditEmployeeModal
        employee={editingEmployee}
        isOpen={!!editingEmployee}
        onClose={() => setEditingEmployee(null)}
        onSave={handleSaveEmployee}
      />
    </div>
  );
};

export default EmployeesAdmin;
