import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useCSRF } from '../../contexts/CSRFContext';
import { useAutoSave } from '../../hooks/useAutoSave';
import { EstablishmentCategory, ConsumableTemplate, Establishment } from '../../types';
import BasicInfoForm from './EstablishmentFormSections/BasicInfoForm';
import OpeningHoursForm from './EstablishmentFormSections/OpeningHoursForm';
import SocialMediaForm from './EstablishmentFormSections/SocialMediaForm';
import PricingForm from './EstablishmentFormSections/PricingForm';
import { logger } from '../../utils/logger';
import { Pencil, Landmark, Loader2, Check, Save, X, Sparkles } from 'lucide-react';
import '../../styles/components/modals.css';
import '../../styles/components/photos.css';
import '../../styles/utilities/layout-utilities.css';
import '../../styles/components/form-components.css';

// Consumable item type for pricing
interface ConsumablePricing {
  consumable_id: string;
  price: string;
}

// Internal form data type with rooms as object for toggle functionality
interface InternalFormData {
  name: string;
  address: string;
  zone: string;
  category_id: string | number;
  description: string;
  phone: string;
  website: string;
  logo_url: string;
  instagram: string;
  twitter: string;
  tiktok: string;
  opening_hours: {
    open: string;
    close: string;
  };
  pricing: {
    consumables: ConsumablePricing[];
    ladydrink: string;
    barfine: string;
    rooms: {
      available: boolean;
      price: string;
    };
  };
}

// Output type for form submission (matches API expectations)
interface EstablishmentSubmitData {
  name: string;
  address: string;
  zone?: string;
  grid_row?: number;
  grid_col?: number;
  category_id: number | string;
  description?: string;
  logo_url?: string;
  phone?: string;
  website?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  opening_hours?: {
    open: string;
    close: string;
  };
  pricing?: {
    consumables: ConsumablePricing[];
    ladydrink: string;
    barfine: string;
    rooms: string;
  };
}

interface EstablishmentFormProps {
  onSubmit: (establishmentData: EstablishmentSubmitData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: Partial<Establishment>;
}

const EstablishmentForm: React.FC<EstablishmentFormProps> = ({ onSubmit, onCancel, isLoading = false, initialData }) => {
  const { t } = useTranslation();
  const { secureFetch } = useSecureFetch();
  const { refreshToken } = useCSRF();
  const [formData, setFormData] = useState<InternalFormData>({
    name: initialData?.name || '',
    address: initialData?.address || '',
    zone: initialData?.zone || '',
    category_id: initialData?.category_id || '',
    description: initialData?.description || '',
    phone: initialData?.phone || '',
    website: initialData?.website || '',
    logo_url: initialData?.logo_url || '',
    // Social media links (v10.1)
    instagram: initialData?.instagram || '',
    twitter: initialData?.twitter || '',
    tiktok: initialData?.tiktok || '',
    opening_hours: {
      open: initialData?.opening_hours?.open || '14:00',
      close: initialData?.opening_hours?.close || '02:00'
    },
    pricing: {
      consumables: initialData?.pricing?.consumables || [],
      ladydrink: initialData?.ladydrink || initialData?.pricing?.ladydrink || '130',
      barfine: initialData?.barfine || initialData?.pricing?.barfine || '400',
      rooms: {
        // Auto-check toggle if rooms price exists
        available: Boolean(initialData?.rooms && initialData.rooms !== 'N/A') ||
                   Boolean(initialData?.pricing?.rooms && initialData.pricing.rooms !== 'N/A'),
        price: (initialData?.rooms && initialData.rooms !== 'N/A')
          ? initialData.rooms
          : (initialData?.pricing?.rooms && initialData.pricing.rooms !== 'N/A'
              ? initialData.pricing.rooms
              : '600')
      }
    }
  });

  const [categories, setCategories] = useState<EstablishmentCategory[]>([]);
  const [consumableTemplates, setConsumableTemplates] = useState<ConsumableTemplate[]>([]);
  const [selectedConsumable, setSelectedConsumable] = useState({ template_id: '', price: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Logo upload state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // 💾 Auto-save hook
  const { isDraft, clearDraft, restoreDraft, lastSaved, isSaving } = useAutoSave({
    key: initialData ? `establishment-form-edit-${initialData.id}` : 'establishment-form-new',
    data: formData,
    debounceMs: 2000,
    enabled: !isLoading,
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await secureFetch(`${import.meta.env.VITE_API_URL}/api/establishments/categories`);
        const data = await response.json();
        setCategories(data.categories || []);
      } catch (error) {
        logger.error('Error fetching categories:', error);
      }
    };

    const fetchConsumableTemplates = async () => {
      try {
        const response = await secureFetch(`${import.meta.env.VITE_API_URL}/api/establishments/consumables`);

        if (!response.ok) {
          logger.error('Failed to fetch consumables:', response.status);
          return;
        }

        const data = await response.json();
        const templates = data.consumables || [];

        logger.debug(`✅ Fetched ${templates.length} consumable templates from API`);
        setConsumableTemplates(templates.filter((t: ConsumableTemplate) => t.status === 'active'));
      } catch (error) {
        logger.error('Error fetching consumable templates:', error);
      }
    };

    fetchCategories();
    fetchConsumableTemplates();
  }, [secureFetch]);

  // 💾 Restore draft on mount if exists
  useEffect(() => {
    if (!initialData && isDraft) {
      const draft = restoreDraft();
      if (draft) {
        setFormData(draft);
        logger.info('📥 Draft restored from localStorage');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name.startsWith('opening_hours.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        opening_hours: {
          ...prev.opening_hours,
          [field]: value
        }
      }));
    } else if (name.startsWith('pricing.rooms.')) {
      const field = name.split('.')[2];
      setFormData(prev => ({
        ...prev,
        pricing: {
          ...prev.pricing,
          rooms: {
            ...prev.pricing.rooms,
            [field]: field === 'available' ? value === 'true' : value
          }
        }
      }));
    } else if (name.startsWith('pricing.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        pricing: {
          ...prev.pricing,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Social media change handler (v10.1)
  const handleSocialMediaChange = (platform: 'instagram' | 'twitter' | 'tiktok', value: string) => {
    setFormData(prev => ({
      ...prev,
      [platform]: value
    }));
  };

  const addConsumable = () => {
    if (selectedConsumable.template_id && selectedConsumable.price) {
      const newConsumable = {
        consumable_id: selectedConsumable.template_id,
        price: selectedConsumable.price
      };

      const exists = formData.pricing.consumables.some((c: ConsumablePricing) => c.consumable_id === newConsumable.consumable_id);
      if (!exists) {
        setFormData(prev => ({
          ...prev,
          pricing: {
            ...prev.pricing,
            consumables: [...prev.pricing.consumables, newConsumable]
          }
        }));
        setSelectedConsumable({ template_id: '', price: '' });
      }
    }
  };

  const removeConsumable = (index: number) => {
    setFormData(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        consumables: prev.pricing.consumables.filter((_: ConsumablePricing, i: number) => i !== index)
      }
    }));
  };

