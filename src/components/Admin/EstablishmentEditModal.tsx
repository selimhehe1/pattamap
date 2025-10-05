import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { Establishment, EstablishmentCategory } from '../../types';
import { logger } from '../../utils/logger';

interface EstablishmentEditModalProps {
  establishment: Establishment;
  onClose: () => void;
  onUpdate: (updatedEstablishment: Establishment) => void;
}

const EstablishmentEditModal: React.FC<EstablishmentEditModalProps> = ({
  establishment,
  onClose,
  onUpdate
}) => {
  const { token } = useAuth();
  const { secureFetch } = useSecureFetch();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<EstablishmentCategory[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: establishment.name || '',
    description: establishment.description || '',
    address: establishment.address || '',
    phone: establishment.phone || '',
    website: establishment.website || '',
    category_id: establishment.category_id || '',
    logo_url: establishment.logo_url || '',
    opening_hours: establishment.opening_hours || {
      monday: '',
      tuesday: '',
      wednesday: '',
      thursday: '',
      friday: '',
      saturday: '',
      sunday: ''
    },
    pricing: establishment.pricing || {
      ladydrink: '',
      barfine: '',
      rooms: '',
      consumables: []
    },
    services: establishment.services || []
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [newService, setNewService] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/establishments/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      logger.error('Failed to load categories:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOpeningHoursChange = (day: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      opening_hours: {
        ...prev.opening_hours,
        [day]: value
      }
    }));
  };

  const handlePricingChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        [field]: value
      }
    }));
  };

  const handleAddService = () => {
    if (newService.trim() && !formData.services.includes(newService.trim())) {
      setFormData(prev => ({
        ...prev,
        services: [...prev.services, newService.trim()]
      }));
      setNewService('');
    }
  };

  const handleRemoveService = (service: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.filter(s => s !== service)
    }));
  };

  const handleLogoUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      // Upload logo to Cloudinary
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const uploadResponse = await secureFetch('/api/upload/establishment-logo', {
        method: 'POST',
        body: uploadFormData,
        headers: {} // Don't set Content-Type for FormData - let browser set multipart/form-data
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload logo');
      }

      const uploadResult = await uploadResponse.json();
      const logoUrl = uploadResult.logo.url;

      // Update form data
      setFormData(prev => ({
        ...prev,
        logo_url: logoUrl
      }));

      setLogoPreview(logoUrl);

    } catch (error) {
      logger.error('Logo upload error:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload logo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a PNG, JPG, or GIF image');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB');
      return;
    }

    setError(null);
    handleLogoUpload(file);
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Update establishment
      const response = await secureFetch(`/api/establishments/${establishment.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to update establishment');
      }

      const result = await response.json();

      // No need for separate PATCH request - logo_url is now included in PUT request

      // Create updated establishment object
      const updatedEstablishment: Establishment = {
        ...establishment,
        ...formData
      };

      onUpdate(updatedEstablishment);
      onClose();

    } catch (error) {
      logger.error('Save error:', error);
      setError(error instanceof Error ? error.message : 'Failed to save establishment');
    } finally {
      setIsLoading(false);
    }
  };

  const currentLogoUrl = logoPreview || formData.logo_url;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(15,15,15,0.95), rgba(30,30,30,0.95))',
        borderRadius: '20px',
        padding: '30px',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'auto',
        border: '2px solid rgba(255,27,141,0.3)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.8)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '25px'
        }}>
          <h2 style={{
            color: '#FF1B8D',
            fontSize: '24px',
            fontWeight: 'bold',
            margin: 0,
            textShadow: '0 0 10px rgba(255,27,141,0.5)'
          }}>
            ✏️ Edit {establishment.name}
          </h2>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '5px',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✖️
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            color: '#FF4757',
            fontSize: '14px',
            marginBottom: '20px',
            padding: '10px',
            background: 'rgba(255,71,87,0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(255,71,87,0.3)'
          }}>
            ❌ {error}
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginBottom: '25px'
        }}>
          {/* Left Column */}
          <div>
            {/* Logo Section */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                color: '#FFD700',
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '8px',
                display: 'block'
              }}>
                🏷️ Logo
              </label>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px'
              }}>
                {currentLogoUrl && (
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, white 45%, transparent 60%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <img
                      src={currentLogoUrl}
                      alt="Logo preview"
                      style={{
                        width: '70%',
                        height: '70%',
                        objectFit: 'contain',
                        borderRadius: '50%'
                      }}
                    />
                  </div>
                )}

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  style={{
                    padding: '8px 15px',
                    background: isLoading ? '#666' : 'linear-gradient(45deg, #FF1B8D, #00FFFF)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  {isLoading ? '⏳ Uploading...' : currentLogoUrl ? '🔄 Change' : '📷 Add Logo'}
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>

            {/* Basic Info */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                color: '#FFD700',
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '8px',
                display: 'block'
              }}>
                📝 Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,27,141,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                color: '#FFD700',
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '8px',
                display: 'block'
              }}>
                📍 Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,27,141,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                color: '#FFD700',
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '8px',
                display: 'block'
              }}>
                📞 Phone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,27,141,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                color: '#FFD700',
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '8px',
                display: 'block'
              }}>
                🌐 Website
              </label>
              <input
                type="text"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,27,141,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                color: '#FFD700',
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '8px',
                display: 'block'
              }}>
                🏷️ Category
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => handleInputChange('category_id', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,27,141,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: '14px'
                }}
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id} style={{ background: '#333' }}>
                    {category.icon} {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Column */}
          <div>
            {/* Description */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                color: '#FFD700',
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '8px',
                display: 'block'
              }}>
                📝 Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,27,141,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Pricing */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                color: '#FFD700',
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '8px',
                display: 'block'
              }}>
                💰 Pricing
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ color: '#ccc', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                    Lady Drink
                  </label>
                  <input
                    type="text"
                    value={formData.pricing.ladydrink}
                    onChange={(e) => handlePricingChange('ladydrink', e.target.value)}
                    placeholder="e.g., 150 THB"
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,27,141,0.3)',
                      background: 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ color: '#ccc', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                    Barfine
                  </label>
                  <input
                    type="text"
                    value={formData.pricing.barfine}
                    onChange={(e) => handlePricingChange('barfine', e.target.value)}
                    placeholder="e.g., 500 THB"
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,27,141,0.3)',
                      background: 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ color: '#ccc', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                    Rooms
                  </label>
                  <input
                    type="text"
                    value={formData.pricing.rooms}
                    onChange={(e) => handlePricingChange('rooms', e.target.value)}
                    placeholder="e.g., 1000-1500 THB"
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,27,141,0.3)',
                      background: 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Services */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                color: '#FFD700',
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '8px',
                display: 'block'
              }}>
                🛠️ Services
              </label>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  value={newService}
                  onChange={(e) => setNewService(e.target.value)}
                  placeholder="Add service..."
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,27,141,0.3)',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddService();
                    }
                  }}
                />
                <button
                  onClick={handleAddService}
                  style={{
                    padding: '8px 12px',
                    background: 'linear-gradient(45deg, #FF1B8D, #00FFFF)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  ➕
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {formData.services.map((service, index) => (
                  <span
                    key={index}
                    style={{
                      background: 'rgba(255,27,141,0.2)',
                      color: '#FF1B8D',
                      padding: '4px 8px',
                      borderRadius: '15px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    {service}
                    <button
                      onClick={() => handleRemoveService(service)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#FF1B8D',
                        cursor: 'pointer',
                        fontSize: '10px',
                        padding: 0
                      }}
                    >
                      ✖
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Opening Hours */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{
            color: '#FFD700',
            fontSize: '14px',
            fontWeight: 'bold',
            marginBottom: '12px',
            display: 'block'
          }}>
            ⏰ Opening Hours
          </label>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '10px'
          }}>
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
              <div key={day}>
                <label style={{
                  color: '#ccc',
                  fontSize: '12px',
                  display: 'block',
                  marginBottom: '4px',
                  textTransform: 'capitalize'
                }}>
                  {day}
                </label>
                <input
                  type="text"
                  value={formData.opening_hours[day] || ''}
                  onChange={(e) => handleOpeningHoursChange(day, e.target.value)}
                  placeholder="e.g., 18:00-02:00"
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,27,141,0.3)',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '15px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 25px',
              background: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            ❌ Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={isLoading}
            style={{
              padding: '12px 25px',
              background: isLoading ? '#666' : 'linear-gradient(45deg, #FF1B8D, #00FFFF)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              boxShadow: '0 4px 12px rgba(255,27,141,0.3)'
            }}
          >
            {isLoading ? '⏳ Saving...' : '💾 Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EstablishmentEditModal;