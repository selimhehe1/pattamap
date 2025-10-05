import React, { useState, useEffect } from 'react';
import { Establishment, ConsumableTemplate } from '../../types';
import { logger } from '../../utils/logger';

interface BarInfoSidebarProps {
  bar: Establishment;
  isEditMode?: boolean;
  editedBar?: Establishment | null;
  onUpdateField?: (field: string, value: any) => void;
}

const BarInfoSidebar: React.FC<BarInfoSidebarProps> = ({
  bar,
  isEditMode = false,
  editedBar = null,
  onUpdateField
}) => {

  const [consumableTemplates, setConsumableTemplates] = useState<Record<string, ConsumableTemplate[]>>({});
  const [templatesById, setTemplatesById] = useState<Record<string, ConsumableTemplate>>({});
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templatesError, setTemplatesError] = useState<string>('');
  const [categories, setCategories] = useState<Array<{id: number, name: string, icon: string, color: string}>>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Fonction pour obtenir le nom lisible de la catégorie (même que dans PricingForm)
  const getCategoryDisplayName = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      beer: 'Bières',
      shot: 'Shots',
      cocktail: 'Cocktails',
      spirit: 'Spiritueux',
      wine: 'Vins',
      soft: 'Boissons non-alcoolisées'
    };
    return categoryMap[category] || category;
  };

  // Charger les catégories d'établissements
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/establishments/categories`);

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
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/consumables`);

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
          const errorMsg = `Erreur de chargement des templates (HTTP ${response.status})`;
          logger.error('❌', errorMsg);
          setTemplatesError(errorMsg);
        }
      } catch (error) {
        const errorMsg = 'Erreur réseau lors du chargement des templates';
        logger.error(errorMsg, error);
        setTemplatesError(errorMsg);
      } finally {
        setLoadingTemplates(false);
      }
    };

    loadConsumableTemplates();
  }, []);

  // Déterminer le type de bar selon la catégorie
  const getBarType = () => {
    if (bar.category?.name?.toLowerCase().includes('gogo')) return 'GoGo Bar';
    if (bar.category?.name?.toLowerCase().includes('nightclub')) return 'Nightclub';
    if (bar.category?.name?.toLowerCase().includes('massage')) return 'Massage Salon';
    if (bar.category?.name?.toLowerCase() === 'bar') return 'Bar';
    return 'Bar'; // Default to Bar
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

  const getBarIcon = () => {
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
      alert(`${template.name} est déjà dans la liste des prix`);
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

  const formatHours = (hours: any) => {
    if (!hours) return '14:00 - 02:00';
    return `${hours.open || '14:00'} - ${hours.close || '02:00'}`;
  };

  const currentBar = editedBar || bar;

  return (
    <div className="establishment-section-nightlife sidebar-container-nightlife">
      {/* Header du bar */}
      <div className="establishment-header-nightlife">
        <div className="sidebar-header-info-nightlife">
          {/* Logo or icon */}
          {bar.logo_url ? (
            <div className="sidebar-logo-nightlife">
              <img
                src={bar.logo_url}
                alt={`${bar.name} logo`}
                className="sidebar-logo-image-nightlife"
                onError={(e) => {
                  // 🛡️ XSS SAFE: Using textContent instead of innerHTML
                  const target = e.target as HTMLElement;
                  const parent = target.parentElement;
                  if (parent) {
                    parent.textContent = getBarIcon();
                    parent.style.background = 'transparent';
                    parent.style.fontSize = '24px';
                    parent.style.border = 'none';
                  }
                }}
              />
            </div>
          ) : (
            <span className="sidebar-icon-nightlife">{getBarIcon()}</span>
          )}
          <div>
            <h3 className="establishment-section-title-nightlife sidebar-title-nightlife">
              {bar.name}
            </h3>
            <p className="establishment-meta-nightlife sidebar-meta-nightlife">
              {isEditMode ? (
                <select
                  value={currentBar.category_id}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    onUpdateField && onUpdateField('category_id', selectedId);
                  }}
                  disabled={loadingCategories}
                  className="sidebar-category-select-nightlife"
                >
                  {loadingCategories ? (
                    <option>Loading...</option>
                  ) : (
                    categories.map(cat => {
                      const catIdString = `cat-${String(cat.id).padStart(3, '0')}`;
                      return (
                        <option key={cat.id} value={catIdString}>
                          {cat.icon} {cat.name}
                        </option>
                      );
                    })
                  )}
                </select>
              ) : (
                `${getBarType()} • ${bar.zone || 'Soi 6'}`
              )}
            </p>
          </div>
        </div>

        {/* Status et heures */}
        <div className="sidebar-status-container-nightlife">
          <span className="sidebar-status-indicator-nightlife" />
          <span className="sidebar-status-text-nightlife">
            OPEN NOW • {isEditMode ? (
              <span className="sidebar-time-inputs-nightlife">
                <input
                  type="time"
                  value={currentBar.opening_hours?.open || '14:00'}
                  onChange={(e) => onUpdateField && onUpdateField('opening_hours', {
                    ...currentBar.opening_hours,
                    open: e.target.value
                  })}
                  className="sidebar-time-input-nightlife"
                />
                -
                <input
                  type="time"
                  value={currentBar.opening_hours?.close || '02:00'}
                  onChange={(e) => onUpdateField && onUpdateField('opening_hours', {
                    ...currentBar.opening_hours,
                    close: e.target.value
                  })}
                  className="sidebar-time-input-nightlife"
                />
              </span>
            ) : formatHours(currentBar.opening_hours)}
          </span>
        </div>
      </div>

      {/* Section pricing */}
      <div className="sidebar-pricing-container-nightlife">
        <h4 className="establishment-section-title-nightlife">
          💰 PRICING
        </h4>

        {/* Consommations dynamiques */}
        {(pricing.consumables.length > 0 || isEditMode) && (
          <div className="sidebar-consumables-container-nightlife">
            <h5 className="price-value-nightlife sidebar-consumables-header-nightlife">
              <span>🍺 CONSOMMATIONS</span>
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
                      Chargement...
                    </span>
                  ) : (
                    <select
                      onChange={(e) => e.target.value && addConsumable(e.target.value)}
                      value=""
                      className="sidebar-add-select-nightlife"
                    >
                      <option value="">+ Ajouter</option>
                      {Object.entries(consumableTemplates)
                        .filter(([category]) => category !== 'service')
                        .map(([category, templates]) =>
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
                    case 'beer': return { name: 'Bières', icon: '🍺' };
                    case 'cocktail': return { name: 'Cocktails', icon: '🍸' };
                    case 'shot': return { name: 'Shots', icon: '🥃' };
                    case 'spirit': return { name: 'Spiritueux', icon: '🥂' };
                    case 'soft': return { name: 'Boissons', icon: '🥤' };
                    case 'wine': return { name: 'Vins', icon: '🍷' };
                    case 'service': return { name: 'Services', icon: '💫' };
                    default: return { name: 'Autres', icon: '🍹' };
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
                        {/* En-tête de catégorie */}
                        <div className="sidebar-category-header-nightlife">
                          <span className="sidebar-category-icon-nightlife">{categoryInfo.icon}</span>
                          <span className="sidebar-category-name-nightlife">{categoryInfo.name}</span>
                          <span className="sidebar-category-count-nightlife">({items.length})</span>
                        </div>

                        {/* Éléments de la catégorie */}
                        {items.map((item) => {
                          const { template } = item;

                          return (
                            <div key={item.consumable_id} className="sidebar-consumable-item-nightlife">
                              <span className="sidebar-consumable-name-nightlife">
                                <span>{template.icon}</span>
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
                                    <span style={{ color: '#00FFFF', fontWeight: 'bold', fontSize: '11px' }}>฿</span>
                                    <button
                                      onClick={() => removeConsumable(item.consumable_id)}
                                      className="photo-remove-btn"
                                      style={{
                                        fontSize: '10px',
                                        width: '16px',
                                        height: '16px'
                                      }}
                                      title="Supprimer"
                                    >
                                      ×
                                    </button>
                                  </>
                                ) : (
                                  <span style={{ color: '#00FFFF', fontWeight: 'bold' }}>
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
                  {isEditMode ? 'Utilisez le menu "Ajouter..." pour ajouter des consommations' : 'Aucune consommation configurée'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Autres prix */}
        <div className="sidebar-pricing-grid-nightlife">
          <div className="sidebar-price-card-nightlife sidebar-price-card-ladydrink-nightlife">
            <div className="sidebar-price-icon-nightlife">💃</div>
            <div className="sidebar-price-label-nightlife sidebar-price-label-ladydrink-nightlife">
              LADY DRINK
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
                `${pricing.ladyDrink}฿`
              )}
            </div>
          </div>

          <div className="sidebar-price-card-nightlife sidebar-price-card-barfine-nightlife">
            <div className="sidebar-price-icon-nightlife">🎫</div>
            <div className="sidebar-price-label-nightlife sidebar-price-label-barfine-nightlife">
              BARFINE
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
                `${pricing.barfine}฿`
              )}
            </div>
          </div>
        </div>

        {/* Rooms si applicable */}
        {(pricing.rooms && pricing.rooms !== 'N/A') && (
          <div className="sidebar-price-card-nightlife sidebar-price-card-rooms-nightlife">
            <div className="sidebar-price-icon-nightlife">🏠</div>
            <div className="sidebar-price-label-nightlife sidebar-price-label-rooms-nightlife">
              ROOMS
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
                    title="Supprimer Rooms"
                  >
                    ×
                  </button>
                </div>
              ) : (
                `${pricing.rooms}฿`
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
            >
              🏠 Ajouter Rooms
            </button>
          </div>
        )}
      </div>

      {/* Contact & Location */}
      <div className="sidebar-contact-container-nightlife">
        <h4 className="establishment-section-title-nightlife">
          📍 CONTACT & LOCATION
        </h4>

        <div className="sidebar-contact-list-nightlife">
          <div className="sidebar-contact-item-nightlife">
            <span>📍</span>
            {isEditMode ? (
              <input
                type="text"
                value={currentBar.address || ''}
                onChange={(e) => onUpdateField && onUpdateField('address', e.target.value)}
                placeholder="Enter address..."
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
                placeholder="Enter phone number..."
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
              <span className="sidebar-no-phone-nightlife">No phone number</span>
            )}
          </div>

          <button
            onClick={() => {
              if (currentBar.address) {
                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentBar.address)}`;
                window.open(mapsUrl, '_blank');
              } else {
                alert('Aucune adresse disponible pour cet établissement');
              }
            }}
            className="btn-secondary-nightlife sidebar-map-button-nightlife"
          >
            🗺️ VIEW ON MAP
          </button>
        </div>
      </div>


      {/* CSS pour animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default BarInfoSidebar;