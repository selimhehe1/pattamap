/**
 * useDocumentUpload Hook
 *
 * Handles document upload logic including drag & drop, file validation,
 * and Cloudinary upload for the ownership request wizard.
 */

import { useState, useCallback, useEffect } from 'react';
import notification from '../../../utils/notification';
import type { DocumentPreview } from './types';

interface UseDocumentUploadReturn {
  documents: DocumentPreview[];
  isDragging: boolean;
  isUploading: boolean;
  handleFileSelect: (files: FileList | null) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleRemoveDocument: (index: number) => void;
  uploadDocumentsToCloudinary: () => Promise<string[]>;
  cleanupDocuments: () => void;
}

export const useDocumentUpload = (): UseDocumentUploadReturn => {
  const [documents, setDocuments] = useState<DocumentPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Handle file selection with validation
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const validFiles = Array.from(files).filter(file => {
      // Validate file type
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        notification.error(`${file.name}: Only images and PDF files are allowed`);
        return false;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        notification.error(`${file.name}: File size must be less than 10MB`);
        return false;
      }

      return true;
    });

    // Add to documents
    const newDocuments: DocumentPreview[] = validFiles.map(file => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name
    }));

    setDocuments(prev => [...prev, ...newDocuments]);
  }, []);

  // Drag handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  // Remove document
  const handleRemoveDocument = useCallback((index: number) => {
    setDocuments(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].url);
      updated.splice(index, 1);
      return updated;
    });
  }, []);

  // Upload documents to Cloudinary
  const uploadDocumentsToCloudinary = useCallback(async (): Promise<string[]> => {
    setIsUploading(true);

    try {
      const uploadPromises = documents.map(async ({ file }) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '');
        formData.append('folder', 'ownership_documents');

        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/upload`,
          {
            method: 'POST',
            body: formData
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
          throw new Error(errorData.error?.message || `Upload failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.secure_url;
      });

      return await Promise.all(uploadPromises);
    } finally {
      setIsUploading(false);
    }
  }, [documents]);

  // Cleanup object URLs
  const cleanupDocuments = useCallback(() => {
    documents.forEach(doc => URL.revokeObjectURL(doc.url));
  }, [documents]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      documents.forEach(doc => URL.revokeObjectURL(doc.url));
    };
  }, [documents]);

  return {
    documents,
    isDragging,
    isUploading,
    handleFileSelect,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleRemoveDocument,
    uploadDocumentsToCloudinary,
    cleanupDocuments
  };
};

export default useDocumentUpload;
