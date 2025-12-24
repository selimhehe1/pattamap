import React, { useState, useEffect, useRef } from 'react';
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
import '../../styles/components/modal-forms.css';
import '../../styles/components/photos.css';
import '../../styles/utilities/layout-utilities.css';
import '../../styles/components/form-components.css';

// Internal form data structure (differs from API structure for rooms)
interface RoomsComplex {
  available: boolean;
  price: string;
}

// Extended initial data that allows complex rooms structure from internal state
interface EstablishmentInitialData extends Omit<Establishment, 'pricing'> {
  pricing?: {
    consumables: Array<{ consumable_id: string; price: string }>;
    ladydrink: string;
    barfine: string;
    rooms: string | RoomsComplex; // Can be string (from API) or object (from internal state)
  };
}

interface EstablishmentEditModalProps {
  onSubmit: (establishmentData: Record<string, unknown>) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: Partial<EstablishmentInitialData>;
  isSuggestion?: boolean; // True if user is suggesting edit (not admin)
}

/**
 * Parse category_id from various formats to string number for select matching
 * 'cat-001' → '1'  (API establishments format)
 * 1 → '1'         (Integer format)
 * '1' → '1'       (Already correct format)
 */
const parseCategoryId = (catId: string | number | undefined): string => {
  if (!catId) return '';
  if (typeof catId === 'number') return catId.toString();

  // Si format 'cat-001', extraire le nombre
  const match = String(catId).match(/cat-(\d+)/);
  if (match) {
    return parseInt(match[1], 10).toString(); // '001' → 1 → '1'
  }

  return String(catId);
};

/**
 * EstablishmentEditModal
 *
 * Modern establishment editing modal with EmployeeProfileWizard-inspired styling.
 * Provides tabbed interface for editing establishment information:
 * - Basic Info (name, address, zone, category, description, logo)
 * - Pricing (consumables, ladydrink, barfine, rooms)
 * - Contact (phone, website)
 * - Opening Hours
 *
 * Features:
 * - Cohesive nightlife theme styling
 * - Tabbed navigation for better UX
 * - Auto-save draft functionality
 * - Logo upload with Cloudinary
 * - Form validation
 * - CSRF protection
 */
