import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Building2, History, ChevronDown } from 'lucide-react';
import EmploymentCard from './EmploymentCard';
import type { EmploymentSectionProps } from './types';

/**
 * EmploymentSection Component
 *
 * Displays current and past employment with collapsible history.
 * Uses EmploymentCard for individual employment records.
 */
const EmploymentSection: React.FC<EmploymentSectionProps> = ({
  currentEmployment,
  pastEmployment,
  showHistory,
  onToggleHistory,
  onNavigate
}) => {
  const { t } = useTranslation();

  if (currentEmployment.length === 0 && pastEmployment.length === 0) {
    return null;
  }

  return (
    <>
      {/* Current Employment - Always visible with accent styling */}
      {currentEmployment.length > 0 && (
        <motion.div
          className="profile-v2-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <h3 className="profile-v2-section-title">
            <Building2 size={16} />
            {t('profile.currentlyWorkingAt', 'Currently Working At')}
          </h3>

          <div className="profile-v2-workplaces profile-v2-workplaces--current">
            {currentEmployment.map((employment) => (
              <EmploymentCard
                key={employment.id}
                employment={employment}
                isPast={false}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Past Employment - Collapsible section with muted styling */}
      {pastEmployment.length > 0 && (
        <motion.div
          className="profile-v2-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <button
            className="profile-v2-history-toggle"
            onClick={onToggleHistory}
            aria-expanded={showHistory}
          >
            <History size={16} />
            <span>{t('profile.employmentHistory', 'Employment History')} ({pastEmployment.length})</span>
            <ChevronDown
              size={16}
              className={`profile-v2-history-chevron ${showHistory ? 'profile-v2-history-chevron--open' : ''}`}
            />
          </button>

          <AnimatePresence>
            {showHistory && (
              <motion.div
                className="profile-v2-workplaces profile-v2-workplaces--past"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                {pastEmployment.map((employment) => (
                  <EmploymentCard
                    key={employment.id}
                    employment={employment}
                    isPast={true}
                    onNavigate={onNavigate}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </>
  );
};

export default EmploymentSection;
