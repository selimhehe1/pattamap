import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaInstagram, FaTiktok } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { Establishment, ConsumableTemplate, Employee } from '../../types';
import { logger } from '../../utils/logger';
import toast from '../../utils/toast';
import '../../styles/components/establishment-ui.css';
import '../../styles/components/sidebar-establishment.css';

interface BarInfoSidebarProps {
  bar: Establishment;
  employees?: Employee[]; // 🆕 v10.3 - For verification stats
  isEditMode?: boolean;
  editedBar?: Establishment | null;
  onUpdateField?: (field: string, value: any) => void;
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
  const [_categories, setCategories] = useState<Array<{id: number, name: string, icon: string, color: string}>>([]);
  const [_loadingCategories, setLoadingCategories] = useState(true);

  // Charger les catégories d'établissements
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/establishments/categories`);

        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories || []);
        } else {
          logger.error('❌ Failed to load categories');
        }
      } catch (error) {
        logger.error('❌ Error loading categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  // Charger les templates de consommations depuis l'API
  useEffect(() => {
    const loadConsumableTemplates = async () => {
      try {
        setLoadingTemplates(true);
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/consumables`);

        if (response.ok) {
          const data = await response.json();
          setConsumableTemplates(data.templates);

          // Créer un index par ID pour accès rapide
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

  // Déterminer le type de bar selon la catégorie
  const getBarType = () => {
    if (bar.category?.name?.toLowerCase().includes('gogo')) return t('barInfoSidebar.barTypes.gogo');
    if (bar.category?.name?.toLowerCase().includes('nightclub')) return t('barInfoSidebar.barTypes.nightclub');
    if (bar.category?.name?.toLowerCase().includes('massage')) return t('barInfoSidebar.barTypes.massage');
    if (bar.category?.name?.toLowerCase() === 'bar') return t('barInfoSidebar.barTypes.bar');
    return t('barInfoSidebar.barTypes.bar'); // Default to Bar
  };

  // Récupérer les pricing depuis les données de l'établissement
  const getCurrentPricing = () => {
    const currentBar = editedBar || bar;

    // Utiliser les colonnes directes en priorité, fallback sur pricing object puis valeurs par défaut
    return {
      consumables: currentBar.pricing?.consumables || [],
      ladyDrink: currentBar.ladydrink || currentBar.pricing?.ladydrink || '130',
      barfine: currentBar.barfine || currentBar.pricing?.barfine || '400',
      rooms: currentBar.rooms || currentBar.pricing?.rooms || 'N/A'
    };
  };

  const pricing = getCurrentPricing();

  const _getBarIcon = () => {
    const barType = getBarType();
    if (barType === 'GoGo Bar') return '💃';
    if (barType === 'Nightclub') return '🎵';
    if (barType === 'Massage Salon') return '💆';
    if (barType === 'Bar') return '🍺';
    return '🍺'; // Default to bar icon
  };

  // Fonctions pour gérer l'édition des pricing
  const updateConsumablePrice = (consumableId: string, price: string) => {
    if (!onUpdateField) return;

    const currentPricing = getCurrentPricing();
    const updatedConsumables = currentPricing.consumables.map(consumable =>
      consumable.consumable_id === consumableId
        ? { ...consumable, price }
        : consumable
    );

    onUpdateField('pricing', {
      ...currentPricing,
      consumables: updatedConsumables
    });
  };

  const addConsumable = (templateId: string) => {
    if (!onUpdateField || !templatesById[templateId]) return;

    const template = templatesById[templateId];
    const currentPricing = getCurrentPricing();

    // Vérifier si la consommation n'existe pas déjà
    const existingConsumable = currentPricing.consumables.find(
      c => c.consumable_id === templateId
    );

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
    const updatedConsumables = currentPricing.consumables.filter(
      c => c.consumable_id !== consumableId
    );

    onUpdateField('pricing', {
      ...currentPricing,
      consumables: updatedConsumables
    });
  };

  const updateServicePrice = (service: 'ladydrink' | 'barfine' | 'rooms', price: string) => {
    if (!onUpdateField) return;

    // Mettre à jour directement les colonnes de base de données
    if (service === 'ladydrink') {
      onUpdateField('ladydrink', price);
    } else if (service === 'barfine') {
      onUpdateField('barfine', price);
    } else if (service === 'rooms') {
      onUpdateField('rooms', price);
    }

    // Note: On ne met pas à jour l'objet pricing car on utilise les colonnes directes
    // L'affichage utilise getCurrentPricing() qui lit depuis les colonnes
  };

  const _formatHours = (hours: any) => {
    if (!hours) return '14:00 - 02:00';
    return `${hours.open || '14:00'} - ${hours.close || '02:00'}`;
  };

  const currentBar = editedBar || bar;

  return (
    <div className="establishment-section-nightlife sidebar-container-nightlife" data-testid="establishment-sidebar">
      {/* Section pricing - Header supprimé, commence directement ici */}
      <div className="sidebar-pricing-container-nightlife">
        <h4 className="establishment-section-title-nightlife">
          💰 {t('barInfoSidebar.sections.pricing')}
        </h4>

        {/* Consommations dynamiques - toujours visible */}
        <div className="sidebar-consumables-container-nightlife">
            <h5 className="price-value-nightlife sidebar-consumables-header-nightlife">
              <span>🍺 {t('barInfoSidebar.sections.consumables')}</span>
              {isEditMode && (
                <div className="sidebar-consumables-controls-nightlife">
                  {templatesError ? (
                    <span style={{
                      fontSize: '9px',
                      color: '#f44336',
                      fontStyle: 'italic'
                    }}>
                      {templatesError}
                    </span>
                  ) : loadingTemplates ? (
                    <span style={{
                      fontSize: '9px',
                      color: '#FFD700',
                      fontStyle: 'italic'
                    }}>
                      {t('barInfoSidebar.loading')}
                    </span>
                  ) : (
                    <select
                      onChange={(e) => e.target.value && addConsumable(e.target.value)}
                      value=""
                      className="sidebar-add-select-nightlife"
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
            </h5>
            <div className="sidebar-consumables-list-nightlife">
              {(() => {
                // Mapper les consommations avec leurs templates
                const itemsWithTemplates = pricing.consumables
                  .map((consumable) => ({
                    ...consumable,
                    template: templatesById[consumable.consumable_id]
                  }))
                  .filter((item) => item.template); // Filtrer les templates manquants


                // Fonction pour déterminer la catégorie depuis l'icône
                const getCategoryFromIcon = (icon: string): string => {
                  switch (icon) {
                    case '🍺': return 'beer';
                    case '🍸': return 'cocktail';
                    case '🥃': return 'shot';
                    case '🥂': return 'spirit';
                    case '🥤': return 'soft';
                    case '🍷': return 'wine';
                    case '🍾': return 'spirit';
                    case '💃': return 'service'; // Lady Drink
                    case '🎫': return 'service'; // Barfine
                    case '🏠': return 'service'; // Room
                    default: return 'other';
                  }
                };

                // Grouper par catégorie
                const groupedByCategory = itemsWithTemplates.reduce((groups, item) => {
                  const category = item.template.category || getCategoryFromIcon(item.template.icon);
                  if (!groups[category]) {
                    groups[category] = [];
                  }
                  groups[category].push(item);
                  return groups;
                }, {} as Record<string, typeof itemsWithTemplates>);

                // Fonction pour obtenir le nom et l'icône de la catégorie
                const getCategoryInfo = (category: string) => {
                  switch (category) {
                    case 'beer': return { name: t('barInfoSidebar.categories.beers'), icon: '🍺' };
                    case 'cocktail': return { name: t('barInfoSidebar.categories.cocktails'), icon: '🍸' };
                    case 'shot': return { name: t('barInfoSidebar.categories.shots'), icon: '🥃' };
                    case 'spirit': return { name: t('barInfoSidebar.categories.spirits'), icon: '🥂' };
                    case 'soft': return { name: t('barInfoSidebar.categories.soft'), icon: '🥤' };
                    case 'wine': return { name: t('barInfoSidebar.categories.wines'), icon: '🍷' };
                    case 'service': return { name: t('barInfoSidebar.categories.services'), icon: '💫' };
                    default: return { name: t('barInfoSidebar.categories.others'), icon: '🍹' };
                  }
                };

                // Ordre des catégories (on exclut 'service' de l'affichage car ce ne sont pas des consommations)
                const categoryOrder = ['beer', 'cocktail', 'shot', 'spirit', 'wine', 'soft', 'other'];

                return categoryOrder
                  .filter(category => groupedByCategory[category]?.length > 0) // Masquer catégories vides
                  .map(category => {
                    const categoryInfo = getCategoryInfo(category);
                    const items = groupedByCategory[category].sort((a, b) =>
                      a.template.name.localeCompare(b.template.name)
                    );

                    return (
                      <div key={category} className="sidebar-category-group-nightlife">
                        {/* En-tête de catégorie - centré, sans compteur */}
                        <div className="sidebar-category-header-nightlife">
                          <span className="sidebar-category-icon-nightlife">{categoryInfo.icon}</span>
                          <span className="sidebar-category-name-nightlife">{categoryInfo.name}</span>
                        </div>

                        {/* Éléments de la catégorie */}
                        {items.map((item) => {
                          const { template } = item;

                          return (
                            <div key={item.consumable_id} className="sidebar-consumable-item-nightlife">
                              <span className="sidebar-consumable-name-nightlife">
                                <span>{template.name}</span>
                              </span>
                              <div className="sidebar-consumable-controls-nightlife">
                                {isEditMode ? (
                                  <>
                                    <input
                                      type="number"
                                      value={item.price}
                                      onChange={(e) => updateConsumablePrice(item.consumable_id, e.target.value)}
                                      className="sidebar-consumable-price-input-nightlife"
                                    />
                                    <span className="sidebar-currency-symbol-nightlife">฿</span>
                                    <button
                                      onClick={() => removeConsumable(item.consumable_id)}
                                      className="photo-remove-btn"
                                      style={{
                                        fontSize: '10px',
                                        width: '16px',
                                        height: '16px'
                                      }}
                                      title={t('barInfoSidebar.buttons.remove')}
                                      aria-label={t('barInfoSidebar.aria.removeConsumable', { name: template.name })}
                                    >
                                      ×
                                    </button>
                                  </>
                                ) : (
                                  <span className="sidebar-price-chip-nightlife sidebar-price-chip-small-nightlife">
                                    {item.price}฿
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  });
              })()}
              {pricing.consumables.length === 0 && (
                <div className="sidebar-empty-consumables-nightlife">
                  {isEditMode ? (
                    t('barInfoSidebar.emptyStates.editMode')
                  ) : (
                    <>
                      <div className="sidebar-empty-consumables-title-nightlife">
                        🍺 {t('barInfoSidebar.emptyStates.noItems')}
                      </div>
                      <div className="sidebar-empty-consumables-cta-nightlife">
                        💡 {t('barInfoSidebar.emptyStates.contributeCTA')}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

        {/* Autres prix */}
        <div className="sidebar-pricing-grid-nightlife">
          <div className="sidebar-price-card-nightlife sidebar-price-card-ladydrink-nightlife">
            <div className="sidebar-price-icon-nightlife">💃</div>
            <div className="sidebar-price-label-nightlife sidebar-price-label-ladydrink-nightlife">
              {t('barInfoSidebar.services.ladyDrink')}
            </div>
            <div className="sidebar-price-value-nightlife">
              {isEditMode ? (
                <div className="sidebar-price-input-group-nightlife">
                  <input
                    type="number"
                    value={pricing.ladyDrink}
                    onChange={(e) => updateServicePrice('ladydrink', e.target.value)}
                    className="sidebar-price-input-ladydrink-nightlife"
                  />
                  <span>฿</span>
                </div>
              ) : (
                <span className="sidebar-price-chip-nightlife">
                  {pricing.ladyDrink}฿
                </span>
              )}
            </div>
          </div>

          <div className="sidebar-price-card-nightlife sidebar-price-card-barfine-nightlife">
            <div className="sidebar-price-icon-nightlife">🎫</div>
            <div className="sidebar-price-label-nightlife sidebar-price-label-barfine-nightlife">
              {t('barInfoSidebar.services.barfine')}
            </div>
            <div className="sidebar-price-value-nightlife">
              {isEditMode ? (
                <div className="sidebar-price-input-group-nightlife">
                  <input
                    type="number"
                    value={pricing.barfine}
                    onChange={(e) => updateServicePrice('barfine', e.target.value)}
                    className="sidebar-price-input-barfine-nightlife"
                  />
                  <span>฿</span>
                </div>
              ) : (
                <span className="sidebar-price-chip-nightlife">
                  {pricing.barfine}฿
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Rooms si applicable */}
        {(pricing.rooms && pricing.rooms !== 'N/A') && (
          <div className="sidebar-price-card-nightlife sidebar-price-card-rooms-nightlife">
            <div className="sidebar-price-icon-nightlife">🏠</div>
            <div className="sidebar-price-label-nightlife sidebar-price-label-rooms-nightlife">
              {t('barInfoSidebar.services.rooms')}
            </div>
            <div className="sidebar-price-value-nightlife">
              {isEditMode ? (
                <div className="sidebar-price-input-group-nightlife">
                  <input
                    type="number"
                    value={pricing.rooms === 'N/A' ? '' : pricing.rooms}
                    onChange={(e) => updateServicePrice('rooms', e.target.value || 'N/A')}
                    className="sidebar-price-input-rooms-nightlife"
                  />
                  <span>฿</span>
                  <button
                    onClick={() => updateServicePrice('rooms', 'N/A')}
                    className="photo-remove-btn"
                    style={{
                      fontSize: '12px',
                      width: '20px',
                      height: '20px',
                      marginLeft: '3px'
                    }}
                    title={`${t('barInfoSidebar.buttons.remove')} ${t('barInfoSidebar.services.rooms')}`}
                    aria-label={t('barInfoSidebar.aria.removeRooms')}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <span className="sidebar-price-chip-nightlife">
                  {pricing.rooms}฿
                </span>
              )}
            </div>
          </div>
        )}

        {/* Option pour afficher/masquer les rooms en mode édition */}
        {isEditMode && (!pricing.rooms || pricing.rooms === 'N/A') && (
          <div className="sidebar-add-rooms-container-nightlife">
            <button
              onClick={() => updateServicePrice('rooms', '600')}
              className="btn-accent-nightlife"
              style={{
                background: 'linear-gradient(45deg, #9C27B0, #E1BEE7)',
                fontSize: '11px',
                padding: '8px 16px'
              }}
              aria-label={t('barInfoSidebar.aria.addRooms')}
            >
              🏠 {t('barInfoSidebar.buttons.addRooms')}
            </button>
          </div>
        )}
      </div>

      {/* Contact & Location */}
      <div className="sidebar-contact-container-nightlife">
        <h4 className="establishment-section-title-nightlife">
          📍 {t('barInfoSidebar.sections.contact')}
        </h4>

        <div className="sidebar-contact-list-nightlife">
          <div className="sidebar-contact-item-nightlife">
            <span>📍</span>
            {isEditMode ? (
              <input
                type="text"
                value={currentBar.address || ''}
                onChange={(e) => onUpdateField && onUpdateField('address', e.target.value)}
                placeholder={t('barInfoSidebar.contact.addressPlaceholder')}
                className="sidebar-contact-input-nightlife"
              />
            ) : (
              <span>{currentBar.address}</span>
            )}
          </div>

          <div className="sidebar-contact-item-nightlife">
            <span>📞</span>
            {isEditMode ? (
              <input
                type="tel"
                value={currentBar.phone || ''}
                onChange={(e) => onUpdateField && onUpdateField('phone', e.target.value)}
                placeholder={t('barInfoSidebar.contact.phonePlaceholder')}
                className="sidebar-contact-input-nightlife sidebar-phone-input-nightlife"
              />
            ) : currentBar.phone ? (
              <a
                href={`tel:${currentBar.phone}`}
                className="sidebar-phone-link-nightlife"
              >
                {currentBar.phone}
              </a>
            ) : (
              <span className="sidebar-no-phone-nightlife">{t('barInfoSidebar.contact.noPhone')}</span>
            )}
          </div>

          {/* Social Media Links (v10.1) - One Line Layout */}
          {(() => {
            const socialLinks = [
              { platform: 'instagram', url: currentBar.instagram, icon: FaInstagram, color: '#E1306C', hoverColor: '#C19A6B' },
              { platform: 'twitter', url: currentBar.twitter, icon: FaXTwitter, color: '#000000', hoverColor: '#1DA1F2' },
              { platform: 'tiktok', url: currentBar.tiktok, icon: FaTiktok, color: '#FE2C55', hoverColor: '#C19A6B' }
            ].filter(link => link.url);

            if (socialLinks.length === 0) return null;

            // Adaptive sizing: 1 RS → 60px, 2 RS → 50px, 3 RS → 40px
            const iconSize = socialLinks.length === 1 ? 60 : socialLinks.length === 2 ? 50 : 40;

            return (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '20px',
                padding: '15px 0',
                marginTop: '10px',
                borderTop: '1px solid rgba(0, 255, 255, 0.2)'
              }}>
                {socialLinks.map(({ platform, url, icon: Icon, color, hoverColor }) => (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: `${iconSize}px`,
                      height: `${iconSize}px`,
                      fontSize: `${iconSize * 0.6}px`,
                      color: color,
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '50%',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      border: `2px solid ${color}`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.2) rotate(5deg)';
                      e.currentTarget.style.boxShadow = `0 0 20px ${hoverColor}`;
                      e.currentTarget.style.borderColor = hoverColor;
                      e.currentTarget.style.color = hoverColor;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = color;
                      e.currentTarget.style.color = color;
                    }}
                    aria-label={t('barInfoSidebar.aria.visitSocial', { platform })}
                  >
                    <Icon />
                  </a>
                ))}
              </div>
            );
          })()}

          <button
            onClick={() => {
              if (currentBar.address) {
                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentBar.address)}`;
                window.open(mapsUrl, '_blank');
              } else {
                toast.warning(t('barInfoSidebar.errors.noAddress'));
              }
            }}
            className="btn-secondary-nightlife sidebar-map-button-nightlife"
            aria-label={t('barInfoSidebar.aria.viewOnMap', { name: currentBar.name })}
          >
            🗺️ {t('barInfoSidebar.buttons.viewOnMap')}
          </button>
        </div>
      </div>

      {/* Verification Stats - 🆕 v10.3 - Staff Trust Metrics + Owner Badge */}
      {employees.length > 0 && (
        <div className="sidebar-verification-container-nightlife">
          {/* 🆕 v10.3 - Verified Owner Badge (if establishment has owner) */}
          {bar?.has_owner && (
            <>
              <div className="sidebar-owner-badge-nightlife">
                <div className="owner-badge-icon-nightlife">🏆</div>
                <div className="owner-badge-content-nightlife">
                  <div className="owner-badge-title-nightlife">
                    {t('barInfoSidebar.verification.verifiedOwner', 'Verified Establishment Owner')}
                  </div>
                  <div className="owner-badge-subtitle-nightlife">
                    {t('barInfoSidebar.verification.managedByOwner', 'Managed by verified owner')}
                  </div>
                </div>
              </div>

              {/* Separator */}
              <div style={{ height: '20px' }} />
            </>
          )}

          <h4 className="establishment-section-title-nightlife">
            ✓ {t('barInfoSidebar.sections.staffVerification', 'Staff Verification')}
          </h4>

          {(() => {
            const verifiedCount = employees.filter(emp => emp.is_verified).length;
            const totalCount = employees.length;
            const verificationRate = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0;

            // Color based on verification rate
            const getColorByRate = (rate: number) => {
              if (rate >= 80) return '#00FF7F'; // Green (excellent)
              if (rate >= 50) return '#FFD700'; // Gold (good)
              if (rate >= 20) return '#FFA500'; // Orange (fair)
              return '#FF6B6B'; // Red (low)
            };

            const color = getColorByRate(verificationRate);

            return (
              <div style={{
                background: 'linear-gradient(135deg, rgba(0,212,255,0.05), rgba(0,0,0,0.3))',
                borderRadius: '15px',
                border: `2px solid ${color}33`,
                padding: '20px'
              }}>
                {/* Circular Progress */}
                <div className="sidebar-progress-wrapper-nightlife">
                  <div
                    className="sidebar-progress-circle-nightlife"
                    style={{
                      '--progress': verificationRate,
                      '--progress-color': color
                    } as React.CSSProperties}
                  >
                    <div className="sidebar-progress-value-nightlife">{verificationRate}%</div>
                    <div className="sidebar-progress-check-nightlife">✓</div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="sidebar-stats-grid-nightlife">
                  <div className="sidebar-stat-card-nightlife" style={{ '--stat-color': color } as React.CSSProperties}>
                    <div className="sidebar-stat-value-nightlife">{verifiedCount}</div>
                    <div className="sidebar-stat-label-nightlife">
                      {t('barInfoSidebar.verification.verified', 'Verified')}
                    </div>
                  </div>

                  <div className="sidebar-stat-card-nightlife" style={{ '--stat-color': '#00E5FF' } as React.CSSProperties}>
                    <div className="sidebar-stat-value-nightlife">{totalCount}</div>
                    <div className="sidebar-stat-label-nightlife">
                      {t('barInfoSidebar.verification.total', 'Total Staff')}
                    </div>
                  </div>
                </div>

                {/* Trust Level Badge */}
                {verificationRate >= 80 && (
                  <div
                    className="sidebar-trust-badge-nightlife"
                    style={{
                      '--trust-color': '#00FF7F',
                      '--trust-border': 'rgba(0,255,127,0.4)',
                      '--trust-bg-start': 'rgba(0,255,127,0.15)',
                      '--trust-bg-end': 'rgba(0,255,127,0.08)',
                      '--trust-glow': 'rgba(0,255,127,0.1)',
                      '--trust-shadow': 'rgba(0,255,127,0.25)'
                    } as React.CSSProperties}
                  >
                    <span>⭐</span>
                    <span>{t('barInfoSidebar.verification.excellentTrust', 'Excellent trust level')}</span>
                  </div>
                )}
                {verificationRate >= 50 && verificationRate < 80 && (
                  <div
                    className="sidebar-trust-badge-nightlife"
                    style={{
                      '--trust-color': '#FFD700',
                      '--trust-border': 'rgba(255,215,0,0.4)',
                      '--trust-bg-start': 'rgba(255,215,0,0.15)',
                      '--trust-bg-end': 'rgba(255,215,0,0.08)',
                      '--trust-glow': 'rgba(255,215,0,0.1)',
                      '--trust-shadow': 'rgba(255,215,0,0.25)'
                    } as React.CSSProperties}
                  >
                    <span>👍</span>
                    <span>{t('barInfoSidebar.verification.goodTrust', 'Good trust level')}</span>
                  </div>
                )}
                {verificationRate >= 20 && verificationRate < 50 && (
                  <div
                    className="sidebar-trust-badge-nightlife"
                    style={{
                      '--trust-color': '#FFA500',
                      '--trust-border': 'rgba(255,165,0,0.4)',
                      '--trust-bg-start': 'rgba(255,165,0,0.15)',
                      '--trust-bg-end': 'rgba(255,165,0,0.08)',
                      '--trust-glow': 'rgba(255,165,0,0.1)',
                      '--trust-shadow': 'rgba(255,165,0,0.25)'
                    } as React.CSSProperties}
                  >
                    <span>⚠️</span>
                    <span>{t('barInfoSidebar.verification.fairTrust', 'Fair trust level')}</span>
                  </div>
                )}
                {verificationRate < 20 && (
                  <div
                    className="sidebar-trust-badge-nightlife"
                    style={{
                      '--trust-color': '#FF6B6B',
                      '--trust-border': 'rgba(255,107,107,0.4)',
                      '--trust-bg-start': 'rgba(255,107,107,0.15)',
                      '--trust-bg-end': 'rgba(255,107,107,0.08)',
                      '--trust-glow': 'rgba(255,107,107,0.1)',
                      '--trust-shadow': 'rgba(255,107,107,0.25)'
                    } as React.CSSProperties}
                  >
                    <span>ℹ️</span>
                    <span>{t('barInfoSidebar.verification.lowTrust', 'Limited verification')}</span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default BarInfoSidebar;