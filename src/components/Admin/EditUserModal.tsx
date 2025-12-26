import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User } from '../../types';
import { logger } from '../../utils/logger';
import {
  User as UserIcon,
  Shield,
  Crown,
  ClipboardList,
  Pencil,
  Mail,
  Lock,
  CheckCircle,
  FileText,
  Loader2,
  Save
} from 'lucide-react';

interface AdminUser extends User {
  is_active: boolean;
  last_login?: string;
  stats?: {
    establishments_submitted: number;
    employees_submitted: number;
    comments_made: number;
  };
}

interface EditUserModalProps {
  user: AdminUser;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedUser: Partial<AdminUser>) => Promise<void>;
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  user,
  isOpen,
  onClose,
  onSave
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    pseudonym: '',
    email: '',
    role: 'user' as 'user' | 'moderator' | 'admin',
    is_active: true,
    notes: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        pseudonym: user.pseudonym || '',
        email: user.email || '',
        role: user.role || 'user',
        is_active: user.is_active !== undefined ? user.is_active : true,
        notes: ''
      });
    }
  }, [user, isOpen]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      logger.error('Failed to save user:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#FF4757';
      case 'moderator': return '#FFD700';
      case 'user': return '#00E5FF';
      default: return '#cccccc';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown size={12} style={{ verticalAlign: 'middle' }} />;
      case 'moderator': return <Shield size={12} style={{ verticalAlign: 'middle' }} />;
      case 'user': return <UserIcon size={12} style={{ verticalAlign: 'middle' }} />;
      default: return '❓';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.9)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      backdropFilter: 'blur(10px)'
    }} role="dialog" aria-modal="true">
      <div style={{
        background: 'linear-gradient(135deg, rgba(26,0,51,0.95), rgba(13,0,25,0.95))',
        borderRadius: '25px',
        border: '2px solid #C19A6B',
        boxShadow: '0 20px 60px rgba(193, 154, 107,0.3)',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{
          padding: '30px 30px 20px 30px',
          borderBottom: '1px solid rgba(193, 154, 107,0.3)'
        }}>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(193, 154, 107,0.2)',
              border: '2px solid #C19A6B',
              color: '#C19A6B',
              fontSize: '20px',
              cursor: 'pointer',
              zIndex: 10,
              transition: 'all 0.3s ease'
            }}
          >
            ×
          </button>

          <h2 style={{
            color: '#C19A6B',
            fontSize: '28px',
            fontWeight: 'bold',
            margin: '0 0 10px 0',
            fontFamily: '"Orbitron", monospace'
          }}>
            <UserIcon size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            {t('admin.editUserProfile')}
          </h2>
          <p style={{
            color: '#cccccc',
            fontSize: '16px',
            margin: 0
          }}>
            {t('admin.modifyUserDetails')}
          </p>
        </div>

        {/* Form Content */}
        <div style={{ padding: '30px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '150px 1fr',
            gap: '30px',
            color: 'white'
          }}>
            {/* User Avatar */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: `linear-gradient(45deg, ${getRoleColor(user.role)}, #FFD700)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '48px',
                marginBottom: '15px',
                border: '3px solid rgba(193, 154, 107,0.3)'
              }}>
                {user.pseudonym.charAt(0).toUpperCase()}
              </div>
              
              <div style={{
                padding: '8px 15px',
                borderRadius: '15px',
                background: `${getRoleColor(user.role)}20`,
                border: `2px solid ${getRoleColor(user.role)}`,
                color: getRoleColor(user.role),
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                {getRoleIcon(user.role)} {user.role.toUpperCase()}
              </div>

              {/* User Stats */}
              {user.stats && (
                <div style={{
                  marginTop: '20px',
                  display: 'grid',
                  gap: '8px',
                  width: '100%'
                }}>
                  <div style={{
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '8px',
                    padding: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      color: '#C19A6B',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}>
                      {user.stats.establishments_submitted}
                    </div>
                    <div style={{
                      color: '#cccccc',
                      fontSize: '10px'
                    }}>
                      {t('admin.establishmentsSubmitted')}
                    </div>
                  </div>

                  <div style={{
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '8px',
                    padding: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      color: '#00E5FF',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}>
                      {user.stats.employees_submitted}
                    </div>
                    <div style={{
                      color: '#cccccc',
                      fontSize: '10px'
                    }}>
                      {t('admin.profiles')}
                    </div>
                  </div>

                  <div style={{
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '8px',
                    padding: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      color: '#FFD700',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}>
                      {user.stats.comments_made}
                    </div>
                    <div style={{
                      color: '#cccccc',
                      fontSize: '10px'
                    }}>
                      {t('admin.reviews')}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Form Fields */}
            <div>
              {/* User Information */}
              <div style={{ marginBottom: '25px' }}>
                <h3 style={{
                  color: '#C19A6B',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  margin: '0 0 15px 0'
                }}>
                  <ClipboardList size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  {t('admin.accountInformation')}
                </h3>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{
                    display: 'block',
                    color: '#FFD700',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    marginBottom: '5px'
                  }}>
                    {t('admin.userId')}
                  </label>
                  <div style={{
                    padding: '10px 15px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#888888',
                    fontSize: '14px'
                  }}>
                    #{user.id}
                  </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{
                    display: 'block',
                    color: '#FFD700',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    marginBottom: '5px'
                  }}>
                    {t('admin.memberSince')}
                  </label>
                  <div style={{
                    padding: '10px 15px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#888888',
                    fontSize: '14px'
                  }}>
                    {formatDate(user.created_at)}
                  </div>
                </div>

                {user.last_login && (
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{
                      display: 'block',
                      color: '#FFD700',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      marginBottom: '5px'
                    }}>
                      {t('admin.lastLogin')}
                    </label>
                    <div style={{
                      padding: '10px 15px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.3)',
                      color: '#888888',
                      fontSize: '14px'
                    }}>
                      {formatDate(user.last_login)}
                    </div>
                  </div>
                )}
              </div>

              {/* Editable Fields */}
              <div style={{ marginBottom: '25px' }}>
                <h3 style={{
                  color: '#C19A6B',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  margin: '0 0 15px 0'
                }}>
                  <Pencil size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  {t('admin.editableFields')}
                </h3>

                {/* Pseudonym */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{
                    display: 'block',
                    color: '#00E5FF',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    marginBottom: '5px'
                  }}>
                    <UserIcon size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    {t('admin.pseudonym')}
                  </label>
                  <input
                    type="text"
                    value={formData.pseudonym}
                    onChange={(e) => handleInputChange('pseudonym', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 15px',
                      borderRadius: '8px',
                      border: '2px solid rgba(0,255,255,0.3)',
                      background: 'rgba(0,0,0,0.3)',
                      color: '#ffffff',
                      fontSize: '14px',
                      transition: 'border-color 0.3s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#00E5FF';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(0,255,255,0.3)';
                    }}
                  />
                </div>

                {/* Email */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{
                    display: 'block',
                    color: '#00E5FF',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    marginBottom: '5px'
                  }}>
                    <Mail size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    {t('admin.email')}
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 15px',
                      borderRadius: '8px',
                      border: '2px solid rgba(0,255,255,0.3)',
                      background: 'rgba(0,0,0,0.3)',
                      color: '#ffffff',
                      fontSize: '14px',
                      transition: 'border-color 0.3s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#00E5FF';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(0,255,255,0.3)';
                    }}
                  />
                </div>

                {/* Role */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{
                    display: 'block',
                    color: '#00E5FF',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    marginBottom: '5px'
                  }}>
                    <Lock size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    {t('admin.role')}
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 15px',
                      borderRadius: '8px',
                      border: '2px solid rgba(0,255,255,0.3)',
                      background: 'rgba(0,0,0,0.3)',
                      color: '#ffffff',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="user" style={{ background: '#1a0033' }}>{t('admin.filterUsers')}</option>
                    <option value="moderator" style={{ background: '#1a0033' }}>{t('admin.filterModerators')}</option>
                    <option value="admin" style={{ background: '#1a0033' }}>{t('admin.filterAdmins')}</option>
                  </select>
                </div>

                {/* Active Status */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => handleInputChange('is_active', e.target.checked)}
                      style={{
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer'
                      }}
                    />
                    <span style={{
                      color: '#00E5FF',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      <CheckCircle size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                      {t('admin.accountActive')}
                    </span>
                  </label>
                </div>

                {/* Admin Notes */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{
                    display: 'block',
                    color: '#00E5FF',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    marginBottom: '5px'
                  }}>
                    <FileText size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    {t('admin.adminNotesOptional')}
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={3}
                    placeholder={t('admin.adminNotesPlaceholder')}
                    style={{
                      width: '100%',
                      padding: '10px 15px',
                      borderRadius: '8px',
                      border: '2px solid rgba(0,255,255,0.3)',
                      background: 'rgba(0,0,0,0.3)',
                      color: '#ffffff',
                      fontSize: '12px',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '15px',
            marginTop: '30px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(193, 154, 107,0.3)'
          }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '15px',
                borderRadius: '12px',
                border: '2px solid rgba(193, 154, 107,0.5)',
                background: 'transparent',
                color: '#C19A6B',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(193, 154, 107,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {t('common.cancel')}
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving || !formData.pseudonym || !formData.email}
              style={{
                flex: 2,
                padding: '15px',
                borderRadius: '12px',
                border: 'none',
                background: isSaving || !formData.pseudonym || !formData.email
                  ? 'linear-gradient(45deg, #666666, #888888)'
                  : 'linear-gradient(45deg, #00FF7F, #00CC65)',
                color: 'white',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: isSaving || !formData.pseudonym || !formData.email ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                opacity: isSaving || !formData.pseudonym || !formData.email ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!isSaving && formData.pseudonym && formData.email) {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,255,127,0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSaving && formData.pseudonym && formData.email) {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {isSaving ? <><Loader2 size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('admin.saving')}</> : <><Save size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('admin.saveChanges')}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditUserModal;