/**
 * BarInfoSidebar - Premium Neo-Nightlife Design
 *
 * Three glassmorphism sections:
 * 1. PRICING - Service cards (Lady Drink/Barfine) + Drinks menu
 * 2. LOCATION - Map preview + Contact buttons
 * 3. TRUST SCORE - Radial SVG gauge + Stats grid
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaInstagram, FaTiktok } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import {
  Sparkles,
  Music,
  Ticket,
  Home,
  Beer,
  Wine,
  Plus,
  MapPin,
  Phone,
  Map,
  Navigation,
  Shield,
  CheckCircle,
  Users,
  Unlock,
  Trophy,
  Star,
  ThumbsUp,
  AlertTriangle,
  Info,
  GlassWater,
  Martini
} from 'lucide-react';
import { Establishment, ConsumableTemplate, Employee } from '../../types';
import { logger } from '../../utils/logger';
import toast from '../../utils/toast';
import { getZoneLabel } from '../../utils/constants';
import '../../styles/components/establishment-ui.css';
import '../../styles/components/sidebar-establishment.css';

interface BarInfoSidebarProps {
  bar: Establishment;
  employees?: Employee[];
  isEditMode?: boolean;
  editedBar?: Establishment | null;
  onUpdateField?: (field: string, value: string | number | boolean | string[] | Establishment['pricing']) => void;
}

const BarInfoSidebar: React.FC<BarInfoSidebarProps> = ({
  bar,
  employees = [],
  isEditMode = false,
  editedBar = null,
  onUpdateField
}) => {
  const { t } = useTranslation();

  const [consumableTemplates, setConsumableTemplates] = useState<Record<string, ConsumableTemplate[]>>({});
  const [templatesById, setTemplatesById] = useState<Record<string, ConsumableTemplate>>({});
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templatesError, setTemplatesError] = useState<string>('');

  // Load consumable templates
  useEffect(() => {
    const loadConsumableTemplates = async () => {
      try {
        setLoadingTemplates(true);
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/consumables`);

        if (response.ok) {
          const data = await response.json();
          setConsumableTemplates(data.templates);

          const byId: Record<string, ConsumableTemplate> = {};
          Object.values(data.templates as Record<string, ConsumableTemplate[]>).forEach((categoryTemplates) => {
            categoryTemplates.forEach(template => {
              byId[template.id] = template;
            });
          });
          setTemplatesById(byId);
        } else {
          const errorMsg = t('barInfoSidebar.errors.loadingTemplates', { status: response.status });
          logger.error('❌', errorMsg);
          setTemplatesError(errorMsg);
        }
      } catch (error) {
        const errorMsg = t('barInfoSidebar.errors.networkError');
        logger.error(errorMsg, error);
        setTemplatesError(errorMsg);
      } finally {
        setLoadingTemplates(false);
      }
    };

    loadConsumableTemplates();
  }, [t]);

  // Get current pricing
  const getCurrentPricing = () => {
    const currentBar = editedBar || bar;
    return {
      consumables: currentBar.pricing?.consumables || [],
      ladydrink: currentBar.ladydrink || currentBar.pricing?.ladydrink || '130',
      barfine: currentBar.barfine || currentBar.pricing?.barfine || '400',
      rooms: currentBar.rooms || currentBar.pricing?.rooms || 'N/A'
    };
  };

  const pricing = getCurrentPricing();
  const currentBar = editedBar || bar;

  // Pricing update handlers
  const updateConsumablePrice = (consumableId: string, price: string) => {
    if (!onUpdateField) return;
    const currentPricing = getCurrentPricing();
    const updatedConsumables = currentPricing.consumables.map(consumable =>
      consumable.consumable_id === consumableId ? { ...consumable, price } : consumable
    );
    onUpdateField('pricing', { ...currentPricing, consumables: updatedConsumables });
  };

  const addConsumable = (templateId: string) => {
    if (!onUpdateField || !templatesById[templateId]) return;
    const template = templatesById[templateId];
    const currentPricing = getCurrentPricing();
    const existingConsumable = currentPricing.consumables.find(c => c.consumable_id === templateId);

    if (existingConsumable) {
      toast.warning(t('barInfoSidebar.toast.alreadyInList', { name: template.name }));
      return;
    }

    const newConsumable = {
      consumable_id: templateId,
      price: template.default_price?.toString() || '0'
    };

    onUpdateField('pricing', {
      ...currentPricing,
      consumables: [...currentPricing.consumables, newConsumable]
    });
  };

  const removeConsumable = (consumableId: string) => {
    if (!onUpdateField) return;
    const currentPricing = getCurrentPricing();
    const updatedConsumables = currentPricing.consumables.filter(c => c.consumable_id !== consumableId);
    onUpdateField('pricing', { ...currentPricing, consumables: updatedConsumables });
  };

  const updateServicePrice = (service: 'ladydrink' | 'barfine' | 'rooms', price: string) => {
    if (!onUpdateField) return;
    onUpdateField(service, price);
  };

  // Verification stats
  const verifiedCount = employees.filter(emp => emp.is_verified).length;
  const totalStaff = employees.length;
  const verificationPercent = totalStaff > 0 ? Math.round((verifiedCount / totalStaff) * 100) : 0;

  // Trust color based on rate
  const getTrustColor = (rate: number) => {
    if (rate >= 80) return '#22c55e';
    if (rate >= 50) return '#FFD700';
    if (rate >= 20) return '#FFA500';
    return '#ef4444';
  };

  const trustColor = getTrustColor(verificationPercent);

  // Category info for consumables display
  const getCategoryInfo = (category: string): { name: string; icon: React.ReactNode } => {
    const iconSize = 14;
    switch (category) {
      case 'beer': return { name: t('barInfoSidebar.categories.beers'), icon: <Beer size={iconSize} /> };
      case 'cocktail': return { name: t('barInfoSidebar.categories.cocktails'), icon: <Martini size={iconSize} /> };
      case 'shot': return { name: t('barInfoSidebar.categories.shots'), icon: <GlassWater size={iconSize} /> };
      case 'spirit': return { name: t('barInfoSidebar.categories.spirits'), icon: <Wine size={iconSize} /> };
      case 'soft': return { name: t('barInfoSidebar.categories.soft'), icon: <GlassWater size={iconSize} /> };
      case 'wine': return { name: t('barInfoSidebar.categories.wines'), icon: <Wine size={iconSize} /> };
      default: return { name: t('barInfoSidebar.categories.others'), icon: <Martini size={iconSize} /> };
    }
  };

  const getCategoryFromIcon = (icon: string): string => {
    switch (icon) {
      case '🍺': return 'beer';
      case '🍸': return 'cocktail';
      case '🥃': return 'shot';
      case '🥂': case '🍾': return 'spirit';
      case '🥤': return 'soft';
      case '🍷': return 'wine';
      default: return 'other';
    }
  };

  // Process consumables with templates
  const itemsWithTemplates = pricing.consumables
    .map((consumable) => ({
      ...consumable,
      template: templatesById[consumable.consumable_id]
    }))
    .filter((item) => item.template);

  // Group by category
  const groupedByCategory = itemsWithTemplates.reduce((groups, item) => {
    const category = item.template.category || getCategoryFromIcon(item.template.icon);
    if (!groups[category]) groups[category] = [];
    groups[category].push(item);
    return groups;
  }, {} as Record<string, typeof itemsWithTemplates>);

  const categoryOrder = ['beer', 'cocktail', 'shot', 'spirit', 'wine', 'soft', 'other'];

  return (
    <aside className="sidebar-premium" data-testid="establishment-sidebar">
      {/* ═══════════════════════════════════════════
          SECTION 1: PRICING
          ═══════════════════════════════════════════ */}
      <section className="sidebar-section pricing-section">
        <header className="section-header">
          <Sparkles className="header-icon" size={20} />
          <h3>{t('barInfoSidebar.sections.pricing')}</h3>
        </header>

        {/* Service Cards - Lady Drink & Barfine */}
        <div className="service-cards-grid">
          <div className="service-card lady-drink">
            <div className="service-icon-wrapper">
              <Music size={24} />
            </div>
            <span className="service-label">{t('barInfoSidebar.services.ladydrink')}</span>
            {isEditMode ? (
              <div className="service-price-edit">
                <input
                  type="number"
                  value={pricing.ladydrink}
                  onChange={(e) => updateServicePrice('ladydrink', e.target.value)}
                  className="service-price-input"
                />
                <span>฿</span>
              </div>
            ) : (
              <span className="service-price">{pricing.ladydrink}฿</span>
            )}
            <div className="service-glow" />
          </div>

          <div className="service-card barfine">
            <div className="service-icon-wrapper">
              <Ticket size={24} />
            </div>
            <span className="service-label">{t('barInfoSidebar.services.barfine')}</span>
            {isEditMode ? (
              <div className="service-price-edit">
                <input
                  type="number"
                  value={pricing.barfine}
                  onChange={(e) => updateServicePrice('barfine', e.target.value)}
                  className="service-price-input"
                />
                <span>฿</span>
              </div>
            ) : (
              <span className="service-price">{pricing.barfine}฿</span>
            )}
            <div className="service-glow" />
          </div>
        </div>

        {/* Rooms if applicable */}
        {(pricing.rooms && pricing.rooms !== 'N/A') && (
          <div className="service-card rooms-card">
            <div className="service-icon-wrapper rooms-icon">
              <Home size={20} />
            </div>
            <span className="service-label">{t('barInfoSidebar.services.rooms')}</span>
            {isEditMode ? (
              <div className="service-price-edit">
                <input
                  type="number"
                  value={pricing.rooms === 'N/A' ? '' : pricing.rooms}
                  onChange={(e) => updateServicePrice('rooms', e.target.value || 'N/A')}
                  className="service-price-input"
                />
                <span>฿</span>
                <button
                  onClick={() => updateServicePrice('rooms', 'N/A')}
                  className="service-remove-btn"
                  aria-label={t('barInfoSidebar.aria.removeRooms')}
                >
                  ×
                </button>
              </div>
            ) : (
              <span className="service-price">{pricing.rooms}฿</span>
            )}
          </div>
        )}

        {/* Add Rooms button in edit mode */}
        {isEditMode && (!pricing.rooms || pricing.rooms === 'N/A') && (
          <button
            onClick={() => updateServicePrice('rooms', '600')}
            className="btn-add-rooms"
            aria-label={t('barInfoSidebar.aria.addRooms')}
          >
            <Home size={14} /> {t('barInfoSidebar.buttons.addRooms')}
          </button>
        )}

        {/* Drinks Menu */}
        <div className="drinks-menu-container">
          <div className="drinks-header">
            <Beer size={18} />
            <span>{t('barInfoSidebar.sections.consumables')}</span>
            {isEditMode && (
              <div className="drinks-add-control">
                {templatesError ? (
                  <span className="error-text">{templatesError}</span>
                ) : loadingTemplates ? (
                  <span className="loading-text">{t('barInfoSidebar.loading')}</span>
                ) : (
                  <select
                    onChange={(e) => e.target.value && addConsumable(e.target.value)}
                    value=""
                    className="drinks-add-select"
                  >
                    <option value="">{t('barInfoSidebar.buttons.add')}</option>
                    {Object.entries(consumableTemplates)
                      .filter(([category]) => category !== 'service')
                      .map(([_category, templates]) =>
                        templates.map(template => (
                          <option key={template.id} value={template.id}>
                            {template.icon} {template.name}
                          </option>
                        ))
                      )}
                  </select>
                )}
              </div>
            )}
          </div>

          {pricing.consumables.length === 0 ? (
            <div className="empty-drinks-state">
              <div className="empty-icon">
                <Wine size={32} />
              </div>
              <p>{isEditMode ? t('barInfoSidebar.emptyStates.editMode') : t('barInfoSidebar.emptyStates.noItems')}</p>
              {!isEditMode && (
                <p className="empty-cta">
                  <Info size={14} /> {t('barInfoSidebar.emptyStates.contributeCTA')}
                </p>
              )}
            </div>
          ) : (
            <div className="drinks-grid">
              {categoryOrder
                .filter(category => groupedByCategory[category]?.length > 0)
                .map(category => {
                  const categoryInfo = getCategoryInfo(category);
                  const items = groupedByCategory[category].sort((a, b) =>
                    a.template.name.localeCompare(b.template.name)
                  );

                  return (
                    <div key={category} className="drinks-category-group">
                      <div className="drinks-category-header">
                        {categoryInfo.icon}
                        <span>{categoryInfo.name}</span>
                      </div>
                      {items.map((item) => (
                        <div key={item.consumable_id} className="drink-item">
                          <span className="drink-name">{item.template.name}</span>
                          {isEditMode ? (
                            <div className="drink-price-edit">
                              <input
                                type="number"
                                value={item.price}
                                onChange={(e) => updateConsumablePrice(item.consumable_id, e.target.value)}
                                className="drink-price-input"
                              />
                              <span>฿</span>
                              <button
                                onClick={() => removeConsumable(item.consumable_id)}
                                className="drink-remove-btn"
                                aria-label={t('barInfoSidebar.aria.removeConsumable', { name: item.template.name })}
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <span className="drink-price">{item.price}฿</span>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 2: LOCATION & CONTACT
          ═══════════════════════════════════════════ */}
      <section className="sidebar-section location-section">
        <header className="section-header">
          <MapPin className="header-icon" size={20} />
          <h3>{t('barInfoSidebar.sections.contact')}</h3>
        </header>

        {/* Address Line */}
        <div className="location-address">
          <MapPin size={16} className="address-icon" />
          {isEditMode ? (
            <input
              type="text"
              value={currentBar.address || ''}
              onChange={(e) => onUpdateField && onUpdateField('address', e.target.value)}
              placeholder={t('barInfoSidebar.contact.addressPlaceholder')}
              className="address-input-inline"
            />
          ) : (
            <span className="address-text">
              {currentBar.address || getZoneLabel(bar.zone || '')}
            </span>
          )}
        </div>

        {/* Single Map Button - Full Width */}
        <button
          onClick={() => {
            if (currentBar.address) {
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentBar.address)}`;
              window.open(mapsUrl, '_blank');
            } else {
              toast.warning(t('barInfoSidebar.errors.noAddress'));
            }
          }}
          className="btn-map-single"
          disabled={!currentBar.address}
          aria-label={t('barInfoSidebar.aria.viewOnMap', { name: currentBar.name })}
        >
          <Map size={18} />
          <span>Open in Google Maps</span>
          <Navigation size={14} className="btn-arrow" />
        </button>

        {/* Contact Divider */}
        <div className="contact-divider">
          <span>Contact</span>
        </div>

        {/* Contact Grid */}
        <div className="contact-grid">
          {/* Phone */}
          {isEditMode ? (
            <div className="contact-edit-group">
              <Phone size={16} />
              <input
                type="tel"
                value={currentBar.phone || ''}
                onChange={(e) => onUpdateField && onUpdateField('phone', e.target.value)}
                placeholder={t('barInfoSidebar.contact.phonePlaceholder')}
                className="contact-input"
              />
            </div>
          ) : currentBar.phone ? (
            <a href={`tel:${currentBar.phone}`} className="contact-btn phone" aria-label="Call">
              <Phone size={20} />
            </a>
          ) : (
            <div className="contact-btn phone disabled" aria-label="No phone">
              <Phone size={20} />
            </div>
          )}

          {/* Social Links */}
          {currentBar.instagram && (
            <a
              href={currentBar.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="contact-btn instagram"
              aria-label={t('barInfoSidebar.aria.visitSocial', { platform: 'Instagram' })}
            >
              <FaInstagram size={20} />
            </a>
          )}

          {currentBar.twitter && (
            <a
              href={currentBar.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="contact-btn twitter"
              aria-label={t('barInfoSidebar.aria.visitSocial', { platform: 'Twitter' })}
            >
              <FaXTwitter size={20} />
            </a>
          )}

          {currentBar.tiktok && (
            <a
              href={currentBar.tiktok}
              target="_blank"
              rel="noopener noreferrer"
              className="contact-btn tiktok"
              aria-label={t('barInfoSidebar.aria.visitSocial', { platform: 'TikTok' })}
            >
              <FaTiktok size={20} />
            </a>
          )}
        </div>

        {/* Edit mode: Add social links */}
        {isEditMode && (
          <div className="social-edit-group">
            <div className="social-edit-row">
              <FaInstagram size={16} />
              <input
                type="url"
                value={currentBar.instagram || ''}
                onChange={(e) => onUpdateField && onUpdateField('instagram', e.target.value)}
                placeholder="Instagram URL"
                className="social-input"
              />
            </div>
            <div className="social-edit-row">
              <FaTiktok size={16} />
              <input
                type="url"
                value={currentBar.tiktok || ''}
                onChange={(e) => onUpdateField && onUpdateField('tiktok', e.target.value)}
                placeholder="TikTok URL"
                className="social-input"
              />
            </div>
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 3: TRUST SCORE
          ═══════════════════════════════════════════ */}
      <section className="sidebar-section trust-section">
        <header className="section-header">
          <Shield className="header-icon" size={20} />
          <h3>{t('barInfoSidebar.sections.staffVerification', 'Trust Score')}</h3>
        </header>

        {/* Verified Owner Badge */}
        {bar?.has_owner && (
          <div className="owner-badge">
            <Trophy size={20} className="owner-badge-icon" />
            <div className="owner-badge-content">
              <span className="owner-badge-title">
                {t('barInfoSidebar.verification.verifiedOwner', 'Verified Owner')}
              </span>
              <span className="owner-badge-subtitle">
                {t('barInfoSidebar.verification.managedByOwner', 'Managed by verified owner')}
              </span>
            </div>
          </div>
        )}

        {/* Radial Progress Gauge */}
        <div className="trust-gauge">
          <svg className="gauge-svg" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="trustGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E879F9" />
                <stop offset="100%" stopColor="#00E5FF" />
              </linearGradient>
            </defs>
            <circle className="gauge-bg" cx="50" cy="50" r="40" />
            <circle
              className="gauge-fill"
              cx="50" cy="50" r="40"
              style={{
                stroke: trustColor,
                strokeDashoffset: 251 - (251 * verificationPercent / 100)
              }}
            />
          </svg>
          <div className="gauge-center">
            <span className="gauge-value" style={{ color: trustColor }}>{verificationPercent}%</span>
            <span className="gauge-label">Trust</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="trust-stats-grid">
          <div className="trust-stat verified">
            <CheckCircle size={18} />
            <span className="stat-value">{verifiedCount}</span>
            <span className="stat-label">{t('barInfoSidebar.verification.verified', 'Verified')}</span>
          </div>
          <div className="trust-stat total">
            <Users size={18} />
            <span className="stat-value">{totalStaff}</span>
            <span className="stat-label">{t('barInfoSidebar.verification.total', 'Total')}</span>
          </div>
        </div>

        {/* Trust Level Badge */}
        {verificationPercent >= 80 && (
          <div className="trust-level-badge excellent">
            <Star size={16} />
            <span>{t('barInfoSidebar.verification.excellentTrust', 'Excellent trust level')}</span>
          </div>
        )}
        {verificationPercent >= 50 && verificationPercent < 80 && (
          <div className="trust-level-badge good">
            <ThumbsUp size={16} />
            <span>{t('barInfoSidebar.verification.goodTrust', 'Good trust level')}</span>
          </div>
        )}
        {verificationPercent >= 20 && verificationPercent < 50 && (
          <div className="trust-level-badge fair">
            <AlertTriangle size={16} />
            <span>{t('barInfoSidebar.verification.fairTrust', 'Fair trust level')}</span>
          </div>
        )}
        {verificationPercent < 20 && totalStaff > 0 && (
          <div className="trust-level-badge low">
            <Info size={16} />
            <span>{t('barInfoSidebar.verification.lowTrust', 'Limited verification')}</span>
          </div>
        )}

        {/* CTA - Help Verify */}
        {totalStaff > 0 && verificationPercent < 100 && (
          <button className="btn-help-verify">
            <Unlock size={16} />
            Help Verify Staff
          </button>
        )}

        {/* Empty state if no employees */}
        {totalStaff === 0 && (
          <div className="trust-empty-state">
            <Users size={32} />
            <p>No staff registered yet</p>
          </div>
        )}
      </section>
    </aside>
  );
};

export default BarInfoSidebar;
