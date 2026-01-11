import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Building2, Store, MapPin, Crown, BookOpen, Phone, Globe,
  Users, AlertTriangle, Loader2, Sparkles, CheckSquare
} from 'lucide-react';
import FormField from '../../Common/FormField';
import { EstablishmentCategory } from '../../../types';
import { ZONE_OPTIONS } from '../../../utils/constants';

interface OwnerCreateStepProps {
  // Establishment data
  name: string;
  address: string;
  zone: string;
  categoryId: number | null;
  description: string;
  phone: string;
  website: string;
  instagram: string;
  twitter: string;
  tiktok: string;
  onFieldChange: (field: string, value: unknown) => void;

  // Categories
  categories: EstablishmentCategory[];

  // Terms acceptance
  acceptedTerms: boolean;
  onAcceptedTermsChange: (accepted: boolean) => void;

  // State
  isLoading: boolean;
  submitError: string;

  // Navigation
  onPrevious: () => void;
}

/**
 * OwnerCreateStep - Step 4 for Owner Create path
 *
 * Form for creating a new establishment including:
 * - Basic info (name, address, zone, category)
 * - Contact info (phone, website)
 * - Social media links
 */
const OwnerCreateStep: React.FC<OwnerCreateStepProps> = ({
  name,
  address,
  zone,
  categoryId,
  description,
  phone,
  website,
  instagram,
  twitter,
  tiktok,
  onFieldChange,
  categories,
  acceptedTerms,
  onAcceptedTermsChange,
  isLoading,
  submitError,
  onPrevious,
}) => {
  const { t } = useTranslation();

  const isFormValid = name.trim() && address.trim() && zone && categoryId && acceptedTerms;

  return (
    <div style={{
      maxHeight: '500px',
      overflowY: 'auto',
      overflowX: 'hidden',
      marginBottom: '20px',
      paddingRight: '8px'
    }}>
      <h3 style={{
        color: '#C19A6B',
        fontSize: '16px',
        fontWeight: '600',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <Building2 size={18} /> {t('register.createEstablishmentTitle')}
      </h3>

      {/* Establishment Name */}
      <FormField
        label={<><Store size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.establishmentName')}</>}
        name="newEstablishmentName"
        value={name}
        onChange={(e) => onFieldChange('newEstablishmentName', e.target.value)}
        placeholder={t('register.establishmentNamePlaceholder')}
        required
        maxLength={100}
      />

      {/* Establishment Address */}
      <FormField
        label={<><MapPin size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.establishmentAddress')}</>}
        name="newEstablishmentAddress"
        value={address}
        onChange={(e) => onFieldChange('newEstablishmentAddress', e.target.value)}
        placeholder={t('register.establishmentAddressPlaceholder')}
        required
      />

      {/* Zone Selection */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          color: '#C19A6B',
          fontSize: '14px',
          fontWeight: 'bold',
          marginBottom: '8px'
        }}>
          <MapPin size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('register.establishmentZone')} *
        </label>
        <select
          value={zone}
          onChange={(e) => onFieldChange('newEstablishmentZone', e.target.value)}
          className="input-nightlife"
          style={{ width: '100%', cursor: 'pointer' }}
        >
          <option value="">{t('register.selectZone')}</option>
          {ZONE_OPTIONS.filter(z => z.value !== 'freelance').map(zoneOption => (
            <option key={zoneOption.value} value={zoneOption.value}>{zoneOption.label}</option>
          ))}
        </select>
      </div>

      {/* Category Selection */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          color: '#C19A6B',
          fontSize: '14px',
          fontWeight: 'bold',
          marginBottom: '8px'
        }}>
          <Crown size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('register.establishmentCategory')} *
        </label>
        <select
          value={categoryId || ''}
          onChange={(e) => onFieldChange('newEstablishmentCategoryId', e.target.value ? Number(e.target.value) : null)}
          className="input-nightlife"
          style={{ width: '100%', cursor: 'pointer' }}
        >
          <option value="">{t('register.selectCategory')}</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Description (Optional) */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          color: '#C19A6B',
          fontSize: '14px',
          fontWeight: 'bold',
          marginBottom: '8px'
        }}>
          <BookOpen size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('register.establishmentDescription')}
          <span style={{ color: '#999999', fontWeight: 'normal', marginLeft: '8px' }}>
            ({t('register.optional')})
          </span>
        </label>
        <textarea
          value={description}
          onChange={(e) => onFieldChange('newEstablishmentDescription', e.target.value)}
          placeholder={t('register.establishmentDescriptionPlaceholder')}
          rows={3}
          className="input-nightlife"
          style={{ resize: 'vertical', minHeight: '80px' }}
        />
      </div>

      {/* Phone (Optional) */}
      <FormField
        label={<><Phone size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.establishmentPhone')} <span style={{ color: '#999999', fontWeight: 'normal' }}>({t('register.optional')})</span></>}
        name="newEstablishmentPhone"
        value={phone}
        onChange={(e) => onFieldChange('newEstablishmentPhone', e.target.value)}
        placeholder={t('register.establishmentPhonePlaceholder')}
      />

      {/* Website (Optional) */}
      <FormField
        label={<><Globe size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.establishmentWebsite')} <span style={{ color: '#999999', fontWeight: 'normal' }}>({t('register.optional')})</span></>}
        name="newEstablishmentWebsite"
        value={website}
        onChange={(e) => onFieldChange('newEstablishmentWebsite', e.target.value)}
        placeholder="https://..."
      />

      {/* Social Media Section */}
      <div style={{
        marginTop: '20px',
        padding: '16px',
        background: 'rgba(193,154,107,0.05)',
        borderRadius: '12px',
        border: '1px solid rgba(193,154,107,0.2)'
      }}>
        <h4 style={{ color: '#C19A6B', fontSize: '14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Users size={14} /> {t('register.socialMediaOptional')}
        </h4>
        <div style={{ display: 'grid', gap: '12px' }}>
          <FormField
            label="Instagram"
            name="newEstablishmentInstagram"
            value={instagram}
            onChange={(e) => onFieldChange('newEstablishmentInstagram', e.target.value)}
            placeholder="@username"
          />
          <FormField
            label="Twitter/X"
            name="newEstablishmentTwitter"
            value={twitter}
            onChange={(e) => onFieldChange('newEstablishmentTwitter', e.target.value)}
            placeholder="@username"
          />
          <FormField
            label="TikTok"
            name="newEstablishmentTiktok"
            value={tiktok}
            onChange={(e) => onFieldChange('newEstablishmentTiktok', e.target.value)}
            placeholder="@username"
          />
        </div>
      </div>

      {/* Terms Acceptance Checkbox - GDPR/PDPA Compliance */}
      <div style={{
        marginTop: '20px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '16px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '12px',
        border: `1px solid ${!acceptedTerms && submitError ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255,255,255,0.1)'}`
      }}>
        <input
          type="checkbox"
          id="acceptedTermsOwner"
          checked={acceptedTerms}
          onChange={(e) => onAcceptedTermsChange(e.target.checked)}
          style={{
            width: '20px',
            height: '20px',
            marginTop: '2px',
            accentColor: '#10b981',
            cursor: 'pointer',
            flexShrink: 0
          }}
          required
        />
        <label
          htmlFor="acceptedTermsOwner"
          style={{
            color: 'rgba(248, 250, 252, 0.9)',
            fontSize: '14px',
            lineHeight: '1.5',
            cursor: 'pointer'
          }}
        >
          <CheckSquare size={14} style={{ marginRight: '6px', verticalAlign: 'middle', color: '#10b981' }} />
          {t('register.acceptTerms', 'I accept the')}{' '}
          <Link to="/privacy-policy" target="_blank" style={{ color: '#E879F9', textDecoration: 'none' }}>
            {t('register.privacyPolicy', 'Privacy Policy')}
          </Link>
          {' '}{t('register.and', 'and')}{' '}
          <Link to="/terms" target="_blank" style={{ color: '#E879F9', textDecoration: 'none' }}>
            {t('register.termsOfService', 'Terms of Service')}
          </Link>
          {' *'}
        </label>
      </div>

      {submitError && (
        <div className="error-message-nightlife error-shake" style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertTriangle size={16} /> {submitError}
        </div>
      )}

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
        <button
          type="button"
          onClick={onPrevious}
          className="btn btn--secondary"
          style={{ flex: 1 }}
        >
          {t('register.previousButton')}
        </button>
        <button
          type="submit"
          disabled={!isFormValid || isLoading}
          className="btn btn--success"
          style={{ flex: 2 }}
        >
          {isLoading ? (
            <><Loader2 size={16} className="spin" style={{ marginRight: '8px' }} /> {t('register.submittingButton')}</>
          ) : (
            <><Sparkles size={16} style={{ marginRight: '8px' }} /> {t('register.createAccountAndEstablishment')}</>
          )}
        </button>
      </div>
    </div>
  );
};

export default OwnerCreateStep;
