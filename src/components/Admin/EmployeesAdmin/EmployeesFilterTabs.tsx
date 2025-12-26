/**
 * Filter tabs component for EmployeesAdmin
 * Displays filter options: pending, pending-edits, approved, rejected, all
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { PlusSquare, Pencil, CheckCircle, XCircle, ClipboardList } from 'lucide-react';
import type { FilterType } from './types';

interface EmployeesFilterTabsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

interface FilterTabWithIcon {
  key: FilterType;
  label: string;
  icon: React.ReactNode;
}

const iconStyle = { marginRight: '4px', verticalAlign: 'middle' as const };

const FILTER_TABS: FilterTabWithIcon[] = [
  { key: 'pending', label: 'admin.filterNewPending', icon: <PlusSquare size={14} style={iconStyle} /> },
  { key: 'pending-edits', label: 'admin.filterPendingEdits', icon: <Pencil size={14} style={iconStyle} /> },
  { key: 'approved', label: 'admin.filterApproved', icon: <CheckCircle size={14} style={iconStyle} /> },
  { key: 'rejected', label: 'admin.filterRejected', icon: <XCircle size={14} style={iconStyle} /> },
  { key: 'all', label: 'admin.filterAll', icon: <ClipboardList size={14} style={iconStyle} /> },
];

export const EmployeesFilterTabs: React.FC<EmployeesFilterTabsProps> = ({
  activeFilter,
  onFilterChange,
}) => {
  const { t } = useTranslation();

  return (
    <div
      style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '30px',
        overflowX: 'auto',
      }}
    >
      {FILTER_TABS.map((tab) => {
        const isActive = activeFilter === tab.key;

        return (
          <button
            key={tab.key}
            onClick={() => onFilterChange(tab.key)}
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              border: isActive
                ? '2px solid #C19A6B'
                : '2px solid rgba(193, 154, 107, 0.3)',
              background: isActive
                ? 'linear-gradient(45deg, rgba(193, 154, 107, 0.2), rgba(255, 215, 0, 0.1))'
                : 'linear-gradient(135deg, rgba(193, 154, 107, 0.1), rgba(0, 0, 0, 0.3))',
              color: isActive ? '#C19A6B' : '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontSize: '14px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.icon}{t(tab.label)}
          </button>
        );
      })}
    </div>
  );
};

export default EmployeesFilterTabs;
