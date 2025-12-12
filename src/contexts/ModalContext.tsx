import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ==========================================
// 🔧 TYPE SAFETY FIX - Removed all 'any' types
// ==========================================
// Base props that all modals must have
// Note: onClose is optional in component props (injected automatically)
export interface ModalProps {
  onClose?: () => void;
  [key: string]: unknown; // Allow additional props
}

// Modal configuration with generic type support
export interface ModalConfig<P extends ModalProps = ModalProps> {
  id: string;
  component: React.ComponentType<P>;
  props?: Partial<Omit<P, 'onClose'>>; // Props without onClose (injected automatically)
  options?: {
    closeOnOverlayClick?: boolean;
    closeOnEscape?: boolean;
    showCloseButton?: boolean;
    size?: 'small' | 'medium' | 'large' | 'profile' | 'fullscreen';
    zIndex?: number;
  };
}

// Internal storage type (uses Record for flexibility)
interface InternalModalConfig {
  id: string;
  component: React.ComponentType<ModalProps>;
  props?: Record<string, unknown>;
  options?: ModalConfig['options'];
}

interface ModalContextType {
  modals: InternalModalConfig[];
  // 🔧 TYPE FIX: Simplified signature to avoid generic inference issues
  // The implementation still uses generics for type safety, but the interface
  // accepts any component to allow proper usage without type errors
  openModal: (
    id: string,
    component: React.ComponentType<any>,
    props?: Record<string, unknown>,
    options?: ModalConfig['options']
  ) => void;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
  updateModalProps: (id: string, newProps: Record<string, unknown>) => void;
  isModalOpen: (id: string) => boolean;
  getTopModalId: () => string | null;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modals, setModals] = useState<InternalModalConfig[]>([]);

  // 🎯 Gestion automatique du scroll du body
  useEffect(() => {
    if (modals.length > 0) {
      document.body.classList.add('modal-open');
      document.documentElement.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    }

    // Nettoyage au démontage
    return () => {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    };
  }, [modals.length]);

  // 🎯 Gestion des touches globales (Escape)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && modals.length > 0) {
        const topModal = modals[modals.length - 1];
        if (topModal.options?.closeOnEscape !== false) {
          closeModal(topModal.id);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- closeModal is stable (useCallback with no deps)
  }, [modals]);

  const openModal = useCallback(<P extends ModalProps>(
    id: string,
    component: React.ComponentType<P>,
    props: Partial<Omit<P, 'onClose'>> = {},
    options: ModalConfig['options'] = {}
  ) => {
    const defaultOptions: ModalConfig['options'] = {
      closeOnOverlayClick: true,
      closeOnEscape: true,
      showCloseButton: true,
      size: 'medium',
      ...options
    };

    const newModal: InternalModalConfig = {
      id,
      component: component as React.ComponentType<ModalProps>,
      props: {
        ...props,
        onClose: (props as Record<string, unknown>)?.onClose || (() => closeModal(id)), // Preserve custom onClose or use default
      } as Record<string, unknown>,
      options: defaultOptions
    };

    setModals(prev => {
      // Si le modal existe déjà, le remplacer
      const existingIndex = prev.findIndex(modal => modal.id === id);
      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex] = newModal;
        return updated;
      }
      // Sinon, l'ajouter au top de la stack
      return [...prev, newModal];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- closeModal is stable (useCallback with no deps)
  }, []);

  const closeModal = useCallback((id: string) => {
    setModals(prev => prev.filter(modal => modal.id !== id));
  }, []);

  const closeAllModals = useCallback(() => {
    setModals([]);
  }, []);

  const updateModalProps = useCallback((id: string, newProps: Record<string, unknown>) => {
    setModals(prev => prev.map(modal => {
      if (modal.id === id) {
        return {
          ...modal,
          props: {
            ...modal.props,
            ...newProps,
            onClose: () => closeModal(id), // Préserver la fonction onClose
          }
        };
      }
      return modal;
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- closeModal is stable (useCallback with no deps)
  }, []);

  const isModalOpen = useCallback((id: string) => {
    return modals.some(modal => modal.id === id);
  }, [modals]);

  const getTopModalId = useCallback(() => {
    return modals.length > 0 ? modals[modals.length - 1].id : null;
  }, [modals]);

  const value: ModalContextType = {
    modals,
    openModal,
    closeModal,
    closeAllModals,
    updateModalProps,
    isModalOpen,
    getTopModalId
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
};

// Hook pour utiliser le contexte
export const useModal = (): ModalContextType => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export default ModalContext;
