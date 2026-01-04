/**
 * Step1EstablishmentSelect Component
 *
 * First step of the ownership request wizard.
 * Allows users to search for an existing establishment or create a new one.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Building2, Plus, Camera, X } from 'lucide-react';
import EstablishmentAutocomplete from '../../Common/EstablishmentAutocomplete';
import type { Step1Props, NewEstablishmentData } from './types';

const Step1EstablishmentSelect: React.FC<Step1Props> = ({
  establishments,
  selectedEstablishment,
  createMode,
  categories,
  newEstablishment,
  onEstablishmentSelect,
  onCreateModeChange,
  onNewEstablishmentChange
}) => {
  const { t } = useTranslation();

  const handleFieldChange = (field: keyof NewEstablishmentData, value: string | number) => {
    onNewEstablishmentChange({ ...newEstablishment, [field]: value });
  };

  return (
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

      {/* Search mode */}
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
                onChange={(establishment) => onEstablishmentSelect(establishment)}
                placeholder={t('ownership.searchPlaceholder', 'Search establishment by name...')}
                disabled={false}
                excludeWithOwner={true}
              />
            </div>
          </div>

          {/* Toggle to create mode */}
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button
              type="button"
              onClick={() => onCreateModeChange(true)}
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
              onClick={() => onCreateModeChange(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#C19A6B',
                cursor: 'pointer',
                fontSize: '14px',
                textDecoration: 'underline'
              }}
            >
              {t('ownership.backToSearch', 'Back to search')}
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
              onChange={(e) => handleFieldChange('name', e.target.value)}
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
              onChange={(e) => handleFieldChange('address', e.target.value)}
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
                onChange={(e) => handleFieldChange('category_id', e.target.value)}
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
                onChange={(e) => handleFieldChange('zone', e.target.value)}
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
                onChange={(e) => handleFieldChange('latitude', parseFloat(e.target.value) || 0)}
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
                onChange={(e) => handleFieldChange('longitude', parseFloat(e.target.value) || 0)}
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
              onChange={(e) => handleFieldChange('description', e.target.value)}
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
                onChange={(e) => handleFieldChange('phone', e.target.value)}
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
                onChange={(e) => handleFieldChange('website', e.target.value)}
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
                onChange={(e) => handleFieldChange('instagram', e.target.value)}
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
                onChange={(e) => handleFieldChange('twitter', e.target.value)}
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
  );
};

export default Step1EstablishmentSelect;
