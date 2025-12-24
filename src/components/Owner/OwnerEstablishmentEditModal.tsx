import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useCSRF } from '../../contexts/CSRFContext';
import { Establishment, EstablishmentCategory, ConsumableTemplate } from '../../types';
import BasicInfoForm from '../Forms/EstablishmentFormSections/BasicInfoForm';
import OpeningHoursForm from '../Forms/EstablishmentFormSections/OpeningHoursForm';
import SocialMediaForm from '../Forms/EstablishmentFormSections/SocialMediaForm';
import PricingForm from '../Forms/EstablishmentFormSections/PricingForm';
import { logger } from '../../utils/logger';
import toastService from '../../utils/toast';
import '../../styles/components/modal-forms.css';
import '../../styles/components/photos.css';
import '../../styles/utilities/layout-utilities.css';
import '../../styles/components/form-components.css';

// 🆕 v10.1 - Owner Establishment Edit Modal
interface OwnerEstablishmentEditModalProps {
  establishment: Establishment;
  permissions: {
    can_edit_info: boolean;
    can_edit_pricing: boolean;
    can_edit_photos: boolean;
    can_edit_employees: boolean;
    can_view_analytics: boolean;
  };
  onClose: () => void;
  onSuccess: () => void;
}

const OwnerEstablishmentEditModal: React.FC<OwnerEstablishmentEditModalProps> = ({
  establishment,
  permissions,
  onClose,
  onSuccess
}) => {
  const { t } = useTranslation();
  const { secureFetch } = useSecureFetch();
  const { refreshToken } = useCSRF();

  const [formData, setFormData] = useState({
    name: establishment.name || '',
    address: establishment.address || '',
    zone: establishment.zone || '',
    category_id: establishment.category_id || '',
    description: establishment.description || '',
    phone: establishment.phone || '',
    website: establishment.website || '',
    logo_url: establishment.logo_url || '',
    // Social media links (v10.1)
    instagram: establishment.instagram || '',
    twitter: establishment.twitter || '',
    tiktok: establishment.tiktok || '',
    opening_hours: {
      open: establishment.opening_hours?.open || '14:00',
      close: establishment.opening_hours?.close || '02:00'
    },
    pricing: {
      consumables: establishment.pricing?.consumables || [] as Array<{ consumable_id: string; price: string }>,
      ladydrink: establishment.ladydrink || establishment.pricing?.ladydrink || '130',
      barfine: establishment.barfine || establishment.pricing?.barfine || '400',
      rooms: {
        available: establishment.rooms ? (establishment.rooms !== 'N/A') : false,
        price: (establishment.rooms && establishment.rooms !== 'N/A') ? establishment.rooms : '600'
      }
    }
  });

  const [categories, setCategories] = useState<EstablishmentCategory[]>([]);
  const [consumableTemplates, setConsumableTemplates] = useState<ConsumableTemplate[]>([]);
  const [selectedConsumable, setSelectedConsumable] = useState({ template_id: '', price: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Logo upload state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

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
        const response = await secureFetch(`${import.meta.env.VITE_API_URL}/api/establishments/consumables`);
        if (!response.ok) {
          logger.error('Failed to fetch consumables:', response.status);
          return;
        }
        const data = await response.json();
        const templates = data.consumables || [];
        setConsumableTemplates(templates.filter((t: ConsumableTemplate) => t.status === 'active'));
      } catch (_error) {
        logger.error('Error fetching consumable templates:', _error);
      }
    };

    fetchCategories();
    fetchConsumableTemplates();
  }, [secureFetch]);

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

    if (field === 'template_id' && value) {
      const template = getConsumableTemplate(value);
      if (template) {
        setSelectedConsumable(prev => ({ ...prev, price: String(template.default_price) }));
      }
    }
  };

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
      toastService.error(t('ownerEstablishmentModal.errorLogoUploadFailed', { error: error instanceof Error ? error.message : 'Unknown error' }));
      return null;
    } finally {
      setUploadingLogo(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Only validate fields that the owner can edit
    if (permissions.can_edit_info) {
      if (!formData.name.trim()) newErrors.name = t('ownerEstablishmentModal.errorNameRequired');
      if (!formData.address.trim()) newErrors.address = t('ownerEstablishmentModal.errorAddressRequired');
      if (!formData.zone) newErrors.zone = t('ownerEstablishmentModal.errorZoneRequired');
      if (!formData.category_id) newErrors.category_id = t('ownerEstablishmentModal.errorCategoryRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Upload logo if there's a new file and owner has photo permission
      let logoUrl = formData.logo_url;
      if (logoFile && permissions.can_edit_photos) {
        const uploadedUrl = await uploadLogo();
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
          await refreshToken();
          await new Promise(resolve => setTimeout(resolve, 600));
        }
      }

      // Build update payload based on permissions
      const updatePayload: Partial<Establishment> = {};

      if (permissions.can_edit_info) {
        updatePayload.name = formData.name;
        updatePayload.address = formData.address;
        updatePayload.zone = formData.zone;
        updatePayload.category_id = formData.category_id;
        updatePayload.description = formData.description;
        updatePayload.phone = formData.phone;
        updatePayload.website = formData.website;
        updatePayload.opening_hours = formData.opening_hours;
        updatePayload.instagram = formData.instagram;
        updatePayload.twitter = formData.twitter;
        updatePayload.tiktok = formData.tiktok;
      }

      if (permissions.can_edit_pricing) {
        updatePayload.ladydrink = formData.pricing.ladydrink;
        updatePayload.barfine = formData.pricing.barfine;
        updatePayload.rooms = formData.pricing.rooms.available ? formData.pricing.rooms.price : 'N/A';
        updatePayload.pricing = {
          consumables: formData.pricing.consumables,
          ladydrink: formData.pricing.ladydrink,
          barfine: formData.pricing.barfine,
          rooms: formData.pricing.rooms.available ? formData.pricing.rooms.price : 'N/A'
        };
      }

      if (permissions.can_edit_photos && logoUrl) {
        updatePayload.logo_url = logoUrl;
      }

      logger.debug('🏢 Submitting owner update:', updatePayload);

      const response = await secureFetch(
        `${import.meta.env.VITE_API_URL}/api/establishments/${establishment.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatePayload)
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || t('ownerEstablishmentModal.errorUpdateFailed'));
      }

      toastService.success(t('ownerEstablishmentModal.successUpdateMessage'));
      onSuccess();
      onClose();
    } catch (error) {
      logger.error('Error updating establishment:', error);
      toastService.error(t('ownerEstablishmentModal.errorUpdateFailedMessage', { error: error instanceof Error ? error.message : 'Unknown error' }));
      setErrors(prev => ({ ...prev, submit: t('ownerEstablishmentModal.errorUpdateFailed') }));
    } finally {
      setIsLoading(false);
    }
  };

  // Permission check message
  const hasAnyEditPermission = permissions.can_edit_info || permissions.can_edit_pricing || permissions.can_edit_photos;

  if (!hasAnyEditPermission) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 900,
        animation: 'fadeIn 0.5s ease-out',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px'
      }} role="dialog" aria-modal="true">
        <div className="modal-form-container" style={{ maxWidth: '500px', textAlign: 'center' }}>
          <button onClick={onClose} className="modal-close-button">✕</button>
          <div className="modal-header">
            <h2 className="header-title-nightlife">🔒 {t('ownerEstablishmentModal.noPermissionsTitle')}</h2>
            <p className="modal-subtitle">
              {t('ownerEstablishmentModal.noPermissionsMessage')}
            </p>
          </div>
          <div className="button-group-center" style={{ marginTop: '2rem' }}>
            <button onClick={onClose} className="btn btn--primary">
              {t('ownerEstablishmentModal.buttonClose')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      zIndex: 900,
      animation: 'fadeIn 0.5s ease-out',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '10px'
    }} role="dialog" aria-modal="true">
      <div className="modal-form-container">
        <button onClick={onClose} className="modal-close-button">✕</button>

        <div className="modal-header">
          <h2 className="header-title-nightlife">
            ✏️ {t('ownerEstablishmentModal.title')}
          </h2>
          <p className="modal-subtitle">
            {establishment.name}
          </p>

          {/* Permission badges */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginTop: '1rem',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            {permissions.can_edit_info && (
              <span style={{
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#10B981',
                padding: '0.25rem 0.75rem',
                borderRadius: '12px',
                fontSize: '0.75rem',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                📝 {t('ownerEstablishmentModal.permissionEditInfo')}
              </span>
            )}
            {permissions.can_edit_pricing && (
              <span style={{
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#10B981',
                padding: '0.25rem 0.75rem',
                borderRadius: '12px',
                fontSize: '0.75rem',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                💰 {t('ownerEstablishmentModal.permissionEditPricing')}
              </span>
            )}
            {permissions.can_edit_photos && (
              <span style={{
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#10B981',
                padding: '0.25rem 0.75rem',
                borderRadius: '12px',
                fontSize: '0.75rem',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                📸 {t('ownerEstablishmentModal.permissionEditPhotos')}
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="form-layout">
          {/* Basic Info Section - Only editable if can_edit_info */}
          {permissions.can_edit_info && (
            <div className="form-section">
              <BasicInfoForm
                formData={formData as any}
                categories={categories}
                errors={errors}
                onChange={handleInputChange}
                logoFile={logoFile}
                onLogoChange={handleLogoChange}
                uploadingLogo={uploadingLogo}
              />
            </div>
          )}

          {/* Opening Hours - Only editable if can_edit_info */}
          {permissions.can_edit_info && (
            <div className="form-section">
              <OpeningHoursForm
                formData={formData}
                onChange={handleInputChange}
              />
            </div>
          )}

          {/* Social Media - Only editable if can_edit_info */}
          {permissions.can_edit_info && (
            <div className="form-section">
              <SocialMediaForm
                formData={formData}
                onSocialMediaChange={handleSocialMediaChange}
              />
            </div>
          )}

          {/* Pricing Section - Only editable if can_edit_pricing */}
          {permissions.can_edit_pricing && (
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
          )}

          <div className="button-group-center">
            <button
              type="button"
              onClick={onClose}
              className="btn btn--secondary"
            >
              ❌ {t('ownerEstablishmentModal.buttonCancel')}
            </button>

            <button
              type="submit"
              disabled={isLoading || uploadingLogo}
              className="btn btn--primary"
            >
              {isLoading ? (
                <span className="loading-flex">
                  <span className="loading-spinner-small-nightlife"></span>
                  ⏳ {t('ownerEstablishmentModal.buttonSaving')}
                </span>
              ) : (
                `💾 ${t('ownerEstablishmentModal.buttonSaveChanges')}`
              )}
            </button>
          </div>
        </form>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default OwnerEstablishmentEditModal;
