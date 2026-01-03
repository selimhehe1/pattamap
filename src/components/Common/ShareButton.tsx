import React, { useState, useCallback } from 'react';
import { Share2, Copy, Check, Facebook, MessageCircle } from 'lucide-react';
import { trackEvent } from '../../utils/analytics';
import notification from '../../utils/notification';

interface ShareButtonProps {
  /** URL to share (defaults to current page) */
  url?: string;
  /** Title for the share */
  title: string;
  /** Optional description */
  description?: string;
  /** Button variant */
  variant?: 'icon' | 'button' | 'dropdown';
  /** Additional CSS classes */
  className?: string;
}

/**
 * ShareButton - Social sharing component
 *
 * Uses Web Share API when available, falls back to copy-to-clipboard
 * Supports: Native share, Facebook, LINE, Copy link
 */
const ShareButton: React.FC<ShareButtonProps> = ({
  url,
  title,
  description,
  variant = 'icon',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = url || window.location.href;
  const shareText = description || title;

  // Check if Web Share API is available
  const canShare = typeof navigator !== 'undefined' && navigator.share;

  const handleNativeShare = useCallback(async () => {
    if (!canShare) return;

    try {
      await navigator.share({
        title,
        text: shareText,
        url: shareUrl,
      });
      trackEvent('Social', 'Share', 'native');
    } catch (error) {
      // User cancelled or share failed
      if ((error as Error).name !== 'AbortError') {
        console.error('Share failed:', error);
      }
    }
  }, [canShare, title, shareText, shareUrl]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      trackEvent('Social', 'Share', 'copy-link');
      notification.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
      notification.error('Failed to copy link');
    }
  }, [shareUrl]);

  const handleFacebookShare = useCallback(() => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(fbUrl, '_blank', 'width=600,height=400');
    trackEvent('Social', 'Share', 'facebook');
  }, [shareUrl, shareText]);

  const handleLineShare = useCallback(() => {
    const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(lineUrl, '_blank', 'width=600,height=400');
    trackEvent('Social', 'Share', 'line');
  }, [shareUrl, shareText]);

  // Icon-only variant with native share
  if (variant === 'icon') {
    return (
      <button
        onClick={canShare ? handleNativeShare : handleCopyLink}
        className={`share-button share-button--icon ${className}`}
        aria-label="Share"
        title={canShare ? 'Share' : 'Copy link'}
      >
        {copied ? <Check size={20} /> : <Share2 size={20} />}
      </button>
    );
  }

  // Button variant with native share
  if (variant === 'button') {
    return (
      <button
        onClick={canShare ? handleNativeShare : handleCopyLink}
        className={`share-button share-button--full ${className}`}
        aria-label="Share"
      >
        {copied ? <Check size={18} /> : <Share2 size={18} />}
        <span>{copied ? 'Copied!' : 'Share'}</span>
      </button>
    );
  }

  // Dropdown variant with multiple options
  return (
    <div className={`share-button-container ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="share-button share-button--icon"
        aria-label="Share options"
        aria-expanded={isOpen}
      >
        <Share2 size={20} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="share-dropdown-backdrop"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Dropdown menu */}
          <div className="share-dropdown" role="menu">
            {canShare && (
              <button
                onClick={() => { handleNativeShare(); setIsOpen(false); }}
                className="share-dropdown-item"
                role="menuitem"
              >
                <Share2 size={18} />
                <span>Share</span>
              </button>
            )}

            <button
              onClick={() => { handleFacebookShare(); setIsOpen(false); }}
              className="share-dropdown-item"
              role="menuitem"
            >
              <Facebook size={18} />
              <span>Facebook</span>
            </button>

            <button
              onClick={() => { handleLineShare(); setIsOpen(false); }}
              className="share-dropdown-item"
              role="menuitem"
            >
              <MessageCircle size={18} />
              <span>LINE</span>
            </button>

            <button
              onClick={() => { handleCopyLink(); setIsOpen(false); }}
              className="share-dropdown-item"
              role="menuitem"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              <span>{copied ? 'Copied!' : 'Copy link'}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ShareButton;
