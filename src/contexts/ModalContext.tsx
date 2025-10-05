import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// Types pour le système de modal
export interface ModalConfig {
  id: string;
  component: React.ComponentType<any>;
  props?: any;
  options?: {
    closeOnOverlayClick?: boolean;
    closeOnEscape?: boolean;
    showCloseButton?: boolean;
    size?: 'small' | 'medium' | 'large' | 'profile' | 'fullscreen';
    zIndex?: number;
  };
}

interface ModalContextType {
  modals: ModalConfig[];
  openModal: (id: string, component: React.ComponentType<any>, props?: any, options?: ModalConfig['options']) => void;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
  updateModalProps: (id: string, newProps: any) => void;
  isModalOpen: (id: string) => boolean;
  getTopModalId: () => string | null;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modals, setModals] = useState<ModalConfig[]>([]);

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
  }, [modals]);

  const openModal = useCallback((
    id: string,
    component: React.ComponentType<any>,
    props: any = {},
    options: ModalConfig['options'] = {}
  ) => {
    const defaultOptions: ModalConfig['options'] = {
      closeOnOverlayClick: true,
      closeOnEscape: true,
      showCloseButton: true,
      size: 'medium',
      ...options
    };

    const newModal: ModalConfig = {
      id,
      component,
      props: {
        ...props,
        onClose: props.onClose || (() => closeModal(id)), // Preserve custom onClose or use default
      },
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
  }, []);

  const closeModal = useCallback((id: string) => {
    setModals(prev => prev.filter(modal => modal.id !== id));
  }, []);

  const closeAllModals = useCallback(() => {
    setModals([]);
  }, []);

  const updateModalProps = useCallback((id: string, newProps: any) => {
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