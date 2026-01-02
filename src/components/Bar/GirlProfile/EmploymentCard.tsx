import React from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Globe, Briefcase, Calendar, ExternalLink } from 'lucide-react';
import type { EmploymentCardProps } from './types';

/**
 * EmploymentCard Component
 *
 * Displays a single employment record (current or past).
 * Extracted from GirlProfile to eliminate code duplication.
 */
const EmploymentCard: React.FC<EmploymentCardProps> = ({
  employment,
  isPast = false,
  onNavigate
}) => {
  const { t } = useTranslation();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (employment.establishment?.id) {
      onNavigate(employment.establishment.id);
    }
  };

  return (
    <div className="profile-v2-workplace">
      <div className="profile-v2-workplace-info">
        <h4 className="profile-v2-workplace-name">
          {employment.establishment?.name}
        </h4>

        <div className="profile-v2-workplace-meta">
          {employment.establishment?.category?.name && (
            <span>
              <MapPin size={12} />
              {employment.establishment.category.name}
            </span>
          )}
          {employment.establishment?.zone && (
            <span>
              <Globe size={12} />
              {employment.establishment.zone}
            </span>
          )}
        </div>

        {employment.position && (
          <div className="profile-v2-workplace-position">
            <Briefcase size={12} />
            {employment.position}
          </div>
        )}

        {employment.start_date && (
          <div className="profile-v2-workplace-date">
            <Calendar size={12} />
            {isPast ? (
              <>
                {new Date(employment.start_date).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric'
                })}
                {employment.end_date && (
                  <> – {new Date(employment.end_date).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric'
                  })}</>
                )}
              </>
            ) : (
              <>
                {t('profile.since', 'Since')} {new Date(employment.start_date).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric'
                })}
              </>
            )}
          </div>
        )}
      </div>

      {employment.establishment?.id && (
        <button
          className={`profile-v2-workplace-btn ${isPast ? 'profile-v2-workplace-btn--muted' : ''}`}
          onClick={handleClick}
        >
          <ExternalLink size={14} />
          {t('profile.visitBar', 'Visit Bar')}
        </button>
      )}
    </div>
  );
};

export default EmploymentCard;
