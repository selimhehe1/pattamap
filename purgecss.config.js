/**
 * PurgeCSS Configuration
 * Analyzes CSS files to identify unused selectors
 *
 * Usage:
 * npm run purgecss
 *
 * Output: Reports unused CSS classes that can be safely removed
 */

module.exports = {
  // Content files to scan for CSS class usage
  content: [
    './src/**/*.tsx',
    './src/**/*.ts',
    './src/**/*.jsx',
    './src/**/*.js',
    './public/index.html'
  ],

  // CSS files to analyze
  css: [
    './src/styles/nightlife-theme.css',
    './src/styles/**/*.css'
  ],

  // Output directory for purged CSS
  output: './purgecss-analysis/',

  // Options
  options: {
    // Safelist: Classes that should never be removed (even if not detected)
    safelist: {
      standard: [
        // Framer Motion classes (dynamically added)
        /^framer-/,

        // React Toastify
        /^Toastify/,

        // Dynamic state classes
        /^is-/,
        /^has-/,

        // Responsive classes (might be conditionally applied)
        /^mobile-/,
        /^tablet-/,
        /^desktop-/,

        // Theme classes
        /^theme-/,
        /^nightlife-/,

        // Accessibility
        /^sr-only/,
        /^focus-/,

        // Animation classes (might be added dynamically)
        /^animate-/,
        /^fade-/,
        /^slide-/,

        // Modal classes (React Portal - outside DOM tree)
        /^modal-/,
        /^overlay-/,
      ],

      // Deep safelist (includes children)
      deep: [
        /Toastify/,
        /framer-/
      ],

      // Greedy safelist (more aggressive)
      greedy: [
        /data-/,
        /aria-/
      ]
    },

    // Only show statistics (don't output purged files yet)
    rejected: true, // Show removed classes

    // Variables to keep
    variables: true,

    // Keyframes to keep
    keyframes: true,

    // Font-faces to keep
    fontFace: true,

    // Show detailed output
    verbose: true
  }
};
