/**
 * Filter tabs component for EmployeesAdmin
 * Displays filter options: pending, pending-edits, approved, rejected, all
 * Refactored to use Command Center CSS classes
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

const FILTER_TABS: FilterTabWithIcon[] = [
  { key: 'pending', label: 'admin.filterNewPending', icon: <PlusSquare size={14} /> },
  { key: 'pending-edits', label: 'admin.filterPendingEdits', icon: <Pencil size={14} /> },
  { key: 'approved', label: 'admin.filterApproved', icon: <CheckCircle size={14} /> },
  { key: 'rejected', label: 'admin.filterRejected', icon: <XCircle size={14} /> },
  { key: 'all', label: 'admin.filterAll', icon: <ClipboardList size={14} /> },
];

export const EmployeesFilterTabs: React.FC<EmployeesFilterTabsProps> = ({
  activeFilter,
  onFilterChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="cmd-filters" style={{ marginBottom: '24px' }}>
      <div className="cmd-filter-pills">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onFilterChange(tab.key)}
            className={`cmd-filter ${activeFilter === tab.key ? 'cmd-filter--active' : ''}`}
          >
            {tab.icon}
            <span>{t(tab.label)}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default EmployeesFilterTabs;
