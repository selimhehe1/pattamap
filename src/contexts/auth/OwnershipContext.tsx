import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { logger } from '../../utils/logger';
import { useCSRF } from '../CSRFContext';

export interface OwnershipContextType {
  submitOwnershipRequest: (
    establishmentId: string,
    documentUrls: string[],
    requestMessage?: string,
    contactMe?: boolean,
    explicitToken?: string
  ) => Promise<void>;
}

const OwnershipContext = createContext<OwnershipContextType | undefined>(undefined);

interface OwnershipProviderProps {
  children: ReactNode;
}

export const OwnershipProvider: React.FC<OwnershipProviderProps> = ({ children }) => {
  const { csrfToken } = useCSRF();

  /**
   * Submit an ownership request for an establishment during registration
   * Similar to employee claim but for establishment owners
   */
  const submitOwnershipRequest = useCallback(async (
    establishmentId: string,
    documentUrls: string[],
    requestMessage?: string,
    contactMe?: boolean,
    explicitToken?: string
  ) => {
    const tokenToUse = explicitToken || csrfToken;

    logger.debug('[OwnershipContext] Submitting ownership request', {
      establishmentId,
      documentCount: documentUrls.length,
      hasMessage: !!requestMessage,
      contactMe,
      usingExplicitToken: !!explicitToken,
      hasCsrfToken: !!tokenToUse,
    });

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/ownership-requests`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': tokenToUse || '',
          },
          body: JSON.stringify({
            establishment_id: establishmentId,
            documents_urls: documentUrls,
            request_message: contactMe
              ? `[CONTACT ME] ${requestMessage || 'Please contact me by email - I don\'t have documents yet'}`
              : requestMessage,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit ownership request');
      }

      logger.info('[OwnershipContext] Ownership request submitted successfully', { request_id: data.id });
    } catch (error) {
      logger.error('[OwnershipContext] Submit ownership request error:', error);
      throw error;
    }
  }, [csrfToken]);

  const value: OwnershipContextType = {
    submitOwnershipRequest,
  };

  return (
    <OwnershipContext.Provider value={value}>
      {children}
    </OwnershipContext.Provider>
  );
};

export const useOwnership = (): OwnershipContextType => {
  const context = useContext(OwnershipContext);
  if (context === undefined) {
    throw new Error('useOwnership must be used within an OwnershipProvider');
  }
  return context;
};

export default OwnershipContext;
