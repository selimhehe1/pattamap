/**
 * Step2DocumentUpload Component
 *
 * Second step of the ownership request wizard.
 * Handles document upload with drag & drop support.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, CheckCircle } from 'lucide-react';
import type { Step2Props } from './types';

const Step2DocumentUpload: React.FC<Step2Props> = ({
  documents,
  isDragging,
  isUploading,
  onFileSelect,
  onDragOver,
  onDragLeave,
  onDrop,
  onRemoveDocument
}) => {
  const { t } = useTranslation();

  return (
    <div style={{
      background: 'rgba(0,0,0,0.3)',
      borderRadius: '12px',
      padding: '25px',
      border: '1px solid rgba(193, 154, 107, 0.2)'
    }}>
      <h3 style={{
        color: '#FFD700',
        fontSize: '20px',
        fontWeight: 'bold',
        marginBottom: '10px',
        textShadow: '0 0 5px rgba(255, 215, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <FolderOpen size={20} /> {t('ownership.step2Title', 'Upload Proof of Ownership')}
      </h3>

      <p style={{
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '14px',
        marginBottom: '15px',
        lineHeight: '1.6'
      }}>
        {t('ownership.step2Description', 'Please upload documents that prove you own or manage this establishment:')}
      </p>

      <ul style={{
        listStyle: 'none',
        padding: 0,
        margin: '0 0 20px 0',
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '13px'
      }}>
        <li style={{ marginBottom: '8px', paddingLeft: '20px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: 0 }}><CheckCircle size={14} color="#00FF7F" /></span>
          {t('ownership.docExample1', 'Business license or registration')}
        </li>
        <li style={{ marginBottom: '8px', paddingLeft: '20px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: 0 }}><CheckCircle size={14} color="#00FF7F" /></span>
          {t('ownership.docExample2', 'Rental agreement or lease contract')}
        </li>
        <li style={{ marginBottom: '8px', paddingLeft: '20px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: 0 }}><CheckCircle size={14} color="#00FF7F" /></span>
          {t('ownership.docExample3', 'Utility bills in establishment name')}
        </li>
        <li style={{ marginBottom: '8px', paddingLeft: '20px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: 0 }}><CheckCircle size={14} color="#00FF7F" /></span>
          {t('ownership.docExample4', 'Official correspondence')}
        </li>
      </ul>

      {/* Drag & drop zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => document.getElementById('file-input')?.click()}
        style={{
          background: isDragging
            ? 'linear-gradient(135deg, rgba(193, 154, 107, 0.3), rgba(0, 229, 255, 0.3))'
            : 'linear-gradient(135deg, rgba(193, 154, 107, 0.1), rgba(0, 229, 255, 0.1))',
          border: isDragging
            ? '2px dashed rgba(193, 154, 107, 0.8)'
            : '2px dashed rgba(193, 154, 107, 0.4)',
          borderRadius: '12px',
          padding: '40px 20px',
          textAlign: 'center',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          marginBottom: '20px',
          opacity: isUploading ? 0.6 : 1
        }}
        onMouseEnter={(e) => {
          if (!isUploading) {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(193, 154, 107, 0.2), rgba(0, 229, 255, 0.2))';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(193, 154, 107, 0.3)';
            e.currentTarget.style.transform = 'scale(1.02)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isUploading && !isDragging) {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(193, 154, 107, 0.1), rgba(0, 229, 255, 0.1))';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.transform = 'scale(1)';
          }
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '15px' }}>📄</div>
        <p style={{
          color: '#FFD700',
          fontSize: '16px',
          fontWeight: 'bold',
          marginBottom: '8px'
        }}>
          <strong>{t('ownership.clickUpload', 'Click to upload')}</strong> {t('ownership.orDragDrop', 'or drag and drop')}
        </p>
        <p style={{
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: '13px',
          margin: 0
        }}>
          {t('ownership.fileTypes', 'PNG, JPG, PDF up to 10MB each')}
        </p>
        <input
          id="file-input"
          type="file"
          accept="image/*,.pdf"
          multiple
          onChange={(e) => onFileSelect(e.target.files)}
          style={{ display: 'none' }}
          disabled={isUploading}
        />
      </div>

      {/* Document previews */}
      {documents.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{
            color: '#C19A6B',
            fontSize: '16px',
            fontWeight: 'bold',
            marginBottom: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📎 {t('ownership.uploadedDocuments', 'Uploaded Documents')} ({documents.length})
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '15px'
          }}>
            {documents.map((doc, index) => (
              <div
                key={index}
                style={{
                  position: 'relative',
                  background: 'rgba(0,0,0,0.4)',
                  border: '2px solid rgba(193, 154, 107, 0.3)',
                  borderRadius: '10px',
                  padding: '10px',
                  transition: 'all 0.3s ease',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = '2px solid rgba(193, 154, 107, 0.6)';
                  e.currentTarget.style.boxShadow = '0 5px 15px rgba(193, 154, 107, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.border = '2px solid rgba(193, 154, 107, 0.3)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {doc.file.type.startsWith('image/') ? (
                  <img
                    src={doc.url}
                    alt={doc.name}
                    style={{
                      width: '100%',
                      height: '120px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      marginBottom: '8px'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '120px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, rgba(193, 154, 107, 0.2), rgba(0, 0, 0, 0.4))',
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}>
                    <span style={{ fontSize: '40px' }}>📄</span>
                    <span style={{
                      color: '#C19A6B',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      marginTop: '5px'
                    }}>PDF</span>
                  </div>
                )}
                <p style={{
                  color: '#fff',
                  fontSize: '12px',
                  margin: 0,
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>{doc.name}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveDocument(index);
                  }}
                  title="Remove document"
                  style={{
                    position: 'absolute',
                    top: '5px',
                    right: '5px',
                    background: 'rgba(255, 0, 0, 0.8)',
                    border: 'none',
                    color: '#fff',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease',
                    fontWeight: 'bold'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 0, 0, 1)';
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 0, 0, 0.8)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security note */}
      <div style={{
        padding: '15px',
        background: 'rgba(0, 229, 255, 0.1)',
        border: '1px solid rgba(0, 229, 255, 0.3)',
        borderRadius: '8px',
        fontSize: '13px',
        color: 'rgba(255, 255, 255, 0.8)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px'
      }}>
        <span style={{ fontSize: '20px' }}>🔒</span>
        <div>
          <strong style={{ color: 'rgba(0, 229, 255, 0.9)' }}>
            {t('ownership.note', 'Note')}:
          </strong> {t('ownership.uploadNote', 'All documents will be securely stored and reviewed only by administrators.')}
        </div>
      </div>
    </div>
  );
};

export default Step2DocumentUpload;
