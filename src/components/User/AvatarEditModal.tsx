import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, Trash2, X, Loader2, Check } from 'lucide-react';
import { User } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import UserAvatar from '../Common/UserAvatar';
import { premiumModalVariants, premiumBackdropVariants } from '../../animations/variants';
import toast from '../../utils/toast';
import '../../styles/components/modal-premium-base.css';

interface AvatarEditModalProps {
  user: User;
  onClose: () => void;
  onAvatarUpdated: (newAvatarUrl: string | null) => void;
  isOpen?: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * AvatarEditModal - Modal for editing user profile avatar
 */
const AvatarEditModal: React.FC<AvatarEditModalProps> = ({
  user,
  onClose,
  onAvatarUpdated,
  isOpen = true
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error(t('avatar.invalidType', 'Please select a JPEG, PNG or WebP image'));
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error(t('avatar.fileTooLarge', 'Image must be less than 5MB'));
      return;
    }

    // Create preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error(t('avatar.invalidType', 'Please select a JPEG, PNG or WebP image'));
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error(t('avatar.fileTooLarge', 'Image must be less than 5MB'));
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/upload/avatar`,
        {
          method: 'POST',
          credentials: 'include',
          body: formData
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      toast.success(t('avatar.uploadSuccess', 'Avatar updated successfully!'));
      onAvatarUpdated(data.avatar.url);
      onClose();
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error(t('avatar.uploadError', 'Failed to upload avatar'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!user.avatar_url) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/upload/avatar`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      toast.success(t('avatar.deleteSuccess', 'Avatar removed successfully!'));
      onAvatarUpdated(null);
      onClose();
    } catch (error) {
      console.error('Avatar delete error:', error);
      toast.error(t('avatar.deleteError', 'Failed to remove avatar'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    onClose();
  };

  const clearPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
            className="modal-premium modal-premium--small"
            variants={premiumModalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="avatar-edit-modal-title"
          >
            {/* Close button */}
            <motion.button
              className="modal-premium__close"
              onClick={handleCancel}
              aria-label={t('common.close', 'Close')}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.95 }}
              disabled={isUploading || isDeleting}
            >
              <X size={18} />
            </motion.button>

            {/* Header */}
            <div className="modal-premium__header modal-premium__header--with-icon">
              <motion.div
                className="modal-premium__icon"
                style={{ background: 'linear-gradient(135deg, #E879F9, #00E5FF)' }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
              >
                <Camera size={32} color="#fff" />
              </motion.div>
              <motion.h2
                id="avatar-edit-modal-title"
                className="modal-premium__title"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                {t('avatar.editTitle', 'Edit Profile Photo')}
              </motion.h2>
            </div>

            {/* Content */}
            <motion.div
              className="modal-premium__content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {/* Current/Preview Avatar */}
              <motion.div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
                  marginBottom: '24px'
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <UserAvatar
                  user={{
                    pseudonym: user.pseudonym,
                    avatar_url: previewUrl || user.avatar_url
                  }}
                  size="xl"
                  showBorder={true}
                />
                <p style={{ color: '#888', fontSize: '14px' }}>
                  {previewUrl
                    ? t('avatar.newPhoto', 'New photo preview')
                    : user.avatar_url
                      ? t('avatar.currentPhoto', 'Current photo')
                      : t('avatar.noPhoto', 'No photo yet')}
                </p>
              </motion.div>

              {/* Upload Zone */}
              {!previewUrl && (
                <motion.div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #444',
                    borderRadius: '12px',
                    padding: '32px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: 'linear-gradient(135deg, rgba(232,121,249,0.05), rgba(0,229,255,0.05))'
                  }}
                  whileHover={{
                    borderColor: '#E879F9',
                    background: 'linear-gradient(135deg, rgba(232,121,249,0.1), rgba(0,229,255,0.1))'
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Upload size={32} style={{ color: '#E879F9', marginBottom: '12px' }} />
                  <p style={{ color: '#fff', marginBottom: '8px' }}>
                    {t('avatar.dropzone', 'Drop an image here or click to browse')}
                  </p>
                  <p style={{ color: '#666', fontSize: '12px' }}>
                    {t('avatar.formats', 'JPEG, PNG or WebP (max 5MB)')}
                  </p>
                </motion.div>
              )}

              {/* Preview Actions */}
              {previewUrl && (
                <motion.div
                  style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <button
                    onClick={clearPreview}
                    className="btn btn--secondary"
                    disabled={isUploading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <X size={16} />
                    {t('avatar.changePhoto', 'Change')}
                  </button>
                </motion.div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />

              {/* Separator */}
              <div className="modal-premium__separator" style={{ margin: '24px 0' }} />

              {/* Actions */}
              <motion.div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
              >
                {/* Save button (only if new file selected) */}
                {selectedFile && (
                  <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="btn btn--primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '14px 24px',
                      background: 'linear-gradient(135deg, #E879F9, #00E5FF)',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#fff',
                      fontWeight: 'bold',
                      cursor: isUploading ? 'wait' : 'pointer'
                    }}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        {t('avatar.uploading', 'Uploading...')}
                      </>
                    ) : (
                      <>
                        <Check size={18} />
                        {t('avatar.save', 'Save Photo')}
                      </>
                    )}
                  </button>
                )}

                {/* Delete button (only if current avatar exists) */}
                {user.avatar_url && !previewUrl && (
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px 24px',
                      background: 'transparent',
                      border: '1px solid #ef4444',
                      borderRadius: '12px',
                      color: '#ef4444',
                      fontWeight: '500',
                      cursor: isDeleting ? 'wait' : 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        {t('avatar.deleting', 'Removing...')}
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        {t('avatar.delete', 'Remove Photo')}
                      </>
                    )}
                  </button>
                )}

                {/* Cancel button */}
                <button
                  onClick={handleCancel}
                  disabled={isUploading || isDeleting}
                  style={{
                    padding: '12px 24px',
                    background: 'transparent',
                    border: '1px solid #444',
                    borderRadius: '12px',
                    color: '#888',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {t('common.cancel', 'Cancel')}
                </button>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default AvatarEditModal;
