import React from 'react';
import { Employee } from '../../types';

interface SearchResultsProps {
  results: Employee[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onEmployeeClick: (employee: Employee) => void;
  totalResults: number;
  currentPage: number;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  loading,
  hasMore,
  onLoadMore,
  onEmployeeClick,
  totalResults,
  currentPage
}) => {
  // Employee card component - Grid layout
  const EmployeeCard: React.FC<{ employee: Employee }> = ({ employee }) => {
    const mainPhoto = employee.photos && Array.isArray(employee.photos) && employee.photos.length > 0 ? employee.photos[0] : null;
    const hasCurrentEmployment = employee.current_employment && Array.isArray(employee.current_employment) && employee.current_employment.length > 0;
    const currentEstablishment = (hasCurrentEmployment && employee.current_employment?.[0]?.establishment) || null;

    return (
      <div
        onClick={() => onEmployeeClick(employee)}
        style={{
          background: 'linear-gradient(135deg, rgba(0,0,0,0.7), rgba(26,0,51,0.7))',
          borderRadius: '20px',
          padding: '15px',
          border: '2px solid rgba(255,27,141,0.3)',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          height: '100%'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#FF1B8D';
          e.currentTarget.style.boxShadow = '0 8px 30px rgba(255,27,141,0.4)';
          e.currentTarget.style.transform = 'translateY(-5px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,27,141,0.3)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        {/* Photo Section */}
        <div style={{
          width: '100%',
          paddingBottom: '100%',
          position: 'relative',
          borderRadius: '15px',
          overflow: 'hidden',
          background: 'linear-gradient(45deg, #FF1B8D, #FFD700)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {mainPhoto ? (
            <img
              src={mainPhoto}
              alt={employee.name}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '13px'
              }}
              onError={(e) => {
                // 🛡️ XSS SAFE: Using DOM manipulation instead of innerHTML
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement!;

                // Create safe fallback element
                const fallbackDiv = document.createElement('div');
                fallbackDiv.style.color = 'white';
                fallbackDiv.style.fontSize = '48px';
                fallbackDiv.style.textAlign = 'center';
                fallbackDiv.style.display = 'flex';
                fallbackDiv.style.alignItems = 'center';
                fallbackDiv.style.justifyContent = 'center';
                fallbackDiv.style.width = '100%';
                fallbackDiv.style.height = '100%';
                fallbackDiv.textContent = '👤';

                // Clear and append safely
                parent.innerHTML = '';
                parent.appendChild(fallbackDiv);
              }}
            />
          ) : (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              color: 'white',
              fontSize: '48px',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              👤
            </div>
          )}

          {/* Photo Count Badge */}
          {employee.photos && Array.isArray(employee.photos) && employee.photos.length > 1 && (
            <div style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'rgba(0,0,0,0.8)',
              color: '#FFD700',
              borderRadius: '12px',
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 'bold',
              zIndex: 1
            }}>
              📸 {employee.photos?.length || 0}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div style={{ flex: '1', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Name & Age */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #FF1B8D, #FFD700)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: '1'
            }}>
              {employee.name}
            </h3>
            {employee.age && (
              <span style={{
                background: 'rgba(0,255,255,0.2)',
                color: '#00FFFF',
                padding: '3px 8px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 'bold',
                border: '1px solid rgba(0,255,255,0.4)',
                flexShrink: 0
              }}>
                {employee.age}y
              </span>
            )}
          </div>

          {/* Nationality */}
          {employee.nationality && (
            <div style={{
              fontSize: '12px',
              color: '#00FFFF',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span>🌍</span>
              <span>{employee.nationality}</span>
            </div>
          )}

          {/* Current Establishment */}
          {currentEstablishment && (
            <div style={{
              fontSize: '12px',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              <span style={{ flexShrink: 0 }}>🏢</span>
              <span style={{
                fontWeight: '500',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>{currentEstablishment.name}</span>
            </div>
          )}

          {/* Rating */}
          {employee.average_rating && (
            <div style={{
              fontSize: '12px',
              color: '#FFD700',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span>⭐</span>
              <span>{employee.average_rating?.toFixed(1) || '0.0'}</span>
              {employee.comment_count && (
                <span style={{ color: '#999999', fontSize: '11px' }}>
                  ({employee.comment_count})
                </span>
              )}
            </div>
          )}

          {/* Social Media Icons */}
          {employee.social_media && (
            <div style={{
              display: 'flex',
              gap: '4px',
              flexWrap: 'wrap',
              marginTop: 'auto'
            }}>
              {employee.social_media.instagram && (
                <span style={{
                  background: 'linear-gradient(45deg, #E4405F, #833AB4)',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}>
                  IG
                </span>
              )}
              {employee.social_media.line && (
                <span style={{
                  background: '#00C300',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}>
                  LINE
                </span>
              )}
              {employee.social_media.whatsapp && (
                <span style={{
                  background: '#25D366',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}>
                  WA
                </span>
              )}
              {employee.social_media.telegram && (
                <span style={{
                  background: '#0088CC',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}>
                  TG
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Empty state
  if (!loading && (!results || results.length === 0)) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px 20px',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '20px',
        border: '2px solid rgba(255,27,141,0.3)'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔍</div>
        <h3 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#FF1B8D',
          marginBottom: '10px'
        }}>
          No Results Found
        </h3>
        <p style={{
          fontSize: '16px',
          color: '#cccccc',
          margin: '0'
        }}>
          Try adjusting your search filters or search terms
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Results Grid */}
      <div
        className="employee-search-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '20px',
          marginBottom: '30px'
        }}
      >
        {(results || []).map((employee) => (
          <EmployeeCard key={employee.id} employee={employee} />
        ))}
      </div>

      {/* Responsive CSS */}
      <style>{`
        @media (max-width: 1399px) {
          .employee-search-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        @media (max-width: 1023px) {
          .employee-search-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 639px) {
          .employee-search-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* Loading More Indicator */}
      {loading && results && results.length > 0 && (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          background: 'rgba(255,27,141,0.1)',
          border: '2px solid rgba(255,27,141,0.3)',
          borderRadius: '15px',
          color: '#FF1B8D',
          fontSize: '16px',
          fontWeight: 'bold'
        }}>
          🔄 Loading more results...
        </div>
      )}

      {/* Load More Button */}
      {!loading && hasMore && results && results.length > 0 && (
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={onLoadMore}
            style={{
              padding: '15px 30px',
              border: '2px solid #FF1B8D',
              background: 'linear-gradient(45deg, rgba(255,27,141,0.1), rgba(255,27,141,0.2))',
              color: '#FF1B8D',
              borderRadius: '25px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(255,27,141,0.3)',
              minWidth: '200px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(45deg, #FF1B8D, #E91E63)';
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.boxShadow = '0 6px 25px rgba(255,27,141,0.5)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(45deg, rgba(255,27,141,0.1), rgba(255,27,141,0.2))';
              e.currentTarget.style.color = '#FF1B8D';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(255,27,141,0.3)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            📥 Load More Results
          </button>
        </div>
      )}

      {/* Pagination Info */}
      {results && results.length > 0 && (
        <div style={{
          textAlign: 'center',
          marginTop: '20px',
          fontSize: '14px',
          color: '#cccccc'
        }}>
          Showing {results?.length || 0} of {totalResults} results (Page {currentPage})
        </div>
      )}

      {/* Initial Loading */}
      {loading && (!results || results.length === 0) && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'rgba(255,27,141,0.1)',
          border: '2px solid rgba(255,27,141,0.3)',
          borderRadius: '20px'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '20px',
            animation: 'spin 2s linear infinite'
          }}>
            🔄
          </div>
          <h3 style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#FF1B8D',
            margin: '0'
          }}>
            Searching employees...
          </h3>
          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default SearchResults;