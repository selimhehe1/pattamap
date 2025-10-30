/**
 * ARIA & Accessibility Audit Script
 * Analyzes React/TSX components for common accessibility issues
 *
 * Checks:
 * - Buttons without accessible labels
 * - Images without alt text
 * - Form inputs without labels
 * - Interactive elements without keyboard support
 * - Missing ARIA landmarks
 * - Modal dialogs accessibility
 * - Focus management
 */

const fs = require('fs');
const path = require('path');

// Color output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

// Counters
let totalFiles = 0;
let issuesFound = 0;
const fileIssues = {};

// Scan patterns for accessibility issues
const patterns = [
  {
    name: 'Button without aria-label or text',
    regex: /<button[^>]*>[\s]*<(?!\/button)[^>]*\/?>[\s]*<\/button>/gi,
    severity: 'high',
    message: 'Button with only icon/element needs aria-label',
  },
  {
    name: 'Image without alt attribute',
    regex: /<img(?![^>]*alt=)[^>]*>/gi,
    severity: 'high',
    message: 'Images must have alt attribute (empty "" for decorative)',
  },
  {
    name: 'Input without label or aria-label',
    regex: /<input(?![^>]*(?:aria-label|aria-labelledby))[^>]*(?!type=["']hidden["'])[^>]*>/gi,
    severity: 'high',
    message: 'Form inputs need associated label or aria-label',
  },
  {
    name: 'onClick on non-interactive element',
    regex: /<div[^>]*onClick[^>]*>|<span[^>]*onClick[^>]*>/gi,
    severity: 'medium',
    message: 'onClick on div/span needs role, tabIndex, and keyboard handler',
  },
  {
    name: 'Modal without role="dialog"',
    regex: /className=["'][^"']*modal[^"']*["'][^>]*(?!role=["']dialog["'])/gi,
    severity: 'medium',
    message: 'Modal containers should have role="dialog" and aria-modal="true"',
  },
  {
    name: 'Link without href or text',
    regex: /<a(?![^>]*href=)[^>]*>|<a[^>]*>[\s]*<(?!\/a)[^>]*\/?>[\s]*<\/a>/gi,
    severity: 'medium',
    message: 'Links need href and accessible text content',
  },
  {
    name: 'Select without label',
    regex: /<select(?![^>]*(?:aria-label|aria-labelledby))[^>]*>/gi,
    severity: 'high',
    message: 'Select elements need associated label',
  },
  {
    name: 'Textarea without label',
    regex: /<textarea(?![^>]*(?:aria-label|aria-labelledby))[^>]*>/gi,
    severity: 'high',
    message: 'Textarea elements need associated label',
  },
  {
    name: 'IconButton without aria-label',
    regex: /<IconButton(?![^>]*aria-label)[^>]*>/gi,
    severity: 'high',
    message: 'Icon-only buttons must have aria-label',
  },
  {
    name: 'SVG without title or aria-label',
    regex: /<svg(?![^>]*(?:aria-label|aria-labelledby|role=["']img["']))[^>]*>(?![\s]*<title>)/gi,
    severity: 'low',
    message: 'Meaningful SVGs need title or aria-label',
  },
];

// Check for good accessibility patterns
const goodPatterns = [
  {
    name: 'ARIA landmarks',
    regex: /role=["'](?:main|navigation|banner|contentinfo|complementary|search|region)["']/gi,
  },
  {
    name: 'Skip navigation link',
    regex: /<a[^>]*href=["']#main-content["']|SkipToContent|skip-link/gi,
  },
  {
    name: 'Focus management',
    regex: /useRef|focus\(\)|tabIndex|onKeyDown|onKeyPress/gi,
  },
  {
    name: 'Screen reader text',
    regex: /sr-only|screen-reader|visually-hidden|aria-live|aria-atomic/gi,
  },
  {
    name: 'ARIA labels',
    regex: /aria-label|aria-labelledby|aria-describedby/gi,
  },
];

// Recursively find all TSX files
function findTSXFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!filePath.includes('node_modules') && !filePath.includes('build')) {
        findTSXFiles(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Analyze a single file
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(process.cwd(), filePath);
  const issues = [];

  // Check for issues
  patterns.forEach(pattern => {
    const matches = content.match(pattern.regex);
    if (matches && matches.length > 0) {
      issues.push({
        pattern: pattern.name,
        severity: pattern.severity,
        message: pattern.message,
        count: matches.length,
      });
      issuesFound += matches.length;
    }
  });

  // Check for good patterns
  const goodPatternsFound = [];
  goodPatterns.forEach(pattern => {
    const matches = content.match(pattern.regex);
    if (matches && matches.length > 0) {
      goodPatternsFound.push(pattern.name);
    }
  });

  if (issues.length > 0) {
    fileIssues[relativePath] = {
      issues,
      goodPatterns: goodPatternsFound,
    };
  }

  return { issues, goodPatterns: goodPatternsFound };
}

// Main execution
console.log('\n====================================');
console.log('♿ ARIA & ACCESSIBILITY AUDIT');
console.log('====================================\n');

const srcDir = path.join(process.cwd(), 'src');
const files = findTSXFiles(srcDir);
totalFiles = files.length;

console.log(`${colors.blue}Scanning ${totalFiles} React components...${colors.reset}\n`);

// Analyze all files
files.forEach(file => {
  analyzeFile(file);
});

// Print results
console.log('====================================');
console.log('📊 RESULTS BY FILE');
console.log('====================================\n');

const sortedFiles = Object.entries(fileIssues)
  .sort((a, b) => {
    // Sort by severity and count
    const aSevere = a[1].issues.filter(i => i.severity === 'high').length;
    const bSevere = b[1].issues.filter(i => i.severity === 'high').length;
    return bSevere - aSevere;
  });

if (sortedFiles.length === 0) {
  console.log(`${colors.green}✅ No accessibility issues detected!${colors.reset}\n`);
} else {
  sortedFiles.forEach(([file, data]) => {
    const highCount = data.issues.filter(i => i.severity === 'high').reduce((sum, i) => sum + i.count, 0);
    const mediumCount = data.issues.filter(i => i.severity === 'medium').reduce((sum, i) => sum + i.count, 0);
    const lowCount = data.issues.filter(i => i.severity === 'low').reduce((sum, i) => sum + i.count, 0);

    console.log(`${colors.yellow}📄 ${file}${colors.reset}`);
    console.log(`   ${colors.red}High: ${highCount}${colors.reset} | ${colors.yellow}Medium: ${mediumCount}${colors.reset} | ${colors.gray}Low: ${lowCount}${colors.reset}`);

    data.issues.forEach(issue => {
      const icon = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '⚪';
      console.log(`   ${icon} ${issue.pattern} (${issue.count})`);
      console.log(`      ${colors.gray}${issue.message}${colors.reset}`);
    });

    if (data.goodPatterns.length > 0) {
      console.log(`   ${colors.green}✓ Good: ${data.goodPatterns.join(', ')}${colors.reset}`);
    }

    console.log('');
  });
}

// Summary
console.log('====================================');
console.log('📋 SUMMARY');
console.log('====================================\n');

const filesWithIssues = Object.keys(fileIssues).length;
const highIssues = Object.values(fileIssues).reduce((sum, data) =>
  sum + data.issues.filter(i => i.severity === 'high').reduce((s, i) => s + i.count, 0), 0);
const mediumIssues = Object.values(fileIssues).reduce((sum, data) =>
  sum + data.issues.filter(i => i.severity === 'medium').reduce((s, i) => s + i.count, 0), 0);
const lowIssues = Object.values(fileIssues).reduce((sum, data) =>
  sum + data.issues.filter(i => i.severity === 'low').reduce((s, i) => s + i.count, 0), 0);

console.log(`Total files scanned: ${totalFiles}`);
console.log(`Files with issues: ${filesWithIssues} (${((filesWithIssues/totalFiles) * 100).toFixed(1)}%)`);
console.log(`Total issues found: ${issuesFound}`);
console.log(`   ${colors.red}🔴 High priority: ${highIssues}${colors.reset}`);
console.log(`   ${colors.yellow}🟡 Medium priority: ${mediumIssues}${colors.reset}`);
console.log(`   ${colors.gray}⚪ Low priority: ${lowIssues}${colors.reset}`);

console.log('\n====================================');
console.log('🎯 RECOMMENDED ACTIONS');
console.log('====================================\n');

console.log('1. Add aria-label to icon-only buttons:');
console.log('   <button aria-label="Close dialog">');
console.log('     <CloseIcon />');
console.log('   </button>\n');

console.log('2. Add alt text to all images:');
console.log('   <img src="..." alt="Description" />');
console.log('   <img src="..." alt="" /> (decorative)\n');

console.log('3. Associate labels with inputs:');
console.log('   <label htmlFor="email">Email</label>');
console.log('   <input id="email" type="email" />\n');

console.log('4. Make clickable divs accessible:');
console.log('   <div role="button" tabIndex={0}');
console.log('        onClick={...} onKeyDown={handleKeyDown}>');
console.log('   </div>\n');

console.log('5. Add dialog role to modals:');
console.log('   <div role="dialog" aria-modal="true"');
console.log('        aria-labelledby="modal-title">');
console.log('   </div>\n');

console.log('====================================\n');

// Exit with error code if high priority issues found
if (highIssues > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
