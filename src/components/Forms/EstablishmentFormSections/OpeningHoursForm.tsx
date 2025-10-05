import React from 'react';

interface OpeningHoursFormProps {
  formData: {
    opening_hours: {
      open: string;
      close: string;
    };
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const OpeningHoursForm: React.FC<OpeningHoursFormProps> = ({ formData, onChange }) => {
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
        🕐 Heures d'Ouverture
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <label className="label-nightlife">
            Heure d'ouverture
          </label>
          <input
            type="time"
            name="opening_hours.open"
            value={formData.opening_hours.open}
            onChange={onChange}
            style={{
              width: '100%',
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
          />
        </div>

        <div>
          <label className="label-nightlife">
            Heure de fermeture
          </label>
          <input
            type="time"
            name="opening_hours.close"
            value={formData.opening_hours.close}
            onChange={onChange}
            style={{
              width: '100%',
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
          />
        </div>
      </div>

      <div style={{
        marginTop: '10px',
        padding: '10px',
        backgroundColor: '#1a1a1a',
        borderRadius: '8px',
        fontSize: '12px',
        color: 'var(--nightlife-secondary)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(0,255,255,0.3)'
      }}>
        💡 Conseil: La plupart des bars de Pattaya ouvrent vers 14h et ferment vers 2h du matin
      </div>
    </div>
  );
};

export default OpeningHoursForm;