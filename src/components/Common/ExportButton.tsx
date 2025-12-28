import React, { useState, useCallback } from 'react';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import toast from 'react-hot-toast';
import { trackEvent } from '../../utils/analytics';

type ExportType = 'favorites' | 'visits' | 'badges' | 'reviews';

interface ExportButtonProps {
  /** Type of data to export */
  type: ExportType;
  /** Button variant */
  variant?: 'icon' | 'button';
  /** Additional CSS classes */
  className?: string;
}

const EXPORT_LABELS: Record<ExportType, string> = {
  favorites: 'Favorites',
  visits: 'Visits',
  badges: 'Badges',
  reviews: 'Reviews',
};

/**
 * ExportButton - Download user data as CSV
 *
 * Exports user's data (favorites, visits, badges, reviews) to CSV format.
 */
const ExportButton: React.FC<ExportButtonProps> = ({
  type,
  variant = 'button',
  className = '',
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const { secureFetch } = useSecureFetch();

  const handleExport = useCallback(async () => {
    if (isExporting) return;

    setIsExporting(true);

    try {
      const response = await secureFetch(`/api/export/${type}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      // Get the CSV content
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `pattamap-${type}-${Date.now()}.csv`;

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`${EXPORT_LABELS[type]} exported successfully`);
      trackEvent('Export', 'Download', type);

    } catch (error) {
      console.error('Export error:', error);
      toast.error(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, [type, isExporting, secureFetch]);

  if (variant === 'icon') {
    return (
      <button
        onClick={handleExport}
        disabled={isExporting}
        className={`export-button export-button--icon ${className}`}
        aria-label={`Export ${EXPORT_LABELS[type]} to CSV`}
        title={`Export ${EXPORT_LABELS[type]}`}
      >
        {isExporting ? (
          <Loader2 size={20} className="animate-spin" />
        ) : (
          <Download size={20} />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className={`export-button export-button--full ${className}`}
      aria-label={`Export ${EXPORT_LABELS[type]} to CSV`}
    >
      {isExporting ? (
        <Loader2 size={18} className="animate-spin" />
      ) : (
        <FileSpreadsheet size={18} />
      )}
      <span>
        {isExporting ? 'Exporting...' : `Export ${EXPORT_LABELS[type]}`}
      </span>
    </button>
  );
};

export default ExportButton;
