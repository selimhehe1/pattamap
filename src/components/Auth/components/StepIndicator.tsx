import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

type AccountType = 'regular' | 'employee' | 'establishment_owner';
type PathType = 'claim' | 'create' | null;

interface StepIndicatorProps {
  /** Current step (1-4) */
  currentStep: number;
  /** Account type selected */
  accountType: AccountType;
  /** Path for employee/owner registration */
  path?: PathType;
}

// Step colors based on step number
const STEP_COLORS = {
  1: '#00E5FF', // Cyan
  2: '#C19A6B', // Gold
  3: '#3B82F6', // Blue
  4: '#9D4EDD', // Purple
};

/**
 * Step progress indicator for multi-step registration form
 * Shows different number of steps based on account type and path
 */
const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  accountType,
  path,
}) => {
  const { t } = useTranslation();

  // Calculate total steps and display step based on account type and path
  const { totalSteps, displayStep } = useMemo(() => {
    let total: number;
    let display: number;

    if (accountType === 'regular') {
      total = 2;
      display = currentStep === 1 ? 1 : 2;
    } else if (path === 'create') {
      total = 4;
      display = currentStep;
    } else {
      // claim path or no path selected yet
      total = 3;
      display = currentStep;
    }

    return { totalSteps: total, displayStep: display };
  }, [accountType, path, currentStep]);

  // Determine which steps to show
  const isEmployeeOrOwner = accountType === 'employee' || accountType === 'establishment_owner';
  const showStep4 = isEmployeeOrOwner && path === 'create';

  // Render a step circle
  const renderStepCircle = (stepNumber: number, displayNumber: number) => {
    const isActive = currentStep >= stepNumber;
    const color = STEP_COLORS[stepNumber as keyof typeof STEP_COLORS] || STEP_COLORS[1];

    return (
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: isActive ? color : 'rgba(255,255,255,0.2)',
          color: isActive ? (stepNumber === 1 ? '#0a0a2e' : '#ffffff') : '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: 'bold',
          transition: 'all 0.3s ease',
        }}
      >
        {displayNumber}
      </div>
    );
  };

  // Render a connector line between steps
  const renderConnector = (nextStep: number) => {
    const isActive = currentStep >= nextStep;
    const color = STEP_COLORS[nextStep as keyof typeof STEP_COLORS] || STEP_COLORS[1];

    return (
      <div
        style={{
          flex: 1,
          height: '4px',
          background: isActive ? color : 'rgba(255,255,255,0.2)',
          borderRadius: '2px',
          transition: 'all 0.3s ease',
        }}
      />
    );
  };

  return (
    <div style={{ marginBottom: '30px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        {/* Step indicators */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
          {/* Step 1 */}
          {renderStepCircle(1, 1)}
          {renderConnector(2)}

          {/* Step 2 (employee or owner path) */}
          {isEmployeeOrOwner && (
            <>
              {renderStepCircle(2, 2)}
              {renderConnector(3)}
            </>
          )}

          {/* Step 3 (or Step 2 for regular users) */}
          {renderStepCircle(
            isEmployeeOrOwner ? 3 : 2,
            isEmployeeOrOwner ? 3 : 2
          )}

          {/* Step 4 (create path only) */}
          {showStep4 && (
            <>
              {renderConnector(4)}
              {renderStepCircle(4, 4)}
            </>
          )}
        </div>
      </div>

      {/* Step progress text */}
      <div style={{ fontSize: '12px', color: '#cccccc', textAlign: 'center' }}>
        {t('register.stepProgress', { current: displayStep, total: totalSteps })}
      </div>
    </div>
  );
};

export default StepIndicator;
