import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import notification from '../../../utils/notification';
import { logger } from '../../../utils/logger';
import { Employee, Establishment } from '../../../types';

interface SocialMediaData {
  ig: string;
  fb: string;
  line: string;
  tg: string;
  wa: string;
}

interface FormDataForSubmit {
  accountType: 'regular' | 'employee' | 'establishment_owner';
  acceptedTerms: boolean;
  pseudonym: string;
  email: string;
  password: string;

  // Employee fields
  employeePath: 'claim' | 'create' | null;
  selectedEmployee: Employee | null;
  claimMessage: string;
  employeeName: string;
  employeeNickname: string;
  employeeAge: string;
  employeeSex: string;
  employeeNationality: string[] | null;
  employeeDescription: string;
  isFreelance: boolean;
  freelanceNightclubIds: string[];
  establishmentId: string;
  socialMedia: SocialMediaData;

  // Owner fields
  ownerPath: 'claim' | 'create' | null;
  selectedEstablishmentToClaim: Establishment | null;
  ownershipDocuments: File[];
  ownershipRequestMessage: string;
  ownershipContactMe: boolean;
  newEstablishmentName: string;
  newEstablishmentAddress: string;
  newEstablishmentZone: string;
  newEstablishmentCategoryId: number | null;
  newEstablishmentDescription: string;
  newEstablishmentPhone: string;
  newEstablishmentWebsite: string;
  newEstablishmentInstagram: string;
  newEstablishmentTwitter: string;
  newEstablishmentTiktok: string;
}

interface UseRegistrationSubmitOptions {
  formData: FormDataForSubmit;
  validateForm: () => boolean;
  clearDraft: () => void;
  uploadPhotos: (csrfToken?: string) => Promise<string[]>;
  onSuccess: () => void;
  isFromGoogle?: boolean;
}

interface UseRegistrationSubmitReturn {
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;
  uploadingPhotos: boolean;
  uploadingOwnershipDocs: boolean;
  submitError: string;
  setSubmitError: (error: string) => void;
}

/**
 * Custom hook for handling the complete registration submission flow
 *
 * Handles 5 different registration flows:
 * 1. Regular user - Simple account creation
 * 2. Owner claim - Register + upload docs + submit ownership request
 * 3. Owner create - Register + create establishment + auto-submit ownership
 * 4. Employee claim - Register + claim existing profile
 * 5. Employee create - Register + upload photos + create new profile
 */
