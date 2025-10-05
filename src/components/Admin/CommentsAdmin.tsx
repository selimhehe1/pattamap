import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import StarRating from '../Common/StarRating';
import AdminBreadcrumb from '../Common/AdminBreadcrumb';
import { logger } from '../../utils/logger';

interface AdminComment {
  id: number;
  user_id: number;
  employee_id: number;
  rating: number;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    pseudonym: string;
  };
  employee?: {
    id: number;
    name: string;
    nickname?: string;
  };
  reports?: Array<{
    id: number;
    user_id: number;
    reason: string;
    created_at: string;
    user?: {
      pseudonym: string;
    };
  }>;
}

interface CommentsAdminProps {
  onTabChange: (tab: string) => void;
}

const CommentsAdmin: React.FC<CommentsAdminProps> = ({ onTabChange }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reported' | 'approved' | 'rejected'>('reported');
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const [selectedComment, setSelectedComment] = useState<AdminComment | null>(null);

  useEffect(() => {
    loadComments();
  }, [filter]);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
      const response = await fetch(`${API_URL}/api/admin/comments?status=${filter === 'all' ? '' : filter}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      logger.error('Failed to load comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (commentId: number) => {
    setProcessingIds(prev => new Set(prev).add(commentId));
    try {
      const response = await fetch(`/api/admin/comments/${commentId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        await loadComments(); // Reload list
      }
    } catch (error) {
      logger.error('Failed to approve comment:', error);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
    }
  };

  const handleReject = async (commentId: number, reason?: string) => {
    setProcessingIds(prev => new Set(prev).add(commentId));
    try {
      const response = await fetch(`/api/admin/comments/${commentId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reason })
      });
      
      if (response.ok) {
        await loadComments(); // Reload list
      }
    } catch (error) {
      logger.error('Failed to reject comment:', error);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
    }
  };

  const handleDismissReports = async (commentId: number) => {
    setProcessingIds(prev => new Set(prev).add(commentId));
    try {
      const response = await fetch(`/api/admin/comments/${commentId}/dismiss-reports`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        await loadComments(); // Reload list
      }
    } catch (error) {
      logger.error('Failed to dismiss reports:', error);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FFD700';
      case 'approved': return '#00FF7F';
      case 'rejected': return '#FF4757';
      default: return '#cccccc';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'approved': return '✅';
      case 'rejected': return '❌';
      default: return '❓';
    }
  };

  if (!user || !['admin', 'moderator'].includes(user.role)) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '30px'
      }}>
        <div className="bg-nightlife-glass-card"
          style={{
            padding: '40px',
            textAlign: 'center'
          }}>
          <h2 style={{
            color: '#FF1B8D',
            fontSize: '24px',
            fontWeight: 'bold',
            margin: '0 0 15px 0'
          }}>
            🚫 Access Denied
          </h2>
          <p style={{ color: '#cccccc', fontSize: '16px' }}>
            You don't have permission to access this area.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-nightlife-gradient-main"
      style={{
        minHeight: '100vh',
        padding: '30px',
        color: 'white'
      }}>
      {/* Breadcrumb Navigation */}
      <AdminBreadcrumb
        currentSection="Gestion des Commentaires"
        onBackToDashboard={() => onTabChange('overview')}
        icon="💬"
      />

      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        
        <h1 style={{
          fontSize: '32px',
          fontWeight: '900',
          margin: '0 0 10px 0',
          background: 'linear-gradient(45deg, #FF1B8D, #FFD700)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 20px rgba(255,27,141,0.5)',
          fontFamily: '"Orbitron", monospace'
        }}>
          💬 Comments & Reviews Management
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#cccccc',
          margin: 0
        }}>
          Moderate comments, reviews, and handle reports
        </p>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '30px',
        overflowX: 'auto'
      }}>
        {[
          { key: 'reported', label: 'Reported', icon: '⚠️' },
          { key: 'pending', label: 'Pending', icon: '⏳' },
          { key: 'approved', label: 'Approved', icon: '✅' },
          { key: 'rejected', label: 'Rejected', icon: '❌' },
          { key: 'all', label: 'All', icon: '📋' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              border: filter === tab.key ? '2px solid #FF1B8D' : '2px solid rgba(255,27,141,0.3)',
              background: filter === tab.key 
                ? 'linear-gradient(45deg, rgba(255,27,141,0.2), rgba(255,215,0,0.1))'
                : 'linear-gradient(135deg, rgba(255,27,141,0.1), rgba(0,0,0,0.3))',
              color: filter === tab.key ? '#FF1B8D' : '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontSize: '14px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Comments List */}
      {isLoading ? (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '300px'
        }}>
          <div style={{
            display: 'inline-block',
            width: '40px',
            height: '40px',
            border: '4px solid rgba(255,27,141,0.3)',
            borderTop: '4px solid #FF1B8D',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      ) : comments.length === 0 ? (
        <div style={{
          background: 'linear-gradient(135deg, rgba(255,27,141,0.1), rgba(0,0,0,0.3))',
          borderRadius: '20px',
          border: '2px solid rgba(255,27,141,0.3)',
          padding: '40px',
          textAlign: 'center'
        }}>
          <h3 style={{
            color: '#FF1B8D',
            fontSize: '20px',
            fontWeight: 'bold',
            margin: '0 0 10px 0'
          }}>
            📭 No Comments Found
          </h3>
          <p style={{
            color: '#cccccc',
            fontSize: '16px'
          }}>
            No comments match the current filter.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {comments.map((comment) => (
            <div
              key={comment.id}
              style={{
                background: 'linear-gradient(135deg, rgba(255,27,141,0.1), rgba(0,0,0,0.3))',
                borderRadius: '20px',
                border: comment.reports && comment.reports.length > 0 
                  ? '2px solid #FF4757' 
                  : '2px solid rgba(255,27,141,0.3)',
                padding: '25px',
                position: 'relative'
              }}
            >
              {/* Status Badge */}
              <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                padding: '8px 15px',
                borderRadius: '20px',
                background: `${getStatusColor(comment.status)}20`,
                border: `2px solid ${getStatusColor(comment.status)}`,
                color: getStatusColor(comment.status),
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                {getStatusIcon(comment.status)} {comment.status.toUpperCase()}
              </div>

              {/* Reports Badge */}
              {comment.reports && comment.reports.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '60px',
                  right: '20px',
                  padding: '6px 12px',
                  borderRadius: '15px',
                  background: 'rgba(255,71,87,0.2)',
                  border: '2px solid #FF4757',
                  color: '#FF4757',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  ⚠️ {comment.reports.length} report{comment.reports.length > 1 ? 's' : ''}
                </div>
              )}

              {/* Comment Header */}
              <div style={{ marginBottom: '20px', paddingRight: '150px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    background: 'linear-gradient(45deg, #FF1B8D, #FFD700)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '18px'
                  }}>
                    {comment.user?.pseudonym?.charAt(0).toUpperCase() || '?'}
                  </div>
                  
                  <div>
                    <div style={{
                      color: '#ffffff',
                      fontWeight: 'bold',
                      fontSize: '16px'
                    }}>
                      {comment.user?.pseudonym || 'Anonymous'}
                    </div>
                    <div style={{
                      color: '#cccccc',
                      fontSize: '12px',
                      marginBottom: '5px'
                    }}>
                      {formatDate(comment.created_at)}
                    </div>
                    <div style={{
                      color: '#00FFFF',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}>
                      Review for: {comment.employee?.name}
                      {comment.employee?.nickname && ` "${comment.employee.nickname}"`}
                    </div>
                  </div>
                </div>

                {/* Rating */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '15px'
                }}>
                  <StarRating
                    rating={comment.rating}
                    readonly={true}
                    size="medium"
                  />
                  <span style={{
                    color: '#FFD700',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                    {(comment.rating || 0).toFixed(1)}/5
                  </span>
                </div>

                {/* Comment Text */}
                <div style={{
                  color: '#ffffff',
                  fontSize: '16px',
                  lineHeight: '1.6',
                  marginBottom: '20px',
                  padding: '15px',
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,27,141,0.2)'
                }}>
                  {comment.comment}
                </div>

                {/* Reports Section */}
                {comment.reports && comment.reports.length > 0 && (
                  <div style={{
                    background: 'rgba(255,71,87,0.1)',
                    border: '1px solid #FF4757',
                    borderRadius: '12px',
                    padding: '15px',
                    marginBottom: '20px'
                  }}>
                    <h4 style={{
                      color: '#FF4757',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      margin: '0 0 10px 0'
                    }}>
                      ⚠️ Reports ({comment.reports.length})
                    </h4>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      {comment.reports.map((report, index) => (
                        <div
                          key={report.id}
                          style={{
                            background: 'rgba(0,0,0,0.3)',
                            borderRadius: '8px',
                            padding: '10px',
                            fontSize: '14px'
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '5px'
                          }}>
                            <span style={{
                              color: '#ffffff',
                              fontWeight: 'bold'
                            }}>
                              {report.user?.pseudonym || 'Anonymous'}
                            </span>
                            <span style={{
                              color: '#cccccc',
                              fontSize: '12px'
                            }}>
                              {formatDate(report.created_at)}
                            </span>
                          </div>
                          <div style={{
                            color: '#FF4757',
                            lineHeight: '1.5'
                          }}>
                            {report.reason}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '12px',
                paddingTop: '20px',
                borderTop: '1px solid rgba(255,27,141,0.3)',
                flexWrap: 'wrap'
              }}>
                {comment.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(comment.id)}
                      disabled={processingIds.has(comment.id)}
                      style={{
                        flex: 1,
                        minWidth: '120px',
                        padding: '12px 20px',
                        background: processingIds.has(comment.id)
                          ? 'linear-gradient(45deg, #666666, #888888)'
                          : 'linear-gradient(45deg, #00FF7F, #00CC65)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: processingIds.has(comment.id) ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        transition: 'all 0.3s ease',
                        opacity: processingIds.has(comment.id) ? 0.7 : 1
                      }}
                    >
                      {processingIds.has(comment.id) ? '⏳ Approving...' : '✅ Approve'}
                    </button>

                    <button
                      onClick={() => handleReject(comment.id)}
                      disabled={processingIds.has(comment.id)}
                      style={{
                        flex: 1,
                        minWidth: '120px',
                        padding: '12px 20px',
                        background: processingIds.has(comment.id)
                          ? 'linear-gradient(45deg, #666666, #888888)'
                          : 'linear-gradient(45deg, #FF4757, #FF3742)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: processingIds.has(comment.id) ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        transition: 'all 0.3s ease',
                        opacity: processingIds.has(comment.id) ? 0.7 : 1
                      }}
                    >
                      {processingIds.has(comment.id) ? '⏳ Rejecting...' : '❌ Reject'}
                    </button>
                  </>
                )}

                {comment.reports && comment.reports.length > 0 && (
                  <button
                    onClick={() => handleDismissReports(comment.id)}
                    disabled={processingIds.has(comment.id)}
                    style={{
                      flex: 1,
                      minWidth: '150px',
                      padding: '12px 20px',
                      background: processingIds.has(comment.id)
                        ? 'linear-gradient(45deg, #666666, #888888)'
                        : 'linear-gradient(45deg, #FFD700, #FFA500)',
                      color: processingIds.has(comment.id) ? 'white' : '#000',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: processingIds.has(comment.id) ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease',
                      opacity: processingIds.has(comment.id) ? 0.7 : 1
                    }}
                  >
                    {processingIds.has(comment.id) ? '⏳ Dismissing...' : '📝 Dismiss Reports'}
                  </button>
                )}

                <button
                  onClick={() => setSelectedComment(comment)}
                  style={{
                    padding: '12px 20px',
                    background: 'linear-gradient(45deg, #00FFFF, #0080FF)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,255,255,0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  👁️ View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comment Detail Modal */}
      {selectedComment && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.9)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(26,0,51,0.95), rgba(13,0,25,0.95))',
            borderRadius: '25px',
            border: '2px solid #FF1B8D',
            boxShadow: '0 20px 60px rgba(255,27,141,0.3)',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative',
            padding: '30px'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setSelectedComment(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(255,27,141,0.2)',
                border: '2px solid #FF1B8D',
                color: '#FF1B8D',
                fontSize: '20px',
                cursor: 'pointer',
                zIndex: 10
              }}
            >
              ×
            </button>

            <h2 style={{
              color: '#FF1B8D',
              fontSize: '24px',
              fontWeight: 'bold',
              margin: '0 0 20px 0'
            }}>
              Comment Details
            </h2>

            {/* Full comment details here */}
            <div style={{ color: 'white' }}>
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#FF1B8D' }}>Author:</strong> {selectedComment.user?.pseudonym || 'Anonymous'}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#FF1B8D' }}>Employee:</strong> {selectedComment.employee?.name}
                {selectedComment.employee?.nickname && ` "${selectedComment.employee.nickname}"`}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#FF1B8D' }}>Rating:</strong> {selectedComment.rating}/5 stars
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#FF1B8D' }}>Status:</strong> {selectedComment.status}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#FF1B8D' }}>Created:</strong> {formatDate(selectedComment.created_at)}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#FF1B8D' }}>Comment:</strong>
                <div style={{
                  marginTop: '10px',
                  padding: '15px',
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '10px',
                  lineHeight: '1.6'
                }}>
                  {selectedComment.comment}
                </div>
              </div>

              {/* Reports in modal */}
              {selectedComment.reports && selectedComment.reports.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <strong style={{ color: '#FF1B8D' }}>Reports:</strong>
                  <div style={{ marginTop: '10px' }}>
                    {selectedComment.reports.map((report) => (
                      <div
                        key={report.id}
                        style={{
                          background: 'rgba(255,71,87,0.1)',
                          border: '1px solid #FF4757',
                          borderRadius: '8px',
                          padding: '10px',
                          marginBottom: '10px'
                        }}
                      >
                        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                          {report.user?.pseudonym || 'Anonymous'} - {formatDate(report.created_at)}
                        </div>
                        <div style={{ color: '#FF4757' }}>
                          {report.reason}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading Animation CSS */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CommentsAdmin;