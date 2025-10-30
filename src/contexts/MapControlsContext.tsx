import React, { createContext, useContext, useState, ReactNode } from 'react';

type ViewMode = 'map' | 'list' | 'employees';

interface MapControlsContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

const MapControlsContext = createContext<MapControlsContextType | undefined>(undefined);

export const MapControlsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Restore view mode from localStorage
    const saved = localStorage.getItem('pattamap-view-mode');
    return (saved === 'list' || saved === 'map' || saved === 'employees') ? saved as ViewMode : 'map';
  });

  const handleSetViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('pattamap-view-mode', mode);
  };

  return (
    <MapControlsContext.Provider value={{
      viewMode,
      setViewMode: handleSetViewMode
    }}>
      {children}
    </MapControlsContext.Provider>
  );
};

export const useMapControls = () => {
  const context = useContext(MapControlsContext);
  if (context === undefined) {
    throw new Error('useMapControls must be used within a MapControlsProvider');
  }
  return context;
};