export function useRegistrationSubmit({
  formData,
  validateForm,
  clearDraft,
  uploadPhotos,
  onSuccess,
  isFromGoogle = false
}: UseRegistrationSubmitOptions): UseRegistrationSubmitReturn {
  const { t } = useTranslation();
  const { register, claimEmployeeProfile, submitOwnershipRequest } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadingOwnershipDocs, setUploadingOwnershipDocs] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // GDPR/PDPA: Require terms acceptance
    if (!formData.acceptedTerms) {
      setSubmitError(t('register.acceptTermsRequired', 'You must accept the Privacy Policy and Terms of Service'));
      notification.error(t('register.acceptTermsRequired', 'You must accept the Privacy Policy and Terms of Service'));
      return;
    }

    if (!validateForm()) {
      notification.error(t('register.fixErrorsToast'));
      return;
    }

    // Early validation for employee fields BEFORE creating account
    if (formData.accountType === 'employee' && formData.employeePath === 'create') {
      if (!formData.employeeName.trim()) {
        notification.error(t('register.employeeNameRequired', 'Employee name is required'));
        return;
      }
      if (!formData.employeeSex) {
        notification.error(t('register.employeeSexRequired', 'Please select your sex/gender'));
        return;
      }
      if (!formData.isFreelance && !formData.establishmentId) {
        notification.error(t('register.establishmentRequired', 'Please select an establishment or enable Freelance Mode'));
        return;
      }
    }

    setIsLoading(true);
    setSubmitError('');

    try {
      let freshToken: string | null | undefined;

      if (isFromGoogle) {
        // Google OAuth flow: user is already authenticated, just need to sync with our database
        const { supabase } = await import('../../../config/supabase');
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          throw new Error(t('register.sessionExpired', 'Session expired. Please sign in with Google again.'));
        }

        // Get stored avatar URL from Google
        const googleAvatarUrl = sessionStorage.getItem('google_avatar_url');

        // Call sync-user to create the user in our database
        // Use credentials: 'include' so the server can set the auth-token cookie
        const syncResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/sync-user`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            supabaseUserId: session.user.id,
            email: formData.email,
            pseudonym: formData.pseudonym,
            account_type: formData.accountType,
            avatar_url: googleAvatarUrl || session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
            checkOnly: false
          })
        });

        if (!syncResponse.ok) {
          const errorData = await syncResponse.json();
          throw new Error(errorData.error || t('register.syncFailed', 'Failed to create account'));
        }

        // Clean up stored Google data
        sessionStorage.removeItem('google_avatar_url');

        // Fetch a CSRF token for subsequent requests (uploads, claims, etc.)
        // The sync-user response sets the auth-token cookie, so we can now get a CSRF token
        const csrfResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/csrf-token`, {
          credentials: 'include'
        });
        if (csrfResponse.ok) {
          const csrfData = await csrfResponse.json();
          freshToken = csrfData.csrfToken;
        }

        logger.debug('[Register] Google OAuth user synced successfully');
      } else {
        // Normal registration flow with email/password
        const result = await register(
          formData.pseudonym,
          formData.email,
          formData.password,
          formData.accountType
        );
        freshToken = result?.csrfToken;

        // Show warning if password was found in breach database
        if (result?.passwordBreached) {
          notification.warning(t('register.passwordBreachWarning', 'Your password has been found in a data breach. Consider changing it for better security.'), {
            duration: 10000
          });
        }
      }

      clearDraft();

      // Handle different post-registration flows
      if (formData.accountType === 'regular') {
        await handleRegularFlow();
      } else if (formData.accountType === 'establishment_owner') {
        await handleOwnerFlow(freshToken);
      } else if (formData.accountType === 'employee') {
        await handleEmployeeFlow(freshToken);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('register.registrationFailed');
      setSubmitError(errorMessage);
      notification.error(errorMessage);
    } finally {
      setIsLoading(false);
    }

    // === Flow handlers ===

    async function handleRegularFlow() {
      notification.success(t('register.accountCreated'));
      onSuccess();
    }

    async function handleOwnerFlow(freshToken: string | null | undefined) {
      if (formData.ownerPath === 'claim' && formData.selectedEstablishmentToClaim) {
        // Upload documents if any
        let documentUrls: string[] = [];
        if (formData.ownershipDocuments.length > 0) {
          setUploadingOwnershipDocs(true);
          try {
            const uploadFormData = new FormData();
            formData.ownershipDocuments.forEach(doc => {
              uploadFormData.append('images', doc);
            });

            const uploadResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/upload/images`, {
              method: 'POST',
              credentials: 'include',
              headers: {
                'X-CSRF-Token': freshToken || ''
              },
              body: uploadFormData
            });

            if (uploadResponse.ok) {
              const uploadData = await uploadResponse.json();
              documentUrls = uploadData.images.map((img: { url: string }) => img.url);
            }
          } catch (uploadError) {
            logger.warn('Document upload failed, continuing without documents:', uploadError);
          } finally {
            setUploadingOwnershipDocs(false);
          }
        }

        // Submit ownership request
        await submitOwnershipRequest!(
          formData.selectedEstablishmentToClaim.id,
          documentUrls,
          formData.ownershipRequestMessage || undefined,
          formData.ownershipContactMe,
          freshToken || undefined
        );

        notification.success(t('register.ownerClaimSubmitted'));
        onSuccess();

      } else if (formData.ownerPath === 'create') {
        // Create new establishment
        const establishmentData = {
          name: formData.newEstablishmentName.trim(),
          address: formData.newEstablishmentAddress.trim(),
          zone: formData.newEstablishmentZone,
          category_id: formData.newEstablishmentCategoryId,
          description: formData.newEstablishmentDescription.trim() || undefined,
          phone: formData.newEstablishmentPhone.trim() || undefined,
          website: formData.newEstablishmentWebsite.trim() || undefined,
          instagram: formData.newEstablishmentInstagram.trim() || undefined,
          twitter: formData.newEstablishmentTwitter.trim() || undefined,
          tiktok: formData.newEstablishmentTiktok.trim() || undefined
        };

        const createResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/establishments`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': freshToken || ''
          },
          body: JSON.stringify(establishmentData)
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.json();
          throw new Error(errorData.error || t('register.establishmentCreationFailed'));
        }

        const createData = await createResponse.json();
        const newEstablishmentId = createData.establishment?.id;

        // Auto-submit ownership request for the new establishment
        if (newEstablishmentId) {
          await submitOwnershipRequest!(
            newEstablishmentId,
            [],
            t('register.selfCreatedEstablishmentMessage'),
            false,
            freshToken || undefined
          );
        }

        notification.success(t('register.establishmentCreatedPending'));
        onSuccess();

      } else {
        // No path selected - just created account
        notification.success(t('register.ownerAccountCreated'));
        onSuccess();
      }
    }

    async function handleEmployeeFlow(freshToken: string | null | undefined) {
      if (formData.employeePath === 'claim') {
        // Claim existing profile
        await claimEmployeeProfile!(
          formData.selectedEmployee!.id,
          formData.claimMessage.trim(),
          [],
          freshToken || undefined
        );
        notification.success(t('register.claimSubmitted'));
        onSuccess();

      } else if (formData.employeePath === 'create') {
        // Create new profile with uploaded photos
        if (!formData.employeeName.trim()) {
          throw new Error(t('register.employeeNameRequired', 'Employee name is required'));
        }
        if (!formData.employeeSex) {
          throw new Error(t('register.employeeSexRequired', 'Please select your sex/gender'));
        }
        if (!formData.isFreelance && !formData.establishmentId) {
          throw new Error(t('register.establishmentRequired', 'Please select an establishment or enable Freelance Mode'));
        }

        notification.info(t('register.creatingEmployeeProfile'));

        if (!freshToken) {
          throw new Error(t('register.sessionSyncError'));
        }

        // Upload photos
        setUploadingPhotos(true);
        let photoUrls: string[] = [];
        try {
          photoUrls = await uploadPhotos(freshToken);
        } finally {
          setUploadingPhotos(false);
        }

        // Create employee profile using /my-profile endpoint
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/employees/my-profile`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': freshToken
          },
          body: JSON.stringify({
            name: formData.employeeName,
            nickname: formData.employeeNickname || undefined,
            age: formData.employeeAge ? parseInt(formData.employeeAge) : undefined,
            sex: formData.employeeSex,
            nationality: formData.employeeNationality,
            description: formData.employeeDescription || undefined,
            photos: photoUrls,
            is_freelance: formData.isFreelance,
            current_establishment_id: !formData.isFreelance && formData.establishmentId ? formData.establishmentId : undefined,
            current_establishment_ids: formData.isFreelance && formData.freelanceNightclubIds.length > 0
              ? formData.freelanceNightclubIds
              : undefined,
            social_media: Object.fromEntries(
              Object.entries(formData.socialMedia).filter(([_, value]) => value.trim() !== '')
            )
          })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create employee profile');
        }

        notification.success(t('register.employeeProfileCreated'));
        onSuccess();
      }
    }
  }, [
    formData,
    validateForm,
    clearDraft,
    uploadPhotos,
    onSuccess,
    register,
    claimEmployeeProfile,
    submitOwnershipRequest,
    t,
    isFromGoogle
  ]);

  return {
    handleSubmit,
    isLoading,
    uploadingPhotos,
    uploadingOwnershipDocs,
    submitError,
    setSubmitError
  };
}

export default useRegistrationSubmit;
