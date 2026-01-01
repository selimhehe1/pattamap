/**
 * 📱 Social Media Types - Types partagés pour les réseaux sociaux
 *
 * Ces types sont utilisés à la fois par le frontend et le backend.
 */

/**
 * Liens de réseaux sociaux pour employees
 */
export interface SocialMedia {
  instagram?: string;
  facebook?: string;
  line?: string;
  telegram?: string;
  whatsapp?: string;
}

/**
 * Liens de réseaux sociaux pour establishments (étendu)
 */
export interface EstablishmentSocialMedia extends SocialMedia {
  twitter?: string;
  tiktok?: string;
  website?: string;
}

/**
 * Forme abrégée des social media (utilisée dans certains formulaires)
 */
export interface SocialMediaShort {
  ig?: string;
  fb?: string;
  line?: string;
  tg?: string;
  wa?: string;
}

/**
 * Convertit le format court vers le format complet
 */
export const expandSocialMedia = (short: SocialMediaShort): SocialMedia => ({
  instagram: short.ig,
  facebook: short.fb,
  line: short.line,
  telegram: short.tg,
  whatsapp: short.wa,
});

/**
 * Convertit le format complet vers le format court
 */
export const shortSocialMedia = (full: SocialMedia): SocialMediaShort => ({
  ig: full.instagram,
  fb: full.facebook,
  line: full.line,
  tg: full.telegram,
  wa: full.whatsapp,
});
