import React from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

/**
 * CustomSelect - Styled dropdown matching Establishment dropdown
 * Phase 3.4: Unified dropdown styling
 */

export interface CustomSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  options: CustomSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  testId?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  testId
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const [dropdownPosition, setDropdownPosition] = React.useState({ top: 0, left: 0, width: 0 });

  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Find selected option label
  const selectedOption = options.find(opt => opt.value === value);
  const displayValue = selectedOption?.label || placeholder;

  // Update dropdown position using RAF loop
  React.useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    let rafId: number | null = null;
    let isRunning = true;

    const updatePosition = () => {
      if (!isRunning || !triggerRef.current) return;

      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition(prev => {
        const newTop = rect.bottom + 4;
        const newLeft = rect.left;
        const newWidth = rect.width;

        if (prev.top !== newTop || prev.left !== newLeft || prev.width !== newWidth) {
          return { top: newTop, left: newLeft, width: newWidth };
        }
        return prev;
      });

      rafId = requestAnimationFrame(updatePosition);
    };

    rafId = requestAnimationFrame(updatePosition);

    return () => {
      isRunning = false;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isOpen]);

  // Close on click outside
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0) {
          onChange(options[highlightedIndex].value);
          setIsOpen(false);
        } else {
          setIsOpen(!isOpen);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(prev =>
            prev < options.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setHighlightedIndex(prev =>
            prev > 0 ? prev - 1 : options.length - 1
          );
        }
        break;
    }
  };

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        data-testid={testId}
        className="input-nightlife"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          textAlign: 'left',
          minHeight: '44px',
          padding: '12px 16px',
          background: isOpen
            ? 'linear-gradient(135deg, rgba(232, 121, 249, 0.15), rgba(0, 229, 255, 0.1))'
            : 'linear-gradient(135deg, rgba(232, 121, 249, 0.08), rgba(0, 229, 255, 0.05))',
          borderColor: isOpen ? 'rgba(232, 121, 249, 0.6)' : 'rgba(232, 121, 249, 0.4)',
          boxShadow: isOpen ? '0 0 20px rgba(232, 121, 249, 0.3)' : 'none'
        }}
      >
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: value ? '#ffffff' : '#999999'
        }}>
          {selectedOption?.icon}
          {displayValue}
        </span>
        <ChevronDown
          size={18}
          style={{
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            color: '#E879F9'
          }}
        />
      </button>

      {/* Dropdown Portal */}
      {isOpen && ReactDOM.createPortal(
        <div
          ref={dropdownRef}
          role="listbox"
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width || 278,
            background: 'rgba(0, 0, 0, 0.95)',
            border: '2px solid rgba(232, 121, 249, 0.4)',
            borderRadius: '12px',
            maxHeight: '300px',
            overflowY: 'auto',
            zIndex: 9999,
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
          }}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = index === highlightedIndex;

            return (
              <div
                key={option.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleOptionClick(option.value)}
                onMouseEnter={() => setHighlightedIndex(index)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  background: isHighlighted ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  borderBottom: index < options.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                  transition: 'background 0.2s ease',
                  color: isSelected ? '#00E5FF' : '#ffffff',
                  fontSize: '14px'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {option.icon}
                  {option.label}
                </span>
                {isSelected && <Check size={16} style={{ color: '#00E5FF' }} />}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
};

export default CustomSelect;
