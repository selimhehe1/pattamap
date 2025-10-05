import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useCSRF } from '../../contexts/CSRFContext';
import { EstablishmentCategory, ConsumableTemplate } from '../../types';
import BasicInfoForm from './EstablishmentFormSections/BasicInfoForm';
import OpeningHoursForm from './EstablishmentFormSections/OpeningHoursForm';
import ServicesForm from './EstablishmentFormSections/ServicesForm';
import PricingForm from './EstablishmentFormSections/PricingForm';
import { logger } from '../../utils/logger';

interface EstablishmentFormProps {
  onSubmit: (establishmentData: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: any;
}

const EstablishmentForm: React.FC<EstablishmentFormProps> = ({ onSubmit, onCancel, isLoading = false, initialData }) => {
  const { token } = useAuth();
  const { secureFetch } = useSecureFetch();
  const { refreshToken } = useCSRF();
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    address: initialData?.address || '',
    zone: initialData?.zone || '',
    category_id: initialData?.category_id || '',
    description: initialData?.description || '',
    phone: initialData?.phone || '',
    website: initialData?.website || '',
    logo_url: initialData?.logo_url || '',
    services: initialData?.services || [] as string[],
    opening_hours: {
      open: initialData?.opening_hours?.open || '14:00',
      close: initialData?.opening_hours?.close || '02:00'
    },
    pricing: {
      consumables: initialData?.pricing?.consumables || [] as Array<{ consumable_id: string; price: string }>,
      ladydrink: initialData?.ladydrink || initialData?.pricing?.ladydrink || '130',
      barfine: initialData?.barfine || initialData?.pricing?.barfine || '400',
      rooms: {
        available: initialData?.pricing?.rooms?.available || false,
        price: initialData?.rooms && initialData?.rooms !== 'N/A' ? initialData.rooms : (initialData?.pricing?.rooms?.price || '600')
      }
    }
  });

  const [categories, setCategories] = useState<EstablishmentCategory[]>([]);
  const [serviceInput, setServiceInput] = useState('');
  const [consumableTemplates, setConsumableTemplates] = useState<ConsumableTemplate[]>([]);
  const [selectedConsumable, setSelectedConsumable] = useState({ template_id: '', price: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Logo upload state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchConsumableTemplates();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/establishments/categories`);
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      logger.error('Error fetching categories:', error);
    }
  };

  const fetchConsumableTemplates = async () => {
    try {
      const mockTemplates: ConsumableTemplate[] = [
        { id: 'cons-001', name: 'Chang', category: 'beer', icon: '🍺', default_price: 70, status: 'active', created_by: 'user-001', created_at: '2024-01-01', updated_at: '2024-01-01' },
        { id: 'cons-002', name: 'Heineken', category: 'beer', icon: '🍺', default_price: 90, status: 'active', created_by: 'user-001', created_at: '2024-01-01', updated_at: '2024-01-01' },
        { id: 'cons-003', name: 'Tiger', category: 'beer', icon: '🍺', default_price: 80, status: 'active', created_by: 'user-001', created_at: '2024-01-01', updated_at: '2024-01-01' },
        { id: 'cons-004', name: 'Leo', category: 'beer', icon: '🍺', default_price: 65, status: 'active', created_by: 'user-001', created_at: '2024-01-01', updated_at: '2024-01-01' },
        { id: 'cons-005', name: 'Tequila Shot', category: 'shot', icon: '🥃', default_price: 150, status: 'active', created_by: 'user-001', created_at: '2024-01-01', updated_at: '2024-01-01' },
        { id: 'cons-006', name: 'Vodka Shot', category: 'shot', icon: '🥃', default_price: 140, status: 'active', created_by: 'user-001', created_at: '2024-01-01', updated_at: '2024-01-01' },
        { id: 'cons-007', name: 'Mojito', category: 'cocktail', icon: '🍹', default_price: 200, status: 'active', created_by: 'user-001', created_at: '2024-01-01', updated_at: '2024-01-01' },
        { id: 'cons-008', name: 'Cosmopolitan', category: 'cocktail', icon: '🍹', default_price: 220, status: 'active', created_by: 'user-001', created_at: '2024-01-01', updated_at: '2024-01-01' },
        { id: 'cons-009', name: 'Whisky', category: 'spirit', icon: '🥂', default_price: 180, status: 'active', created_by: 'user-001', created_at: '2024-01-01', updated_at: '2024-01-01' },
        { id: 'cons-010', name: 'Coca Cola', category: 'soft', icon: '🥤', default_price: 50, status: 'active', created_by: 'user-001', created_at: '2024-01-01', updated_at: '2024-01-01' }
      ];
      setConsumableTemplates(mockTemplates.filter(t => t.status === 'active'));
    } catch (error) {
      logger.error('Error fetching consumable templates:', error);
    }
  };

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

  const addService = () => {
    if (serviceInput.trim() && !formData.services.includes(serviceInput.trim())) {
      setFormData(prev => ({
        ...prev,
        services: [...prev.services, serviceInput.trim()]
      }));
      setServiceInput('');
    }
  };

  const removeService = (service: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.filter((s: string) => s !== service)
    }));
  };

  const addConsumable = () => {
    if (selectedConsumable.template_id && selectedConsumable.price) {
      const newConsumable = {
        consumable_id: selectedConsumable.template_id,
        price: selectedConsumable.price
      };

      const exists = formData.pricing.consumables.some((c: any) => c.consumable_id === newConsumable.consumable_id);
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
        consumables: prev.pricing.consumables.filter((_: any, i: number) => i !== index)
      }
    }));
  };

  const editConsumable = (index: number, newPrice: string) => {
    setFormData(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        consumables: prev.pricing.consumables.map((consumable: any, i: number) =>
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

      const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/upload/establishment-logo`, {
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
      setErrors(prev => ({ ...prev, logo_url: `Failed to upload logo: ${error instanceof Error ? error.message : 'Unknown error'}` }));
      return null;
    } finally {
      setUploadingLogo(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Nom requis';
    if (!formData.address.trim()) newErrors.address = 'Adresse requise';
    if (!formData.zone) newErrors.zone = 'Zone requise';
    if (!formData.category_id) newErrors.category_id = 'Catégorie requise';

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

      // Prepare final form data with uploaded logo URL
      const finalFormData = {
        ...formData,
        logo_url: logoUrl || formData.logo_url || ''
      };

      if (process.env.NODE_ENV === 'development') {
        logger.debug('🏢 Submitting establishment with final data:', finalFormData);
      }

      await onSubmit(finalFormData);
    } catch (error) {
      logger.error('Error submitting form:', error);
      setErrors(prev => ({ ...prev, submit: 'Failed to submit form' }));
    }
  };

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
    }}>
      <div className="modal-form-container">
        {/* Bouton fermeture */}
        <button
          onClick={onCancel}
          className="modal-close-button"
        >
          ✕
        </button>

        <div className="modal-header">
          <h2 className="header-title-nightlife">
            {initialData ? '✏️ Edit Establishment' : '🏮 Add New Establishment'}
          </h2>
          <p className="modal-subtitle">
            {initialData ? 'Modify establishment information' : 'Create a new establishment profile'}
          </p>
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
          <ServicesForm
            formData={formData}
            serviceInput={serviceInput}
            onServiceInputChange={setServiceInput}
            onAddService={addService}
            onRemoveService={removeService}
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
            className="btn-nightlife-base btn-secondary-nightlife"
          >
            ❌ Cancel
          </button>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-nightlife-base btn-primary-nightlife"
          >
            {isLoading ? (
              <span className="loading-flex">
                <span className="loading-spinner-small-nightlife"></span>
                ⏳ Submitting...
              </span>
            ) : (
              initialData ? '💾 Save Changes' : '✨ Add Establishment'
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