  const editConsumable = (index: number, newPrice: string) => {
    setFormData(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        consumables: prev.pricing.consumables.map((consumable: ConsumablePricing, i: number) =>
          i === index ? { ...consumable, price: newPrice } : consumable
        )
      }
    }));
  };

  const getConsumableTemplate = (id: string) => {
    return consumableTemplates.find(t => t.id === id);
  };

  const handleSelectedConsumableChange = (field: string, value: string) => {
    setSelectedConsumable(prev => ({ ...prev, [field]: value }));

    // Auto-fill price when template is selected
    if (field === 'template_id' && value) {
      const template = getConsumableTemplate(value);
      if (template) {
        setSelectedConsumable(prev => ({ ...prev, price: String(template.default_price) }));
      }
    }
  };

  // Logo upload functions
  const handleLogoChange = (file: File | null) => {
    setLogoFile(file);
    if (!file) {
      // If removing logo file, also clear logo_url from formData
      setFormData(prev => ({
        ...prev,
        logo_url: ''
      }));
      return;
    }
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return formData.logo_url || null;

    setUploadingLogo(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('image', logoFile); // Use 'image' to match backend multer config

      logger.debug('🎨 Uploading logo', {
        name: logoFile.name,
        size: `${(logoFile.size / 1024 / 1024).toFixed(2)}MB`
      });

      const response = await secureFetch(`${import.meta.env.VITE_API_URL}/api/upload/establishment-logo`, {
        method: 'POST',
        body: formDataUpload
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `Upload failed: ${response.status}`);
      }

      const data = await response.json();

      logger.debug('✅ Logo upload successful:', data);

      // Return the logo URL from the specialized endpoint
      return data.logo?.url || null;
    } catch (error) {
      logger.error('❌ Logo upload error:', error);
      setErrors(prev => ({ ...prev, logo_url: t('establishment.errorLogoUploadFailed', { error: error instanceof Error ? error.message : 'Unknown error' }) }));
      return null;
    } finally {
      setUploadingLogo(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = t('establishment.errorNameRequired');
    if (!formData.address.trim()) newErrors.address = t('establishment.errorAddressRequired');
    if (!formData.zone) newErrors.zone = t('establishment.errorZoneRequired');
    if (!formData.category_id) newErrors.category_id = t('establishment.errorCategoryRequired');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      // Upload logo if there's a new file
      const logoUrl = await uploadLogo();

      // ENHANCED: Force CSRF token refresh after logo upload to sync sessions
      if (logoUrl) {
        if (process.env.NODE_ENV === 'development') {
          logger.debug('🛡️ Logo uploaded successfully, refreshing CSRF token for session sync...');
        }
        await refreshToken();
        // Extra delay to ensure session synchronization
        await new Promise(resolve => setTimeout(resolve, 600));
      }

      // Transform internal form data to API format
      // Assign default grid position (1,1) when zone is selected so establishment appears on map
      const finalFormData: EstablishmentSubmitData = {
        name: formData.name,
        address: formData.address,
        zone: formData.zone || undefined,
        grid_row: formData.zone ? 1 : undefined, // Default position row 1
        grid_col: formData.zone ? 1 : undefined, // Default position col 1
        category_id: formData.category_id,
        description: formData.description || undefined,
        logo_url: logoUrl || formData.logo_url || undefined,
        phone: formData.phone || undefined,
        website: formData.website || undefined,
        instagram: formData.instagram || undefined,
        twitter: formData.twitter || undefined,
        tiktok: formData.tiktok || undefined,
        opening_hours: formData.opening_hours,
        pricing: {
          consumables: formData.pricing.consumables,
          ladydrink: formData.pricing.ladydrink,
          barfine: formData.pricing.barfine,
          rooms: formData.pricing.rooms.available ? formData.pricing.rooms.price : 'N/A'
        }
      };

      if (process.env.NODE_ENV === 'development') {
        logger.debug('🏢 Submitting establishment with final data:', finalFormData);
      }

      await onSubmit(finalFormData);

      // ✅ Clear draft after successful submission
      clearDraft();
      logger.info('🗑️ Draft cleared after successful submission');
    } catch (error) {
      logger.error('Error submitting form:', error);
      setErrors(prev => ({ ...prev, submit: t('establishment.errorSubmitFailed') }));
    }
  };

  return (
    <div className="modal-overlay-unified" role="dialog" aria-modal="true">
      <div className="modal-content-unified modal--large">
        {/* Bouton fermeture */}
        <button
          onClick={onCancel}
          className="modal-close-btn"
          aria-label="Close"
        >
          ×
        </button>

        <div className="modal-header">
          <h2 className="header-title-nightlife">
            {initialData ? <><Pencil size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> {t('establishment.editTitle')}</> : <><Landmark size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> {t('establishment.addTitle')}</>}
          </h2>
          <p className="modal-subtitle">
            {initialData ? t('establishment.editSubtitle') : t('establishment.createSubtitle')}
          </p>

          {/* Auto-save indicator */}
          {!initialData && (
            <div style={{
              fontSize: '0.75rem',
              color: isSaving ? '#00E5FF' : isDraft ? '#4ADE80' : '#6B7280',
              marginTop: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem'
            }}>
              {isSaving ? (
                <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> {t('establishment.savingDraft')}</>
              ) : isDraft && lastSaved ? (
                <>
                  <Check size={14} /> {t('establishment.draftSavedAt', { time: new Date(lastSaved).toLocaleTimeString() })}
                </>
              ) : (
                <><Save size={14} /> {t('establishment.autoSaveEnabled')}</>
              )}
            </div>
          )}
        </div>

      <form onSubmit={handleSubmit} className="form-layout">
        <div className="form-section">
          <BasicInfoForm
            formData={formData}
            categories={categories}
            errors={errors}
            onChange={handleInputChange}
            logoFile={logoFile}
            onLogoChange={handleLogoChange}
            uploadingLogo={uploadingLogo}
          />
        </div>

        <div className="form-section">
          <OpeningHoursForm
            formData={formData}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-section">
          <SocialMediaForm
            formData={formData}
            onSocialMediaChange={handleSocialMediaChange}
          />
        </div>

        <div className="form-section">
          <PricingForm
            formData={formData}
            consumableTemplates={consumableTemplates}
            selectedConsumable={selectedConsumable}
            onSelectedConsumableChange={handleSelectedConsumableChange}
            onAddConsumable={addConsumable}
            onRemoveConsumable={removeConsumable}
            onEditConsumable={editConsumable}
            onChange={handleInputChange}
            getConsumableTemplate={getConsumableTemplate}
            selectedCategoryName={categories.find(cat => cat.id.toString() === formData.category_id.toString())?.name || ''}
          />
        </div>

        <div className="button-group-center">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn--secondary"
          >
            <X size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> {t('establishment.buttonCancel')}
          </button>

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn--primary"
          >
            {isLoading ? (
              <span className="loading-flex">
                <span className="loading-spinner-small-nightlife"></span>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', marginRight: '6px' }} /> {t('establishment.buttonSubmitting')}
              </span>
            ) : (
              initialData ? <><Save size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> {t('establishment.buttonSaveChanges')}</> : <><Sparkles size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> {t('establishment.buttonAddEstablishment')}</>
            )}
          </button>
        </div>
      </form>

      {/* Loading Animation CSS */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Animations spécifiques au formulaire */
      `}</style>
      </div>
    </div>
  );
};

export default EstablishmentForm;