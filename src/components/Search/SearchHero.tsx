import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Users, CheckCircle, Sparkles } from 'lucide-react';

interface SearchHeroProps {
  totalResults: number;
  verifiedCount?: number;
  isLoading?: boolean;
}

const SearchHero: React.FC<SearchHeroProps> = ({
  totalResults,
  verifiedCount = 0,
  isLoading = false
}) => {
  const { t } = useTranslation();

  return (
    <section className="search-hero">
      {/* Animated gradient background */}
      <div className="search-hero-bg" />

      {/* Radial glow effect */}
      <div className="search-hero-glow" />

      <div className="search-hero-content">
        {/* Animated Search Icon */}
        <div className="search-icon-container">
          <Search className="search-hero-icon" size={36} />
          <Sparkles className="search-sparkle search-sparkle-1" size={16} />
          <Sparkles className="search-sparkle search-sparkle-2" size={12} />
        </div>

        {/* Title */}
        <h1 className="search-hero-title">
          {t('search.title', 'Discover Profiles')}
        </h1>

        {/* Tagline */}
        <p className="search-hero-tagline">
          {t('search.subtitle', 'Find the perfect match with advanced filters')}
        </p>

        {/* Stats Cards */}
        <div className="search-hero-stats">
          {/* Total Profiles */}
          <div className="search-stat-card">
            <Users className="search-stat-icon" size={24} />
            <span className="search-stat-value">
              {isLoading ? '...' : totalResults.toLocaleString()}
            </span>
            <span className="search-stat-label">
              {t('search.stats.profiles', 'Profiles')}
            </span>
          </div>

          {/* Verified Count */}
          <div className="search-stat-card search-stat-card-cyan">
            <CheckCircle className="search-stat-icon" size={24} />
            <span className="search-stat-value">
              {isLoading ? '...' : verifiedCount.toLocaleString()}
            </span>
            <span className="search-stat-label">
              {t('search.stats.verified', 'Verified')}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SearchHero;
