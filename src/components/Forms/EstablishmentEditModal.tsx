import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useCSRF } from '../../contexts/CSRFContext';
import { useAutoSave } from '../../hooks/useAutoSave';
import { EstablishmentCategory, ConsumableTemplate, Establishment } from '../../types';
import BasicInfoForm from './EstablishmentFormSections/BasicInfoForm';
import OpeningHoursForm from './EstablishmentFormSections/OpeningHoursForm';
import SocialMediaForm from './EstablishmentFormSections/SocialMediaForm';
import PricingForm from './EstablishmentFormSections/PricingForm';
import { logger } from '../../utils/logger';
import { FileText, DollarSign, Phone, Clock, Pencil, Pen, Landmark, Loader2, Check, Save, X, Sparkles } from 'lucide-react';
import {
  premiumModalVariants,
  premiumBackdropVariants,
  sectionTransitionVariants,
  logoFloatVariants,
  headerItemVariants,
  neonButtonHover,
  neonButtonTap,
} from '../../animations/variants';
import '../../styles/components/modals.css';
import '../../styles/components/edit-modal-premium.css';
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

  // Tab configuration with Lucide icons
  const tabIcons = {
    basic: <FileText size={16} />,
    pricing: <DollarSign size={16} />,
    contact: <Phone size={16} />,
    hours: <Clock size={16} />
  };

  const tabs = [
    { id: 'basic', label: t('establishment.editModal.tabs.basicInfo'), icon: tabIcons.basic },
    { id: 'pricing', label: t('establishment.editModal.tabs.pricing'), icon: tabIcons.pricing },
    { id: 'contact', label: t('establishment.editModal.tabs.contact'), icon: tabIcons.contact },
    { id: 'hours', label: t('establishment.editModal.tabs.hours'), icon: tabIcons.hours }
  ] as const;

  return (
    <motion.div
      className="modal-overlay-unified"
      variants={premiumBackdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div
        className="modal-content-unified modal--large edit-modal-premium"
        variants={premiumModalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Close Button */}
        <motion.button
          onClick={onCancel}
          className="edit-modal__close"
          aria-label="Close"
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
        >
          <X size={20} />
        </motion.button>

        {/* Header Section */}
        <div className="edit-modal__header">
          {/* Logo Preview with Glow */}
          {formData.logo_url && (
            <motion.div
              className="edit-modal__logo-wrapper"
              variants={logoFloatVariants}
              initial="hidden"
              animate="visible"
            >
              <div className="edit-modal__logo-glow" />
              <img
                src={formData.logo_url}
                alt={formData.name}
                className="edit-modal__logo"
              />
            </motion.div>
          )}

          <motion.h2
            className="edit-modal__title"
            variants={headerItemVariants}
            initial="hidden"
            animate="visible"
          >
            {isSuggestion ? (
              <><Pen size={24} /> {t('establishment.editModal.suggestEditTitle')}</>
            ) : initialData ? (
              <><Pencil size={24} /> {t('establishment.editTitle')}</>
            ) : (
              <><Landmark size={24} /> {t('establishment.addTitle')}</>
            )}
          </motion.h2>

          <motion.p
            className="edit-modal__subtitle"
            variants={headerItemVariants}
            initial="hidden"
            animate="visible"
          >
            {isSuggestion
              ? t('establishment.editModal.suggestEditSubtitle')
              : initialData
              ? t('establishment.editSubtitle')
              : t('establishment.createSubtitle')
            }
          </motion.p>

          {/* Auto-save indicator */}
          {!initialData && !isSuggestion && (
            <motion.div
              className={`edit-modal__autosave edit-modal__autosave--${isSaving ? 'saving' : isDraft ? 'saved' : 'idle'}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {isSaving ? (
                <><Loader2 size={14} /> {t('establishment.savingDraft')}</>
              ) : isDraft && lastSaved ? (
                <><Check size={14} /> {t('establishment.draftSavedAt', { time: new Date(lastSaved).toLocaleTimeString() })}</>
              ) : (
                <><Save size={14} /> {t('establishment.autoSaveEnabled')}</>
              )}
            </motion.div>
          )}
        </div>

        {/* Tabs Navigation */}
        <div className="edit-modal__tabs">
          {tabs.map((tab, index) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`edit-modal__tab ${activeSection === tab.id ? 'edit-modal__tab--active' : ''}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 + 0.2 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {activeSection === tab.id && (
                <motion.div
                  className="edit-modal__tab-indicator"
                  layoutId="tab-indicator"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </motion.button>
          ))}
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            {/* Basic Info Section */}
            {activeSection === 'basic' && (
              <motion.div
                key="basic"
                className="edit-modal__content"
                variants={sectionTransitionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <BasicInfoForm
                  formData={formData}
                  categories={categories}
                  errors={errors}
                  onChange={handleInputChange}
                  logoFile={logoFile}
                  onLogoChange={handleLogoChange}
                  uploadingLogo={uploadingLogo}
                />
              </motion.div>
            )}

            {/* Pricing Section */}
            {activeSection === 'pricing' && (
              <motion.div
                key="pricing"
                className="edit-modal__content"
                variants={sectionTransitionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
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
              </motion.div>
            )}

            {/* Contact Section */}
            {activeSection === 'contact' && (
              <motion.div
                key="contact"
                className="edit-modal__content"
                variants={sectionTransitionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <div className="edit-modal__section">
                  <h3 className="edit-modal__section-title">
                    <Phone size={18} />
                    <span>{t('establishment.editModal.contact.sectionTitle')}</span>
                  </h3>

                  {/* Phone */}
                  <div className="edit-modal__field">
                    <label className="edit-modal__label">
                      {t('establishment.editModal.contact.phoneLabel')}
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder={t('establishment.editModal.contact.phonePlaceholder')}
                      className="edit-modal__input"
                    />
                  </div>

                  {/* Website */}
                  <div className="edit-modal__field">
                    <label className="edit-modal__label">
                      {t('establishment.editModal.contact.websiteLabel')}
                    </label>
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      placeholder={t('establishment.editModal.contact.websitePlaceholder')}
                      className="edit-modal__input"
                    />
                  </div>

                  {/* Social Media */}
                  <SocialMediaForm
                    formData={formData}
                    onSocialMediaChange={handleSocialMediaChange}
                  />
                </div>
              </motion.div>
            )}

            {/* Opening Hours Section */}
            {activeSection === 'hours' && (
              <motion.div
                key="hours"
                className="edit-modal__content"
                variants={sectionTransitionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <OpeningHoursForm
                  formData={formData}
                  onChange={handleInputChange}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Error */}
          <AnimatePresence>
            {errors.submit && (
              <motion.div
                className="edit-modal__error-banner"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <X size={18} />
                {errors.submit}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer Buttons */}
          <div className="edit-modal__footer">
            <motion.button
              type="button"
              onClick={onCancel}
              className="edit-modal__btn-secondary"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <X size={16} />
              {t('establishment.buttonCancel')}
            </motion.button>

            <motion.button
              type="submit"
              disabled={isLoading || uploadingLogo}
              className="edit-modal__btn-primary"
              whileHover={!isLoading && !uploadingLogo ? neonButtonHover : undefined}
              whileTap={!isLoading && !uploadingLogo ? neonButtonTap : undefined}
            >
              {isLoading || uploadingLogo ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>{uploadingLogo ? t('establishment.editModal.uploading') : t('establishment.buttonSubmitting')}</span>
                </>
              ) : isSuggestion ? (
                <>
                  <Pen size={18} />
                  {t('establishment.editModal.submitSuggestionButton')}
                </>
              ) : initialData ? (
                <>
                  <Save size={18} />
                  {t('establishment.buttonSaveChanges')}
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  {t('establishment.buttonAddEstablishment')}
                </>
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default EstablishmentEditModal;
