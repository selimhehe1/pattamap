/**
 * OwnerManagementModal Component
 *
 * Modal for managing establishment owners - assign, edit, and remove owners.
 * Extracted from EstablishmentOwnersAdmin for better maintainability.
 */

import React from 'react';
import {
  Building2,
  User,
  Crown,
  Key,
  Plus,
  X,
  Check,
  Pencil,
  Trash2,
  Loader2,
  MailX,
  Info,
  Users
} from 'lucide-react';
import type {
  AdminEstablishment,
  EstablishmentOwner,
  AdminUser,
  OwnerPermissions,
  OwnerRole
} from '../types/ownershipTypes';
import {
  formatDate,
  getRoleColor,
  getRoleIcon,
  getPermissionIcon,
  getPermissionLabel,
  PERMISSION_DESCRIPTIONS
} from './utils';

interface OwnerManagementModalProps {
  establishment: AdminEstablishment;
  owners: EstablishmentOwner[];
  processingIds: Set<string>;
  onClose: () => void;
  // Assign owner props
  showAssignModal: boolean;
  onShowAssignModal: (show: boolean) => void;
  searchUserTerm: string;
  onSearchUserTermChange: (term: string) => void;
  isSearching: boolean;
  searchedUsers: AdminUser[];
  selectedUser: AdminUser | null;
  onSelectUser: (user: AdminUser | null) => void;
  ownerRole: OwnerRole;
  onOwnerRoleChange: (role: OwnerRole) => void;
  customPermissions: OwnerPermissions;
  onCustomPermissionsChange: (permissions: OwnerPermissions) => void;
  onAssignOwner: () => void;
  // Edit owner props
  editingOwner: EstablishmentOwner | null;
  onEditingOwnerChange: (owner: EstablishmentOwner | null) => void;
  onUpdateOwnerPermissions: () => void;
  // Remove owner
  onRemoveOwner: (establishmentId: string, userId: string) => void;
}

