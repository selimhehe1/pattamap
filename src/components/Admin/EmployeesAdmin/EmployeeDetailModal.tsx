/**
 * Employee detail modal component for EmployeesAdmin
 * Shows full employee details with photos and action buttons
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Instagram,
  MessageSquare,
  Send,
  Smartphone,
  Users,
  Link,
  Briefcase,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  Building2,
  User,
  X
} from 'lucide-react';
import LazyImage from '../../Common/LazyImage';
import SanitizedText from '../../Common/SanitizedText';
import type { AdminEmployee } from './types';
import { premiumBackdropVariants, premiumModalVariants } from '../../../animations/variants';
import '../../../styles/components/modal-premium-base.css';

interface EmployeeDetailModalProps {
  employee: AdminEmployee;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (employeeId: string) => void;
  onReject: (employeeId: string) => void;
}

const getSocialMediaIcon = (platform: string): React.ReactNode => {
  const iconStyle = { verticalAlign: 'middle' as const };
  switch (platform) {
    case 'instagram': return <Instagram size={14} style={iconStyle} />;
    case 'line': return <MessageSquare size={14} style={iconStyle} />;
    case 'telegram': return <Send size={14} style={iconStyle} />;
    case 'whatsapp': return <Smartphone size={14} style={iconStyle} />;
    case 'facebook': return <Users size={14} style={iconStyle} />;
    default: return <Link size={14} style={iconStyle} />;
  }
};

export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({
  employee,
  isOpen,
  onClose,
  onApprove,
  onReject,
}) => {
  const { t } = useTranslation();

  const currentJob = employee.employment_history?.find((job) => job.is_current);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className="modal-premium-overlay"
          variants={premiumBackdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={handleOverlayClick}
        >
          <motion.div
            className="modal-premium modal-premium--medium"
            variants={premiumModalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-detail-modal-title"
          >
            {/* Close button */}
            <motion.button
              className="modal-premium__close"
              onClick={onClose}
              aria-label={t('common.close')}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.95 }}
            >
              <X size={18} />
            </motion.button>

            {/* Header */}
            <div className="modal-premium__header modal-premium__header--with-icon">
              <motion.div
                className="modal-premium__icon modal-premium__icon--info"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
              >
                <User size={32} />
              </motion.div>
              <motion.h2
                id="employee-detail-modal-title"
                className="modal-premium__title modal-premium__title--info"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                {employee.name}
                {employee.nickname && (
                  <span style={{ color: '#FFD700', fontSize: '0.7em', marginLeft: '10px' }}>
                    "{employee.nickname}"
                  </span>
                )}
              </motion.h2>
            </div>

            {/* Content */}
            <motion.div
              className="modal-premium__content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {/* Content Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '300px 1fr',
                  gap: '30px',
                }}
              >
            {/* Photos */}
            <div>
              {employee.photos.map((photo, index) => (
                <LazyImage
                  key={photo}
                  src={photo}
                  alt={`${employee.name}, ${employee.age} years old from ${employee.nationality} - ${index + 1}`}
                  cloudinaryPreset="employeePhoto"
                  style={{
                    width: '100%',
                    marginBottom: '10px',
                    borderRadius: '10px',
                  }}
                  objectFit="cover"
                />
              ))}
            </div>

            {/* Details */}
            <div style={{ color: 'white' }}>
              {/* Sex/Gender */}
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#C19A6B' }}>{t('employee.sexLabel', 'Gender')}:</strong>{' '}
                {employee.sex ? t(`employee.sex.${employee.sex}`, employee.sex.charAt(0).toUpperCase() + employee.sex.slice(1)) : '-'}
              </div>

              {/* Age */}
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#C19A6B' }}>Age:</strong> {employee.age}
              </div>

              {/* Nationality */}
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#C19A6B' }}>Nationality:</strong>{' '}
                {employee.nationality}
              </div>

              {/* Current Employment */}
              {currentJob && (
                <div style={{ marginBottom: '20px' }}>
                  <strong style={{ color: '#C19A6B' }}>{t('admin.currentEmployment')}</strong>
                  <div
                    style={{
                      marginTop: '10px',
                      background: 'rgba(0, 255, 127, 0.1)',
                      border: '2px solid rgba(0, 255, 127, 0.3)',
                      borderRadius: '12px',
                      padding: '15px',
                    }}
                  >
                    <div
                      style={{
                        color: '#00FF7F',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        marginBottom: '8px',
                      }}
                    >
                      <Building2 size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{currentJob.establishment_name}
                    </div>
                    {currentJob.position && (
                      <div style={{ color: '#FFD700', marginBottom: '5px' }}>
                        <Briefcase size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Position: {currentJob.position}
                      </div>
                    )}
                    <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                      <Calendar size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('admin.started')}{' '}
                      {new Date(currentJob.start_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                    {currentJob.notes && (
                      <div
                        style={{
                          color: 'rgba(255, 255, 255, 0.7)',
                          fontSize: '13px',
                          marginTop: '8px',
                          fontStyle: 'italic',
                        }}
                      >
                        <FileText size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('admin.notes')} {currentJob.notes}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {employee.description && (
                <div style={{ marginBottom: '20px' }}>
                  <strong style={{ color: '#C19A6B' }}>Description:</strong>
                  <SanitizedText
                    html={employee.description}
                    tag="p"
                    className="employee-description"
                  />
                </div>
              )}

              {/* Social Media */}
              {employee.social_media && (
                <div style={{ marginBottom: '20px' }}>
                  <strong style={{ color: '#C19A6B' }}>Social Media:</strong>
                  <div style={{ marginTop: '10px' }}>
                    {Object.entries(employee.social_media).map(([platform, username]) => {
                      if (!username) return null;
                      return (
                        <div key={platform} style={{ marginBottom: '5px' }}>
                          {getSocialMediaIcon(platform)} {platform}: {username}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

                {/* Action Buttons for Pending */}
                {employee.status === 'pending' && (
                  <div className="modal-premium__footer" style={{ marginTop: '30px' }}>
                    <motion.button
                      className="modal-premium__btn-primary"
                      onClick={() => {
                        onApprove(employee.id);
                        onClose();
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      style={{ background: 'linear-gradient(135deg, #00FF7F, #00CC65)' }}
                    >
                      <CheckCircle size={16} style={{ marginRight: '8px' }} />
                      {t('admin.approve')}
                    </motion.button>
                    <motion.button
                      className="modal-premium__btn-secondary"
                      onClick={() => {
                        onReject(employee.id);
                        onClose();
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        borderColor: 'rgba(255, 71, 87, 0.5)',
                        color: '#FF4757'
                      }}
                    >
                      <XCircle size={16} style={{ marginRight: '8px' }} />
                      {t('admin.reject')}
                    </motion.button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default EmployeeDetailModal;
