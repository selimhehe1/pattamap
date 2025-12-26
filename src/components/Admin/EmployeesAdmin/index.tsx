/**
 * EmployeesAdmin - Main component for employee management in admin panel
 * Refactored from 1600+ lines to ~150 lines using modular architecture
 */

import React, { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, Loader2, Ban, CheckCircle, MailX, Users } from 'lucide-react';
import { EmployeeForm, GirlProfile } from '../../../routes/lazyComponents';
import AdminBreadcrumb from '../../Common/AdminBreadcrumb';
import LoadingFallback from '../../Common/LoadingFallback';
import { useEmployeesAdmin } from './hooks/useEmployeesAdmin';
import { EmployeesFilterTabs } from './EmployeesFilterTabs';
import { EmployeeCard } from './EmployeeCard';
import { EditProposalCard } from './EditProposalCard';
import { EmployeeDetailModal } from './EmployeeDetailModal';
import { logger } from '../../../utils/logger';
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
      <div className="access-denied-container">
        <div className="access-denied-card">
          <h2><Ban size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />{t('admin.accessDenied')}</h2>
          <p>{t('admin.accessDeniedArea')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page-container">
      <AdminBreadcrumb
        currentSection={t('admin.employeesManagement')}
        onBackToDashboard={() => onTabChange('overview')}
        icon={<Users size={20} style={{ verticalAlign: 'middle' }} />}
      />

      {/* Header */}
      <div className="admin-page-header">
        <h1 className="admin-page-title">👥 {t('admin.employeesManagement')}</h1>
        <p className="admin-page-subtitle">{t('admin.reviewApproveEmployees')}</p>
      </div>

      {/* Filter Tabs */}
      <EmployeesFilterTabs activeFilter={filter} onFilterChange={setFilter} />

      {/* Content */}
      {isLoading ? (
        <LoadingFallback message={t('admin.loadingEmployees')} variant="inline" />
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              marginBottom: '16px',
              background: 'rgba(193, 154, 107, 0.1)',
              borderRadius: '12px',
              border: '1px solid rgba(193, 154, 107, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  color: '#C19A6B',
                  fontWeight: 500,
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.size === employees.length && employees.length > 0}
                  onChange={toggleSelectAll}
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: '#C19A6B',
                    cursor: 'pointer',
                  }}
                />
                {t('admin.selectAll', 'Select All')}
              </label>
              {selectedIds.size > 0 && (
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>
                  ({selectedIds.size} {t('admin.selected', 'selected')})
                </span>
              )}
            </div>

            {selectedIds.size > 0 && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleBulkApprove}
                  disabled={isBulkProcessing}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: isBulkProcessing ? 'not-allowed' : 'pointer',
                    opacity: isBulkProcessing ? 0.7 : 1,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isBulkProcessing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  {t('admin.approveSelected', 'Approve')}
                </button>
                <button
                  onClick={handleBulkReject}
                  disabled={isBulkProcessing}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: isBulkProcessing ? 'not-allowed' : 'pointer',
                    opacity: isBulkProcessing ? 0.7 : 1,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isBulkProcessing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <X size={16} />
                  )}
                  {t('admin.rejectSelected', 'Reject')}
                </button>
                <button
                  onClick={clearSelection}
                  disabled={isBulkProcessing}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '14px',
                    cursor: isBulkProcessing ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                  }}
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
              />
            ))}
          </div>
        </>
      )}

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
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

      {/* Edit Employee Form */}
      {editingEmployee && (
        <Suspense fallback={<LoadingFallback message="Loading employee form..." variant="modal" />}>
          <EmployeeForm
            initialData={{
              ...editingEmployee,
              current_establishment_id: (() => {
                const fromHistory = editingEmployee.employment_history?.find(
                  (eh) => eh.is_current
                )?.establishment_id;
                logger.debug('EmployeesAdmin: current_establishment_id:', fromHistory);
                return fromHistory || '';
              })(),
            }}
            onSubmit={handleSaveEmployee}
            onCancel={() => setEditingEmployee(null)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default EmployeesAdmin;
