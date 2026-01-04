import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  User, UserCog, Users, Cake, Globe, FileText, PersonStanding,
  Store, MapPin, CheckCircle, Lightbulb, Camera, BookOpen,
  MessageSquare, Send, Phone, AlertTriangle, Upload, Loader2, Sparkles
} from 'lucide-react';
import { Establishment } from '../../../types';
import { PhotoUploadGrid, EstablishmentAutocomplete } from '../components';
import NationalityTagsInput from '../../Forms/NationalityTagsInput';

interface SocialMediaData {
  ig: string;
  fb: string;
  line: string;
  tg: string;
  wa: string;
}

interface EmployeeCreateStepProps {
  // Photos
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
  photoErrors: string;
  onPhotoError: (error: string) => void;

  // Basic Info
  employeeName: string;
  employeeNickname: string;
  employeeSex: string;
  employeeAge: string;
  employeeNationality: string[] | null;
  employeeDescription: string;
  onFieldChange: (field: string, value: unknown) => void;

  // Employment
  isFreelance: boolean;
  freelanceNightclubIds: string[];
  nightclubs: Establishment[];
  establishmentId: string;
  establishmentSearch: string;
  onEstablishmentSearchChange: (value: string) => void;
  onEstablishmentSelect: (est: Establishment) => void;
  onEstablishmentClear: () => void;
  establishments: Establishment[];

  // Social Media
  socialMedia: SocialMediaData;

  // State
  isLoading: boolean;
  uploadingPhotos: boolean;
  submitError: string;

  // Navigation
  onPrevious: () => void;
}

/**
 * EmployeeCreateStep - Step 4 for Employee Create path
 *
 * Complete profile form including:
 * - Photos upload
 * - Basic info (name, nickname, sex, age, nationality, description)
 * - Employment mode (freelance vs establishment)
 * - Social media links
 */
