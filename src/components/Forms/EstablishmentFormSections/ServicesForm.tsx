import React from 'react';

// Force recompile 2

interface ServicesFormProps {
  formData: {
    services: string[];
  };
  serviceInput: string;
  onServiceInputChange: (value: string) => void;
  onAddService: () => void;
  onRemoveService: (service: string) => void;
}

const ServicesForm: React.FC<ServicesFormProps> = ({
  formData,
  serviceInput,
  onServiceInputChange,
  onAddService,
  onRemoveService
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onAddService();
    }
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
        ⭐ Services
      </h3>

      <div style={{ marginBottom: '12px' }}>
        <label className="label-nightlife">
          Ajouter un service
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={serviceInput}
            onChange={(e) => onServiceInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            style={{
              flex: 1,
              padding: '10px 12px',
              background: '#1a1a1a',
              border: '2px solid rgba(255,27,141,0.3)',
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
              e.target.style.borderColor = 'rgba(255,27,141,0.3)';
              e.target.style.boxShadow = 'none';
            }}
            placeholder="Ex: Billard, Karaoke, Terrasse..."
          />
          <button
            type="button"
            onClick={onAddService}
            disabled={!serviceInput.trim()}
            style={{
              padding: '10px 15px',
              backgroundColor: serviceInput.trim() ? 'var(--nightlife-secondary)' : 'rgba(0,0,0,0.5)',
              color: serviceInput.trim() ? '#000' : '#666',
              border: '2px solid ' + (serviceInput.trim() ? 'var(--nightlife-secondary)' : 'rgba(255,27,141,0.3)'),
              borderRadius: '8px',
              cursor: serviceInput.trim() ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)'
            }}
          >
            ➕ Ajouter
          </button>
        </div>
      </div>

      {formData.services.length > 0 && (
        <div>
          <label className="label-nightlife">
            Services ajoutés:
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {formData.services.map((service, index) => (
              <span
                key={index}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 12px',
                  backgroundColor: 'rgba(0,255,255,0.2)',
                  color: 'var(--nightlife-secondary)',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '500',
                  border: '1px solid var(--nightlife-secondary)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                {service}
                <button
                  type="button"
                  onClick={() => onRemoveService(service)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--nightlife-secondary)',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    marginLeft: '4px',
                    fontSize: '14px',
                    lineHeight: '1',
                    borderRadius: '50%',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  title="Supprimer ce service"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

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
        💡 Suggestions: Pool/Billard, Karaoke, Terrasse, Climatisation, WiFi, Sport TV, Live Music, Jeux, Bar Food, Happy Hour
      </div>
    </div>
  );
};

export default ServicesForm;