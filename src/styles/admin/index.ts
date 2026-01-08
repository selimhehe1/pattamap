/**
 * Admin CSS Lazy Loader
 *
 * These CSS files are only loaded when the admin panel is accessed,
 * reducing the initial CSS bundle size for regular users.
 */

let adminStylesLoaded = false;

export const loadAdminStyles = (): void => {
  if (adminStylesLoaded) return;

  // Dynamically import admin CSS files
  import('./admin-employee-card.css');
  import('./admin-light-mode.css');
  import('./command-tables.css');
  import('./command-filters.css');
  import('./command-modals.css');
  import('./command-cards.css');

  adminStylesLoaded = true;
};

export const areAdminStylesLoaded = (): boolean => adminStylesLoaded;
