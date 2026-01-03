import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { ConsumableTemplate } from '../../types';
import AdminBreadcrumb from '../Common/AdminBreadcrumb';
import { logger } from '../../utils/logger';
import notification from '../../utils/notification';
import {
  Beer,
  Wine,
  Martini,
  CupSoda,
  GlassWater,
  X,
  Plus,
  Pencil,
  Ban,
  CheckCircle,
  Trash2
} from 'lucide-react';

// Consumable category icon mapping
const getConsumableCategoryIcon = (category: string, size = 16): React.ReactNode => {
  const icons: Record<string, React.ReactNode> = {
    beer: <Beer size={size} />,
    shot: <Wine size={size} />,
    cocktail: <Martini size={size} />,
    spirit: <Wine size={size} />,
    wine: <GlassWater size={size} />,
    soft: <CupSoda size={size} />,
  };
  return icons[category] || <Beer size={size} />;
};

interface ConsumablesAdminProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const ConsumablesAdmin: React.FC<ConsumablesAdminProps> = ({ activeTab, onTabChange }) => {
  const { t } = useTranslation();
  const { secureFetch } = useSecureFetch();
  const API_URL = import.meta.env.VITE_API_URL || '';
  const [consumables, setConsumables] = useState<ConsumableTemplate[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingConsumable, setEditingConsumable] = useState<ConsumableTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'beer' as 'beer' | 'shot' | 'cocktail' | 'spirit' | 'wine' | 'soft',
    default_price: ''
  });
  const [refreshCounter, setRefreshCounter] = useState(0);

  const refreshConsumables = () => setRefreshCounter(c => c + 1);

  useEffect(() => {
    const loadConsumables = async () => {
      try {
        const response = await secureFetch(`${API_URL}/api/admin/consumables`);

        if (response.ok) {
          const data = await response.json();
          setConsumables(data.consumables || []);
        } else {
          const mockConsumables: ConsumableTemplate[] = [
            { id: 'cons-001', name: 'Chang', category: 'beer', icon: 'beer', default_price: 70, status: 'active', created_by: 'user-001', created_at: '2024-01-01', updated_at: '2024-01-01' },
            { id: 'cons-002', name: 'Heineken', category: 'beer', icon: 'beer', default_price: 90, status: 'active', created_by: 'user-001', created_at: '2024-01-01', updated_at: '2024-01-01' },
            { id: 'cons-003', name: 'Tiger', category: 'beer', icon: 'beer', default_price: 80, status: 'active', created_by: 'user-001', created_at: '2024-01-01', updated_at: '2024-01-01' },
            { id: 'cons-004', name: 'Tequila Shot', category: 'shot', icon: 'shot', default_price: 150, status: 'active', created_by: 'user-001', created_at: '2024-01-01', updated_at: '2024-01-01' },
            { id: 'cons-005', name: 'Mojito', category: 'cocktail', icon: 'cocktail', default_price: 200, status: 'active', created_by: 'user-001', created_at: '2024-01-01', updated_at: '2024-01-01' },
            { id: 'cons-006', name: 'Whisky', category: 'spirit', icon: 'spirit', default_price: 180, status: 'active', created_by: 'user-001', created_at: '2024-01-01', updated_at: '2024-01-01' }
          ];
          setConsumables(mockConsumables);
        }
      } catch (error) {
        logger.error('Failed to load consumables:', error);
        const mockConsumables: ConsumableTemplate[] = [
          { id: 'cons-001', name: 'Chang', category: 'beer', icon: 'beer', default_price: 70, status: 'active', created_by: 'user-001', created_at: '2024-01-01', updated_at: '2024-01-01' },
          { id: 'cons-002', name: 'Heineken', category: 'beer', icon: 'beer', default_price: 90, status: 'active', created_by: 'user-001', created_at: '2024-01-01', updated_at: '2024-01-01' },
          { id: 'cons-003', name: 'Tiger', category: 'beer', icon: 'beer', default_price: 80, status: 'active', created_by: 'user-001', created_at: '2024-01-01', updated_at: '2024-01-01' }
        ];
        setConsumables(mockConsumables);
      }
    };
    loadConsumables();
  }, [secureFetch, API_URL, refreshCounter]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const consumableData = {
      ...formData,
      icon: formData.category, // Store category key as icon identifier
      default_price: formData.default_price ? parseInt(formData.default_price) : undefined
    };

    try {
      const url = editingConsumable
        ? `${API_URL}/api/admin/consumables/${editingConsumable.id}`
        : `${API_URL}/api/admin/consumables`;

      const method = editingConsumable ? 'PUT' : 'POST';

      const response = await secureFetch(url, {
        method,
        body: JSON.stringify(consumableData)
      });

      if (response.ok) {
        setFormData({ name: '', category: 'beer', default_price: '' });
        setShowAddForm(false);
        setEditingConsumable(null);
        refreshConsumables();
        notification.success(
          editingConsumable
            ? t('admin.consumableUpdated', 'Consumable updated')
            : t('admin.consumableAdded', 'Consumable added')
        );
      } else {
        logger.error('Failed to save consumable');
        notification.error(t('admin.consumableSaveFailed', 'Failed to save consumable'));
      }
    } catch (error) {
      logger.error('Error saving consumable:', error);
      notification.error(t('admin.consumableSaveFailed', 'Failed to save consumable'));
      setFormData({ name: '', category: 'beer', default_price: '' });
      setShowAddForm(false);
      setEditingConsumable(null);
      refreshConsumables();
    }
  };

  const handleEdit = (consumable: ConsumableTemplate) => {
    setEditingConsumable(consumable);
    setFormData({
      name: consumable.name,
      category: consumable.category,
      default_price: consumable.default_price?.toString() || ''
    });
    setShowAddForm(true);
  };

  const handleToggleStatus = async (consumable: ConsumableTemplate) => {
    try {
      const newStatus = consumable.status === 'active' ? 'inactive' : 'active';

      const response = await secureFetch(`${API_URL}/api/admin/consumables/${consumable.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        refreshConsumables();
        notification.success(
          newStatus === 'active'
            ? t('admin.consumableActivated', 'Consumable activated')
            : t('admin.consumableDeactivated', 'Consumable deactivated')
        );
      } else {
        logger.error('Failed to toggle status');
        notification.error(t('admin.consumableStatusFailed', 'Failed to change status'));
      }
    } catch (error) {
      logger.error('Error toggling status:', error);
      notification.error(t('admin.consumableStatusFailed', 'Failed to change status'));
      refreshConsumables();
    }
  };

  const handleDelete = async (consumable: ConsumableTemplate) => {
    if (!window.confirm(t('admin.confirmDeleteConsumable', { name: consumable.name }))) {
      return;
    }

    try {
      const response = await secureFetch(`${API_URL}/api/admin/consumables/${consumable.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        refreshConsumables();
        notification.success(t('admin.consumableDeleted', 'Consumable deleted'));
      } else {
        logger.error('Failed to delete consumable');
        notification.error(t('admin.consumableDeleteFailed', 'Failed to delete consumable'));
      }
    } catch (error) {
      logger.error('Error deleting consumable:', error);
      notification.error(t('admin.consumableDeleteFailed', 'Failed to delete consumable'));
      refreshConsumables();
    }
  };

  const filterByCategory = (category: string) => {
    return consumables.filter(c => c.category === category);
  };

  const categories = [
    { key: 'beer', label: t('admin.beers'), icon: <Beer size={16} />, color: 'gold' },
    { key: 'shot', label: t('admin.shots'), icon: <Wine size={16} />, color: 'error' },
    { key: 'cocktail', label: t('admin.cocktails'), icon: <Martini size={16} />, color: 'cyan' },
    { key: 'spirit', label: t('admin.spirits'), icon: <Wine size={16} />, color: 'info' },
    { key: 'wine', label: t('admin.wines'), icon: <GlassWater size={16} />, color: 'success' },
    { key: 'soft', label: t('admin.softs'), icon: <CupSoda size={16} />, color: 'warning' }
  ];

  if (activeTab !== 'consumables') return null;

  return (
    <div className="command-content-section">
      {/* Breadcrumb Navigation */}
      <AdminBreadcrumb
        currentSection={t('admin.consumablesManagement')}
        onBackToDashboard={() => onTabChange('overview')}
        icon={<Beer size={16} />}
      />

      {/* Header */}
      <div className="cmd-section-header cmd-section-header--with-action">
        <div>
          <h1 className="cmd-section-title">
            <Beer size={28} />
            {t('admin.consumablesManagement')}
          </h1>
          <p className="cmd-section-subtitle">{t('admin.manageConsumablesList')}</p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={`cmd-modal-btn ${showAddForm ? 'cmd-modal-btn--secondary' : 'cmd-modal-btn--success'}`}
        >
          {showAddForm ? (
            <><X size={16} /> {t('common.cancel')}</>
          ) : (
            <><Plus size={16} /> {t('admin.addConsumable')}</>
          )}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="cmd-card cmd-card--form">
          <div className="cmd-card__header">
            <h3 className="cmd-card__title">
              {editingConsumable ? (
                <><Pencil size={18} /> {t('admin.editConsumableTitle')}</>
              ) : (
                <><Plus size={18} /> {t('admin.newConsumableTitle')}</>
              )}
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="cmd-form cmd-form--inline">
            <div className="cmd-form__group">
              <label className="cmd-form__label">{t('admin.consumableName')}</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="cmd-form__input"
                placeholder={t('admin.consumablePlaceholder')}
              />
            </div>

            <div className="cmd-form__group">
              <label className="cmd-form__label">{t('admin.category')}</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="cmd-form__select"
              >
                <option value="beer">{t('admin.beer')}</option>
                <option value="shot">{t('admin.shot')}</option>
                <option value="cocktail">{t('admin.cocktail')}</option>
                <option value="spirit">{t('admin.spirits')}</option>
                <option value="wine">{t('admin.wine')}</option>
                <option value="soft">{t('admin.soft')}</option>
              </select>
            </div>

            <div className="cmd-form__group">
              <label className="cmd-form__label">{t('admin.defaultPrice')}</label>
              <input
                type="number"
                name="default_price"
                value={formData.default_price}
                onChange={handleInputChange}
                className="cmd-form__input"
                placeholder="70"
              />
            </div>

            <div className="cmd-form__group">
              <label className="cmd-form__label">{t('admin.preview')}</label>
              <div className="cmd-form__preview">
                {getConsumableCategoryIcon(formData.category)}{' '}{formData.name || 'Nom'}
              </div>
            </div>

            <div className="cmd-form__group cmd-form__group--action">
              <button
                type="submit"
                disabled={!formData.name.trim()}
                className="cmd-modal-btn cmd-modal-btn--primary"
              >
                {editingConsumable ? (
                  <><Pencil size={14} /> {t('admin.editConsumableButton')}</>
                ) : (
                  <><Plus size={14} /> {t('admin.addButton')}</>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Categories Grid */}
      <div className="cmd-card-grid cmd-card-grid--2col">
        {categories.map(category => {
          const categoryConsumables = filterByCategory(category.key);

          return (
            <div key={category.key} className={`cmd-card cmd-card--category cmd-card--${category.color}`}>
              <div className="cmd-card__header">
                <h3 className="cmd-card__title">{category.icon} {category.label}</h3>
                <span className={`cmd-card__badge cmd-card__badge--${category.color}`}>
                  {categoryConsumables.length}
                </span>
              </div>

              <div className="cmd-card__content">
                {categoryConsumables.length === 0 ? (
                  <div className="cmd-table__empty cmd-table__empty--sm">
                    <p>{t('admin.noConsumablesInCategory')}</p>
                  </div>
                ) : (
                  <div className="cmd-consumable-list">
                    {categoryConsumables.map(consumable => (
                      <div key={consumable.id} className="cmd-consumable-item">
                        <div className="cmd-consumable-item__info">
                          <span className="cmd-consumable-item__icon">{getConsumableCategoryIcon(consumable.category)}</span>
                          <div className="cmd-consumable-item__details">
                            <span className="cmd-consumable-item__name">{consumable.name}</span>
                            {consumable.default_price && (
                              <span className="cmd-consumable-item__price">
                                {t('admin.defaultPriceLabel')}: {consumable.default_price}฿
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="cmd-consumable-item__actions">
                          <span className={`cmd-consumable-item__status cmd-consumable-item__status--${consumable.status}`}>
                            {consumable.status === 'active' ? (
                              <><CheckCircle size={12} /> {t('admin.active')}</>
                            ) : (
                              <><X size={12} /> {t('admin.inactive')}</>
                            )}
                          </span>

                          <button
                            onClick={() => handleEdit(consumable)}
                            className="cmd-card__action cmd-card__action--icon cmd-card__action--info"
                            title={t('common.edit')}
                          >
                            <Pencil size={14} />
                          </button>

                          <button
                            onClick={() => handleToggleStatus(consumable)}
                            className={`cmd-card__action cmd-card__action--icon ${consumable.status === 'active' ? 'cmd-card__action--warning' : 'cmd-card__action--success'}`}
                            title={consumable.status === 'active' ? t('admin.deactivate') : t('admin.activate')}
                          >
                            {consumable.status === 'active' ? <Ban size={14} /> : <CheckCircle size={14} />}
                          </button>

                          <button
                            onClick={() => handleDelete(consumable)}
                            className="cmd-card__action cmd-card__action--icon cmd-card__action--danger"
                            title={t('common.delete')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConsumablesAdmin;
