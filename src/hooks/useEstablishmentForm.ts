/**
 * 📋 useEstablishmentForm - Hook pour gérer les formulaires d'établissement
 *
 * Centralise la logique commune entre:
 * - EstablishmentEditModal (Forms)
 * - OwnerEstablishmentEditModal (Owner)
 *
 * Gère:
 * - État du formulaire
 * - Handlers de changement
 * - Fetch des catégories et consumables
 * - Upload du logo
 * - Validation
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSecureFetch } from './useSecureFetch';
import { Establishment, EstablishmentCategory, ConsumableTemplate } from '../types';
import { logger } from '../utils/logger';

/**
 * Structure interne pour les données de rooms
 */
interface RoomsData {
  available: boolean;
  price: string;
}

/**
 * Structure des données de pricing
 */
interface PricingData {
  consumables: Array<{ consumable_id: string; price: string }>;
  ladydrink: string;
  barfine: string;
  rooms: RoomsData;
}

/**
 * Structure complète du formulaire
 */
export interface EstablishmentFormData {
  name: string;
  address: string;
  zone: string;
  category_id: string;
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
  pricing: PricingData;
}

/**
 * Options de configuration du hook
 */
interface UseEstablishmentFormOptions {
  initialData?: Partial<Establishment>;
  onDataLoaded?: () => void;
}

/**
 * Parse category_id from various formats to string number
 * 'cat-001' → '1', 1 → '1', '1' → '1'
 */
const parseCategoryId = (catId: string | number | undefined): string => {
  if (!catId) return '';
  if (typeof catId === 'number') return catId.toString();

  const match = String(catId).match(/cat-(\d+)/);
  if (match) {
    return parseInt(match[1], 10).toString();
  }

  return String(catId);
};

/**
 * Crée les données de formulaire initiales à partir des données de l'établissement
 */
const createInitialFormData = (data?: Partial<Establishment>): EstablishmentFormData => {
  return {
    name: data?.name || '',
    address: data?.address || '',
    zone: data?.zone || '',
    category_id: parseCategoryId(data?.category_id),
    description: data?.description || '',
    phone: data?.phone || '',
    website: data?.website || '',
    logo_url: data?.logo_url || '',
    instagram: data?.instagram || '',
    twitter: data?.twitter || '',
    tiktok: data?.tiktok || '',
    opening_hours: {
      open: data?.opening_hours?.open || '14:00',
      close: data?.opening_hours?.close || '02:00'
    },
    pricing: {
      consumables: data?.pricing?.consumables || [],
      ladydrink: data?.ladydrink || data?.pricing?.ladydrink || '130',
      barfine: data?.barfine || data?.pricing?.barfine || '400',
      rooms: {
        available: data?.rooms ? (data.rooms !== 'N/A') : false,
        price: (data?.rooms && data?.rooms !== 'N/A') ? data.rooms : '600'
      }
    }
  };
};

/**
 * Hook principal pour gérer les formulaires d'établissement
 */
export function useEstablishmentForm(options: UseEstablishmentFormOptions = {}) {
  const { initialData, onDataLoaded } = options;
  const { secureFetch } = useSecureFetch();
  const dataLoadedRef = useRef(false);

  // Form state
  const [formData, setFormData] = useState<EstablishmentFormData>(() =>
    createInitialFormData(initialData)
  );

  // Reference data
  const [categories, setCategories] = useState<EstablishmentCategory[]>([]);
  const [consumableTemplates, setConsumableTemplates] = useState<ConsumableTemplate[]>([]);
  const [selectedConsumable, setSelectedConsumable] = useState({ template_id: '', price: '' });

  // Form state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load reference data
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
        setConsumableTemplates(templates.filter((t: ConsumableTemplate) => t.status === 'active'));
      } catch (error) {
        logger.error('Error fetching consumable templates:', error);
      }
    };

    fetchCategories();
    fetchConsumableTemplates();
  }, [secureFetch]);

  // Update form data when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData && !dataLoadedRef.current) {
      setFormData(createInitialFormData(initialData));
      dataLoadedRef.current = true;
      onDataLoaded?.();
    }
  }, [initialData, onDataLoaded]);

  /**
   * Generic input change handler
   * Handles nested paths like 'opening_hours.open', 'pricing.rooms.price'
   */
  const handleInputChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
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

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [errors]);

  /**
   * Direct field update (for programmatic changes)
   */
  const setField = useCallback(<K extends keyof EstablishmentFormData>(
    field: K,
    value: EstablishmentFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  /**
   * Add consumable to pricing
   */
  const addConsumable = useCallback((consumable: { consumable_id: string; price: string }) => {
    if (!consumable.consumable_id || !consumable.price) return;

    setFormData(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        consumables: [
          ...prev.pricing.consumables.filter(c => c.consumable_id !== consumable.consumable_id),
          consumable
        ]
      }
    }));
    setSelectedConsumable({ template_id: '', price: '' });
  }, []);

  /**
   * Remove consumable from pricing
   */
  const removeConsumable = useCallback((consumableId: string) => {
    setFormData(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        consumables: prev.pricing.consumables.filter(c => c.consumable_id !== consumableId)
      }
    }));
  }, []);

  /**
   * Upload logo file
   */
  const uploadLogo = useCallback(async (file: File): Promise<string | null> => {
    setUploadingLogo(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await secureFetch(`${import.meta.env.VITE_API_URL}/api/upload/establishment-logo`, {
        method: 'POST',
        body: uploadFormData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload logo');
      }

      const result = await response.json();
      const logoUrl = result.url || result.secure_url;

      setFormData(prev => ({ ...prev, logo_url: logoUrl }));
      setLogoFile(null);
      return logoUrl;
    } catch (error) {
      logger.error('Error uploading logo:', error);
      return null;
    } finally {
      setUploadingLogo(false);
    }
  }, [secureFetch]);

  /**
   * Validate form data
   */
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.zone) {
      newErrors.zone = 'Zone is required';
    }
    if (!formData.category_id) {
      newErrors.category_id = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  /**
   * Reset form to initial state
   */
  const reset = useCallback(() => {
    setFormData(createInitialFormData(initialData));
    setErrors({});
    setLogoFile(null);
    dataLoadedRef.current = false;
  }, [initialData]);

  /**
   * Get form data ready for API submission
   */
  const getSubmitData = useCallback((): Record<string, unknown> => {
    return {
      name: formData.name,
      address: formData.address,
      zone: formData.zone,
      category_id: formData.category_id,
      description: formData.description,
      phone: formData.phone,
      website: formData.website,
      logo_url: formData.logo_url,
      instagram: formData.instagram,
      twitter: formData.twitter,
      tiktok: formData.tiktok,
      opening_hours: formData.opening_hours,
      pricing: {
        ...formData.pricing,
        rooms: formData.pricing.rooms.available ? formData.pricing.rooms.price : 'N/A'
      }
    };
  }, [formData]);

  return {
    // Form data
    formData,
    setFormData,
    setField,

    // Reference data
    categories,
    consumableTemplates,
    selectedConsumable,
    setSelectedConsumable,

    // Handlers
    handleInputChange,
    addConsumable,
    removeConsumable,

    // Logo
    logoFile,
    setLogoFile,
    uploadLogo,
    uploadingLogo,

    // Validation
    errors,
    setErrors,
    validate,

    // State
    isSubmitting,
    setIsSubmitting,

    // Utilities
    reset,
    getSubmitData,
  };
}

export default useEstablishmentForm;
