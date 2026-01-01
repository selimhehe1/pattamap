import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { asyncHandler, UnauthorizedError , InternalServerError } from '../middleware/asyncHandler';

/**
 * Export Controller
 * Handles data export to CSV format
 */

// Supabase relationship types for export queries
interface EmployeeRelation {
  name: string;
  nickname?: string;
  age?: number;
  nationality?: string[];
  is_freelance?: boolean;
}

interface EstablishmentRelation {
  name: string;
  zone?: string;
  address?: string;
}

interface BadgeRelation {
  name: string;
  description?: string;
  category?: string;
  rarity?: string;
}

// Helper to convert data to CSV
const toCSV = (data: Record<string, unknown>[], columns: string[]): string => {
  if (data.length === 0) return '';

  // Header row
  const header = columns.join(',');

  // Data rows
  const rows = data.map(row =>
    columns.map(col => {
      const value = row[col];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string') {
        // Escape quotes and wrap in quotes if contains comma or quote
        const escaped = value.replace(/"/g, '""');
        return /[,"\n]/.test(value) ? `"${escaped}"` : escaped;
      }
      if (Array.isArray(value)) return `"${value.join(', ')}"`;
      return String(value);
    }).join(',')
  );

  return [header, ...rows].join('\n');
};

/**
 * Export user's favorites to CSV
 * GET /api/export/favorites
 */
export const exportFavorites = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw UnauthorizedError('Authentication required');
    }

    const { data: favorites, error } = await supabase
      .from('favorites')
      .select(`
        created_at,
        employee:employees(
          name,
          nickname,
          age,
          nationality,
          is_freelance
        )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Export favorites error:', error);
      throw InternalServerError('Failed to export favorites');
    }

    // Flatten data for CSV
    const flatData = (favorites || []).map(fav => {
      const employeeArray = fav.employee as EmployeeRelation[] | null;
      const employee = employeeArray?.[0];
      return {
        name: employee?.name || '',
        nickname: employee?.nickname || '',
        age: employee?.age || '',
        nationality: employee?.nationality || [],
        is_freelance: employee?.is_freelance ? 'Yes' : 'No',
        added_at: new Date(fav.created_at).toLocaleDateString(),
      };
    });

    const csv = toCSV(flatData, ['name', 'nickname', 'age', 'nationality', 'is_freelance', 'added_at']);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="pattamap-favorites-${Date.now()}.csv"`);
    res.send(csv);
});

/**
 * Export user's visit history to CSV
 * GET /api/export/visits
 */
export const exportVisits = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw UnauthorizedError('Authentication required');
    }

    const { data: visits, error } = await supabase
      .from('user_visits')
      .select(`
        visited_at,
        establishment:establishments(
          name,
          zone,
          address
        )
      `)
      .eq('user_id', req.user.id)
      .order('visited_at', { ascending: false });

    if (error) {
      logger.error('Export visits error:', error);
      throw InternalServerError('Failed to export visits');
    }

    const flatData = (visits || []).map(visit => {
      const establishmentArray = visit.establishment as EstablishmentRelation[] | null;
      const establishment = establishmentArray?.[0];
      return {
        establishment: establishment?.name || '',
        zone: establishment?.zone || '',
        address: establishment?.address || '',
        visited_at: new Date(visit.visited_at).toLocaleDateString(),
      };
    });

    const csv = toCSV(flatData, ['establishment', 'zone', 'address', 'visited_at']);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="pattamap-visits-${Date.now()}.csv"`);
    res.send(csv);
});

/**
 * Export user's badges to CSV
 * GET /api/export/badges
 */
export const exportBadges = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw UnauthorizedError('Authentication required');
    }

    const { data: userBadges, error } = await supabase
      .from('user_badges')
      .select(`
        awarded_at,
        badge:badges(
          name,
          description,
          category,
          rarity
        )
      `)
      .eq('user_id', req.user.id)
      .order('awarded_at', { ascending: false });

    if (error) {
      logger.error('Export badges error:', error);
      throw InternalServerError('Failed to export badges');
    }

    const flatData = (userBadges || []).map(ub => {
      const badgeArray = ub.badge as BadgeRelation[] | null;
      const badge = badgeArray?.[0];
      return {
        badge: badge?.name || '',
        description: badge?.description || '',
        category: badge?.category || '',
        rarity: badge?.rarity || '',
        earned_at: new Date(ub.awarded_at).toLocaleDateString(),
      };
    });

    const csv = toCSV(flatData, ['badge', 'description', 'category', 'rarity', 'earned_at']);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="pattamap-badges-${Date.now()}.csv"`);
    res.send(csv);
});

/**
 * Export user's comments/reviews to CSV
 * GET /api/export/reviews
 */
export const exportReviews = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw UnauthorizedError('Authentication required');
    }

    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        rating,
        text,
        status,
        created_at,
        establishment:establishments(name, zone),
        employee:employees(name)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Export reviews error:', error);
      throw InternalServerError('Failed to export reviews');
    }

    const flatData = (comments || []).map(comment => {
      const establishmentArray = comment.establishment as EstablishmentRelation[] | null;
      const establishment = establishmentArray?.[0];
      const employeeArray = comment.employee as { name: string }[] | null;
      const employee = employeeArray?.[0];
      return {
        type: comment.establishment ? 'Establishment' : 'Employee',
        target: establishment?.name || employee?.name || '',
        zone: establishment?.zone || '',
        rating: comment.rating || '',
        review: comment.text || '',
        status: comment.status,
        date: new Date(comment.created_at).toLocaleDateString(),
      };
    });

    const csv = toCSV(flatData, ['type', 'target', 'zone', 'rating', 'review', 'status', 'date']);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="pattamap-reviews-${Date.now()}.csv"`);
    res.send(csv);
});
