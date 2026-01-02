/**
 * OwnershipRequestCard Component
 *
 * Displays a single ownership request with all details and admin review controls.
 * Extracted from EstablishmentOwnersAdmin for better maintainability.
 */

import React from 'react';
import {
  Building2,
  MapPin,
  User,
  MessageSquare,
  Key,
  Paperclip,
  FileText,
  Pencil,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import type { OwnershipRequest } from '../types/ownershipTypes';
import { formatDate } from './utils';

interface OwnershipRequestCardProps {
  request: OwnershipRequest;
  isProcessing: boolean;
  isSelected: boolean;
  adminNotes: string;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
  onSelect: (request: OwnershipRequest) => void;
  onAdminNotesChange: (notes: string) => void;
}

const OwnershipRequestCard: React.FC<OwnershipRequestCardProps> = ({
  request,
  isProcessing,
  isSelected,
  adminNotes,
  onApprove,
  onReject,
  onSelect,
  onAdminNotesChange
}) => {
  const notesValue = isSelected ? adminNotes : '';
  const isButtonDisabled = isProcessing || (isSelected && !adminNotes.trim());

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(193, 154, 107,0.1), rgba(0,0,0,0.3))',
        borderRadius: '20px',
        border: '2px solid rgba(255,215,0,0.3)',
        padding: '25px',
        position: 'relative'
      }}
    >
      {/* Request Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '20px',
        gap: '20px'
      }}>
        <div style={{ flex: 1 }}>
          <h3 style={{
            color: '#FFD700',
            fontSize: '20px',
            fontWeight: 'bold',
            margin: '0 0 10px 0'
          }}>
            <Building2 size={24} /> {request.establishment.name}
          </h3>
          <p style={{
            color: '#cccccc',
            fontSize: '14px',
            margin: '0 0 10px 0'
          }}>
            {request.establishment.address}
          </p>
          {request.establishment.zone && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '10px',
              background: 'rgba(0,229,255,0.2)',
              border: '1px solid #00E5FF',
              color: '#00E5FF',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              <MapPin size={12} /> {request.establishment.zone}
            </span>
          )}
        </div>

        {request.establishment.logo_url && (
          <img
            src={request.establishment.logo_url}
            alt={request.establishment.name}
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '12px',
              objectFit: 'cover',
              border: '2px solid rgba(255,215,0,0.3)'
            }}
          />
        )}
      </div>

      {/* User Info */}
      <div style={{
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '12px',
        padding: '15px',
        marginBottom: '20px'
      }}>
        <h4 style={{
          color: '#C19A6B',
          fontSize: '14px',
          fontWeight: 'bold',
          margin: '0 0 10px 0',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          <User size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Requester Information
        </h4>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px'
        }}>
          <div>
            <div style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase',
              fontWeight: 'bold',
              marginBottom: '5px'
            }}>
              Name
            </div>
            <div style={{ color: '#ffffff', fontWeight: 'bold' }}>
              {request.user.pseudonym}
            </div>
          </div>
          <div>
            <div style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase',
              fontWeight: 'bold',
              marginBottom: '5px'
            }}>
              Email
            </div>
            <div style={{ color: '#ffffff' }}>
              {request.user.email}
            </div>
          </div>
          <div>
            <div style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase',
              fontWeight: 'bold',
              marginBottom: '5px'
            }}>
              Submitted
            </div>
            <div style={{ color: '#ffffff' }}>
              {formatDate(request.created_at)}
            </div>
          </div>
        </div>
      </div>

      {/* Request Message */}
      {request.request_message && (
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '12px',
          padding: '15px',
          marginBottom: '20px',
          borderLeft: '3px solid rgba(0,229,255,0.6)'
        }}>
          <h4 style={{
            color: '#00E5FF',
            fontSize: '14px',
            fontWeight: 'bold',
            margin: '0 0 10px 0',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            <MessageSquare size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Request Message
          </h4>
          <p style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: '14px',
            margin: 0,
            lineHeight: 1.6
          }}>
            {request.request_message}
          </p>
        </div>
      )}

      {/* Verification Code */}
      {request.verification_code && (
        <div style={{
          background: 'rgba(255,215,0,0.1)',
          borderRadius: '12px',
          padding: '15px',
          marginBottom: '20px',
          border: '2px solid rgba(255,215,0,0.3)'
        }}>
          <h4 style={{
            color: '#FFD700',
            fontSize: '14px',
            fontWeight: 'bold',
            margin: '0 0 10px 0',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            <Key size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Verification Code
          </h4>
          <div style={{
            color: '#FFD700',
            fontSize: '18px',
            fontWeight: 'bold',
            fontFamily: 'monospace'
          }}>
            {request.verification_code}
          </div>
        </div>
      )}

      {/* Documents */}
      {request.documents_urls && request.documents_urls.length > 0 && (
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '12px',
          padding: '15px',
          marginBottom: '20px'
        }}>
          <h4 style={{
            color: '#C19A6B',
            fontSize: '14px',
            fontWeight: 'bold',
            margin: '0 0 15px 0',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            <Paperclip size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Submitted Documents ({request.documents_urls.length})
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: '15px'
          }}>
            {request.documents_urls.map((url, index) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '2px solid rgba(193, 154, 107,0.2)',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(193, 154, 107,0.1)';
                  e.currentTarget.style.borderColor = '#C19A6B';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(193, 154, 107,0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  width: '100%',
                  height: '100px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}>
                  {url.toLowerCase().endsWith('.pdf') ? (
                    <FileText size={32} />
                  ) : (
                    <img src={url} alt={`Document ${index + 1}`} style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }} />
                  )}
                </div>
                <span style={{
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.7)',
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}>
                  Document {index + 1}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Admin Review Form */}
      <div style={{
        background: 'rgba(0,0,0,0.5)',
        borderRadius: '12px',
        padding: '20px',
        border: '2px solid rgba(255,215,0,0.3)'
      }}>
        <h4 style={{
          color: '#FFD700',
          fontSize: '16px',
          fontWeight: 'bold',
          margin: '0 0 15px 0'
        }}>
          <Pencil size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          Admin Review
        </h4>

        <textarea
          placeholder="Enter admin notes (reason for approval/rejection)..."
          value={notesValue}
          onChange={(e) => {
            onSelect(request);
            onAdminNotesChange(e.target.value);
          }}
          onFocus={() => onSelect(request)}
          style={{
            width: '100%',
            minHeight: '100px',
            padding: '12px',
            borderRadius: '10px',
            border: '2px solid rgba(255,215,0,0.3)',
            background: 'rgba(0,0,0,0.3)',
            color: '#ffffff',
            fontSize: '14px',
            fontFamily: 'inherit',
            resize: 'vertical',
            marginBottom: '15px'
          }}
        />

        <div style={{
          display: 'flex',
          gap: '12px'
        }}>
          <button
            onClick={() => onApprove(request.id)}
            disabled={isButtonDisabled}
            style={{
              flex: 1,
              padding: '12px',
              background: isButtonDisabled
                ? 'linear-gradient(45deg, #666666, #888888)'
                : 'linear-gradient(45deg, #00FF7F, #00CC65)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              opacity: isButtonDisabled ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!isButtonDisabled) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,255,127,0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {isProcessing ? (
              <><Loader2 size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Approving...</>
            ) : (
              <><CheckCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Approve & Assign Ownership</>
            )}
          </button>

          <button
            onClick={() => onReject(request.id)}
            disabled={isButtonDisabled}
            style={{
              flex: 1,
              padding: '12px',
              background: isButtonDisabled
                ? 'linear-gradient(45deg, #666666, #888888)'
                : 'linear-gradient(45deg, #FF4757, #FF3742)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              opacity: isButtonDisabled ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!isButtonDisabled) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 5px 15px rgba(255,71,87,0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {isProcessing ? (
              <><Loader2 size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Rejecting...</>
            ) : (
              <><XCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Reject Request</>
            )}
          </button>
        </div>

        <p style={{
          fontSize: '12px',
          color: 'rgba(255,255,255,0.5)',
          marginTop: '12px',
          marginBottom: 0,
          textAlign: 'center'
        }}>
          <AlertTriangle size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
          Admin notes are required before approving or rejecting
        </p>
      </div>
    </div>
  );
};

export default OwnershipRequestCard;
