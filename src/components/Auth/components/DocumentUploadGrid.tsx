import React, { useState, useCallback, useMemo, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, FileText, AlertTriangle } from 'lucide-react';

interface DocumentPreview {
  file: File;
  url: string;
  name: string;
}

interface DocumentUploadGridProps {
  /** Array of document files */
  documents: File[];
  /** Callback when documents change */
  onChange: (documents: File[]) => void;
  /** Maximum file size in MB */
  maxFileSizeMB?: number;
  /** Accepted file types */
  accept?: string;
  /** Error message to display */
  error?: string;
  /** Callback when error changes */
  onError?: (error: string) => void;
  /** Accent color for styling */
  accentColor?: string;
  /** Optional description text */
  description?: string;
}

/**
 * Reusable document upload component with drag & drop support
 * Displays file names instead of image previews
 */
const DocumentUploadGrid: React.FC<DocumentUploadGridProps> = ({
  documents,
  onChange,
  maxFileSizeMB = 10,
  accept = 'image/*,.pdf,.doc,.docx',
  error,
  onError,
  accentColor = '#C19A6B',
  description,
}) => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const inputId = useId();

  // Generate preview data for documents
  const previews = useMemo<DocumentPreview[]>(() => {
    return documents.map(file => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name,
    }));
  }, [documents]);

  // Cleanup URLs when component unmounts or documents change
  React.useEffect(() => {
    return () => {
      previews.forEach(preview => URL.revokeObjectURL(preview.url));
    };
  }, [previews]);

  const handleFiles = useCallback((files: File[]) => {
    const validFiles = files.filter(file => {
      if (file.size > maxFileSizeMB * 1024 * 1024) {
        onError?.(t('register.fileSizeError'));
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      onChange([...documents, ...validFiles]);
      onError?.('');
    }
  }, [documents, onChange, maxFileSizeMB, onError, t]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, [handleFiles]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
    // Reset input to allow selecting same file again
    e.target.value = '';
  }, [handleFiles]);

  const removeDocument = useCallback((index: number) => {
    onChange(documents.filter((_, i) => i !== index));
  }, [documents, onChange]);

  const handleClick = useCallback(() => {
    document.getElementById(inputId)?.click();
  }, [inputId]);

  return (
    <div>
      {/* Description */}
      {description && (
        <p style={{ color: '#999999', fontSize: '12px', marginBottom: '12px' }}>
          {description}
        </p>
      )}

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        style={{
          padding: '24px',
          border: `2px dashed ${isDragging ? accentColor : 'rgba(255,255,255,0.2)'}`,
          borderRadius: '12px',
          background: isDragging ? `${accentColor}1A` : 'rgba(0,0,0,0.2)',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
        }}
      >
        <FolderOpen size={32} style={{ color: accentColor, marginBottom: '8px' }} />
        <p style={{ color: '#cccccc', fontSize: '14px' }}>
          {t('register.dragDropDocuments')}
        </p>
        <p style={{ color: '#999999', fontSize: '12px', marginTop: '4px' }}>
          {t('register.acceptedFormats')}
        </p>
        <input
          id={inputId}
          type="file"
          multiple
          accept={accept}
          style={{ display: 'none' }}
          onChange={handleInputChange}
        />
      </div>

      {/* Error Message */}
      {error && (
        <p style={{ color: '#ff6b6b', fontSize: '12px', marginTop: '8px' }}>
          <AlertTriangle size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
          {error}
        </p>
      )}

      {/* Document Previews */}
      {previews.length > 0 && (
        <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {previews.map((doc, index) => (
            <div
              key={index}
              style={{
                position: 'relative',
                padding: '8px 12px',
                background: `${accentColor}1A`,
                border: `1px solid ${accentColor}4D`,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <FileText size={14} style={{ color: accentColor }} />
              <span
                style={{
                  color: '#ffffff',
                  fontSize: '12px',
                  maxWidth: '150px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {doc.name}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeDocument(index);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ff6b6b',
                  cursor: 'pointer',
                  padding: '0',
                  fontSize: '16px',
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentUploadGrid;