const EmployeeCreateStep: React.FC<EmployeeCreateStepProps> = ({
  photos,
  onPhotosChange,
  photoErrors,
  onPhotoError,
  employeeName,
  employeeNickname,
  employeeSex,
  employeeAge,
  employeeNationality,
  employeeDescription,
  onFieldChange,
  isFreelance,
  freelanceNightclubIds,
  nightclubs,
  establishmentId,
  establishmentSearch,
  onEstablishmentSearchChange,
  onEstablishmentSelect,
  onEstablishmentClear,
  establishments,
  socialMedia,
  isLoading,
  uploadingPhotos,
  submitError,
  onPrevious,
}) => {
  const { t } = useTranslation();

  const sexOptions = [
    { value: 'female', label: t('employee.sex.female', 'Female'), icon: '♀' },
    { value: 'male', label: t('employee.sex.male', 'Male'), icon: '♂' },
    { value: 'ladyboy', label: t('employee.sex.ladyboy', 'Ladyboy'), icon: '⚧' }
  ];

  return (
    <div style={{
      maxHeight: '500px',
      overflowY: 'auto',
      overflowX: 'hidden',
      marginBottom: '20px',
      paddingRight: '8px'
    }}>
      {/* Photos Section */}
      <div className="form-section" style={{ marginBottom: '30px' }}>
        <h3 style={{
          color: '#00E5FF',
          fontSize: '16px',
          fontWeight: '600',
          marginBottom: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {t('register.photosSection')}
        </h3>

        <PhotoUploadGrid
          photos={photos}
          onChange={onPhotosChange}
          error={photoErrors}
          onError={onPhotoError}
          maxPhotos={5}
          accentColor="#00E5FF"
        />
      </div>

      {/* Basic Info Section */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{
          color: '#C19A6B',
          fontSize: '16px',
          fontWeight: '600',
          marginBottom: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {t('register.basicInfoSection')}
        </h3>

        {/* Name */}
        <div className="form-input-group">
          <label className="label-nightlife">
            <User size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            {t('register.nameLabel')} *
          </label>
          <input
            type="text"
            value={employeeName}
            onChange={(e) => onFieldChange('employeeName', e.target.value)}
            className="input-nightlife"
            placeholder={t('register.namePlaceholder')}
            required
          />
        </div>

        {/* Nickname */}
        <div className="form-input-group-lg">
          <label className="label-nightlife">
            <UserCog size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            {t('register.nicknameLabel')}
          </label>
          <input
            type="text"
            value={employeeNickname}
            onChange={(e) => onFieldChange('employeeNickname', e.target.value)}
            className="input-nightlife"
            placeholder={t('register.nicknamePlaceholder')}
          />
        </div>

        {/* Sex/Gender Field */}
        <div className="form-input-group-lg">
          <label className="label-nightlife">
            <Users size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            {t('employee.sex.label', 'Sex')} *
          </label>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {sexOptions.map(option => (
              <label
                key={option.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: employeeSex === option.value ? '2px solid #ec4899' : '2px solid rgba(255,255,255,0.2)',
                  background: employeeSex === option.value ? 'rgba(236, 72, 153, 0.15)' : 'rgba(0,0,0,0.3)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <input
                  type="radio"
                  name="employeeSex"
                  value={option.value}
                  checked={employeeSex === option.value}
                  onChange={(e) => onFieldChange('employeeSex', e.target.value)}
                  style={{ display: 'none' }}
                />
                <span style={{ fontSize: '18px' }}>{option.icon}</span>
                <span style={{ color: '#fff' }}>{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Age & Nationality */}
        <div className="form-row-2-cols">
          <div>
            <label className="label-nightlife">
              <Cake size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              {t('register.ageLabel')}
            </label>
            <input
              type="number"
              value={employeeAge}
              onChange={(e) => onFieldChange('employeeAge', e.target.value)}
              className="input-nightlife"
              min="18"
              max="80"
              placeholder={t('register.agePlaceholder')}
            />
          </div>
          <div>
            <label className="label-nightlife">
              <Globe size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              {t('register.nationalityLabel')}
            </label>
            <NationalityTagsInput
              value={employeeNationality}
              onChange={(nationalities) => onFieldChange('employeeNationality', nationalities)}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Description */}
        <div className="form-input-group">
          <label className="label-nightlife">
            <FileText size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            {t('register.descriptionLabel')}
          </label>
          <textarea
            value={employeeDescription}
            onChange={(e) => onFieldChange('employeeDescription', e.target.value)}
            className="textarea-nightlife"
            rows={4}
            placeholder={t('register.descriptionPlaceholder')}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(0,0,0,0.4)',
              border: '2px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              color: '#ffffff',
              fontSize: '14px',
              resize: 'vertical'
            }}
          />
        </div>
      </div>

      {/* Employment Mode Section */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{
          color: '#9D4EDD',
          fontSize: '16px',
          fontWeight: '600',
          marginBottom: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {t('register.employmentModeSection')}
        </h3>

        {/* Freelance Mode Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          padding: '15px',
          background: 'rgba(157, 78, 221, 0.1)',
          border: '2px solid rgba(157, 78, 221, 0.3)',
          borderRadius: '12px',
          marginBottom: '20px'
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            color: 'white',
            fontSize: '15px',
            fontWeight: '500'
          }}>
            <input
              type="checkbox"
              checked={isFreelance}
              onChange={(e) => {
                onFieldChange('isFreelance', e.target.checked);
                if (e.target.checked) {
                  onFieldChange('establishmentId', '');
                }
              }}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <span>
              <PersonStanding size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              {t('register.freelanceMode')}
            </span>
          </label>
          {isFreelance && (
            <span style={{
              background: 'linear-gradient(45deg, #9D4EDD, #C77DFF)',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {t('register.freelanceModeActive')}
            </span>
          )}
        </div>

        {/* Freelance Nightclub Multi-Select */}
        {isFreelance && (
          <div style={{ marginBottom: '20px' }}>
            <label className="label-nightlife">
              <Store size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              {t('register.selectNightclubs', 'Select Nightclubs (Optional)')}
            </label>

            <div style={{
              marginBottom: '15px',
              padding: '12px',
              background: 'rgba(157, 78, 221, 0.15)',
              borderRadius: '8px',
              fontSize: '13px',
              color: 'rgba(255,255,255,0.8)'
            }}>
              <Lightbulb size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              {t('register.freelanceNightclubNote', 'As a freelance, you can work at multiple nightclubs simultaneously, or leave empty to be listed as a free freelance.')}
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              maxHeight: '200px',
              overflowY: 'auto',
              padding: '10px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px'
            }}>
              {nightclubs.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', margin: '10px 0' }}>
                  {t('register.noNightclubsAvailable', 'No nightclubs available')}
                </p>
              ) : (
                nightclubs.map(nightclub => (
                  <label
                    key={nightclub.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: freelanceNightclubIds.includes(nightclub.id)
                        ? 'rgba(157, 78, 221, 0.2)'
                        : 'transparent',
                      border: freelanceNightclubIds.includes(nightclub.id)
                        ? '1px solid rgba(157, 78, 221, 0.5)'
                        : '1px solid transparent',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={freelanceNightclubIds.includes(nightclub.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onFieldChange('freelanceNightclubIds', [...freelanceNightclubIds, nightclub.id]);
                        } else {
                          onFieldChange('freelanceNightclubIds', freelanceNightclubIds.filter(id => id !== nightclub.id));
                        }
                      }}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ color: '#fff', flex: 1 }}>{nightclub.name}</span>
                    {nightclub.zone && (
                      <span style={{ color: '#9D4EDD', fontSize: '12px' }}>
                        <MapPin size={12} style={{ marginRight: '2px', verticalAlign: 'middle' }} />
                        {nightclub.zone}
                      </span>
                    )}
                  </label>
                ))
              )}
            </div>

            {freelanceNightclubIds.length > 0 && (
              <div style={{ marginTop: '10px', color: '#9D4EDD', fontSize: '13px' }}>
                <CheckCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                {freelanceNightclubIds.length} {t('register.nightclubsSelected', 'nightclub(s) selected')}
              </div>
            )}
          </div>
        )}

        {/* Establishment Selector - Required for non-freelance */}
        {!isFreelance && (
          <div style={{ marginBottom: '20px' }}>
            <label className="label-nightlife">
              <Store size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              {t('register.currentEstablishmentRequired', 'Current Establishment')} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <EstablishmentAutocomplete
              value={establishmentSearch}
              onChange={onEstablishmentSearchChange}
              onSelect={onEstablishmentSelect}
              onClear={onEstablishmentClear}
              establishments={establishments}
              labelColor="#9D4EDD"
              showCategory={true}
              selectedId={establishmentId}
            />
          </div>
        )}
      </div>

      {/* Social Media Section */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{
          color: '#00E5FF',
          fontSize: '16px',
          fontWeight: '600',
          marginBottom: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {t('register.socialMediaSection')}
        </h3>

        <div style={{
          marginBottom: '20px',
          padding: '12px',
          background: 'rgba(0,229,255,0.1)',
          borderRadius: '8px',
          fontSize: '13px',
          color: 'rgba(255,255,255,0.8)'
        }}>
          <Lightbulb size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
          {t('register.socialMediaNote')}
        </div>

        <div className="social-media-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px'
        }}>
          <div>
            <label className="label-nightlife">
              <Camera size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              {t('register.instagramLabel')}
            </label>
            <input
              type="text"
              value={socialMedia.ig}
              onChange={(e) => onFieldChange('socialMedia', { ...socialMedia, ig: e.target.value })}
              className="input-nightlife"
              placeholder={t('register.instagramPlaceholder')}
            />
          </div>

          <div>
            <label className="label-nightlife">
              <BookOpen size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              {t('register.facebookLabel')}
            </label>
            <input
              type="text"
              value={socialMedia.fb}
              onChange={(e) => onFieldChange('socialMedia', { ...socialMedia, fb: e.target.value })}
              className="input-nightlife"
              placeholder={t('register.facebookPlaceholder')}
            />
          </div>

          <div>
            <label className="label-nightlife">
              <MessageSquare size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              {t('register.lineLabel')}
            </label>
            <input
              type="text"
              value={socialMedia.line}
              onChange={(e) => onFieldChange('socialMedia', { ...socialMedia, line: e.target.value })}
              className="input-nightlife"
              placeholder={t('register.linePlaceholder')}
            />
          </div>

          <div>
            <label className="label-nightlife" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Send size={14} /> {t('register.telegramLabel')}
            </label>
            <input
              type="text"
              value={socialMedia.tg}
              onChange={(e) => onFieldChange('socialMedia', { ...socialMedia, tg: e.target.value })}
              className="input-nightlife"
              placeholder={t('register.telegramPlaceholder')}
            />
          </div>

          <div>
            <label className="label-nightlife" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={14} /> {t('register.whatsappLabel')}
            </label>
            <input
              type="text"
              value={socialMedia.wa}
              onChange={(e) => onFieldChange('socialMedia', { ...socialMedia, wa: e.target.value })}
              className="input-nightlife"
              placeholder={t('register.whatsappPlaceholder')}
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {submitError && (
        <div className="error-message-nightlife error-shake" style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertTriangle size={16} /> {submitError}
        </div>
      )}

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
        <button
          type="button"
          onClick={onPrevious}
          className="btn btn--secondary"
          style={{ flex: 1 }}
        >
          ← {t('register.backButton')}
        </button>
        <button
          type="submit"
          disabled={isLoading || uploadingPhotos}
          className={`btn btn--success ${isLoading ? 'btn--loading' : ''}`}
          style={{ flex: 2 }}
        >
          {uploadingPhotos ? (
            <span className="loading-flex">
              <span className="loading-spinner-small-nightlife"></span>
              <Upload size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              {t('register.uploadingPhotos')}
            </span>
          ) : isLoading ? (
            <span className="loading-flex">
              <span className="loading-spinner-small-nightlife"></span>
              <Loader2 size={16} style={{ marginRight: '4px', verticalAlign: 'middle', animation: 'spin 1s linear infinite' }} />
              {t('register.creatingProfile')}
            </span>
          ) : (
            <>
              <Sparkles size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              {t('register.createAccount')}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default EmployeeCreateStep;