const OwnerManagementModal: React.FC<OwnerManagementModalProps> = ({
  establishment,
  owners,
  processingIds,
  onClose,
  showAssignModal,
  onShowAssignModal,
  searchUserTerm,
  onSearchUserTermChange,
  isSearching,
  searchedUsers,
  selectedUser,
  onSelectUser,
  ownerRole,
  onOwnerRoleChange,
  customPermissions,
  onCustomPermissionsChange,
  onAssignOwner,
  editingOwner,
  onEditingOwnerChange,
  onUpdateOwnerPermissions,
  onRemoveOwner
}) => {
  const isProcessing = processingIds.has(establishment.id);

  const handleClose = () => {
    onShowAssignModal(false);
    onSelectUser(null);
    onSearchUserTermChange('');
    onEditingOwnerChange(null);
    onClose();
  };

  return (
    <div className="cmd-modal-overlay" role="dialog" aria-modal="true">
      <div className="cmd-modal cmd-modal--gold" style={{ maxWidth: '800px' }}>
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="cmd-modal__close"
        >
          &times;
        </button>

        <h2 className="cmd-modal__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={24} /> {establishment.name}
        </h2>
        <p className="cmd-modal__description" style={{ marginBottom: '24px' }}>
          Manage owners who can control this establishment
        </p>

        {/* Assign New Owner Button */}
        {!showAssignModal && !editingOwner && (
          <button
            onClick={() => onShowAssignModal(true)}
            style={{
              width: '100%',
              padding: '15px',
              background: 'linear-gradient(45deg, #00FF7F, #00CC65)',
              color: 'white',
              border: 'none',
              borderRadius: '15px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '20px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,255,127,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Plus size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Assign New Owner
          </button>
        )}

        {/* Assign Owner Form */}
        {showAssignModal && !editingOwner && (
          <AssignOwnerForm
            searchUserTerm={searchUserTerm}
            onSearchUserTermChange={onSearchUserTermChange}
            isSearching={isSearching}
            searchedUsers={searchedUsers}
            selectedUser={selectedUser}
            onSelectUser={onSelectUser}
            ownerRole={ownerRole}
            onOwnerRoleChange={onOwnerRoleChange}
            customPermissions={customPermissions}
            onCustomPermissionsChange={onCustomPermissionsChange}
            isProcessing={isProcessing}
            onCancel={() => {
              onShowAssignModal(false);
              onSelectUser(null);
              onSearchUserTermChange('');
            }}
            onSubmit={onAssignOwner}
          />
        )}

        {/* Edit Permissions Form */}
        {editingOwner && (
          <EditPermissionsForm
            owner={editingOwner}
            onOwnerChange={onEditingOwnerChange}
            isProcessing={isProcessing}
            onCancel={() => onEditingOwnerChange(null)}
            onSubmit={onUpdateOwnerPermissions}
          />
        )}

        {/* Current Owners List */}
        <CurrentOwnersList
          owners={owners}
          processingIds={processingIds}
          showAssignModal={showAssignModal}
          editingOwner={editingOwner}
          onEditOwner={onEditingOwnerChange}
          onRemoveOwner={onRemoveOwner}
        />
      </div>
    </div>
  );
};

// ============================================
// Sub-components
// ============================================

interface AssignOwnerFormProps {
  searchUserTerm: string;
  onSearchUserTermChange: (term: string) => void;
  isSearching: boolean;
  searchedUsers: AdminUser[];
  selectedUser: AdminUser | null;
  onSelectUser: (user: AdminUser | null) => void;
  ownerRole: OwnerRole;
  onOwnerRoleChange: (role: OwnerRole) => void;
  customPermissions: OwnerPermissions;
  onCustomPermissionsChange: (permissions: OwnerPermissions) => void;
  isProcessing: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}

const AssignOwnerForm: React.FC<AssignOwnerFormProps> = ({
  searchUserTerm,
  onSearchUserTermChange,
  isSearching,
  searchedUsers,
  selectedUser,
  onSelectUser,
  ownerRole,
  onOwnerRoleChange,
  customPermissions,
  onCustomPermissionsChange,
  isProcessing,
  onCancel,
  onSubmit
}) => {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.3)',
      borderRadius: '15px',
      border: '2px solid rgba(193, 154, 107,0.3)',
      padding: '20px',
      marginBottom: '20px'
    }}>
      <h3 style={{
        color: '#FFD700',
        fontSize: '18px',
        fontWeight: 'bold',
        margin: '0 0 15px 0'
      }}>
        <User size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
        Assign New Owner
      </h3>

      {/* Search User */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{
          color: '#cccccc',
          fontSize: '12px',
          fontWeight: 'bold',
          display: 'block',
          marginBottom: '5px'
        }}>
          Search User (must have account_type="establishment_owner")
        </label>
        <input
          type="text"
          placeholder="Search by pseudonym or email... (min 2 chars)"
          value={searchUserTerm}
          onChange={(e) => onSearchUserTermChange(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '10px',
            border: '2px solid rgba(193, 154, 107,0.3)',
            background: 'rgba(0,0,0,0.3)',
            color: '#ffffff',
            fontSize: '14px'
          }}
        />

        {/* Loading Indicator */}
        {isSearching && (
          <div style={{
            marginTop: '10px',
            padding: '20px',
            textAlign: 'center',
            background: 'rgba(0,0,0,0.5)',
            borderRadius: '10px',
            border: '1px solid rgba(0,229,255,0.3)'
          }}>
            <div style={{
              display: 'inline-block',
              width: '20px',
              height: '20px',
              border: '3px solid rgba(0,229,255,0.3)',
              borderTop: '3px solid #00E5FF',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#00E5FF' }}>
              Searching establishment owners...
            </div>
          </div>
        )}

        {/* No Results Message */}
        {!isSearching && searchUserTerm.length >= 2 && searchedUsers.length === 0 && (
          <div style={{
            marginTop: '10px',
            padding: '20px',
            textAlign: 'center',
            background: 'rgba(0,0,0,0.5)',
            borderRadius: '10px',
            border: '1px solid rgba(255,71,87,0.3)'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}><MailX size={24} /></div>
            <div style={{ fontSize: '12px', color: '#888888' }}>
              No establishment owners found matching "<span style={{ color: '#C19A6B' }}>{searchUserTerm}</span>"
            </div>
          </div>
        )}

        {/* Minimum Characters Message */}
        {searchUserTerm.length > 0 && searchUserTerm.length < 2 && (
          <div style={{
            marginTop: '10px',
            padding: '10px',
            textAlign: 'center',
            background: 'rgba(255,215,0,0.1)',
            borderRadius: '10px',
            border: '1px solid rgba(255,215,0,0.3)',
            fontSize: '11px',
            color: '#FFD700'
          }}>
            <Info size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Type at least 2 characters to search
          </div>
        )}

        {/* Search Results */}
        {!isSearching && searchedUsers.length > 0 && (
          <div style={{
            marginTop: '10px',
            maxHeight: '200px',
            overflowY: 'auto',
            background: 'rgba(0,0,0,0.5)',
            borderRadius: '10px',
            border: '1px solid rgba(193, 154, 107,0.3)'
          }}>
            {searchedUsers.map((u) => (
              <div
                key={u.id}
                onClick={() => onSelectUser(u)}
                style={{
                  padding: '10px',
                  borderBottom: '1px solid rgba(193, 154, 107,0.1)',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(193, 154, 107,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ color: '#ffffff', fontWeight: 'bold' }}>{u.pseudonym}</div>
                <div style={{ color: '#cccccc', fontSize: '12px' }}>{u.email}</div>
              </div>
            ))}
          </div>
        )}

        {/* Selected User */}
        {selectedUser && (
          <div style={{
            marginTop: '10px',
            padding: '10px',
            borderRadius: '10px',
            background: 'rgba(255,215,0,0.1)',
            border: '2px solid #FFD700'
          }}>
            <div style={{ color: '#FFD700', fontWeight: 'bold' }}>
              <Check size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Selected: {selectedUser.pseudonym}
            </div>
            <div style={{ color: '#cccccc', fontSize: '12px' }}>{selectedUser.email}</div>
          </div>
        )}
      </div>

      {/* Role Selection */}
      <RoleSelector
        role={ownerRole}
        onRoleChange={onOwnerRoleChange}
      />

      {/* Permissions Checkboxes */}
      <PermissionsCheckboxes
        permissions={customPermissions}
        onPermissionsChange={onCustomPermissionsChange}
      />

      {/* Form Actions */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '10px',
            background: 'linear-gradient(45deg, #666666, #888888)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold'
          }}
        >
          <X size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={!selectedUser || isProcessing}
          style={{
            flex: 1,
            padding: '10px',
            background: (!selectedUser || isProcessing)
              ? 'linear-gradient(45deg, #666666, #888888)'
              : 'linear-gradient(45deg, #00FF7F, #00CC65)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: (!selectedUser || isProcessing) ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            opacity: (!selectedUser || isProcessing) ? 0.5 : 1
          }}
        >
          {isProcessing ? (
            <><Loader2 size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Assigning...</>
          ) : (
            <><Check size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Assign Owner</>
          )}
        </button>
      </div>
    </div>
  );
};

interface EditPermissionsFormProps {
  owner: EstablishmentOwner;
  onOwnerChange: (owner: EstablishmentOwner | null) => void;
  isProcessing: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}

const EditPermissionsForm: React.FC<EditPermissionsFormProps> = ({
  owner,
  onOwnerChange,
  isProcessing,
  onCancel,
  onSubmit
}) => {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.3)',
      borderRadius: '15px',
      border: '2px solid rgba(255,215,0,0.3)',
      padding: '20px',
      marginBottom: '20px'
    }}>
      <h3 style={{
        color: '#FFD700',
        fontSize: '18px',
        fontWeight: 'bold',
        margin: '0 0 15px 0'
      }}>
        <Pencil size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
        Edit Permissions: {owner.user?.pseudonym}
      </h3>

      {/* Role Selection */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{
          color: '#cccccc',
          fontSize: '12px',
          fontWeight: 'bold',
          display: 'block',
          marginBottom: '5px'
        }}>
          Owner Role
        </label>
        <div className="cmd-role-toggle">
          <button
            onClick={() => onOwnerChange({ ...owner, owner_role: 'owner' })}
            className={`cmd-role-toggle__btn cmd-role-toggle__btn--owner ${owner.owner_role === 'owner' ? 'cmd-role-toggle__btn--active' : ''}`}
          >
            <Crown size={14} />Owner
          </button>
          <button
            onClick={() => onOwnerChange({ ...owner, owner_role: 'manager' })}
            className={`cmd-role-toggle__btn cmd-role-toggle__btn--manager ${owner.owner_role === 'manager' ? 'cmd-role-toggle__btn--active' : ''}`}
          >
            <Key size={14} />Manager
          </button>
        </div>
      </div>

      {/* Permissions Checkboxes */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{
          color: '#cccccc',
          fontSize: '12px',
          fontWeight: 'bold',
          display: 'block',
          marginBottom: '10px'
        }}>
          Permissions (hover <Info size={12} style={{ verticalAlign: 'middle' }} /> for details)
        </label>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {Object.entries(owner.permissions).map(([key, value]) => (
            <label
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '8px',
                cursor: 'pointer',
                position: 'relative'
              }}
            >
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => onOwnerChange({
                  ...owner,
                  permissions: { ...owner.permissions, [key]: e.target.checked }
                })}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ color: '#ffffff', fontSize: '13px', flex: 1 }}>
                {getPermissionLabel(key)}
              </span>
              <span
                style={{
                  marginLeft: '4px',
                  cursor: 'help',
                  color: '#00E5FF',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
                title={PERMISSION_DESCRIPTIONS[key]}
              >
                <Info size={12} />
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Form Actions */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '10px',
            background: 'linear-gradient(45deg, #666666, #888888)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold'
          }}
        >
          <X size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={isProcessing}
          style={{
            flex: 1,
            padding: '10px',
            background: isProcessing
              ? 'linear-gradient(45deg, #666666, #888888)'
              : 'linear-gradient(45deg, #FFD700, #FFA500)',
            color: isProcessing ? 'white' : '#000',
            border: 'none',
            borderRadius: '10px',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            opacity: isProcessing ? 0.5 : 1
          }}
        >
          {isProcessing ? (
            <><Loader2 size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Updating...</>
          ) : (
            <><Check size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Save Changes</>
          )}
        </button>
      </div>
    </div>
  );
};

