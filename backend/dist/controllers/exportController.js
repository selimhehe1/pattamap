"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportReviews = exports.exportBadges = exports.exportVisits = exports.exportFavorites = void 0;
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
/**
 * Export Controller
 * Handles data export to CSV format
 */
// Helper to convert data to CSV
const toCSV = (data, columns) => {
    if (data.length === 0)
        return '';
    // Header row
    const header = columns.join(',');
    // Data rows
    const rows = data.map(row => columns.map(col => {
        const value = row[col];
        if (value === null || value === undefined)
            return '';
        if (typeof value === 'string') {
            // Escape quotes and wrap in quotes if contains comma or quote
            const escaped = value.replace(/"/g, '""');
            return /[,"\n]/.test(value) ? `"${escaped}"` : escaped;
        }
        if (Array.isArray(value))
            return `"${value.join(', ')}"`;
        return String(value);
    }).join(','));
    return [header, ...rows].join('\n');
};
/**
 * Export user's favorites to CSV
 * GET /api/export/favorites
 */
const exportFavorites = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const { data: favorites, error } = await supabase_1.supabase
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
            logger_1.logger.error('Export favorites error:', error);
            return res.status(500).json({ error: 'Failed to export favorites' });
        }
        // Flatten data for CSV
        const flatData = (favorites || []).map(fav => ({
            name: fav.employee?.name || '',
            nickname: fav.employee?.nickname || '',
            age: fav.employee?.age || '',
            nationality: fav.employee?.nationality || [],
            is_freelance: fav.employee?.is_freelance ? 'Yes' : 'No',
            added_at: new Date(fav.created_at).toLocaleDateString(),
        }));
        const csv = toCSV(flatData, ['name', 'nickname', 'age', 'nationality', 'is_freelance', 'added_at']);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="pattamap-favorites-${Date.now()}.csv"`);
        res.send(csv);
    }
    catch (error) {
        logger_1.logger.error('Export favorites error:', error);
        return res.status(500).json({ error: 'Export failed' });
    }
};
exports.exportFavorites = exportFavorites;
/**
 * Export user's visit history to CSV
 * GET /api/export/visits
 */
const exportVisits = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const { data: visits, error } = await supabase_1.supabase
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
            logger_1.logger.error('Export visits error:', error);
            return res.status(500).json({ error: 'Failed to export visits' });
        }
        const flatData = (visits || []).map(visit => ({
            establishment: visit.establishment?.name || '',
            zone: visit.establishment?.zone || '',
            address: visit.establishment?.address || '',
            visited_at: new Date(visit.visited_at).toLocaleDateString(),
        }));
        const csv = toCSV(flatData, ['establishment', 'zone', 'address', 'visited_at']);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="pattamap-visits-${Date.now()}.csv"`);
        res.send(csv);
    }
    catch (error) {
        logger_1.logger.error('Export visits error:', error);
        return res.status(500).json({ error: 'Export failed' });
    }
};
exports.exportVisits = exportVisits;
/**
 * Export user's badges to CSV
 * GET /api/export/badges
 */
const exportBadges = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const { data: userBadges, error } = await supabase_1.supabase
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
            logger_1.logger.error('Export badges error:', error);
            return res.status(500).json({ error: 'Failed to export badges' });
        }
        const flatData = (userBadges || []).map(ub => ({
            badge: ub.badge?.name || '',
            description: ub.badge?.description || '',
            category: ub.badge?.category || '',
            rarity: ub.badge?.rarity || '',
            earned_at: new Date(ub.awarded_at).toLocaleDateString(),
        }));
        const csv = toCSV(flatData, ['badge', 'description', 'category', 'rarity', 'earned_at']);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="pattamap-badges-${Date.now()}.csv"`);
        res.send(csv);
    }
    catch (error) {
        logger_1.logger.error('Export badges error:', error);
        return res.status(500).json({ error: 'Export failed' });
    }
};
exports.exportBadges = exportBadges;
/**
 * Export user's comments/reviews to CSV
 * GET /api/export/reviews
 */
const exportReviews = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const { data: comments, error } = await supabase_1.supabase
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
            logger_1.logger.error('Export reviews error:', error);
            return res.status(500).json({ error: 'Failed to export reviews' });
        }
        const flatData = (comments || []).map(comment => ({
            type: comment.establishment ? 'Establishment' : 'Employee',
            target: comment.establishment?.name || comment.employee?.name || '',
            zone: comment.establishment?.zone || '',
            rating: comment.rating || '',
            review: comment.text || '',
            status: comment.status,
            date: new Date(comment.created_at).toLocaleDateString(),
        }));
        const csv = toCSV(flatData, ['type', 'target', 'zone', 'rating', 'review', 'status', 'date']);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="pattamap-reviews-${Date.now()}.csv"`);
        res.send(csv);
    }
    catch (error) {
        logger_1.logger.error('Export reviews error:', error);
        return res.status(500).json({ error: 'Export failed' });
    }
};
exports.exportReviews = exportReviews;
//# sourceMappingURL=exportController.js.map