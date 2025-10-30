/**
 * Color Contrast Testing Script
 * Tests all color combinations against WCAG 2.1 Level AA standards
 *
 * Requirements:
 * - Normal text: 4.5:1 minimum
 * - Large text (18pt+/24px+ or 14pt+/19px+ bold): 3:1 minimum
 * - UI components & graphical objects: 3:1 minimum
 */

// Utility: Convert hex to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Utility: Convert rgba string to RGB object
function rgbaToRgb(rgba, background = { r: 10, g: 10, b: 46 }) {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
  if (!match) return null;

  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  const a = match[4] ? parseFloat(match[4]) : 1;

  // Alpha blending with background
  return {
    r: Math.round((1 - a) * background.r + a * r),
    g: Math.round((1 - a) * background.g + a * g),
    b: Math.round((1 - a) * background.b + a * b)
  };
}

// Calculate relative luminance
function getLuminance(rgb) {
  const rsRGB = rgb.r / 255;
  const gsRGB = rgb.g / 255;
  const bsRGB = rgb.b / 255;

  const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Calculate contrast ratio
function getContrastRatio(color1, color2) {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

// Parse color (hex or rgba)
function parseColor(colorStr, bgForAlpha) {
  if (colorStr.startsWith('#')) {
    return hexToRgb(colorStr);
  } else if (colorStr.startsWith('rgb')) {
    return rgbaToRgb(colorStr, bgForAlpha);
  }
  return null;
}

// Test color combination
function testCombination(name, foreground, background, minRatio = 4.5, textType = 'normal') {
  const bgRgb = parseColor(background);
  const fgRgb = parseColor(foreground, bgRgb);

  if (!bgRgb || !fgRgb) {
    return {
      name,
      status: 'ERROR',
      message: 'Invalid color format',
      ratio: 0,
      required: minRatio
    };
  }

  const ratio = getContrastRatio(fgRgb, bgRgb);
  const pass = ratio >= minRatio;

  return {
    name,
    foreground,
    background,
    ratio: ratio.toFixed(2),
    required: minRatio,
    textType,
    status: pass ? 'PASS' : 'FAIL',
    message: pass ? '✅ WCAG AA Compliant' : `❌ FAIL - Need ${minRatio}:1, got ${ratio.toFixed(2)}:1`
  };
}

// DARK MODE COLOR DEFINITIONS (from theme-variables.css)
const darkMode = {
  // Brand Colors (for text/icons)
  primary: '#FF1B8D',
  secondary: '#0088AA',
  accent: '#FFD700',

  // Button Colors (darker variants for WCAG AA compliance)
  primaryButton: '#D91875',     // WCAG AA: 4.51:1
  secondaryButton: '#006688',   // WCAG AA: 5.67:1
  successButton: '#008844',     // WCAG AA: 5.51:1
  warningButton: '#AA5500',     // WCAG AA: 4.62:1
  errorButton: '#CC0033',       // WCAG AA: 5.53:1

  // Text Colors (for messages, etc.)
  success: '#00CC55',           // WCAG AA: 4.80:1
  warning: '#FFA500',           // WCAG AA: 4.61:1
  error: '#FF4757',             // WCAG AA: 5.74:1
  info: '#0088AA',

  // Backgrounds
  bgPrimary: '#0a0a2e',
  bgSecondary: '#16213e',
  bgTertiary: '#240046',
  bgSurface: '#1a1a1a',
  bgSurfaceAlt: '#2a2a2a',

  // Text
  textPrimary: '#ffffff',
  textSecondary: '#e0e0e0',
  textMuted: 'rgba(255, 255, 255, 0.6)',
  textDisabled: 'rgba(255, 255, 255, 0.4)',
  textInverse: '#0a0a2e'
};

console.log('\n====================================');
console.log('🎨 WCAG 2.1 COLOR CONTRAST TESTING');
console.log('====================================\n');

console.log('📊 DARK MODE (Default Theme)\n');

// Category 1: Text on Primary Background
console.log('--- TEXT ON PRIMARY BACKGROUND (#0a0a2e) ---\n');
const textOnBgTests = [
  testCombination('Primary Text (White)', darkMode.textPrimary, darkMode.bgPrimary, 4.5, 'normal'),
  testCombination('Secondary Text (#e0e0e0)', darkMode.textSecondary, darkMode.bgPrimary, 4.5, 'normal'),
  testCombination('Muted Text (60% opacity)', darkMode.textMuted, darkMode.bgPrimary, 4.5, 'normal'),
  testCombination('Disabled Text (40% opacity)', darkMode.textDisabled, darkMode.bgPrimary, 3.0, 'disabled'),
  testCombination('Primary Color Text', darkMode.primary, darkMode.bgPrimary, 4.5, 'normal'),
  testCombination('Secondary Color Text', darkMode.secondary, darkMode.bgPrimary, 4.5, 'normal'),
  testCombination('Accent Color Text', darkMode.accent, darkMode.bgPrimary, 4.5, 'normal'),
];

textOnBgTests.forEach(result => {
  console.log(`${result.message}`);
  console.log(`   ${result.name}: ${result.ratio}:1 (Required: ${result.required}:1)`);
  console.log(`   FG: ${result.foreground} | BG: ${result.background}\n`);
});

// Category 2: Buttons (text on colored background)
console.log('\n--- BUTTONS (White text on colored backgrounds) ---\n');
const buttonTests = [
  testCombination('Primary Button (White on Dark Pink)', darkMode.textPrimary, darkMode.primaryButton, 4.5, 'normal'),
  testCombination('Secondary Button (White on Dark Cyan)', darkMode.textPrimary, darkMode.secondaryButton, 4.5, 'normal'),
  testCombination('Success Button (White on Dark Green)', darkMode.textPrimary, darkMode.successButton, 4.5, 'normal'),
  testCombination('Warning Button (White on Dark Orange)', darkMode.textPrimary, darkMode.warningButton, 4.5, 'normal'),
  testCombination('Error Button (White on Dark Red)', darkMode.textPrimary, darkMode.errorButton, 4.5, 'normal'),
];

buttonTests.forEach(result => {
  console.log(`${result.message}`);
  console.log(`   ${result.name}: ${result.ratio}:1 (Required: ${result.required}:1)`);
  console.log(`   FG: ${result.foreground} | BG: ${result.background}\n`);
});

// Category 3: UI Components
console.log('\n--- UI COMPONENTS (Borders, Focus, etc.) ---\n');
const uiTests = [
  testCombination('Focus Indicator (Pink)', darkMode.primary, darkMode.bgPrimary, 3.0, 'UI component'),
  testCombination('Secondary Focus (Cyan)', darkMode.secondary, darkMode.bgPrimary, 3.0, 'UI component'),
  testCombination('Border on Background', 'rgba(255, 255, 255, 0.35)', darkMode.bgPrimary, 3.0, 'UI component'),
  testCombination('Strong Border on Background', 'rgba(255, 255, 255, 0.45)', darkMode.bgPrimary, 3.0, 'UI component'),
];

uiTests.forEach(result => {
  console.log(`${result.message}`);
  console.log(`   ${result.name}: ${result.ratio}:1 (Required: ${result.required}:1)`);
  console.log(`   FG: ${result.foreground} | BG: ${result.background}\n`);
});

// Category 4: Form Elements
console.log('\n--- FORM ELEMENTS ---\n');
const formTests = [
  testCombination('Error Message (Red)', darkMode.error, darkMode.bgPrimary, 4.5, 'normal'),
  testCombination('Success Message (Green)', darkMode.success, darkMode.bgPrimary, 4.5, 'normal'),
  testCombination('Warning Message (Orange)', darkMode.warning, darkMode.bgPrimary, 4.5, 'normal'),
  testCombination('Input Placeholder (60% white)', darkMode.textMuted, darkMode.bgSurfaceAlt, 4.5, 'normal'),
];

formTests.forEach(result => {
  console.log(`${result.message}`);
  console.log(`   ${result.name}: ${result.ratio}:1 (Required: ${result.required}:1)`);
  console.log(`   FG: ${result.foreground} | BG: ${result.background}\n`);
});

// Category 5: Map Elements
console.log('\n--- MAP ELEMENTS ---\n');
const mapTests = [
  testCombination('Tooltip Text (White on Black)', darkMode.textPrimary, 'rgba(0, 0, 0, 0.9)', 4.5, 'normal'),
  testCombination('Map Label (Gold)', darkMode.accent, darkMode.bgPrimary, 4.5, 'normal'),
  testCombination('Map Pink Glow', darkMode.primary, '#0a0a2e', 3.0, 'UI component'),
];

mapTests.forEach(result => {
  console.log(`${result.message}`);
  console.log(`   ${result.name}: ${result.ratio}:1 (Required: ${result.required}:1)`);
  console.log(`   FG: ${result.foreground} | BG: ${result.background}\n`);
});

// Summary
console.log('\n====================================');
console.log('📋 SUMMARY');
console.log('====================================\n');

const allTests = [...textOnBgTests, ...buttonTests, ...uiTests, ...formTests, ...mapTests];
const passed = allTests.filter(t => t.status === 'PASS').length;
const failed = allTests.filter(t => t.status === 'FAIL').length;
const total = allTests.length;

console.log(`Total Tests: ${total}`);
console.log(`✅ Passed: ${passed} (${((passed/total) * 100).toFixed(1)}%)`);
console.log(`❌ Failed: ${failed} (${((failed/total) * 100).toFixed(1)}%)`);

if (failed > 0) {
  console.log('\n⚠️  FAILED TESTS:\n');
  allTests.filter(t => t.status === 'FAIL').forEach(result => {
    console.log(`   ${result.name}: ${result.ratio}:1 (Need ${result.required}:1)`);
    console.log(`   Suggestion: Increase brightness or adjust color\n`);
  });
}

console.log('\n====================================\n');

// Export results for programmatic use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { allTests, passed, failed, total };
}