interface RoleSelectorProps {
  role: OwnerRole;
  onRoleChange: (role: OwnerRole) => void;
}

const RoleSelector: React.FC<RoleSelectorProps> = ({ role, onRoleChange }) => {
  return (
    <div style={{ marginBottom: '15px' }}>
      <label style={{
        color: '#cccccc',
        fontSize: '12px',
        fontWeight: 'bold',
        display: 'block',
        marginBottom: '5px'
      }}>
        Owner Role
      </label>
      <div className="cmd-role-toggle">
        <button
          onClick={() => onRoleChange('owner')}
          className={`cmd-role-toggle__btn cmd-role-toggle__btn--owner ${role === 'owner' ? 'cmd-role-toggle__btn--active' : ''}`}
        >
          <Crown size={14} />Owner
        </button>
        <button
          onClick={() => onRoleChange('manager')}
          className={`cmd-role-toggle__btn cmd-role-toggle__btn--manager ${role === 'manager' ? 'cmd-role-toggle__btn--active' : ''}`}
        >
          <Key size={14} />Manager
        </button>
      </div>

      {/* Role Explanation Info Box */}
      <div style={{
        background: 'rgba(0,229,255,0.1)',
        border: '1px solid rgba(0,229,255,0.3)',
        borderRadius: '10px',
        padding: '12px',
        marginTop: '10px',
        fontSize: '11px',
        color: '#cccccc'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#00E5FF', fontSize: '12px' }}>
          <Info size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Role Differences:
        </div>
        <div style={{ marginBottom: '6px', paddingLeft: '4px' }}>
          <span style={{ color: '#FFD700', fontWeight: 'bold' }}>
            <Crown size={12} style={{ marginRight: '2px', verticalAlign: 'middle' }} />Owner:
          </span>
          <span style={{ color: '#aaaaaa' }}> Full control - Info, Pricing, Photos, Analytics</span>
        </div>
        <div style={{ paddingLeft: '4px' }}>
          <span style={{ color: '#00E5FF', fontWeight: 'bold' }}>
            <Key size={12} style={{ marginRight: '2px', verticalAlign: 'middle' }} />Manager:
          </span>
          <span style={{ color: '#aaaaaa' }}> Limited - Info, Photos, Analytics only (no pricing)</span>
        </div>
        <div style={{
          marginTop: '8px',
          paddingTop: '8px',
          borderTop: '1px solid rgba(0,229,255,0.2)',
          fontSize: '10px',
          color: '#888888'
        }}>
          Tip: Permissions below are auto-adjusted based on role. You can customize them after.
        </div>
      </div>
    </div>
  );
};

interface PermissionsCheckboxesProps {
  permissions: OwnerPermissions;
  onPermissionsChange: (permissions: OwnerPermissions) => void;
}

const PermissionsCheckboxes: React.FC<PermissionsCheckboxesProps> = ({
  permissions,
  onPermissionsChange
}) => {
  return (
    <div style={{ marginBottom: '15px' }}>
      <label style={{
        color: '#cccccc',
        fontSize: '12px',
        fontWeight: 'bold',
        display: 'block',
        marginBottom: '10px'
      }}>
        Permissions (hover <Info size={12} style={{ verticalAlign: 'middle' }} /> for details)
      </label>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {Object.entries(permissions).map(([key, value]) => (
          <label
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => onPermissionsChange({ ...permissions, [key]: e.target.checked })}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ color: '#ffffff', fontSize: '13px', flex: 1 }}>
              {getPermissionLabel(key)}
            </span>
            <span
              style={{
                marginLeft: '4px',
                cursor: 'help',
                color: '#00E5FF',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
              title={PERMISSION_DESCRIPTIONS[key]}
            >
              <Info size={12} />
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};

interface CurrentOwnersListProps {
  owners: EstablishmentOwner[];
  processingIds: Set<string>;
  showAssignModal: boolean;
  editingOwner: EstablishmentOwner | null;
  onEditOwner: (owner: EstablishmentOwner) => void;
  onRemoveOwner: (establishmentId: string, userId: string) => void;
}

const CurrentOwnersList: React.FC<CurrentOwnersListProps> = ({
  owners,
  processingIds,
  showAssignModal,
  editingOwner,
  onEditOwner,
  onRemoveOwner
}) => {
  return (
    <div>
      <h3 style={{
        color: '#00E5FF',
        fontSize: '18px',
        fontWeight: 'bold',
        margin: '0 0 15px 0'
      }}>
        <Users size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
        Current Owners ({owners.length})
      </h3>

      {owners.length === 0 ? (
        <div style={{
          padding: '30px',
          textAlign: 'center',
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '15px',
          border: '2px dashed rgba(193, 154, 107,0.3)'
        }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}><MailX size={40} /></div>
          <div style={{ color: '#cccccc', fontSize: '14px' }}>
            No owners assigned yet. Click "Assign New Owner" to add one.
          </div>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '15px'
        }}>
          {owners.map((owner) => (
            <OwnerCard
              key={owner.id}
              owner={owner}
              isProcessing={processingIds.has(owner.establishment_id)}
              isDisabled={showAssignModal || editingOwner !== null}
              onEdit={() => onEditOwner(owner)}
              onRemove={() => onRemoveOwner(owner.establishment_id, owner.user_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface OwnerCardProps {
  owner: EstablishmentOwner;
  isProcessing: boolean;
  isDisabled: boolean;
  onEdit: () => void;
  onRemove: () => void;
}

const OwnerCard: React.FC<OwnerCardProps> = ({
  owner,
  isProcessing,
  isDisabled,
  onEdit,
  onRemove
}) => {
  const roleColor = getRoleColor(owner.owner_role);

  return (
    <div
      style={{
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '15px',
        border: '2px solid rgba(193, 154, 107,0.3)',
        padding: '15px',
        position: 'relative'
      }}
    >
      {/* Role Badge */}
      <div style={{
        position: 'absolute',
        top: '15px',
        right: '15px',
        padding: '6px 12px',
        borderRadius: '15px',
        background: `${roleColor}20`,
        border: `2px solid ${roleColor}`,
        color: roleColor,
        fontSize: '11px',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        {getRoleIcon(owner.owner_role)} {owner.owner_role.toUpperCase()}
      </div>

      {/* Owner Info */}
      <div style={{ marginBottom: '15px', paddingRight: '120px' }}>
        <div style={{
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: '16px',
          marginBottom: '5px'
        }}>
          {owner.user?.pseudonym || 'Unknown User'}
        </div>
        <div style={{
          color: '#cccccc',
          fontSize: '14px',
          marginBottom: '10px'
        }}>
          {owner.user?.email}
        </div>
        <div style={{
          color: '#888888',
          fontSize: '12px',
          marginBottom: '10px'
        }}>
          Assigned {formatDate(owner.assigned_at)}
          {owner.assigner && ` by ${owner.assigner.pseudonym}`}
        </div>

        {/* Permissions Badges */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          marginTop: '10px'
        }}>
          {Object.entries(owner.permissions).map(([key, value]) => (
            <div
              key={key}
              style={{
                padding: '4px 8px',
                borderRadius: '8px',
                background: value ? 'rgba(0,255,127,0.1)' : 'rgba(255,71,87,0.1)',
                border: `1px solid ${value ? '#00FF7F' : '#FF4757'}`,
                color: value ? '#00FF7F' : '#FF4757',
                fontSize: '10px',
                fontWeight: 'bold'
              }}
            >
              {getPermissionIcon(value)} {key.replace(/_/g, ' ').replace(/can /g, '')}
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '8px',
        paddingTop: '15px',
        borderTop: '1px solid rgba(193, 154, 107,0.3)'
      }}>
        <button
          onClick={onEdit}
          disabled={isDisabled}
          style={{
            flex: 1,
            padding: '8px',
            background: isDisabled
              ? 'linear-gradient(45deg, #666666, #888888)'
              : 'linear-gradient(45deg, #FFD700, #FFA500)',
            color: isDisabled ? 'white' : '#000',
            border: 'none',
            borderRadius: '8px',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            fontSize: '11px',
            fontWeight: 'bold',
            opacity: isDisabled ? 0.5 : 1
          }}
        >
          <Pencil size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Edit Permissions
        </button>
        <button
          onClick={onRemove}
          disabled={isProcessing || isDisabled}
          style={{
            flex: 1,
            padding: '8px',
            background: (isProcessing || isDisabled)
              ? 'linear-gradient(45deg, #666666, #888888)'
              : 'linear-gradient(45deg, #FF4757, #FF3742)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: (isProcessing || isDisabled) ? 'not-allowed' : 'pointer',
            fontSize: '11px',
            fontWeight: 'bold',
            opacity: (isProcessing || isDisabled) ? 0.5 : 1
          }}
        >
          {isProcessing ? (
            <><Loader2 size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Removing...</>
          ) : (
            <><Trash2 size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Remove</>
          )}
        </button>
      </div>
    </div>
  );
};

export default OwnerManagementModal;