const EstablishmentEditModal: React.FC<EstablishmentEditModalProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
  initialData,
  isSuggestion = false
}) => {
  const { t } = useTranslation();
  const { secureFetch } = useSecureFetch();
  const { refreshToken } = useCSRF();

  // Active section state (tab navigation)
  const [activeSection, setActiveSection] = useState<'basic' | 'pricing' | 'contact' | 'hours'>('basic');

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    address: initialData?.address || '',
    zone: initialData?.zone || '',
    category_id: parseCategoryId(initialData?.category_id),
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
      consumables: initialData?.pricing?.consumables || [] as Array<{ consumable_id: string; price: string }>,
      ladydrink: initialData?.ladydrink || initialData?.pricing?.ladydrink || '130',
      barfine: initialData?.barfine || initialData?.pricing?.barfine || '400',
      rooms: {
        // Auto-check toggle if rooms price exists (fix: detect existing rooms price)
        // Handle both string (API) and object (internal) formats for rooms
        available:
          (typeof initialData?.pricing?.rooms === 'object' ? initialData.pricing.rooms.available : undefined) ??
          (initialData?.rooms && initialData.rooms !== 'N/A' ? true : false),
        price: initialData?.rooms && initialData?.rooms !== 'N/A'
          ? initialData.rooms
          : (typeof initialData?.pricing?.rooms === 'object' ? initialData.pricing.rooms.price : initialData?.pricing?.rooms) || '600'
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

  // Track if initialData has been loaded (to prevent overwriting user edits)
  const dataLoadedRef = useRef(false);

  // Auto-save hook
  const { isDraft, clearDraft, restoreDraft, lastSaved, isSaving } = useAutoSave({
    key: initialData ? `establishment-edit-${initialData.id}` : 'establishment-edit-new',
    data: formData,
    debounceMs: 2000,
    enabled: !isLoading && !isSuggestion, // Disable auto-save for suggestions
  });

  // Debug: Log component mount and initialData
  useEffect(() => {
    logger.info('🚀 EstablishmentEditModal MOUNTED', {
      hasInitialData: !!initialData,
      initialDataId: initialData?.id,
      initialDataName: initialData?.name,
      initialDataZone: initialData?.zone,
      isSuggestion,
      formDataName: formData.name,
      formDataZone: formData.zone
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only log on mount

  // Load initialData ONCE when it becomes available (prevents overwriting user edits)
  useEffect(() => {
    const hasInitialData = initialData && (initialData.name || initialData.address);

    // Load data only ONCE at mount when initialData is available
    if (hasInitialData && !dataLoadedRef.current) {
      logger.info('📝 EstablishmentEditModal - Loading establishment data (FIRST TIME):', {
        name: initialData.name,
        zone: initialData.zone,
        category_id: initialData.category_id,
        category_id_type: typeof initialData.category_id,
        hasLogo: !!initialData.logo_url
      });

      // Parse category_id for select matching
      const parsedCategoryId = parseCategoryId(initialData.category_id);

      logger.debug('📝 Category parsed:', {
        original: initialData.category_id,
        parsed: parsedCategoryId
      });

      const loadedData = {
        name: initialData.name || '',
        address: initialData.address || '',
        zone: initialData.zone || '',
        category_id: parsedCategoryId,
        description: initialData.description || '',
        phone: initialData.phone || '',
        website: initialData.website || '',
        logo_url: initialData.logo_url || '',
        // Social media links (v10.1)
        instagram: initialData.instagram || '',
        twitter: initialData.twitter || '',
        tiktok: initialData.tiktok || '',
        opening_hours: {
          open: initialData.opening_hours?.open || '14:00',
          close: initialData.opening_hours?.close || '02:00'
        },
        pricing: {
          consumables: initialData.pricing?.consumables || [],
          ladydrink: initialData.ladydrink || initialData.pricing?.ladydrink || '130',
          barfine: initialData.barfine || initialData.pricing?.barfine || '400',
          rooms: {
            // Auto-check toggle if rooms price exists (fix: detect existing rooms price)
            // Handle both string (API) and object (internal) formats for rooms
            available:
              (typeof initialData.pricing?.rooms === 'object' ? initialData.pricing.rooms.available : undefined) ??
              (initialData.rooms && initialData.rooms !== 'N/A' ? true : false),
            price: initialData.rooms && initialData.rooms !== 'N/A'
              ? initialData.rooms
              : (typeof initialData.pricing?.rooms === 'object' ? initialData.pricing.rooms.price : initialData.pricing?.rooms) || '600'
          }
        }
      };

      logger.debug('📝 Setting formData to:', loadedData);
      setFormData(loadedData);
      dataLoadedRef.current = true; // Mark as loaded - never reload again
    }
  }, [initialData]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await secureFetch(`${import.meta.env.VITE_API_URL}/api/establishments/categories`);
        const data = await response.json();
        setCategories(data.categories || []);
      } catch (_error) {
        logger.error('Error fetching categories:', _error);
      }
    };

    const fetchConsumableTemplates = async () => {
      try {
        // Fetch real consumable templates from API (returns UUIDs)
        const response = await secureFetch(`${import.meta.env.VITE_API_URL}/api/establishments/consumables`);

        if (!response.ok) {
          logger.error('Failed to fetch consumables:', response.status);
          return;
        }

        const data = await response.json();
        const templates = data.consumables || [];

        logger.debug(`✅ Fetched ${templates.length} consumable templates from API`);

        // Filter only active consumables
        setConsumableTemplates(templates.filter((t: ConsumableTemplate) => t.status === 'active'));
      } catch (_error) {
        logger.error('Error fetching consumable templates:', _error);
      }
    };

    fetchCategories();
    fetchConsumableTemplates();
  }, [secureFetch]);

  // Restore draft when isDraft becomes true (after useAutoSave checks localStorage)
  // Only restore if this is a NEW establishment (no initialData) and not a suggestion
  useEffect(() => {
    if (!initialData && !isSuggestion && isDraft) {
      const draft = restoreDraft();
      if (draft) {
        logger.info('📥 Draft restored from localStorage', {
          draftKeys: Object.keys(draft),
          hasName: !!draft.name
        });
        setFormData(draft);
      }
    }
  }, [isDraft, initialData, isSuggestion, restoreDraft]);

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

      const exists = formData.pricing.consumables.some((c) => c.consumable_id === newConsumable.consumable_id);
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
        consumables: prev.pricing.consumables.filter((_, i) => i !== index)
      }
    }));
  };

  const editConsumable = (index: number, newPrice: string) => {
    setFormData(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        consumables: prev.pricing.consumables.map((consumable, i) =>
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
      formDataUpload.append('image', logoFile);

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

      // Force CSRF token refresh after logo upload
      if (logoUrl) {
        if (process.env.NODE_ENV === 'development') {
          logger.debug('🛡️ Logo uploaded successfully, refreshing CSRF token for session sync...');
        }
        await refreshToken();
        await new Promise(resolve => setTimeout(resolve, 600));
      }

      // Prepare final form data
      const finalFormData = {
        ...formData,
        logo_url: logoUrl || formData.logo_url || ''
      };

      if (process.env.NODE_ENV === 'development') {
        logger.debug('🏢 Submitting establishment with final data:', finalFormData);
      }

      await onSubmit(finalFormData);

      // Clear draft after successful submission
      if (!isSuggestion) {
        clearDraft();
        logger.info('🗑️ Draft cleared after successful submission');
      }
    } catch (error) {
      logger.error('Error submitting form:', error);
      setErrors(prev => ({ ...prev, submit: t('establishment.errorSubmitFailed') }));
    }
  };

  // Tab configuration
  const tabs = [
    { id: 'basic', label: t('establishment.editModal.tabs.basicInfo'), icon: '📝' },
    { id: 'pricing', label: t('establishment.editModal.tabs.pricing'), icon: '💰' },
    { id: 'contact', label: t('establishment.editModal.tabs.contact'), icon: '📞' },
    { id: 'hours', label: t('establishment.editModal.tabs.hours'), icon: '🕐' }
  ] as const;

  return (
    <div className="modal-overlay-nightlife">
      <div
        className="modal-form-container"
        style={{
          maxWidth: '900px',
          maxHeight: '90vh',
          overflow: 'auto',
          background: 'linear-gradient(135deg, rgba(20, 10, 40, 0.95), rgba(30, 20, 50, 0.92))',
          border: '2px solid rgba(255,255,255,0.15)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="modal-close-button"
          aria-label="Close"
        >
          ×
        </button>

        {/* Header Section */}
        <div className="modal-header" style={{ marginBottom: '30px', textAlign: 'center' }}>
          {/* Logo Preview */}
          {formData.logo_url && (
            <div style={{
              width: '88px',
              height: '88px',
              borderRadius: '50%',
              overflow: 'hidden',
              margin: '0 auto 16px',
              border: '3px solid rgba(255,255,255,0.2)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}>
              <img
                src={formData.logo_url}
                alt={formData.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            </div>
          )}

          <h2 className="header-title-nightlife" style={{ fontSize: '28px', marginBottom: '12px' }}>
            {isSuggestion ? `✍️ ${t('establishment.editModal.suggestEditTitle')}` : initialData ? `✏️ ${t('establishment.editTitle')}` : `🏮 ${t('establishment.addTitle')}`}
          </h2>
          <p className="modal-subtitle" style={{ fontSize: '15px' }}>
            {isSuggestion
              ? t('establishment.editModal.suggestEditSubtitle')
              : initialData
              ? t('establishment.editSubtitle')
              : t('establishment.createSubtitle')
            }
          </p>

          {/* Auto-save indicator */}
          {!initialData && !isSuggestion && (
            <div style={{
              fontSize: '12px',
              color: isSaving ? '#00E5FF' : isDraft ? '#4ADE80' : '#6B7280',
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
              {isSaving ? (
                <>⏳ {t('establishment.savingDraft')}</>
              ) : isDraft && lastSaved ? (
                <>✓ {t('establishment.draftSavedAt', { time: new Date(lastSaved).toLocaleTimeString() })}</>
              ) : (
                <>💾 {t('establishment.autoSaveEnabled')}</>
              )}
            </div>
          )}
        </div>

        {/* Tabs Navigation */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '30px',
          overflowX: 'auto',
          padding: '4px'
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              style={{
                flex: '1',
                minWidth: '120px',
                padding: '12px 20px',
                background: activeSection === tab.id
                  ? 'linear-gradient(135deg, rgba(193, 154, 107,0.3), rgba(193, 154, 107,0.2))'
                  : 'rgba(0,0,0,0.3)',
                border: activeSection === tab.id
                  ? '2px solid #C19A6B'
                  : '2px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: activeSection === tab.id ? '#C19A6B' : 'rgba(255,255,255,0.7)',
                fontSize: '14px',
                fontWeight: activeSection === tab.id ? 'bold' : 'normal',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                if (activeSection !== tab.id) {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                  e.currentTarget.style.background = 'rgba(0,0,0,0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeSection !== tab.id) {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.background = 'rgba(0,0,0,0.3)';
                }
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit}>
          {/* Basic Info Section */}
          {activeSection === 'basic' && (
            <div style={{
              animation: 'fadeIn 0.3s ease-out',
              marginBottom: '30px'
            }}>
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
          )}

          {/* Pricing Section */}
          {activeSection === 'pricing' && (
            <div style={{
              animation: 'fadeIn 0.3s ease-out',
              marginBottom: '30px'
            }}>
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
          )}

          {/* Contact Section */}
          {activeSection === 'contact' && (
            <div style={{
              animation: 'fadeIn 0.3s ease-out',
              marginBottom: '30px'
            }}>
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '24px'
              }}>
                <h3 style={{
                  color: '#00E5FF',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>📞</span>
                  <span>{t('establishment.editModal.contact.sectionTitle')}</span>
                </h3>

                {/* Phone */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '8px'
                  }}>
                    {t('establishment.editModal.contact.phoneLabel')}
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder={t('establishment.editModal.contact.phonePlaceholder')}
                    className="input-field-nightlife"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'rgba(0,0,0,0.4)',
                      border: '2px solid rgba(255,255,255,0.2)',
                      borderRadius: '10px',
                      color: '#ffffff',
                      fontSize: '15px'
                    }}
                  />
                </div>

                {/* Website */}
                <div style={{ marginBottom: '0' }}>
                  <label style={{
                    display: 'block',
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '8px'
                  }}>
                    {t('establishment.editModal.contact.websiteLabel')}
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    placeholder={t('establishment.editModal.contact.websitePlaceholder')}
                    className="input-field-nightlife"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'rgba(0,0,0,0.4)',
                      border: '2px solid rgba(255,255,255,0.2)',
                      borderRadius: '10px',
                      color: '#ffffff',
                      fontSize: '15px'
                    }}
                  />
                </div>

                {/* Social Media (v10.1 - replaces Services) */}
                <div style={{ marginTop: '20px' }}>
                  <SocialMediaForm
                    formData={formData}
                    onSocialMediaChange={handleSocialMediaChange}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Opening Hours Section */}
          {activeSection === 'hours' && (
            <div style={{
              animation: 'fadeIn 0.3s ease-out',
              marginBottom: '30px'
            }}>
              <OpeningHoursForm
                formData={formData}
                onChange={handleInputChange}
              />
            </div>
          )}

          {/* Submit Error */}
          {errors.submit && (
            <div style={{
              padding: '16px',
              background: 'rgba(255,71,87,0.1)',
              border: '2px solid rgba(255,71,87,0.3)',
              borderRadius: '12px',
              color: '#FF4757',
              fontSize: '14px',
              marginBottom: '20px'
            }}>
              {errors.submit}
            </div>
          )}

          {/* Footer Buttons */}
          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            marginTop: '30px'
          }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '14px 28px',
                background: 'rgba(255,255,255,0.1)',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                minWidth: '140px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              }}
            >
              ❌ {t('establishment.buttonCancel')}
            </button>

            <button
              type="submit"
              disabled={isLoading || uploadingLogo}
              style={{
                padding: '14px 28px',
                background: isLoading || uploadingLogo
                  ? 'rgba(100,100,100,0.3)'
                  : 'linear-gradient(135deg, rgba(193, 154, 107,0.9), rgba(193, 154, 107,0.7))',
                border: '2px solid',
                borderColor: isLoading || uploadingLogo ? 'rgba(255,255,255,0.1)' : '#C19A6B',
                borderRadius: '12px',
                color: isLoading || uploadingLogo ? 'rgba(255,255,255,0.5)' : '#ffffff',
                fontSize: '15px',
                fontWeight: 'bold',
                cursor: isLoading || uploadingLogo ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                minWidth: '140px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                if (!isLoading && !uploadingLogo) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(193, 154, 107,1), rgba(193, 154, 107,0.8))';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(193, 154, 107,0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading && !uploadingLogo) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(193, 154, 107,0.9), rgba(193, 154, 107,0.7))';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {isLoading || uploadingLogo ? (
                <>
                  <div className="loading-spinner-small-nightlife" />
                  <span>{uploadingLogo ? t('establishment.editModal.uploading') : t('establishment.buttonSubmitting')}</span>
                </>
              ) : (
                <>
                  {isSuggestion ? `✍️ ${t('establishment.editModal.submitSuggestionButton')}` : initialData ? `💾 ${t('establishment.buttonSaveChanges')}` : `✨ ${t('establishment.buttonAddEstablishment')}`}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default EstablishmentEditModal;
