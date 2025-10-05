import { useState, useMemo } from 'react';
import { Establishment } from '../types';
import { sampleCategories } from '../data/sampleData';

interface UseEstablishmentFiltersProps {
  establishments: Establishment[];
}

export const useEstablishmentFilters = ({ establishments }: UseEstablishmentFiltersProps) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    sampleCategories.map(c => c.id)
  );
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEstablishments = useMemo(() => {
    return establishments.filter(est =>
      selectedCategories.includes(String(est.category_id)) &&
      (est.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       est.address.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [establishments, selectedCategories, searchTerm]);

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const clearFilters = () => {
    setSelectedCategories(sampleCategories.map(c => c.id));
    setSearchTerm('');
  };

  return {
    selectedCategories,
    searchTerm,
    filteredEstablishments,
    handleCategoryToggle,
    setSearchTerm,
    clearFilters,
    categories: sampleCategories
  };
};