import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import GirlsGallery from './GirlsGallery';
import BarInfoSidebar from './BarInfoSidebar';
import EstablishmentForm from '../Forms/EstablishmentForm';
import { Employee, Establishment } from '../../types';
import { logger } from '../../utils/logger';

// Plus de données hardcodées - utilisation exclusive de l'API

interface BarDetailPageProps {}

const BarDetailPage: React.FC<BarDetailPageProps> = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedGirl, setSelectedGirl] = useState<Employee | null>(null);
  const [bar, setBar] = useState<Establishment | null>(null);
  const [girls, setGirls] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedBar, setEditedBar] = useState<Establishment | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const { user, token } = useAuth();
  const { secureFetch } = useSecureFetch();

  // Logo upload states for Edit Mode
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

  // Initialize edited data when bar changes
  useEffect(() => {
    if (bar) {
      setEditedBar({ ...bar });
    }
  }, [bar]);

  const handleSaveChanges = async () => {
    if (!editedBar || !id) return;

    setIsSaving(true);

    try {
      // Upload logo first if there's a new file
      let logoUrl = editedBar.logo_url;
      if (logoFile) {
        const uploadedUrl = await uploadLogoFile(logoFile);
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
          // Update editedBar with new logo URL
          setEditedBar(prev => prev ? { ...prev, logo_url: logoUrl } : null);
        } else {
          setIsSaving(false);
          return; // Abort save if logo upload failed
        }
      }

      // Helper to convert category_id from STRING back to INTEGER for DB
      const categoryIdToInt = (catId: string | number): number => {
        // If already a number, return it
        if (typeof catId === 'number') return catId;

        // Extract number from "cat-006" format
        const match = catId.match(/cat-(\d+)/);
        return match ? parseInt(match[1], 10) : 1;
      };

      // Clean the data before sending - only send allowed fields
      const cleanedData = {
        name: editedBar.name,
        address: editedBar.address,
        description: editedBar.description,
        phone: editedBar.phone,
        website: editedBar.website,
        logo_url: logoUrl, // Include uploaded logo URL
        opening_hours: editedBar.opening_hours,
        services: editedBar.services,
        category_id: categoryIdToInt(editedBar.category_id), // Convert STRING → INTEGER
        zone: editedBar.zone,
        grid_row: editedBar.grid_row,
        grid_col: editedBar.grid_col,
        // Champs de pricing (nouveaux)
        ladydrink: editedBar.ladydrink,
        barfine: editedBar.barfine,
        rooms: editedBar.rooms,
        pricing: editedBar.pricing
      };
      if (isAdmin) {
        const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/establishments/${id}`, {
          method: 'PUT',
          body: JSON.stringify(cleanedData)
        });

        if (response.ok) {
          const updatedData = await response.json();

          setBar(updatedData.establishment || editedBar);
          setIsEditMode(false);

          setShowSuccessMessage(true);
          setTimeout(() => setShowSuccessMessage(false), 3000);
        } else {
          const errorData = await response.text();
          logger.error('❌ Failed to update establishment - Status:', response.status);
          logger.error('❌ Error response:', errorData);
          alert(`Error saving changes: ${response.status} - ${errorData}`);
        }
      } else {
        const currentValues = {
          name: bar?.name,
          address: bar?.address,
          description: bar?.description,
          phone: bar?.phone,
          opening_hours: bar?.opening_hours,
          ladydrink: bar?.ladydrink,
          barfine: bar?.barfine,
          rooms: bar?.rooms,
          pricing: bar?.pricing
        };

        const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/edit-proposals`, {
          method: 'POST',
          body: JSON.stringify({
            item_type: 'establishment',
            item_id: id,
            proposed_changes: cleanedData,
            current_values: currentValues
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.auto_approved) {
            alert('✅ Modifications appliquées immédiatement !');
            window.location.reload();
          } else {
            alert('✅ Merci ! Votre modification sera examinée par un modérateur.');
          }
          setIsEditMode(false);
        } else {
          alert('❌ Erreur lors de la création de la proposition');
        }
      }
    } catch (error) {
      logger.error('Error updating establishment:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (bar) {
      setEditedBar({ ...bar }); // Reset to original data
    }
    setIsEditMode(false);
    // Reset logo states
    setLogoFile(null);
    setLogoPreviewUrl(null);
  };

  // Logo handlers for Edit Mode
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      // Validation
      if (!file.type.startsWith('image/')) {
        alert('🖼️ Please select an image file (JPG, PNG, GIF)');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        alert(`🚨 Logo file too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Please use an image under 2MB.`);
        return;
      }

      setLogoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setLogoPreviewUrl(previewUrl);
      logger.debug('🖼️ Logo file selected:', file.name);
    }
  };

  const uploadLogoFile = async (file: File): Promise<string | null> => {
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      logger.debug('🎨 Uploading logo:', file.name);

      const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/upload/establishment-logo`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        logger.debug('✅ Logo uploaded successfully:', data.logo?.url);
        return data.logo?.url || null;
      } else {
        const errorData = await response.json();
        logger.error('❌ Logo upload failed:', errorData);
        alert(`❌ Failed to upload logo: ${errorData.error || 'Unknown error'}`);
        return null;
      }
    } catch (error) {
      logger.error('❌ Logo upload error:', error);
      alert('❌ Failed to upload logo. Please try again.');
      return null;
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    if (window.confirm('🗑️ Are you sure you want to remove the logo?')) {
      updateEditedField('logo_url', '');
      setLogoFile(null);
      setLogoPreviewUrl(null);
      logger.debug('🗑️ Logo removed');
    }
  };

  const updateEditedField = (field: string, value: any) => {
    if (!editedBar) return;
    setEditedBar({
      ...editedBar,
      [field]: value
    });
  };

  const handleEditSubmit = async (establishmentData: any) => {
    if (!bar || !id) return;

    try {
      const currentValues = {
        name: bar.name,
        address: bar.address,
        description: bar.description,
        phone: bar.phone,
        website: bar.website,
        logo_url: bar.logo_url,
        opening_hours: bar.opening_hours,
        services: bar.services,
        zone: bar.zone,
        category_id: bar.category_id,
        ladydrink: bar.ladydrink,
        barfine: bar.barfine,
        rooms: bar.rooms,
        pricing: bar.pricing
      };

      if (user?.role === 'admin' || user?.role === 'moderator') {
        // Admin/Moderator -> édition directe
        const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/establishments/${id}`, {
          method: 'PUT',
          body: JSON.stringify(establishmentData)
        });

        if (response.ok) {
          const data = await response.json();
          setBar(data.establishment);
          setShowEditModal(false);
          alert('✅ Modifications appliquées immédiatement !');
          window.location.reload();
        } else {
          throw new Error('Failed to update establishment');
        }
      } else {
        // User normal -> création proposal
        const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/edit-proposals`, {
          method: 'POST',
          body: JSON.stringify({
            item_type: 'establishment',
            item_id: id,
            proposed_changes: establishmentData,
            current_values: currentValues
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.auto_approved) {
            alert('✅ Modifications appliquées immédiatement !');
            window.location.reload();
          } else {
            alert('✅ Merci ! Votre modification sera examinée par un modérateur.');
          }
          setShowEditModal(false);
        } else {
          throw new Error('Failed to create proposal');
        }
      }
    } catch (error) {
      logger.error('Error submitting edit:', error);
      alert('❌ Erreur lors de la soumission de la modification');
    }
  };

  useEffect(() => {
    const loadBarData = async () => {
      // Early return if no ID
      if (!id) {
        logger.error('❌ No establishment ID provided, redirecting to home');
        navigate('/');
        return;
      }

      setLoading(true);
      try {
        // Charger les données du bar depuis l'API
        const barResponse = await secureFetch(`${process.env.REACT_APP_API_URL}/api/establishments/${id}`);
        if (barResponse.ok) {
          const barData = await barResponse.json();
          setBar(barData.establishment);
        } else {
          logger.error('Bar not found:', id);
          // No fallback - redirect to home if bar not found
          navigate('/');
          return;
        }

        // Charger les employées depuis l'API
        const employeesResponse = await secureFetch(`${process.env.REACT_APP_API_URL}/api/employees?establishment_id=${id}`);
        if (employeesResponse.ok) {
          const employeesData = await employeesResponse.json();
          setGirls(employeesData.employees || []);
        } else {
          logger.error('Failed to load employees');
          // Plus de fallback sur données de test - utilisation exclusive de l'API
          setGirls([]);
        }
      } catch (error) {
        logger.error('Error loading bar data:', error);
        logger.error('Failed to load bar data, redirecting to home');
        navigate('/');
        // Plus de fallback sur données d'employées - utilisation exclusive de l'API
        setGirls([]);
      } finally {
        setLoading(false);
      }
    };

    loadBarData();
  }, [id, navigate]);


  if (loading) {
    return (
      <div className="loading-container-nightlife bg-nightlife-gradient-main establishment-page-container-nightlife page-content-with-header-nightlife">
        <div className="establishment-loading-container-nightlife">
          <div className="establishment-loading-icon-nightlife">
            💃
          </div>
          <div className="establishment-loading-text-nightlife">
            Loading beautiful girls...
          </div>
        </div>
      </div>
    );
  }

  if (!bar) {
    return (
      <div className="loading-container-nightlife bg-nightlife-gradient-main establishment-page-container-nightlife page-content-with-header-nightlife">
        <div className="establishment-empty-state-nightlife">
          <h2 className="establishment-empty-title-nightlife">Bar not found</h2>
          <button
            onClick={() => navigate('/')}
            className="btn-primary-nightlife"
          >
            Back to Map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-nightlife-gradient-main establishment-page-container-nightlife page-content-with-header-nightlife">
      <style>
        {`
          @keyframes fadeInOut {
            0% { opacity: 0; transform: translateX(100px); }
            20% { opacity: 1; transform: translateX(0); }
            80% { opacity: 1; transform: translateX(0); }
            100% { opacity: 0; transform: translateX(100px); }
          }
        `}
      </style>

      {/* Header du bar */}
      <div className="establishment-header-nightlife">
        <div className="establishment-header-content-nightlife">
          <div className="establishment-header-info-nightlife">
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              {/* Logo - Editable in Edit Mode */}
              {isEditMode && editedBar ? (
                <div style={{ position: 'relative' }}>
                  <div
                    onClick={() => {
                      if (!uploadingLogo) {
                        const fileInput = document.getElementById('header-logo-upload') as HTMLInputElement;
                        if (fileInput) fileInput.click();
                      }
                    }}
                    className="establishment-logo-header-nightlife"
                    style={{
                      cursor: uploadingLogo ? 'not-allowed' : 'pointer',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      if (!uploadingLogo) {
                        const overlay = e.currentTarget.querySelector('.logo-hover-overlay') as HTMLElement;
                        if (overlay) overlay.style.opacity = '1';
                      }
                    }}
                    onMouseLeave={(e) => {
                      const overlay = e.currentTarget.querySelector('.logo-hover-overlay') as HTMLElement;
                      if (overlay) overlay.style.opacity = '0';
                    }}
                  >
                    {uploadingLogo ? (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.8)',
                        color: '#00FFFF',
                        fontSize: '24px'
                      }}>
                        ⏳
                      </div>
                    ) : (
                      (logoPreviewUrl || editedBar.logo_url) && (
                        <img
                          src={logoPreviewUrl || editedBar.logo_url}
                          alt={`${editedBar.name} logo`}
                          className="establishment-logo-header-image-nightlife"
                          onError={(e) => {
                            const target = e.target as HTMLElement;
                            target.style.display = 'none';
                          }}
                        />
                      )
                    )}

                    {/* Hover Overlay */}
                    {!uploadingLogo && (
                      <div
                        className="logo-hover-overlay"
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: 'rgba(0,0,0,0.75)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0,
                          transition: 'opacity 0.3s ease',
                          pointerEvents: 'none',
                          borderRadius: '12px'
                        }}
                      >
                        <div style={{
                          color: '#00FFFF',
                          fontSize: '11px',
                          fontWeight: '600',
                          textAlign: 'center'
                        }}>
                          📸<br/>Click to<br/>change
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Hidden file input */}
                  <input
                    id="header-logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    disabled={uploadingLogo}
                    style={{ display: 'none' }}
                  />

                  {/* Remove Icon - Only if logo exists */}
                  {!uploadingLogo && (logoPreviewUrl || editedBar.logo_url) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRemoveLogo();
                      }}
                      style={{
                        position: 'absolute',
                        top: '5px',
                        right: '5px',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #F44336, #D32F2F)',
                        border: '2px solid white',
                        color: 'white',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s ease',
                        zIndex: 10,
                        boxShadow: '0 2px 8px rgba(244,67,54,0.4)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.15)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(244,67,54,0.6)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(244,67,54,0.4)';
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ) : (
                /* Logo Read-Only */
                bar.logo_url && (
                  <div className="establishment-logo-header-nightlife">
                    <img
                      src={bar.logo_url}
                      alt={`${bar.name} logo`}
                      className="establishment-logo-header-image-nightlife"
                      onError={(e) => {
                        // Hide logo if it fails to load
                        const target = e.target as HTMLElement;
                        const parent = target.parentElement?.parentElement;
                        if (parent) {
                          parent.style.display = 'none';
                        }
                      }}
                    />
                  </div>
                )
              )}

              {/* Text content */}
              <div>
              {isEditMode && editedBar ? (
                <input
                  type="text"
                  value={editedBar.name}
                  onChange={(e) => updateEditedField('name', e.target.value)}
                  className="establishment-name-input-nightlife"
                />
              ) : (
                <h1 className="establishment-name-nightlife">
                  {bar.name}
                </h1>
              )}

              {isEditMode && editedBar ? (
                <textarea
                  value={editedBar.description || ''}
                  onChange={(e) => updateEditedField('description', e.target.value)}
                  placeholder="Add establishment description..."
                  className="establishment-description-textarea-nightlife"
                />
              ) : (
                <p className="establishment-meta-nightlife">
                  {bar.description || 'Soi 6 Premium Experience'}
                </p>
              )}
              </div>
            </div>
          </div>

          {/* Admin Edit/Save Buttons */}
          {isAdmin && (
            <div className="establishment-buttons-group-nightlife">
              {isEditMode ? (
                <>
                  <button
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    className="btn-secondary-nightlife"
                    style={{
                      background: isSaving ? 'rgba(76,175,80,0.5)' : undefined,
                      cursor: isSaving ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isSaving ? '⏳ Saving...' : '💾 Save Changes'}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="btn-primary-nightlife"
                    style={{
                      background: 'linear-gradient(45deg, #f44336, #ff5722)'
                    }}
                  >
                    ❌ Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditMode(true)}
                  className="btn-accent-nightlife"
                >
                  ✏️ Edit Mode
                </button>
              )}
            </div>
          )}

          {/* Public Suggest Edit Button */}
          {user && !isAdmin && (
            <div className="establishment-buttons-group-nightlife">
              <button
                onClick={() => setShowEditModal(true)}
                className={user.role === 'admin' || user.role === 'moderator'
                  ? 'btn-primary-nightlife'
                  : 'btn-secondary-nightlife'
                }
              >
                {user.role === 'admin' || user.role === 'moderator' ? '✏️ Edit' : '✏️ Suggest Edit'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Message de succès */}
      {showSuccessMessage && (
        <div className="btn-secondary-nightlife establishment-success-message-nightlife">
          ✅ Modifications sauvegardées avec succès !
        </div>
      )}

      {/* Contenu principal */}
      <div className="establishment-layout-nightlife">
        {/* Zone principale des serveuses (80%) */}
        <div className="establishment-main-content-nightlife">
          <GirlsGallery 
            girls={girls}
            onGirlClick={setSelectedGirl}
            selectedGirl={selectedGirl}
          />
        </div>

        {/* Sidebar infos bar (20%) */}
        <div className="establishment-sidebar-nightlife">
          {bar && (
            <BarInfoSidebar
              bar={bar}
              isEditMode={isEditMode}
              editedBar={editedBar}
              onUpdateField={updateEditedField}
            />
          )}
        </div>
      </div>

      {/* Edit Establishment Modal */}
      {showEditModal && bar && (
        <div className="profile-overlay-nightlife">
          <div className="establishment-container-nightlife establishment-edit-modal-content-nightlife">
            {/* Close Button */}
            <button
              onClick={() => setShowEditModal(false)}
              className="profile-close-button"
            >
              ×
            </button>

            <div className="establishment-edit-modal-padding-nightlife">
              <h2 className="establishment-section-title-nightlife establishment-edit-modal-title-nightlife">
                {user?.role === 'admin' || user?.role === 'moderator'
                  ? '✏️ Edit Establishment'
                  : '✏️ Suggest Edit'}
              </h2>
              <p className="establishment-edit-modal-description-nightlife">
                {user?.role === 'admin' || user?.role === 'moderator'
                  ? 'Modify establishment information directly'
                  : 'Propose changes to establishment information for review'}
              </p>

              <EstablishmentForm
                onSubmit={handleEditSubmit}
                onCancel={() => setShowEditModal(false)}
                initialData={bar}
              />
            </div>
          </div>
        </div>
      )}

      {/* CSS pour les animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        
        @media (max-width: 768px) {
          .bar-detail-container {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
            padding: 20px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default BarDetailPage;