#!/usr/bin/env node

/**
 * Script de conversion automatique px → rem
 * Phase 2B - Responsive Design Avancé
 *
 * Convertit font-size, padding, margin de px en rem
 * Garde px pour border, box-shadow, border-radius
 *
 * Usage: node tools/convert-px-to-rem.js
 */

const fs = require('fs');
const path = require('path');

const BASE_FONT_SIZE = 16;
const CSS_FILE_PATH = path.join(__dirname, '..', 'src', 'styles', 'nightlife-theme.css');

// Properties to convert to rem
const CONVERT_PROPERTIES = [
  'font-size',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'gap',
  'top',
  'bottom',
  'left',
  'right',
  'width',  // For some text/spacing contexts
  'height', // For some text/spacing contexts
  'line-height',
  'letter-spacing',
  'min-height',
  'max-height',
  'min-width',
  'max-width',
];

// Properties to KEEP in px
const KEEP_PX_PROPERTIES = [
  'border',
  'border-width',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-radius',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-left-radius',
  'border-bottom-right-radius',
  'box-shadow',
  'text-shadow',
  'outline',
  'outline-width',
  'outline-offset',
  'stroke-width',
];

function pxToRem(px) {
  const value = parseFloat(px);
  if (value === 0) return '0';
  return `${(value / BASE_FONT_SIZE).toFixed(4)}rem`.replace(/\.?0+rem$/, 'rem');
}

function shouldConvertProperty(property) {
  property = property.trim();

  // Check if it's a property we should KEEP in px
  for (const keepProp of KEEP_PX_PROPERTIES) {
    if (property === keepProp || property.startsWith(keepProp + '-')) {
      return false;
    }
  }

  // Check if it's a property we should CONVERT
  for (const convertProp of CONVERT_PROPERTIES) {
    if (property === convertProp || property.startsWith(convertProp + '-')) {
      return true;
    }
  }

  return false;
}

function convertCssFile(filePath) {
  console.log(`\n🔄 Reading file: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf8');
  let conversions = 0;

  // Regex to match CSS property: value pairs
  // Matches: property: XXpx; or property: XXpx XXpx; etc.
  const cssPropertyRegex = /([\w-]+)\s*:\s*([^;]+);/g;

  content = content.replace(cssPropertyRegex, (match, property, value) => {
    const trimmedProperty = property.trim();

    // Check if we should convert this property
    if (!shouldConvertProperty(trimmedProperty)) {
      return match; // Keep as-is
    }

    // Convert px values in the value string
    const convertedValue = value.replace(/(\d+(?:\.\d+)?)px/g, (pxMatch, number) => {
      conversions++;
      return pxToRem(number);
    });

    // If conversion happened, return new declaration
    if (convertedValue !== value) {
      return `${trimmedProperty}: ${convertedValue};`;
    }

    return match;
  });

  // Special case: calc() expressions with px
  content = content.replace(/calc\(([^)]+)\)/g, (match, calcContent) => {
    let hasConversion = false;
    const converted = calcContent.replace(/(\d+(?:\.\d+)?)px/g, (pxMatch, number) => {
      // Only convert in calc if it's for spacing/sizing, not borders
      hasConversion = true;
      conversions++;
      return pxToRem(number);
    });
    return hasConversion ? `calc(${converted})` : match;
  });

  console.log(`✅ ${conversions} conversions px → rem effectuées`);

  // Write back to file
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`💾 File saved: ${filePath}`);

  return conversions;
}

// Main execution
console.log('🚀 Starting px → rem conversion...');
console.log(`📂 Target file: ${CSS_FILE_PATH}`);

try {
  const totalConversions = convertCssFile(CSS_FILE_PATH);

  console.log('\n✨ Conversion complete!');
  console.log(`📊 Total conversions: ${totalConversions}`);
  console.log('\n🔍 Next steps:');
  console.log('  1. Review the changes in nightlife-theme.css');
  console.log('  2. Test the application at different zoom levels');
  console.log('  3. Check that borders/shadows remained in px');
  console.log('  4. Run: npm run build');

} catch (error) {
  console.error('\n❌ Error during conversion:', error.message);
  process.exit(1);
}
