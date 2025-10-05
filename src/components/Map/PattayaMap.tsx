import React, { useState, useMemo, useEffect } from 'react';
import { ZONES, Zone } from './ZoneSelector';
import ZoneMapRenderer from './ZoneMapRenderer';
import MapSidebar from './MapSidebar';

// Note: Leaflet replaced by custom zone maps

import { Establishment } from '../../types';
import { logger } from '../../utils/logger';

interface PattayaMapProps {
  establishments: Establishment[];
  freelances?: any[]; // Independent position employees
  onEstablishmentClick?: (establishment: Establishment) => void;
  selectedEstablishment?: string;
  currentZone?: string;
  onEstablishmentUpdate?: () => Promise<void>;
}

const PattayaMap: React.FC<PattayaMapProps> = ({
  establishments,
  freelances = [],
  onEstablishmentClick,
  selectedEstablishment,
  currentZone: propCurrentZone,
  onEstablishmentUpdate
}) => {
  const [currentZone, setCurrentZone] = useState<string>(propCurrentZone || 'soi6'); // Default to Soi 6
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mapKey, setMapKey] = useState(0); // Force re-render on sidebar toggle

  // Load categories from database
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/establishments/categories`);
        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories || []);
          // Select all categories by default - Convert INTEGER id to STRING format 'cat-XXX'
          setSelectedCategories((data.categories || []).map((cat: any) => `cat-${String(cat.id).padStart(3, '0')}`));
        }
      } catch (error) {
        logger.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Handle zone changes
  const handleZoneChange = (zone: Zone) => {
    setCurrentZone(zone.id);
  };

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleClearFilters = () => {
    // Reset categories to all selected
    setSelectedCategories(categories.map((cat: any) => `cat-${String(cat.id).padStart(3, '0')}`));
    // Clear search term
    setSearchTerm('');
  };

  // Filter establishments based on selected categories and search term
  const filteredEstablishments = useMemo(() => {
    logger.debug('🟢 PATTAYAMAP - Received establishments:', establishments.length);
    logger.debug('🟢 PATTAYAMAP - Soi 6 received:', establishments.filter(e => e.zone === 'soi6').length);
    logger.debug('🟢 PATTAYAMAP - selectedCategories:', selectedCategories);

    const filtered = establishments.filter(establishment => {
      // Filter by category
      const categoryMatch = selectedCategories.length === 0 ||
                           selectedCategories.includes(String(establishment.category_id));

      // Filter by search term
      const searchMatch = searchTerm === '' ||
                         establishment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (establishment.address && establishment.address.toLowerCase().includes(searchTerm.toLowerCase()));

      return categoryMatch && searchMatch;
    });

    logger.debug('🟢 PATTAYAMAP - After filtering:', filtered.length);
    logger.debug('🟢 PATTAYAMAP - Filtered Soi 6:', filtered.filter(e => e.zone === 'soi6').length);

    return filtered;
  }, [establishments, selectedCategories, searchTerm]);

  // Show controls on all zones including Soi 6
  const showControls = true;

  return (
    <div className="map-layout-nightlife">
      <MapSidebar
        isOpen={sidebarOpen}
        onToggle={() => {
          setSidebarOpen(!sidebarOpen);
          setMapKey(prev => prev + 1);
        }}
        currentZone={ZONES.find(z => z.id === currentZone) || ZONES[0]}
        zones={ZONES}
        onZoneChange={handleZoneChange}
        showControls={showControls}
        categories={categories}
        selectedCategories={selectedCategories}
        onCategoryToggle={handleCategoryToggle}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onClearFilters={handleClearFilters}
      />

      <div className={`map-content-area-nightlife ${sidebarOpen ? '' : 'sidebar-closed'}`}>
        <ZoneMapRenderer
          key={mapKey}
          currentZone={currentZone}
          establishments={filteredEstablishments}
          freelances={freelances}
          onEstablishmentClick={onEstablishmentClick}
          selectedEstablishment={selectedEstablishment}
          onEstablishmentUpdate={onEstablishmentUpdate}
        />
      </div>
    </div>
  );
};

export default PattayaMap;
