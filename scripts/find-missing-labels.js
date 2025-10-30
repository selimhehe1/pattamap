/**
 * Precise Detection of Missing Accessible Names
 * Finds buttons, links, and menu items without proper labels
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
};

let issuesFound = 0;
const fileIssues = {};

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

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(process.cwd(), filePath);
  const lines = content.split('\n');
  const issues = [];

  // Pattern 1: Button with only icon/emoji and no aria-label
  const iconOnlyButtonPattern = /<button([^>]*?)>[\s\n]*([\u{1F300}-\u{1F9FF}]|[✖✓×➕➖🗑💾📷🔍]|<[A-Z]\w*Icon[^>]*\/>)[\s\n]*<\/button>/gmu;

  let match;
  while ((match = iconOnlyButtonPattern.exec(content)) !== null) {
    const props = match[1];
    const icon = match[2];

    // Check if aria-label exists
    if (!/aria-label=/.test(props)) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      issues.push({
        line: lineNum,
        type: 'Button without aria-label',
        code: match[0].substring(0, 100),
        fix: 'Add aria-label="descriptive text"'
      });
      issuesFound++;
    }
  }

  // Pattern 2: Link with no text or aria-label
  const emptyLinkPattern = /<a([^>]*?)>[\s\n]*<\/a>/g;
  while ((match = emptyLinkPattern.exec(content)) !== null) {
    const props = match[1];
    if (!/aria-label=/.test(props) && !/href=/.test(props)) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      issues.push({
        line: lineNum,
        type: 'Empty link without aria-label',
        code: match[0],
        fix: 'Add aria-label or text content'
      });
      issuesFound++;
    }
  }

  // Pattern 3: Link component from react-router without text
  const linkComponentPattern = /<Link([^>]*?)>[\s\n]*<\/Link>/g;
  while ((match = linkComponentPattern.exec(content)) !== null) {
    const props = match[1];
    if (!/aria-label=/.test(props)) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      issues.push({
        line: lineNum,
        type: 'Link component without aria-label',
        code: match[0],
        fix: 'Add aria-label or children text'
      });
      issuesFound++;
    }
  }

  // Pattern 4: Button with only SVG and no aria-label
  const svgButtonPattern = /<button([^>]*?)>[\s\n]*<svg[^>]*>[\s\S]*?<\/svg>[\s\n]*<\/button>/g;
  while ((match = svgButtonPattern.exec(content)) !== null) {
    const props = match[1];
    if (!/aria-label=/.test(props)) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      issues.push({
        line: lineNum,
        type: 'Button with SVG only, no aria-label',
        code: match[0].substring(0, 100) + '...',
        fix: 'Add aria-label="descriptive text"'
      });
      issuesFound++;
    }
  }

  // Pattern 5: Icon buttons without text
  const iconButtonJSXPattern = /<IconButton([^>]*?)\/>/g;
  while ((match = iconButtonJSXPattern.exec(content)) !== null) {
    const props = match[1];
    if (!/aria-label=/.test(props)) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      issues.push({
        line: lineNum,
        type: 'IconButton without aria-label',
        code: match[0],
        fix: 'Add aria-label prop'
      });
      issuesFound++;
    }
  }

  if (issues.length > 0) {
    fileIssues[relativePath] = issues;
  }
}

// Main execution
console.log('\n====================================');
console.log('🔍 MISSING ACCESSIBLE NAMES DETECTOR');
console.log('====================================\n');

const srcDir = path.join(process.cwd(), 'src');
const files = findTSXFiles(srcDir);

console.log(`${colors.blue}Analyzing ${files.length} files...${colors.reset}\n`);

files.forEach(file => analyzeFile(file));

// Print results
console.log('====================================');
console.log('📊 RESULTS');
console.log('====================================\n');

if (Object.keys(fileIssues).length === 0) {
  console.log(`${colors.green}✅ No missing accessible names found!${colors.reset}\n`);
} else {
  Object.entries(fileIssues).forEach(([file, issues]) => {
    console.log(`${colors.yellow}📄 ${file}${colors.reset}`);

    issues.forEach((issue, idx) => {
      console.log(`\n   ${colors.red}Issue ${idx + 1}:${colors.reset} ${issue.type}`);
      console.log(`   Line ${issue.line}`);
      console.log(`   ${colors.blue}Fix:${colors.reset} ${issue.fix}`);
      console.log(`   ${colors.blue}Code:${colors.reset} ${issue.code.trim()}`);
    });

    console.log('\n');
  });
}

console.log('====================================');
console.log('📋 SUMMARY');
console.log('====================================\n');

console.log(`Total files scanned: ${files.length}`);
console.log(`Files with issues: ${Object.keys(fileIssues).length}`);
console.log(`Total issues: ${issuesFound}`);

console.log('\n====================================\n');

process.exit(issuesFound > 0 ? 1 : 0);
