import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Employee } from '../../types';
import { logger } from '../../utils/logger';
import { useUser } from './UserContext';
import { useCSRF } from '../CSRFContext';

export interface EmployeeContextType {
  linkedEmployeeProfile: Employee | null;
  refreshLinkedProfile: (skipCheck?: boolean) => Promise<void>;
  claimEmployeeProfile: (
    employeeId: string,
    message: string,
    verificationProof?: string[],
    explicitToken?: string
  ) => Promise<void>;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

interface EmployeeProviderProps {
  children: ReactNode;
}

export const EmployeeProvider: React.FC<EmployeeProviderProps> = ({ children }) => {
  const { user } = useUser();
  const { csrfToken } = useCSRF();
  const [linkedEmployeeProfile, setLinkedEmployeeProfile] = useState<Employee | null>(null);

  /**
   * Fetch the employee profile linked to the current user account
   * Only for users with account_type === 'employee' and a linked_employee_id
   */
  const getMyLinkedProfile = useCallback(async (skipCheck: boolean = false) => {
    logger.debug('[EmployeeContext] getMyLinkedProfile() called', {
      hasUser: !!user,
      account_type: user?.account_type,
      linked_employee_id: user?.linked_employee_id,
      skipCheck
    });

    // Only fetch if user is an employee and has a linked profile
    if (!skipCheck && (!user || user.account_type !== 'employee' || !user.linked_employee_id)) {
      logger.debug('[EmployeeContext] getMyLinkedProfile() aborted - conditions not met');
      setLinkedEmployeeProfile(null);
      return;
    }

    logger.debug('[EmployeeContext] Fetching /api/employees/my-linked-profile...');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/employees/my-linked-profile`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        logger.debug('[EmployeeContext] Linked employee profile fetched:', {
          employee_id: data.id,
          name: data.name,
          status: data.status
        });
        setLinkedEmployeeProfile(data);
      } else {
        const errorData = await response.json();
        logger.debug('[EmployeeContext] Failed to fetch linked profile:', {
          status: response.status,
          error: errorData
        });
        setLinkedEmployeeProfile(null);
      }
    } catch (error) {
      logger.error('[EmployeeContext] Get linked profile error:', error);
      setLinkedEmployeeProfile(null);
    }
  }, [user]);

  /**
   * Claim an existing employee profile
   * User submits a request to link their account to an employee profile
   * Requires admin approval
   */
  const claimEmployeeProfile = useCallback(async (
    employeeId: string,
    message: string,
    verificationProof?: string[],
    explicitToken?: string
  ) => {
    const tokenToUse = explicitToken || csrfToken;

    logger.debug('[EmployeeContext] Claiming employee profile', {
      employeeId,
      usingExplicitToken: !!explicitToken,
      hasCsrfToken: !!tokenToUse,
    });

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/employees/claim/${employeeId}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': tokenToUse || '',
          },
          body: JSON.stringify({
            message,
            verification_proof: verificationProof || [],
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit claim request');
      }

      logger.info('[EmployeeContext] Claim request submitted successfully', { claim_id: data.claim_id });
    } catch (error) {
      logger.error('[EmployeeContext] Claim employee profile error:', error);
      throw error;
    }
  }, [csrfToken]);

  // Auto-fetch linked profile when user changes
  useEffect(() => {
    if (user?.account_type === 'employee' && user?.linked_employee_id && !linkedEmployeeProfile) {
      logger.debug('[EmployeeContext] useEffect triggered - fetching linked profile');
      getMyLinkedProfile(true);
    }
  }, [user?.account_type, user?.linked_employee_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear linked profile when user logs out
  useEffect(() => {
    if (!user) {
      setLinkedEmployeeProfile(null);
    }
  }, [user]);

  const value: EmployeeContextType = {
    linkedEmployeeProfile,
    refreshLinkedProfile: getMyLinkedProfile,
    claimEmployeeProfile,
  };

  return (
    <EmployeeContext.Provider value={value}>
      {children}
    </EmployeeContext.Provider>
  );
};

export const useEmployee = (): EmployeeContextType => {
  const context = useContext(EmployeeContext);
  if (context === undefined) {
    throw new Error('useEmployee must be used within an EmployeeProvider');
  }
  return context;
};

export default EmployeeContext;
