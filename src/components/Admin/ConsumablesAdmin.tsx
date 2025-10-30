import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ConsumableTemplate } from '../../types';
import AdminBreadcrumb from '../Common/AdminBreadcrumb';
import { logger } from '../../utils/logger';
import { getCategoryIcon } from '../../utils/iconMapper';

interface ConsumablesAdminProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const ConsumablesAdmin: React.FC<ConsumablesAdminProps> = ({ activeTab, onTabChange }) => {
  const { t } = useTranslation();
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
  const [consumables, setConsumables] = useState<ConsumableTemplate[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingConsumable, setEditingConsumable] = useState<ConsumableTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'beer' as 'beer' | 'shot' | 'cocktail' | 'spirit' | 'wine' | 'soft',
    icon: '🍺',
    default_price: ''
  });

  useEffect(() => {
    loadConsumables();
  }, []);

  const loadConsumables = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/consumables`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setConsumables(data.consumables || []);
      } else {
        // Fallback to mock data if API not available
        const mockConsumables: ConsumableTemplate[] = [
          { id: 'cons-001', name: 'Chang', category: 'beer', icon: '🍺', default_price: 70, status: 'active', created_by: 'user-001', created_at: '2024-01-01', updated_at: '2024-01-01' },
          { id: 'cons-002', name: 'Heineken', category: 'beer', icon: '🍺', default_price: 90, status: 'active', created_by: 'user-001', created_at: '2024-01-01', updated_at: '2024-01-01' },
          { id: 'cons-003', name: 'Tiger', category: 'beer', icon: '🍺', default_price: 80, status: 'active', created_by: 'user-001', created_at: '2024-01-01', updated_at: '2024-01-01' },
          { id: 'cons-004', name: 'Tequila Shot', category: 'shot', icon: '🥃', default_price: 150, status: 'active', created_by: 'user-001', created_at: '2024-01-01', updated_at: '2024-01-01' },
          { id: 'cons-005', name: 'Mojito', category: 'cocktail', icon: '🍹', default_price: 200, status: 'active', created_by: 'user-001', created_at: '2024-01-01', updated_at: '2024-01-01' },
          { id: 'cons-006', name: 'Whisky', category: 'spirit', icon: '🥂', default_price: 180, status: 'active', created_by: 'user-001', created_at: '2024-01-01', updated_at: '2024-01-01' }
        ];
        setConsumables(mockConsumables);
      }
    } catch (error) {
      logger.error('Failed to load consumables:', error);
      // Fallback to mock data
      const mockConsumables: ConsumableTemplate[] = [
        { id: 'cons-001', name: 'Chang', category: 'beer', icon: '🍺', default_price: 70, status: 'active', created_by: 'user-001', created_at: '2024-01-01', updated_at: '2024-01-01' },
        { id: 'cons-002', name: 'Heineken', category: 'beer', icon: '🍺', default_price: 90, status: 'active', created_by: 'user-001', created_at: '2024-01-01', updated_at: '2024-01-01' },
        { id: 'cons-003', name: 'Tiger', category: 'beer', icon: '🍺', default_price: 80, status: 'active', created_by: 'user-001', created_at: '2024-01-01', updated_at: '2024-01-01' }
      ];
      setConsumables(mockConsumables);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const consumableData = {
      ...formData,
      icon: getCategoryIcon(formData.category),
      default_price: formData.default_price ? parseInt(formData.default_price) : undefined
    };
    
    try {
      const url = editingConsumable
        ? `${API_URL}/api/admin/consumables/${editingConsumable.id}`
        : `${API_URL}/api/admin/consumables`;
      
      const method = editingConsumable ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(consumableData)
      });
      
      if (response.ok) {
        // Reset form
        setFormData({ name: '', category: 'beer', icon: '🍺', default_price: '' });
        setShowAddForm(false);
        setEditingConsumable(null);
        loadConsumables();
      } else {
        logger.error('Failed to save consumable');
      }
    } catch (error) {
      logger.error('Error saving consumable:', error);
      // For demo purposes, still reset form
      setFormData({ name: '', category: 'beer', icon: '🍺', default_price: '' });
      setShowAddForm(false);
      setEditingConsumable(null);
      loadConsumables();
    }
  };

  const handleEdit = (consumable: ConsumableTemplate) => {
    setEditingConsumable(consumable);
    setFormData({
      name: consumable.name,
      category: consumable.category,
      icon: consumable.icon,
      default_price: consumable.default_price?.toString() || ''
    });
    setShowAddForm(true);
  };

  const handleToggleStatus = async (consumable: ConsumableTemplate) => {
    try {
      const newStatus = consumable.status === 'active' ? 'inactive' : 'active';
      
      const response = await fetch(`${API_URL}/api/admin/consumables/${consumable.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        loadConsumables();
      } else {
        logger.error('Failed to toggle status');
      }
    } catch (error) {
      logger.error('Error toggling status:', error);
      // For demo purposes, still reload
      loadConsumables();
    }
  };

  const handleDelete = async (consumable: ConsumableTemplate) => {
    if (!window.confirm(t('admin.confirmDeleteConsumable', { name: consumable.name }))) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/consumables/${consumable.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        loadConsumables();
      } else {
        logger.error('Failed to delete consumable');
      }
    } catch (error) {
      logger.error('Error deleting consumable:', error);
      // For demo purposes, still reload
      loadConsumables();
    }
  };

  const filterByCategory = (category: string) => {
    return consumables.filter(c => c.category === category);
  };

  const categories = [
    { key: 'beer', label: `🍺 ${t('admin.beers')}`, color: '#FFD700' },
    { key: 'shot', label: `🥃 ${t('admin.shots')}`, color: '#FF6B6B' },
    { key: 'cocktail', label: `🍹 ${t('admin.cocktails')}`, color: '#4ECDC4' },
    { key: 'spirit', label: `🥂 ${t('admin.spirits')}`, color: '#45B7D1' },
    { key: 'wine', label: `🍷 ${t('admin.wines')}`, color: '#96CEB4' },
    { key: 'soft', label: `🥤 ${t('admin.softs')}`, color: '#FFEAA7' }
  ];

  if (activeTab !== 'consumables') return null;

  return (
    <div className="bg-nightlife-gradient-main"
      style={{
        minHeight: '100vh',
        padding: '30px',
        color: 'white'
      }}>

      {/* Breadcrumb Navigation */}
      <AdminBreadcrumb
        currentSection={t('admin.consumablesManagement')}
        onBackToDashboard={() => onTabChange('overview')}
        icon="🍺"
      />

      {/* Header */}
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '900',
            margin: '0 0 5px 0',
            background: 'linear-gradient(45deg, #C19A6B, #FFD700)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontFamily: '"Orbitron", monospace'
          }}>
            🍺 {t('admin.consumablesManagement')}
          </h1>
          <p style={{ fontSize: '14px', color: '#cccccc', margin: 0 }}>
            {t('admin.manageConsumablesList')}
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            padding: '12px 20px',
            background: 'linear-gradient(45deg, #00FF7F, #FFD700)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'all 0.3s ease'
          }}
        >
          {showAddForm ? `❌ ${t('common.cancel')}` : `➕ ${t('admin.addConsumable')}`}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(193, 154, 107,0.1), rgba(0,0,0,0.3))',
          borderRadius: '15px',
          border: '2px solid rgba(193, 154, 107,0.3)',
          padding: '25px',
          marginBottom: '30px'
        }}>
          <h3 style={{
            color: '#C19A6B',
            fontSize: '18px',
            fontWeight: 'bold',
            margin: '0 0 20px 0'
          }}>
            {editingConsumable ? `✏️ ${t('admin.editConsumableTitle')}` : `➕ ${t('admin.newConsumableTitle')}`}
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '15px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold', color: '#00E5FF' }}>
                {t('admin.consumableName')}
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '2px solid rgba(193, 154, 107,0.3)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: 'white',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                placeholder={t('admin.consumablePlaceholder')}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold', color: '#00E5FF' }}>
                {t('admin.category')}
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '2px solid rgba(193, 154, 107,0.3)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: 'white',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              >
                <option value="beer" style={{ background: '#1a1a1a' }}>🍺 {t('admin.beer')}</option>
                <option value="shot" style={{ background: '#1a1a1a' }}>🥃 {t('admin.shot')}</option>
                <option value="cocktail" style={{ background: '#1a1a1a' }}>🍹 {t('admin.cocktail')}</option>
                <option value="spirit" style={{ background: '#1a1a1a' }}>🥂 {t('admin.spirits')}</option>
                <option value="wine" style={{ background: '#1a1a1a' }}>🍷 {t('admin.wine')}</option>
                <option value="soft" style={{ background: '#1a1a1a' }}>🥤 {t('admin.soft')}</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold', color: '#00E5FF' }}>
                {t('admin.defaultPrice')}
              </label>
              <input
                type="number"
                name="default_price"
                value={formData.default_price}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '2px solid rgba(193, 154, 107,0.3)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: 'white',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                placeholder="70"
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold', color: '#00E5FF' }}>
                {t('admin.preview')}
              </label>
              <div style={{
                padding: '10px 12px',
                background: 'rgba(193, 154, 107,0.1)',
                border: '2px solid rgba(193, 154, 107,0.3)',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#00E5FF',
                textAlign: 'center'
              }}>
                {getCategoryIcon(formData.category)} {formData.name || 'Nom'}
              </div>
            </div>
            
            <button
              type="submit"
              disabled={!formData.name.trim()}
              style={{
                padding: '10px 15px',
                background: 'linear-gradient(45deg, #C19A6B, #9C27B0)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: formData.name.trim() ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: 'bold',
                opacity: formData.name.trim() ? 1 : 0.5
              }}
            >
              {editingConsumable ? `✏️ ${t('admin.editConsumableButton')}` : `➕ ${t('admin.addButton')}`}
            </button>
          </form>
        </div>
      )}

      {/* Categories Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '25px' }}>
        {categories.map(category => {
          const categoryConsumables = filterByCategory(category.key);
          
          return (
            <div
              key={category.key}
              style={{
                background: 'linear-gradient(135deg, rgba(193, 154, 107,0.1), rgba(0,0,0,0.3))',
                borderRadius: '15px',
                border: `2px solid ${category.color}40`,
                padding: '20px'
              }}
            >
              <h3 style={{
                color: category.color,
                fontSize: '18px',
                fontWeight: 'bold',
                margin: '0 0 15px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                {category.label}
                <span style={{
                  background: `${category.color}20`,
                  color: category.color,
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {categoryConsumables.length}
                </span>
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {categoryConsumables.length === 0 ? (
                  <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: '#666',
                    fontStyle: 'italic'
                  }}>
                    {t('admin.noConsumablesInCategory')}
                  </div>
                ) : (
                  categoryConsumables.map(consumable => (
                    <div
                      key={consumable.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 15px',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>{consumable.icon}</span>
                        <div>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: 'bold',
                            color: '#ffffff'
                          }}>
                            {consumable.name}
                          </div>
                          {consumable.default_price && (
                            <div style={{
                              fontSize: '12px',
                              color: category.color
                            }}>
                              {t('admin.defaultPriceLabel')}: {consumable.default_price}฿
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          background: consumable.status === 'active' ? '#4CAF5020' : '#FF475720',
                          color: consumable.status === 'active' ? '#4CAF50' : '#FF4757'
                        }}>
                          {consumable.status === 'active' ? `✅ ${t('admin.active')}` : `❌ ${t('admin.inactive')}`}
                        </div>
                        
                        <button
                          onClick={() => handleEdit(consumable)}
                          style={{
                            padding: '6px 10px',
                            background: 'linear-gradient(45deg, #00E5FF, #0080FF)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                        >
                          ✏️
                        </button>
                        
                        <button
                          onClick={() => handleToggleStatus(consumable)}
                          style={{
                            padding: '6px 10px',
                            background: consumable.status === 'active' 
                              ? 'linear-gradient(45deg, #FF4757, #C19A6B)'
                              : 'linear-gradient(45deg, #4CAF50, #00FF7F)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                        >
                          {consumable.status === 'active' ? '🚫' : '✅'}
                        </button>
                        
                        <button
                          onClick={() => handleDelete(consumable)}
                          style={{
                            padding: '6px 10px',
                            background: 'linear-gradient(45deg, #8B0000, #FF0000)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                          title="Supprimer définitivement"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
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