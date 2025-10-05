import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

export const getFavorites = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: favorites, error } = await supabase
      .from('user_favorites')
      .select(`
        id,
        employee_id,
        created_at,
        employee:employees(
          id,
          name,
          nickname,
          age,
          nationality,
          photos,
          description,
          social_media
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching favorites:', error);
      return res.status(500).json({ error: 'Failed to fetch favorites' });
    }

    const favoritesWithEstablishment = await Promise.all(
      (favorites || []).map(async (fav: any) => {
        const { data: employment } = await supabase
          .from('employment_history')
          .select(`
            establishment_id,
            establishments:establishment_id (
              id,
              name,
              zone,
              address
            )
          `)
          .eq('employee_id', fav.employee_id)
          .eq('is_current', true)
          .single();

        const { data: stats } = await supabase
          .from('comments')
          .select('rating')
          .eq('employee_id', fav.employee_id);

        const avgRating = stats && stats.length > 0
          ? stats.reduce((sum, c) => sum + (c.rating || 0), 0) / stats.length
          : 0;

        return {
          id: fav.id,
          employee_id: fav.employee_id,
          employee_name: fav.employee.name,
          employee_nickname: fav.employee.nickname,
          employee_photos: fav.employee.photos || [],
          employee_age: fav.employee.age,
          employee_nationality: fav.employee.nationality,
          employee_description: fav.employee.description,
          employee_social_media: fav.employee.social_media,
          employee_rating: avgRating,
          employee_comment_count: stats?.length || 0,
          current_establishment: employment?.establishments ? {
            id: (employment.establishments as any).id,
            name: (employment.establishments as any).name,
            zone: (employment.establishments as any).zone,
            address: (employment.establishments as any).address
          } : null,
          created_at: fav.created_at
        };
      })
    );

    res.json({
      favorites: favoritesWithEstablishment,
      count: favoritesWithEstablishment.length
    });
  } catch (error) {
    logger.error('Error in getFavorites:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addFavorite = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { employee_id } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!employee_id) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }

    const { data: existingFavorite } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('employee_id', employee_id)
      .single();

    if (existingFavorite) {
      return res.status(409).json({
        error: 'Employee already in favorites',
        is_favorite: true
      });
    }

    const { data, error } = await supabase
      .from('user_favorites')
      .insert([{
        user_id: userId,
        employee_id: employee_id
      }])
      .select()
      .single();

    if (error) {
      logger.error('Error adding favorite:', error);
      return res.status(500).json({ error: 'Failed to add favorite' });
    }

    res.status(201).json({
      message: 'Employee added to favorites',
      favorite: data,
      is_favorite: true
    });
  } catch (error) {
    logger.error('Error in addFavorite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const removeFavorite = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { employee_id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('employee_id', employee_id);

    if (error) {
      logger.error('Error removing favorite:', error);
      return res.status(500).json({ error: 'Failed to remove favorite' });
    }

    res.json({
      message: 'Employee removed from favorites',
      is_favorite: false
    });
  } catch (error) {
    logger.error('Error in removeFavorite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const checkFavorite = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { employee_id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data, error } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('employee_id', employee_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error checking favorite:', error);
      return res.status(500).json({ error: 'Failed to check favorite status' });
    }

    res.json({
      is_favorite: !!data
    });
  } catch (error) {
    logger.error('Error in checkFavorite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};