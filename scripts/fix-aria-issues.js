/**
 * Automated ARIA Fixes Script
 * Automatically fixes common accessibility issues in React/TSX files
 *
 * Fixes:
 * 1. Adds role="dialog" and aria-modal="true" to modal overlays
 * 2. Adds aria-label to icon-only buttons
 * 3. Associates labels with inputs by adding id/htmlFor
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

let filesModified = 0;
let fixesApplied = 0;

// Find all TSX/JSX files
function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!filePath.includes('node_modules') && !filePath.includes('build')) {
        findFiles(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Fix 1: Add role="dialog" and aria-modal to modals
function fixModalDialogs(content) {
  let modified = content;
  let count = 0;

  // Pattern: Modal overlays with position: fixed and high z-index
  const modalPattern = /(<div\s+[^>]*style={{[^}]*position:\s*['"]fixed['"][^}]*zIndex:\s*\d+[^}]*}}[^>]*)(>)/gi;

  modified = modified.replace(modalPattern, (match, opening, closing) => {
    // Check if already has role="dialog"
    if (/role=["']dialog["']/.test(opening)) {
      return match;
    }

    // Check if it's likely a modal (has overlay background)
    if (/background.*rgba.*0\./.test(opening)) {
      count++;
      fixesApplied++;
      return `${opening} role="dialog" aria-modal="true"${closing}`;
    }

    return match;
  });

  if (count > 0) {
    console.log(`   ${colors.green}✓${colors.reset} Added role="dialog" to ${count} modals`);
  }

  return modified;
}

// Fix 2: Add aria-label to icon-only buttons
function fixIconButtons(content) {
  let modified = content;
  let count = 0;

  // Pattern: Buttons with only emoji/icon content
  const patterns = [
    { regex: /<button([^>]*)>[\s]*✖️?[\s]*<\/button>/gi, label: 'Close' },
    { regex: /<button([^>]*)>[\s]*✖[\s]*<\/button>/gi, label: 'Close' },
    { regex: /<button([^>]*)>[\s]*➕[\s]*<\/button>/gi, label: 'Add' },
    { regex: /<button([^>]*)>[\s]*➖[\s]*<\/button>/gi, label: 'Remove' },
    { regex: /<button([^>]*)>[\s]*🗑️?[\s]*<\/button>/gi, label: 'Delete' },
    { regex: /<button([^>]*)>[\s]*✏️?[\s]*<\/button>/gi, label: 'Edit' },
    { regex: /<button([^>]*)>[\s]*💾[\s]*<\/button>/gi, label: 'Save' },
    { regex: /<button([^>]*)>[\s]*🔍[\s]*<\/button>/gi, label: 'Search' },
  ];

  patterns.forEach(({ regex, label: ariaLabel }) => {
    modified = modified.replace(regex, (match, props) => {
      // Check if already has aria-label
      if (/aria-label=/.test(props)) {
        return match;
      }

      count++;
      fixesApplied++;

      // Insert aria-label before closing >
      return match.replace('>', ` aria-label="${ariaLabel}">`);
    });
  });

  if (count > 0) {
    console.log(`   ${colors.green}✓${colors.reset} Added aria-label to ${count} icon buttons`);
  }

  return modified;
}

// Fix 3: Add alt="" to decorative images
function fixDecorativeImages(content) {
  let modified = content;
  let count = 0;

  // SVG icons in buttons (decorative)
  const svgInButtonPattern = /<button[^>]*>[\s\S]*?<svg(?![^>]*(?:aria-label|role))([^>]*)>/gi;

  modified = modified.replace(svgInButtonPattern, (match, svgProps) => {
    if (/<\/button>/.test(match)) {
      count++;
      fixesApplied++;
      return match.replace('<svg', '<svg aria-hidden="true" role="presentation"');
    }
    return match;
  });

  if (count > 0) {
    console.log(`   ${colors.green}✓${colors.reset} Marked ${count} decorative SVGs as hidden`);
  }

  return modified;
}

// Fix 4: Add role="button" and tabIndex to clickable divs
function fixClickableDivs(content) {
  let modified = content;
  let count = 0;

  // Pattern: div/span with onClick
  const clickablePattern = /<(div|span)([^>]*onClick=[^>]*)>/gi;

  modified = modified.replace(clickablePattern, (match, tag, props) => {
    // Check if already has role
    if (/role=/.test(props)) {
      return match;
    }

    // Check if already has tabIndex
    if (/tabIndex=/.test(props)) {
      return match;
    }

    count++;
    fixesApplied++;

    // Add role="button" and tabIndex={0}
    return `<${tag}${props} role="button" tabIndex={0}>`;
  });

  if (count > 0) {
    console.log(`   ${colors.green}✓${colors.reset} Made ${count} clickable divs/spans accessible`);
  }

  return modified;
}

// Process a single file
function processFile(filePath) {
  const originalContent = fs.readFileSync(filePath, 'utf-8');
  let content = originalContent;

  // Apply all fixes
  content = fixModalDialogs(content);
  content = fixIconButtons(content);
  content = fixDecorativeImages(content);
  content = fixClickableDivs(content);

  // Write back if modified
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    filesModified++;
    const relativePath = path.relative(process.cwd(), filePath);
    console.log(`\n${colors.yellow}📝 ${relativePath}${colors.reset}`);
    return true;
  }

  return false;
}

// Main execution
console.log('\n====================================');
console.log('🔧 AUTOMATED ARIA FIXES');
console.log('====================================\n');

const srcDir = path.join(process.cwd(), 'src');
const files = findFiles(srcDir);

console.log(`${colors.blue}Processing ${files.length} files...${colors.reset}\n`);

files.forEach(file => {
  processFile(file);
});

console.log('\n====================================');
console.log('📊 SUMMARY');
console.log('====================================\n');

console.log(`Files modified: ${filesModified}`);
console.log(`Total fixes applied: ${fixesApplied}`);

console.log('\n✅ Automated fixes complete!');
console.log('\n💡 Note: Some issues require manual review:');
console.log('   - Label/input associations (requires unique IDs)');
console.log('   - Complex interactive widgets');
console.log('   - Dynamic content announcements\n');

console.log('Run "npm run aria-audit" to see remaining issues.\n');

console.log('====================================\n');
