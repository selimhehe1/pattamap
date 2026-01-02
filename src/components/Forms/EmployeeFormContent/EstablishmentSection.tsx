import React from 'react';
import { Building2, Store } from 'lucide-react';
import { getZoneLabel } from '../../../utils/constants';
import type { EstablishmentSectionProps } from './types';

// Icon style helper
const iconStyle = { marginRight: '6px', verticalAlign: 'middle' as const };

/**
 * EstablishmentSection Component
 *
 * Form section for selecting current employment establishment.
 * Groups establishments by zone for easier navigation.
 */
const EstablishmentSection: React.FC<EstablishmentSectionProps> = ({
  establishments,
  currentEstablishmentId,
  onChange
}) => {
  // Filter establishments with zone only
  const establishmentsWithZone = establishments.filter(est => est.zone);

  // Group by zone
  const groupedByZone = establishmentsWithZone.reduce((acc, est) => {
    const zone = est.zone || 'other';
    if (!acc[zone]) acc[zone] = [];
    acc[zone].push(est);
    return acc;
  }, {} as Record<string, typeof establishments>);

  // Sort each group alphabetically
  Object.keys(groupedByZone).forEach(zone => {
    groupedByZone[zone].sort((a, b) => a.name.localeCompare(b.name));
  });

  // Sort zones alphabetically (using centralized getZoneLabel)
  const sortedZones = Object.keys(groupedByZone).sort((a, b) =>
    getZoneLabel(a).localeCompare(getZoneLabel(b))
  );

  return (
    <div className="uf-section">
      <h3 className="uf-section-title">
        <Building2 size={16} style={iconStyle} /> Current Employment (Optional)
      </h3>

      <div className="uf-field">
        <label className="uf-label">
          <Store size={14} style={iconStyle} /> Current Establishment
        </label>
        <select
          name="current_establishment_id"
          value={currentEstablishmentId}
          onChange={onChange}
          className="uf-select"
        >
          <option value="">Select establishment</option>
          {sortedZones.map(zone => (
            <optgroup key={zone} label={getZoneLabel(zone)}>
              {groupedByZone[zone].map(est => (
                <option key={est.id} value={est.id}>
                  {est.name} - {est.category?.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
    </div>
  );
};

export default EstablishmentSection;
