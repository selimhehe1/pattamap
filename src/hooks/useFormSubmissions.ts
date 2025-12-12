import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { EmployeeFormData, EstablishmentFormData, ApiResponse } from '../types';
import { logger } from '../utils/logger';

export const useFormSubmissions = () => {
  const { token } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitEmployee = async (employeeData: EmployeeFormData): Promise<ApiResponse> => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(employeeData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit employee');
      }

      return { success: true, message: 'Employee submitted successfully! It will be reviewed by administrators.' };
    } catch (error) {
      logger.error('Error submitting employee:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitEstablishment = async (establishmentData: EstablishmentFormData): Promise<ApiResponse> => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/establishments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(establishmentData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit establishment');
      }

      return { success: true, message: 'Establishment submitted successfully! It will be reviewed by administrators.' };
    } catch (error) {
      logger.error('Error submitting establishment:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    submitEmployee,
    submitEstablishment
  };
};