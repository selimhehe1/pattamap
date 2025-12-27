import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useAuth } from '../../contexts/AuthContext';
import toast from '../../utils/toast';
import { logger } from '../../utils/logger';
import { Establishment, EstablishmentCategory } from '../../types';
import EstablishmentAutocomplete from '../Common/EstablishmentAutocomplete';
import { Trophy, X, Search, Building2, Plus, FolderOpen, CheckCircle, AlertTriangle, Rocket, Loader2, Camera, Check } from 'lucide-react';
import '../../styles/components/modals.css';
import '../../styles/components/modal-forms.css';
import '../../styles/components/form-components.css';
import '../../styles/utilities/layout-utilities.css';

interface RequestOwnershipModalProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

interface DocumentPreview {
  file: File;
  url: string;
  name: string;
}

interface OwnershipRequestBody {
  documents_urls: string[];
  verification_code?: string;
  request_message?: string;
  establishment_id?: string;
  establishment_data?: Partial<Establishment>;
}

const RequestOwnershipModal: React.FC<RequestOwnershipModalProps> = ({ onClose, onSuccess }) => {
  const { t } = useTranslation();
  const { secureFetch } = useSecureFetch();
  const { user } = useAuth();

  // Step management
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Establishment selection
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [selectedEstablishment, setSelectedEstablishment] = useState<Establishment | null>(null);
  const [createMode, setCreateMode] = useState(false); // Toggle between search and create
  const [categories, setCategories] = useState<EstablishmentCategory[]>([]);

  // New establishment data (when creating)
  const [newEstablishment, setNewEstablishment] = useState({
    name: '',
    address: '',
    zone: '',
    category_id: '',
    latitude: 0,
    longitude: 0,
    description: '',
    phone: '',
    website: '',
    instagram: '',
    twitter: '',
    tiktok: ''
  });

  // Step 2: Document upload
  const [documents, setDocuments] = useState<DocumentPreview[]>([]);
  const [isUploading, _setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Step 3: Verification & message
  const [verificationCode, setVerificationCode] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check user account type on mount
  useEffect(() => {
    if (user && user.account_type !== 'establishment_owner') {
      toast.error(t('ownership.accountTypeRequired', 'You must have an establishment owner account to request ownership'));
      onClose?.();
    }
  }, [user, onClose, t]);

  // Fetch establishments and categories on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all establishments for autocomplete
        const estResponse = await secureFetch(
          `${import.meta.env.VITE_API_URL}/api/establishments?limit=1000`,
          { method: 'GET' }
        );

        if (estResponse.ok) {
          const estData = await estResponse.json();
          setEstablishments(estData.establishments || []);
        }

        // Fetch categories for establishment creation
        const catResponse = await secureFetch(
          `${import.meta.env.VITE_API_URL}/api/establishments/categories`,
          { method: 'GET' }
        );

        if (catResponse.ok) {
          const catData = await catResponse.json();
          setCategories(catData.categories || []);
        }
      } catch (error) {
        logger.error('Fetch data error:', error);
      }
    };

    fetchData();
  }, [secureFetch]);

  // Handle file selection
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const validFiles = Array.from(files).filter(file => {
      // Validate file type
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        toast.error(`${file.name}: Only images and PDF files are allowed`);
        return false;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}: File size must be less than 10MB`);
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
  };

  // Handle drag & drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // Remove document
  const handleRemoveDocument = (index: number) => {
    setDocuments(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].url);
      updated.splice(index, 1);
      return updated;
    });
  };

  // Upload documents to Cloudinary
  const uploadDocumentsToCloudinary = async (): Promise<string[]> => {
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

    return Promise.all(uploadPromises);
  };

  // Submit ownership request
  const handleSubmit = async () => {
    // Validate establishment selection or creation
    if (!createMode && !selectedEstablishment) {
      toast.error('Please select an establishment');
      return;
    }

    if (createMode) {
      // Validate new establishment data
      if (!newEstablishment.name || !newEstablishment.address || !newEstablishment.category_id) {
        toast.error('Please fill in all required establishment fields');
        return;
      }
    }

    if (documents.length === 0) {
      toast.error('Please upload at least one document');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload documents
      toast.info('Uploading documents...');
      const documentUrls = await uploadDocumentsToCloudinary();

      // Prepare request body
      const requestBody: OwnershipRequestBody = {
        documents_urls: documentUrls,
        verification_code: verificationCode || undefined,
        request_message: requestMessage || undefined
      };

      // Add establishment_id or establishment_data
      if (createMode) {
        requestBody.establishment_data = {
          name: newEstablishment.name,
          address: newEstablishment.address,
          latitude: newEstablishment.latitude,
          longitude: newEstablishment.longitude,
          category_id: newEstablishment.category_id,
          zone: newEstablishment.zone || undefined,
          description: newEstablishment.description || undefined,
          phone: newEstablishment.phone || undefined,
          website: newEstablishment.website || undefined,
          instagram: newEstablishment.instagram || undefined,
          twitter: newEstablishment.twitter || undefined,
          tiktok: newEstablishment.tiktok || undefined
        };
      } else {
        requestBody.establishment_id = selectedEstablishment!.id;
      }

      // Submit request
      toast.info(createMode ? 'Creating establishment and submitting request...' : 'Submitting request...');
      const response = await secureFetch(
        `${import.meta.env.VITE_API_URL}/api/ownership-requests`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit request');
      }

      const data = await response.json();
      logger.info('Ownership request submitted successfully', data);

      const successMessage = data.isNewEstablishment
        ? 'Establishment and ownership request submitted successfully! Admins will review both.'
        : 'Ownership request submitted successfully! Admins will review your request.';

      toast.success(successMessage);

      // Cleanup
      documents.forEach(doc => URL.revokeObjectURL(doc.url));

      // Call success callback
      onSuccess?.();
      onClose?.();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Submit ownership request error:', error);
      toast.error(errorMessage || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Navigation
  const handleNext = () => {
    if (currentStep === 1) {
      // Validate establishment selection or creation
      if (!createMode && !selectedEstablishment) {
        toast.error('Please select an establishment');
        return;
      }

      if (createMode) {
        // Validate new establishment data
        if (!newEstablishment.name || !newEstablishment.address || !newEstablishment.category_id) {
          toast.error('Please fill in all required fields: name, address, and category');
          return;
        }
      }
    }

    if (currentStep === 2 && documents.length === 0) {
      toast.error('Please upload at least one document');
      return;
    }

    setCurrentStep(prev => Math.min(3, prev + 1) as 1 | 2 | 3);
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(1, prev - 1) as 1 | 2 | 3);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      documents.forEach(doc => URL.revokeObjectURL(doc.url));
    };
  }, [documents]);

  return (
    <>
      {/* Keyframe Animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      <div className="modal-overlay-unified" role="dialog" aria-modal="true">
      <div className="modal-content-unified modal--large" style={{ padding: '30px' }}>
        {/* Close Button */}
        <button onClick={onClose} className="modal-close-btn" aria-label="Close">
          ×
        </button>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '25px'
        }}>
          <h2 style={{
            color: '#C19A6B',
            fontSize: '28px',
            fontWeight: 'bold',
            margin: 0,
            textShadow: '0 0 10px rgba(193, 154, 107,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Trophy size={28} style={{ color: '#FFD700' }} /> {t('ownership.title', 'Request Establishment Ownership')}
          </h2>
        </div>

        {/* Subtitle */}
        <p style={{
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '14px',
          margin: '0 0 30px 0',
          textAlign: 'center'
        }}>
          {t('ownership.subtitle', 'Verify your ownership to manage your establishment')}
        </p>

      {/* Progress indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '30px',
        padding: '20px',
        background: 'rgba(193, 154, 107, 0.05)',
        borderRadius: '12px',
        border: '1px solid rgba(193, 154, 107, 0.2)'
      }}>
        {/* Step 1 */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            margin: '0 auto 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: currentStep >= 1 ? 'linear-gradient(45deg, #C19A6B, #FFD700)' : 'rgba(255,255,255,0.1)',
            border: currentStep >= 1 ? '2px solid #FFD700' : '2px solid rgba(255,255,255,0.3)',
            color: currentStep >= 1 ? '#000' : 'rgba(255,255,255,0.6)',
            fontSize: '18px',
            fontWeight: 'bold',
            boxShadow: currentStep >= 1 ? '0 0 20px rgba(193, 154, 107, 0.5)' : 'none',
            transition: 'all 0.3s ease'
          }}>
            {currentStep > 1 ? <Check size={18} /> : '1'}
          </div>
          <div style={{
            fontSize: '13px',
            color: currentStep >= 1 ? '#FFD700' : 'rgba(255,255,255,0.6)',
            fontWeight: currentStep === 1 ? 'bold' : 'normal'
          }}>
            Select Establishment
          </div>
        </div>

        {/* Line 1 */}
        <div style={{
          flex: '0 0 60px',
          height: '2px',
          background: currentStep > 1 ? 'linear-gradient(90deg, #C19A6B, #FFD700)' : 'rgba(255,255,255,0.2)',
          transition: 'all 0.5s ease'
        }} />

        {/* Step 2 */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            margin: '0 auto 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: currentStep >= 2 ? 'linear-gradient(45deg, #C19A6B, #FFD700)' : 'rgba(255,255,255,0.1)',
            border: currentStep >= 2 ? '2px solid #FFD700' : '2px solid rgba(255,255,255,0.3)',
            color: currentStep >= 2 ? '#000' : 'rgba(255,255,255,0.6)',
            fontSize: '18px',
            fontWeight: 'bold',
            boxShadow: currentStep >= 2 ? '0 0 20px rgba(193, 154, 107, 0.5)' : 'none',
            transition: 'all 0.3s ease'
          }}>
            {currentStep > 2 ? <Check size={18} /> : '2'}
          </div>
          <div style={{
            fontSize: '13px',
            color: currentStep >= 2 ? '#FFD700' : 'rgba(255,255,255,0.6)',
            fontWeight: currentStep === 2 ? 'bold' : 'normal'
          }}>
            Upload Documents
          </div>
        </div>

        {/* Line 2 */}
        <div style={{
          flex: '0 0 60px',
          height: '2px',
          background: currentStep > 2 ? 'linear-gradient(90deg, #C19A6B, #FFD700)' : 'rgba(255,255,255,0.2)',
          transition: 'all 0.5s ease'
        }} />

        {/* Step 3 */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            margin: '0 auto 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: currentStep >= 3 ? 'linear-gradient(45deg, #C19A6B, #FFD700)' : 'rgba(255,255,255,0.1)',
            border: currentStep >= 3 ? '2px solid #FFD700' : '2px solid rgba(255,255,255,0.3)',
            color: currentStep >= 3 ? '#000' : 'rgba(255,255,255,0.6)',
            fontSize: '18px',
            fontWeight: 'bold',
            boxShadow: currentStep >= 3 ? '0 0 20px rgba(193, 154, 107, 0.5)' : 'none',
            transition: 'all 0.3s ease'
          }}>
            3
          </div>
          <div style={{
            fontSize: '13px',
            color: currentStep >= 3 ? '#FFD700' : 'rgba(255,255,255,0.6)',
            fontWeight: currentStep === 3 ? 'bold' : 'normal'
          }}>
            Confirm & Submit
          </div>
        </div>
      </div>

      {/* Step content */}
      <div>
        {/* Step 1: Select Establishment */}
        {currentStep === 1 && (
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
              <Search size={20} /> {t('ownership.step1Title', 'Search for Your Establishment')}
            </h3>
            <p style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '14px',
              marginBottom: '25px'
            }}>
              {t('ownership.step1Description', 'Type the name of your establishment to find it in our database')}
            </p>

            {/* Establishment Autocomplete */}
            {!createMode && (
              <>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    color: '#FFD700',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Building2 size={16} /> {t('ownership.establishment', 'Establishment')}
                  </label>
                  <div style={{
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '8px',
                    padding: '2px',
                    border: '1px solid rgba(193, 154, 107, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.border = '1px solid rgba(193, 154, 107, 0.6)';
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(193, 154, 107, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.border = '1px solid rgba(193, 154, 107, 0.3)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}>
                    <EstablishmentAutocomplete
                      value={selectedEstablishment}
                      establishments={establishments}
                      onChange={(establishment) => setSelectedEstablishment(establishment)}
                      placeholder={t('ownership.searchPlaceholder', 'Search establishment by name...')}
                      disabled={false}
                    />
                  </div>
                </div>

                {/* Toggle to create mode */}
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                  <button
                    type="button"
                    onClick={() => setCreateMode(true)}
                    style={{
                      background: 'linear-gradient(45deg, rgba(193, 154, 107, 0.2), rgba(0, 229, 255, 0.2))',
                      border: '1px solid rgba(193, 154, 107, 0.5)',
                      color: '#FFD700',
                      cursor: 'pointer',
                      fontSize: '14px',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      transition: 'all 0.3s ease',
                      fontWeight: 'bold'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(45deg, rgba(193, 154, 107, 0.3), rgba(0, 229, 255, 0.3))';
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 5px 15px rgba(193, 154, 107, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(45deg, rgba(193, 154, 107, 0.2), rgba(0, 229, 255, 0.2))';
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <Plus size={16} style={{ marginRight: '6px' }} /> {t('ownership.cantFind', "Can't find your establishment? Create it here")}
                  </button>
                </div>
              </>
            )}

            {/* Create new establishment form */}
            {createMode && (
              <div style={{ marginTop: '20px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px'
                }}>
                  <h4 style={{ margin: 0, color: '#C19A6B' }}>
                    {t('ownership.createNewEstablishment', 'Create New Establishment')}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setCreateMode(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#C19A6B',
                      cursor: 'pointer',
                      fontSize: '14px',
                      textDecoration: 'underline'
                    }}
                  >
                    ← {t('ownership.backToSearch', 'Back to search')}
                  </button>
                </div>

                {/* Basic Info */}
                <div style={{ marginBottom: '20px' }}>
                  <label className="label-nightlife" htmlFor="est-name">
                    {t('establishment.name', 'Establishment Name')} <span style={{ color: '#FF4757' }}>*</span>
                  </label>
                  <input
                    id="est-name"
                    type="text"
                    className="input-nightlife"
                    placeholder={t('establishment.namePlaceholder', 'e.g., Walking Street Bar')}
                    value={newEstablishment.name}
                    onChange={(e) => setNewEstablishment({ ...newEstablishment, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label className="label-nightlife" htmlFor="est-address">
                    {t('establishment.address', 'Address')} <span style={{ color: '#FF4757' }}>*</span>
                  </label>
                  <input
                    id="est-address"
                    type="text"
                    className="input-nightlife"
                    placeholder={t('establishment.addressPlaceholder', 'e.g., 123 Walking Street, Pattaya')}
                    value={newEstablishment.address}
                    onChange={(e) => setNewEstablishment({ ...newEstablishment, address: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                  <div>
                    <label className="label-nightlife" htmlFor="est-category">
                      {t('establishment.category', 'Category')} <span style={{ color: '#FF4757' }}>*</span>
                    </label>
                    <select
                      id="est-category"
                      className="select-nightlife"
                      value={newEstablishment.category_id}
                      onChange={(e) => setNewEstablishment({ ...newEstablishment, category_id: e.target.value })}
                      required
                    >
                      <option value="">{t('establishment.selectCategory', 'Select category...')}</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label-nightlife" htmlFor="est-zone">
                      {t('establishment.zone', 'Zone')}
                    </label>
                    <input
                      id="est-zone"
                      type="text"
                      className="input-nightlife"
                      placeholder={t('establishment.zonePlaceholder', 'e.g., Walking Street')}
                      value={newEstablishment.zone}
                      onChange={(e) => setNewEstablishment({ ...newEstablishment, zone: e.target.value })}
                    />
                  </div>
                </div>

                {/* Location */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                  <div>
                    <label className="label-nightlife" htmlFor="est-lat">
                      {t('establishment.latitude', 'Latitude')}
                    </label>
                    <input
                      id="est-lat"
                      type="number"
                      step="0.000001"
                      className="input-nightlife"
                      placeholder="12.9279"
                      value={newEstablishment.latitude || ''}
                      onChange={(e) => setNewEstablishment({ ...newEstablishment, latitude: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div>
                    <label className="label-nightlife" htmlFor="est-lng">
                      {t('establishment.longitude', 'Longitude')}
                    </label>
                    <input
                      id="est-lng"
                      type="number"
                      step="0.000001"
                      className="input-nightlife"
                      placeholder="100.8776"
                      value={newEstablishment.longitude || ''}
                      onChange={(e) => setNewEstablishment({ ...newEstablishment, longitude: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                {/* Description */}
                <div style={{ marginBottom: '20px' }}>
                  <label className="label-nightlife" htmlFor="est-description">
                    {t('establishment.description', 'Description')}
                  </label>
                  <textarea
                    id="est-description"
                    className="input-nightlife"
                    placeholder={t('establishment.descriptionPlaceholder', 'Brief description of your establishment...')}
                    value={newEstablishment.description}
                    onChange={(e) => setNewEstablishment({ ...newEstablishment, description: e.target.value })}
                    rows={3}
                    style={{ resize: 'vertical', minHeight: '80px' }}
                  />
                </div>

                {/* Contact */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                  <div>
                    <label className="label-nightlife" htmlFor="est-phone">
                      {t('establishment.phone', 'Phone')}
                    </label>
                    <input
                      id="est-phone"
                      type="tel"
                      className="input-nightlife"
                      placeholder="+66 123 456 789"
                      value={newEstablishment.phone}
                      onChange={(e) => setNewEstablishment({ ...newEstablishment, phone: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="label-nightlife" htmlFor="est-website">
                      {t('establishment.website', 'Website')}
                    </label>
                    <input
                      id="est-website"
                      type="url"
                      className="input-nightlife"
                      placeholder="https://example.com"
                      value={newEstablishment.website}
                      onChange={(e) => setNewEstablishment({ ...newEstablishment, website: e.target.value })}
                    />
                  </div>
                </div>

                {/* Social Media */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                  <div>
                    <label className="label-nightlife" htmlFor="est-instagram">
                      <Camera size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Instagram
                    </label>
                    <input
                      id="est-instagram"
                      type="text"
                      className="input-nightlife"
                      placeholder="@username"
                      value={newEstablishment.instagram}
                      onChange={(e) => setNewEstablishment({ ...newEstablishment, instagram: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="label-nightlife" htmlFor="est-twitter">
                      <X size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> X (Twitter)
                    </label>
                    <input
                      id="est-twitter"
                      type="text"
                      className="input-nightlife"
                      placeholder="@username"
                      value={newEstablishment.twitter}
                      onChange={(e) => setNewEstablishment({ ...newEstablishment, twitter: e.target.value })}
                    />
                  </div>
                </div>

                {/* Note */}
                <div style={{
                  padding: '15px',
                  background: 'rgba(255, 165, 0, 0.1)',
                  border: '1px solid rgba(255, 165, 0, 0.3)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}>
                  <strong style={{ color: 'rgba(255, 165, 0, 0.9)' }}>
                    {t('ownership.note', 'Note')}:
                  </strong> {t('ownership.createNote', 'Your new establishment will be created with pending status and reviewed by admins along with your ownership request.')}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Upload Documents */}
        {currentStep === 2 && (
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

            {/* Drag & drop zone with gradient */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
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
                onChange={(e) => handleFileSelect(e.target.files)}
                style={{ display: 'none' }}
                disabled={isUploading}
              />
            </div>

            {/* Document previews with cards */}
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
                          handleRemoveDocument(index);
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
        )}

        {/* Step 3: Verification & Message */}
        {currentStep === 3 && (
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
              <CheckCircle size={20} /> {t('ownership.step3Title', 'Final Details')}
            </h3>

            <p style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '14px',
              marginBottom: '20px',
              lineHeight: '1.6'
            }}>
              {t('ownership.step3Description', 'Review your request and provide additional information')}
            </p>

            {/* Summary Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(193, 154, 107, 0.1), rgba(0, 0, 0, 0.4))',
              border: '2px solid rgba(193, 154, 107, 0.3)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '25px'
            }}>
              <h4 style={{
                color: '#C19A6B',
                fontSize: '16px',
                fontWeight: 'bold',
                marginBottom: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                📋 {t('ownership.requestSummary', 'Request Summary')}
              </h4>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: '1px solid rgba(193, 154, 107, 0.2)'
              }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
                  {t('ownership.establishment', 'Establishment')}:
                </span>
                <span style={{
                  color: '#FFD700',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {createMode ? newEstablishment.name : selectedEstablishment?.name}
                  {createMode && (
                    <span style={{
                      background: 'linear-gradient(45deg, #00E5FF, #00B8D4)',
                      color: '#000',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}>
                      {t('ownership.new', 'NEW')}
                    </span>
                  )}
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0'
              }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
                  {t('ownership.documents', 'Documents')}:
                </span>
                <span style={{
                  color: '#FFD700',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  {documents.length} {t('ownership.files', 'file(s)')}
                </span>
              </div>
            </div>

            {/* Verification code (optional) */}
            <div style={{ marginBottom: '20px' }}>
              <label
                htmlFor="verification-code"
                style={{
                  display: 'block',
                  color: '#C19A6B',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  marginBottom: '8px'
                }}
              >
                🔑 {t('ownership.verificationCode', 'Verification Code')}{' '}
                <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontWeight: 'normal', fontSize: '12px' }}>
                  ({t('ownership.optional', 'Optional')})
                </span>
              </label>
              <p style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '12px',
                marginBottom: '8px'
              }}>
                {t('ownership.verificationCodeHint', 'If you were given a verification code, enter it here')}
              </p>
              <input
                id="verification-code"
                type="text"
                placeholder={t('ownership.verificationCodePlaceholder', 'e.g., VRF-12345')}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={50}
                className="input-nightlife"
              />
            </div>

            {/* Request message */}
            <div style={{ marginBottom: '20px' }}>
              <label
                htmlFor="request-message"
                style={{
                  display: 'block',
                  color: '#C19A6B',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  marginBottom: '8px'
                }}
              >
                💬 {t('ownership.additionalMessage', 'Additional Message')}{' '}
                <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontWeight: 'normal', fontSize: '12px' }}>
                  ({t('ownership.optional', 'Optional')})
                </span>
              </label>
              <p style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '12px',
                marginBottom: '8px'
              }}>
                {t('ownership.additionalMessageHint', 'Provide any additional context that may help verify your ownership')}
              </p>
              <textarea
                id="request-message"
                placeholder={t('ownership.additionalMessagePlaceholder', "e.g., I've been managing this establishment since 2020...")}
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                rows={4}
                maxLength={500}
                className="input-nightlife"
                style={{ resize: 'vertical', minHeight: '100px' }}
              />
              <div style={{
                textAlign: 'right',
                color: requestMessage.length >= 450 ? '#FFD700' : 'rgba(255, 255, 255, 0.5)',
                fontSize: '12px',
                marginTop: '5px'
              }}>
                {requestMessage.length} / 500
              </div>
            </div>

            {/* Important notes */}
            <div style={{
              padding: '20px',
              background: 'rgba(255, 165, 0, 0.1)',
              border: '2px solid rgba(255, 165, 0, 0.4)',
              borderRadius: '12px'
            }}>
              <h4 style={{
                color: '#FFA500',
                fontSize: '16px',
                fontWeight: 'bold',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertTriangle size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('ownership.important', 'Important')}
              </h4>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '13px'
              }}>
                <li style={{ marginBottom: '10px', paddingLeft: '20px', position: 'relative', lineHeight: '1.6' }}>
                  <span style={{ position: 'absolute', left: 0, color: '#FFA500' }}>•</span>
                  {t('ownership.importantNote1', 'Your request will be reviewed by administrators within 48-72 hours')}
                </li>
                <li style={{ marginBottom: '10px', paddingLeft: '20px', position: 'relative', lineHeight: '1.6' }}>
                  <span style={{ position: 'absolute', left: 0, color: '#FFA500' }}>•</span>
                  {t('ownership.importantNote2', 'You will receive a notification once your request is processed')}
                </li>
                <li style={{ marginBottom: '10px', paddingLeft: '20px', position: 'relative', lineHeight: '1.6' }}>
                  <span style={{ position: 'absolute', left: 0, color: '#FFA500' }}>•</span>
                  {t('ownership.importantNote3', 'Approved ownership grants you permission to edit your establishment details')}
                </li>
                <li style={{ paddingLeft: '20px', position: 'relative', lineHeight: '1.6' }}>
                  <span style={{ position: 'absolute', left: 0, color: '#FFA500' }}>•</span>
                  {t('ownership.importantNote4', 'False ownership claims may result in account suspension')}
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Footer with navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '30px',
        paddingTop: '20px',
        borderTop: '2px solid rgba(193, 154, 107, 0.2)'
      }}>
        <button
          onClick={currentStep === 1 ? onClose : handleBack}
          disabled={isSubmitting}
          style={{
            background: 'linear-gradient(135deg, rgba(100, 100, 100, 0.3), rgba(50, 50, 50, 0.5))',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            color: '#fff',
            padding: '12px 30px',
            borderRadius: '8px',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            fontSize: '15px',
            fontWeight: 'bold',
            transition: 'all 0.3s ease',
            opacity: isSubmitting ? 0.5 : 1
          }}
          onMouseEnter={(e) => {
            if (!isSubmitting) {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(120, 120, 120, 0.4), rgba(70, 70, 70, 0.6))';
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 5px 15px rgba(255, 255, 255, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSubmitting) {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(100, 100, 100, 0.3), rgba(50, 50, 50, 0.5))';
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          {currentStep === 1 ? t('common.cancel', 'Cancel') : t('common.back', 'Back')}
        </button>

        {currentStep < 3 ? (
          <button
            onClick={handleNext}
            disabled={isSubmitting}
            style={{
              background: isSubmitting
                ? 'linear-gradient(135deg, rgba(100, 100, 100, 0.3), rgba(50, 50, 50, 0.5))'
                : 'linear-gradient(135deg, #C19A6B, #FFD700)',
              border: '2px solid rgba(193, 154, 107, 0.6)',
              color: isSubmitting ? 'rgba(255, 255, 255, 0.5)' : '#000',
              padding: '12px 30px',
              borderRadius: '8px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: '15px',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              boxShadow: isSubmitting ? 'none' : '0 0 15px rgba(193, 154, 107, 0.4)'
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.background = 'linear-gradient(135deg, #FFD700, #FFA500)';
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 5px 20px rgba(193, 154, 107, 0.6)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.background = 'linear-gradient(135deg, #C19A6B, #FFD700)';
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 0 15px rgba(193, 154, 107, 0.4)';
              }
            }}
          >
            {t('common.next', 'Next')} →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              background: isSubmitting
                ? 'linear-gradient(135deg, rgba(100, 100, 100, 0.3), rgba(50, 50, 50, 0.5))'
                : 'linear-gradient(135deg, #00E5FF, #00B8D4)',
              border: isSubmitting ? '2px solid rgba(255, 255, 255, 0.2)' : '2px solid rgba(0, 229, 255, 0.6)',
              color: isSubmitting ? 'rgba(255, 255, 255, 0.5)' : '#000',
              padding: '12px 30px',
              borderRadius: '8px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: '15px',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              boxShadow: isSubmitting ? 'none' : '0 0 15px rgba(0, 229, 255, 0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.background = 'linear-gradient(135deg, #00B8D4, #0097A7)';
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 5px 20px rgba(0, 229, 255, 0.7)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.background = 'linear-gradient(135deg, #00E5FF, #00B8D4)';
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 229, 255, 0.5)';
              }
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                {t('common.submitting', 'Submitting...')}
              </>
            ) : (
              <>
                <Rocket size={18} /> {t('ownership.submitRequest', 'Submit Request')}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  </div>
    </>
  );
};

export default RequestOwnershipModal;
