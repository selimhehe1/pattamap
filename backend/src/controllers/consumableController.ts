import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

export const getConsumableTemplates = async (req: Request, res: Response) => {
  try {
    logger.debug('📋 Getting consumable templates...');

    // Récupérer tous les templates actifs, organisés par catégorie
    const { data: templates, error } = await supabase
      .from('consumable_templates')
      .select(`
        id,
        name,
        category,
        icon,
        default_price,
        status
      `)
      .eq('status', 'active')
      .order('category')
      .order('name');

    if (error) {
      logger.error('Error fetching templates:', error);
      return res.status(500).json({ error: 'Failed to fetch consumable templates' });
    }

    // Organiser par catégorie pour faciliter l'utilisation frontend
    const templatesByCategory = templates?.reduce((acc: any, template) => {
      if (!acc[template.category]) {
        acc[template.category] = [];
      }
      acc[template.category].push({
        id: template.id,
        name: template.name,
        icon: template.icon,
        default_price: template.default_price
      });
      return acc;
    }, {}) || {};

    // Ordre des catégories pour l'affichage
    const categoryOrder = ['beer', 'service', 'cocktail', 'shot', 'spirit', 'soft'];
    const orderedCategories = categoryOrder.reduce((acc: any, category) => {
      if (templatesByCategory[category]) {
        acc[category] = templatesByCategory[category];
      }
      return acc;
    }, {});

    // Ajouter les catégories qui ne sont pas dans l'ordre prédéfini
    Object.keys(templatesByCategory).forEach(category => {
      if (!orderedCategories[category]) {
        orderedCategories[category] = templatesByCategory[category];
      }
    });

    logger.debug(`✅ Found ${templates?.length || 0} templates in ${Object.keys(orderedCategories).length} categories`);

    res.json({
      success: true,
      templates: orderedCategories,
      total: templates?.length || 0
    });

  } catch (error) {
    logger.error('Get consumable templates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createConsumableTemplate = async (req: Request, res: Response) => {
  try {
    const { name, category, icon, default_price } = req.body;

    if (!name || !category || !icon) {
      return res.status(400).json({ error: 'Name, category and icon are required' });
    }

    const { data: template, error } = await supabase
      .from('consumable_templates')
      .insert({
        name,
        category,
        icon,
        default_price,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating template:', error);
      return res.status(500).json({ error: 'Failed to create consumable template' });
    }

    logger.debug(`✅ Created template: ${template.name} (${template.category})`);

    res.status(201).json({
      success: true,
      template
    });

  } catch (error) {
    logger.error('Create consumable template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};