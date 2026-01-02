/**
 * StepIndicator Component
 *
 * Displays the progress indicator for the ownership request wizard.
 * Shows 3 steps with visual feedback on completion.
 */

import React from 'react';
import { Check } from 'lucide-react';
import type { StepIndicatorProps } from './types';

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  const steps = [
    { number: 1, label: 'Select Establishment' },
    { number: 2, label: 'Upload Documents' },
    { number: 3, label: 'Confirm & Submit' }
  ];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '30px',
      padding: '20px',
      background: 'rgba(193, 154, 107, 0.05)',
      borderRadius: '12px',
      border: '1px solid rgba(193, 154, 107, 0.2)'
    }}>
      {steps.map((step, index) => (
        <React.Fragment key={step.number}>
          {/* Step circle */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              margin: '0 auto 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: currentStep >= step.number
                ? 'linear-gradient(45deg, #C19A6B, #FFD700)'
                : 'rgba(255,255,255,0.1)',
              border: currentStep >= step.number
                ? '2px solid #FFD700'
                : '2px solid rgba(255,255,255,0.3)',
              color: currentStep >= step.number ? '#000' : 'rgba(255,255,255,0.6)',
              fontSize: '18px',
              fontWeight: 'bold',
              boxShadow: currentStep >= step.number
                ? '0 0 20px rgba(193, 154, 107, 0.5)'
                : 'none',
              transition: 'all 0.3s ease'
            }}>
              {currentStep > step.number ? <Check size={18} /> : step.number}
            </div>
            <div style={{
              fontSize: '13px',
              color: currentStep >= step.number ? '#FFD700' : 'rgba(255,255,255,0.6)',
              fontWeight: currentStep === step.number ? 'bold' : 'normal'
            }}>
              {step.label}
            </div>
          </div>

          {/* Connector line (not after last step) */}
          {index < steps.length - 1 && (
            <div style={{
              flex: '0 0 60px',
              height: '2px',
              background: currentStep > step.number
                ? 'linear-gradient(90deg, #C19A6B, #FFD700)'
                : 'rgba(255,255,255,0.2)',
              transition: 'all 0.5s ease'
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default StepIndicator;
