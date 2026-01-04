import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DollarSign, Gem, Pencil, Trash2, Lightbulb, Beer, Plus, Hotel, Wine, Martini, CupSoda, GlassWater } from 'lucide-react';
import { ConsumableTemplate } from '../../../types';
import '../../../styles/components/establishment-ui.css';

interface ConsumableGroup {
  category: string;
  displayName: string;
  templates: ConsumableTemplate[];
}

interface PricingFormProps {
  formData: {
    pricing: {
      consumables: Array<{ consumable_id: string; price: string }>;
      ladydrink: string;
      barfine: string;
      rooms: {
        available: boolean;
        price: string;
      };
    };
  };
  consumableTemplates: ConsumableTemplate[];
  selectedConsumable: { template_id: string; price: string };
  onSelectedConsumableChange: (field: string, value: string) => void;
  onAddConsumable: () => void;
  onRemoveConsumable: (index: number) => void;
  onEditConsumable?: (index: number, newPrice: string) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  getConsumableTemplate: (id: string) => ConsumableTemplate | undefined;
  selectedCategoryName: string;
}

const PricingForm: React.FC<PricingFormProps> = ({
  formData,
  consumableTemplates,
  selectedConsumable,
  onSelectedConsumableChange,
  onAddConsumable,
  onRemoveConsumable,
  onEditConsumable,
  onChange,
  getConsumableTemplate,
  selectedCategoryName
}) => {
  const { t } = useTranslation();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');

  // Render consumable icon based on category or icon key
  const renderConsumableIcon = (icon: string | undefined, size = 14): React.ReactNode => {
    const key = icon?.toLowerCase() || '';
    const icons: Record<string, React.ReactNode> = {
      beer: <Beer size={size} />,
      shot: <Wine size={size} />,
      cocktail: <Martini size={size} />,
      spirit: <Wine size={size} />,
      wine: <GlassWater size={size} />,
      soft: <CupSoda size={size} />,
    };
    return icons[key] || <Beer size={size} />;
  };

  // Détermine si les options "special pricing" doivent être affichées
  // Afficher par défaut (catégorie vide) et pour Bar/GoGo Bar
  const shouldShowSpecialPricing =
    selectedCategoryName === '' || // Pas encore sélectionné → afficher par défaut
    selectedCategoryName === 'Bar' ||
    selectedCategoryName === 'GoGo Bar';

  // Fonction pour obtenir le nom lisible de la catégorie
  const getCategoryDisplayName = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      beer: t('establishment.pricing.categories.beer'),
      shot: t('establishment.pricing.categories.shot'),
      cocktail: t('establishment.pricing.categories.cocktail'),
      spirit: t('establishment.pricing.categories.spirit'),
      wine: t('establishment.pricing.categories.wine'),
      soft: t('establishment.pricing.categories.soft')
    };
    return categoryMap[category] || category;
  };

  const handleEditConsumable = (index: number, currentPrice: string) => {
    setEditingIndex(index);
    setEditPrice(currentPrice);
  };

  const handleSaveEdit = (index: number) => {
    if (onEditConsumable) {
      onEditConsumable(index, editPrice);
    }
    setEditingIndex(null);
    setEditPrice('');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditPrice('');
  };

  return (
    <div style={{ marginBottom: '15px' }}>
      <h3 className="text-cyan-nightlife" style={{
        margin: '0 0 12px 0',
        fontSize: '15px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <DollarSign size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> {t('establishment.pricing.sectionTitle')}
      </h3>

      {/* Consommations */}
      <div style={{ marginBottom: '15px' }}>
        <h4 className="text-cyan-nightlife" style={{ marginBottom: '10px', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}><Beer size={14} /> {t('establishment.pricing.consumablesTitle')}</h4>

        <div style={{ marginBottom: '12px' }}>
          <label style={{
            display: 'block',
            marginBottom: '5px',
            fontSize: '12px',
            fontWeight: '600',
            color: 'var(--nightlife-secondary)'
          }}>
            {t('establishment.pricing.addConsumableLabel')}
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'end' }}>
            <div style={{ flex: 2, minWidth: 0 }}>
              <select
                value={selectedConsumable.template_id}
                onChange={(e) => onSelectedConsumableChange('template_id', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#1a1a1a',
                  border: '2px solid rgba(193, 154, 107,0.3)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: 'white',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--nightlife-secondary)';
                  e.target.style.boxShadow = '0 0 15px rgba(0,255,255,0.3)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(193, 154, 107,0.3)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <option value="">{t('establishment.pricing.selectDrinkPlaceholder')}</option>
                {consumableTemplates
                  .sort((a, b) => {
                    // Trier par catégorie puis par nom
                    if (a.category === b.category) {
                      return a.name.localeCompare(b.name);
                    }
                    return a.category.localeCompare(b.category);
                  })
                  .reduce<ConsumableGroup[]>((groups, template) => {
                    const lastGroup = groups[groups.length - 1];
                    if (!lastGroup || lastGroup.category !== template.category) {
                      groups.push({
                        category: template.category,
                        displayName: getCategoryDisplayName(template.category),
                        templates: [template]
                      });
                    } else {
                      lastGroup.templates.push(template);
                    }
                    return groups;
                  }, [])
                  .map(group => (
                    <optgroup key={group.category} label={`[${group.displayName}]`}>
                      {group.templates.map((template) => (
                        <option key={template.id} value={template.id.toString()}>
                          {template.name} ({t('establishment.pricing.defaultLabel')}: {template.default_price}฿)
                        </option>
                      ))}
                    </optgroup>
                  ))
                }
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '70px', maxWidth: '100px' }}>
              <input
                type="number"
                value={selectedConsumable.price}
                onChange={(e) => onSelectedConsumableChange('price', e.target.value)}
                placeholder="฿"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#1a1a1a',
                  border: '2px solid rgba(193, 154, 107,0.3)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: 'white',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--nightlife-secondary)';
                  e.target.style.boxShadow = '0 0 15px rgba(0,255,255,0.3)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(193, 154, 107,0.3)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            <button
              type="button"
              onClick={onAddConsumable}
              disabled={!selectedConsumable.template_id || !selectedConsumable.price}
              style={{
                padding: '10px 15px',
                backgroundColor: selectedConsumable.template_id && selectedConsumable.price ? 'var(--nightlife-secondary)' : 'rgba(0,0,0,0.5)',
                color: selectedConsumable.template_id && selectedConsumable.price ? '#000' : '#666',
                border: '2px solid ' + (selectedConsumable.template_id && selectedConsumable.price ? 'var(--nightlife-secondary)' : 'rgba(193, 154, 107,0.3)'),
                borderRadius: '8px',
                cursor: selectedConsumable.template_id && selectedConsumable.price ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(10px)'
              }}
             aria-label="Add">
              <Plus size={16} />
            </button>
          </div>
        </div>

        {formData.pricing.consumables.length > 0 && (
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--nightlife-secondary)'
            }}>
              {t('establishment.pricing.addedConsumablesLabel')}
            </label>
            <div style={{
              border: '2px solid rgba(193, 154, 107,0.3)',
              borderRadius: '8px',
              overflow: 'hidden',
              backgroundColor: '#1a1a1a',
              backdropFilter: 'blur(10px)'
            }}>
              {formData.pricing.consumables.map((consumable, index) => {
                const template = getConsumableTemplate(consumable.consumable_id);
                return (
                  <div
                    key={index}
                    className="consumable-item-nightlife"
                    style={{
                      borderBottom: index < formData.pricing.consumables.length - 1 ? '1px solid rgba(193, 154, 107,0.2)' : 'none',
                      backgroundColor: index % 2 === 0 ? 'rgba(0,255,255,0.1)' : 'transparent'
                    }}
                  >
                    <span style={{ fontSize: '14px', color: 'white', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {renderConsumableIcon(template?.icon || template?.category)} {template?.name}
                    </span>
                    <div className="consumable-actions-nightlife">
                      {editingIndex === index ? (
                        // Mode édition
                        <>
                          <input
                            type="number"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            style={{
                              width: '60px',
                              padding: '4px 8px',
                              background: '#1a1a1a',
                              border: '2px solid var(--nightlife-secondary)',
                              borderRadius: '4px',
                              fontSize: '12px',
                              color: 'white',
                              outline: 'none'
                            }}
                            autoFocus
                          />
                          <span style={{ color: 'var(--nightlife-secondary)', fontSize: '14px' }}>฿</span>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(index)}
                            style={{
                              background: 'rgba(0,255,0,0.9)',
                              color: '#1a1a1a',
                              border: 'none',
                              borderRadius: '50%',
                              width: '25px',
                              height: '25px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title={t('establishment.pricing.saveButton')}
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            style={{
                              background: 'rgba(255,71,87,0.9)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '50%',
                              width: '25px',
                              height: '25px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title={t('establishment.pricing.cancelButton')}
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        // Mode affichage
                        <>
                          <span style={{ fontWeight: 'bold', color: 'var(--nightlife-secondary)', fontSize: '14px' }}>
                            {consumable.price}฿
                          </span>
                          <button
                            type="button"
                            onClick={() => handleEditConsumable(index, consumable.price)}
                            className="consumable-edit-btn-nightlife"
                            title={t('establishment.pricing.editPriceButton')}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveConsumable(index)}
                            className="consumable-remove-btn-nightlife"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(255,71,87,0.2)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            title={t('establishment.pricing.deleteButton')}
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Tarifs spéciaux - Uniquement pour Bar et GoGo Bar */}
      {shouldShowSpecialPricing && (
        <div style={{ marginBottom: '15px' }}>
          <h4 className="text-cyan-nightlife" style={{ marginBottom: '10px', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}><Gem size={14} /> {t('establishment.pricing.specialPricingTitle')}</h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '5px',
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--nightlife-secondary)'
              }}>
                Lady Drink (฿)
              </label>
              <input
                type="number"
                name="pricing.ladydrink"
                value={formData.pricing.ladydrink}
                onChange={onChange}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#1a1a1a',
                  border: '2px solid rgba(193, 154, 107,0.3)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: 'white',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--nightlife-secondary)';
                  e.target.style.boxShadow = '0 0 15px rgba(0,255,255,0.3)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(193, 154, 107,0.3)';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="130"
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '5px',
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--nightlife-secondary)'
              }}>
                Barfine (฿)
              </label>
              <input
                type="number"
                name="pricing.barfine"
                value={formData.pricing.barfine}
                onChange={onChange}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#1a1a1a',
                  border: '2px solid rgba(193, 154, 107,0.3)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: 'white',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--nightlife-secondary)';
                  e.target.style.boxShadow = '0 0 15px rgba(0,255,255,0.3)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(193, 154, 107,0.3)';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="400"
              />
            </div>
          </div>
        </div>
      )}

      {/* Chambres - Uniquement pour Bar et GoGo Bar */}
      {shouldShowSpecialPricing && (
        <div>
          <h4 className="text-cyan-nightlife" style={{ marginBottom: '15px', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}><Hotel size={14} /> {t('establishment.pricing.roomsTitle')}</h4>

          <div className="rooms-toggle-container-nightlife">
            <div className="rooms-toggle-label-nightlife">
              <Hotel size={16} />
              <span>{t('establishment.pricing.roomsAvailableLabel')}</span>
            </div>
            <div
              className={`rooms-toggle-switch-nightlife ${formData.pricing.rooms.available ? 'active' : ''}`}
              role="button" tabIndex={0} onClick={() => {
                const event = {
                  target: {
                    name: 'pricing.rooms.available',
                    value: (!formData.pricing.rooms.available).toString()
                  }
                } as React.ChangeEvent<HTMLSelectElement>;
                onChange(event);
              }}
            >
              <div className="rooms-toggle-slider-nightlife"></div>
            </div>
          </div>

          {formData.pricing.rooms.available && (
            <div>
              <label style={{
                display: 'block',
                marginBottom: '5px',
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--nightlife-secondary)'
              }}>
                {t('establishment.pricing.roomPriceLabel')}
              </label>
              <input
                type="number"
                name="pricing.rooms.price"
                value={formData.pricing.rooms.price}
                onChange={onChange}
                style={{
                  width: '200px',
                  padding: '10px 12px',
                  background: '#1a1a1a',
                  border: '2px solid rgba(193, 154, 107,0.3)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: 'white',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--nightlife-secondary)';
                  e.target.style.boxShadow = '0 0 15px rgba(0,255,255,0.3)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(193, 154, 107,0.3)';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="600"
              />
            </div>
          )}
        </div>
      )}

      {shouldShowSpecialPricing && (
        <div style={{
          marginTop: '12px',
          padding: '10px',
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          fontSize: '12px',
          color: 'var(--nightlife-secondary)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0,255,255,0.3)'
        }}>
          <Lightbulb size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('establishment.pricing.pricingTipText')}
        </div>
      )}
    </div>
  );
};

export default PricingForm;