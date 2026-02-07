import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Slugify a string for URL usage (mirrors frontend slugify utility)
 */
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-0-9]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/** Zone name to slug mapping (mirrors frontend ZONE_SLUG_MAP) */
const ZONE_SLUG_MAP: Record<string, string> = {
  soi6: 'soi-6',
  walkingstreet: 'walking-street',
  treetown: 'tree-town',
  soibuakhao: 'soi-buakhao',
  beachroad: 'beach-road',
  lkmetro: 'lk-metro'
};

function getZoneSlug(zone: string): string {
  return ZONE_SLUG_MAP[zone] || slugify(zone);
}

/** Escape XML special characters */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Format date to W3C datetime (YYYY-MM-DD) */
function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

/** Static pages included in the sitemap */
const STATIC_PAGES = [
  { loc: '/', changefreq: 'daily', priority: '1.0' },
  { loc: '/search', changefreq: 'daily', priority: '0.9' },
  { loc: '/establishments', changefreq: 'daily', priority: '0.9' },
  { loc: '/privacy-policy', changefreq: 'monthly', priority: '0.3' },
  { loc: '/terms', changefreq: 'monthly', priority: '0.3' }
];

/**
 * @swagger
 * /api/public/sitemap.xml:
 *   get:
 *     summary: Dynamic XML sitemap
 *     description: Generates a sitemap with all approved establishments for search engine indexing
 *     tags: [Public]
 *     produces:
 *       - application/xml
 *     responses:
 *       200:
 *         description: XML sitemap
 */
router.get('/sitemap.xml', async (_req: Request, res: Response) => {
  try {
    const siteUrl = process.env.SITE_URL || 'https://pattamap.com';

    // Fetch all approved establishments
    const { data: establishments, error } = await supabase
      .from('establishments')
      .select('id, name, zone, updated_at')
      .eq('status', 'approved')
      .order('updated_at', { ascending: false });

    if (error) {
      logger.error('Sitemap: Error fetching establishments:', error);
      throw error;
    }

    // Build XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Static pages
    for (const page of STATIC_PAGES) {
      xml += '  <url>\n';
      xml += `    <loc>${escapeXml(siteUrl + page.loc)}</loc>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += '  </url>\n';
    }

    // Dynamic establishment pages
    if (establishments) {
      for (const est of establishments) {
        const zoneSlug = getZoneSlug(est.zone || '');
        const nameSlug = slugify(est.name || '');
        const url = `${siteUrl}/bar/${zoneSlug}/${nameSlug}-${est.id}`;

        xml += '  <url>\n';
        xml += `    <loc>${escapeXml(url)}</loc>\n`;
        if (est.updated_at) {
          xml += `    <lastmod>${formatDate(est.updated_at)}</lastmod>\n`;
        }
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.7</priority>\n';
        xml += '  </url>\n';
      }
    }

    xml += '</urlset>';

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(xml);
  } catch (error) {
    logger.error('Sitemap generation error:', error);
    res.status(500).set('Content-Type', 'application/xml').send(
      '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>'
    );
  }
});

export default router;
