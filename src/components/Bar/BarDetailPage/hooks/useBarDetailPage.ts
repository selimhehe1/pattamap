/**
 * useBarDetailPage Hook
 * Manages state and data fetching for BarDetailPage
 */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigateWithTransition } from '../../../../hooks/useNavigateWithTransition';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../../contexts/AuthContext';
import { useSecureFetch } from '../../../../hooks/useSecureFetch';
import { useEstablishment } from '../../../../hooks/useEstablishments';
import { Employee, Establishment } from '../../../../types';
import { logger } from '../../../../utils/logger';
import { parseEstablishmentId, generateEstablishmentUrl } from '../../../../utils/slugify';

export interface UseBarDetailPageReturn {
  // Data
  bar: Establishment | null;
  girls: Employee[];
  // Loading states
  barLoading: boolean;
  girlsLoading: boolean;
  // UI state
  selectedGirl: Employee | null;
  setSelectedGirl: React.Dispatch<React.SetStateAction<Employee | null>>;
  showEditModal: boolean;
  setShowEditModal: React.Dispatch<React.SetStateAction<boolean>>;
  activeTab: 'employees' | 'info';
  setActiveTab: React.Dispatch<React.SetStateAction<'employees' | 'info'>>;
  isMobile: boolean;
  showSuccessMessage: boolean;
  // Computed
  isAdmin: boolean;
  establishmentId: string | null | undefined;
}

export function useBarDetailPage(): UseBarDetailPageReturn {
  const { id: legacyId, slug } = useParams<{ id?: string; zone?: string; slug?: string }>();
  const navigate = useNavigateWithTransition();
  const { user } = useAuth();
  const { secureFetch } = useSecureFetch();

  // Parse ID from slug or use legacy ID
  const establishmentId = slug ? parseEstablishmentId(slug) : legacyId;

  // React Query for establishment
  const { data: bar = null, isLoading: barLoading } = useEstablishment(establishmentId || null);

  // Query for employees of this establishment
  const { data: girls = [], isLoading: girlsLoading } = useQuery({
    queryKey: ['employees', 'establishment', establishmentId],
    queryFn: async (): Promise<Employee[]> => {
      if (!establishmentId) return [];
      const response = await secureFetch(
        `${import.meta.env.VITE_API_URL}/api/employees?establishment_id=${establishmentId}&status=approved`
      );
      if (!response.ok) return [];
      const data = await response.json();
      return data.employees || [];
    },
    enabled: !!establishmentId && !!bar,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });

  // Local states
  const [selectedGirl, setSelectedGirl] = useState<Employee | null>(null);
  const [showSuccessMessage] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'employees' | 'info'>('employees');
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 || window.innerHeight <= 500 : false
  );

  const isAdmin = user?.role === 'admin';

  // Redirect if no ID
  useEffect(() => {
    if (!establishmentId) {
      logger.error('No establishment ID provided, redirecting to home');
      navigate('/');
    }
  }, [establishmentId, navigate]);

  // Redirect if bar not found after loading
  useEffect(() => {
    if (!barLoading && !bar && establishmentId) {
      logger.error('Bar not found:', establishmentId);
      navigate('/');
    }
  }, [bar, barLoading, establishmentId, navigate]);

  // 301 Redirect: Legacy URL to SEO URL
  useEffect(() => {
    if (bar && legacyId && !slug) {
      const seoUrl = generateEstablishmentUrl(bar.id, bar.name, bar.zone || 'other');
      logger.info(`Redirecting legacy URL /bar/${legacyId} to ${seoUrl}`);
      navigate(seoUrl, { replace: true });
    }
  }, [bar, legacyId, slug, navigate]);

  // Mobile detection - Update on window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768 || window.innerHeight <= 500);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    bar,
    girls,
    barLoading,
    girlsLoading,
    selectedGirl,
    setSelectedGirl,
    showEditModal,
    setShowEditModal,
    activeTab,
    setActiveTab,
    isMobile,
    showSuccessMessage,
    isAdmin,
    establishmentId,
  };
}
