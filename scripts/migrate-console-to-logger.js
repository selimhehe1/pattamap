#!/usr/bin/env node
/**
 * Script de migration automatique:
 * Remplace tous les console.log/error/warn par logger.debug/error/warn
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SRC_DIR = path.join(__dirname, 'src');
const EXCLUDED_FILES = ['logger.ts', 'setupTests.ts', 'reportWebVitals.ts'];
const FILE_EXTENSIONS = ['.tsx', '.ts'];

// Statistiques
let stats = {
  filesProcessed: 0,
  filesModified: 0,
  replacements: {
    'console.log': 0,
    'console.error': 0,
    'console.warn': 0,
    'console.debug': 0,
    'console.info': 0
  }
};

/**
 * Check if logger is imported in file
 */
function hasLoggerImport(content) {
  return /import\s+.*\{\s*logger\s*\}.*from\s+['"].*logger['"]/.test(content);
}

/**
 * Add logger import if not present
 */
function addLoggerImport(content, filePath) {
  if (hasLoggerImport(content)) {
    return content;
  }

  // Determine relative path to logger
  const relativePath = path.relative(path.dirname(filePath), path.join(SRC_DIR, 'utils'));
  const importPath = relativePath.replace(/\\/g, '/') + '/logger';

  // Find last import statement
  const lines = content.split('\n');
  let lastImportIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^import\s+/)) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex !== -1) {
    lines.splice(lastImportIndex + 1, 0, `import { logger } from '${importPath}';`);
    return lines.join('\n');
  }

  // If no imports found, add at beginning after comments
  let insertIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith('//') && !lines[i].startsWith('/*') && !lines[i].startsWith('*') && lines[i].trim() !== '') {
      insertIndex = i;
      break;
    }
  }
  lines.splice(insertIndex, 0, `import { logger } from '${importPath}';`);
  return lines.join('\n');
}

/**
 * Replace console statements with logger
 */
function replaceConsoleCalls(content) {
  let modified = content;
  let changesMade = false;

  // Pattern matching improvements
  const replacements = [
    // console.log → logger.debug
    {
      pattern: /console\.log\(/g,
      replacement: 'logger.debug(',
      stat: 'console.log'
    },
    // console.error → logger.error
    {
      pattern: /console\.error\(/g,
      replacement: 'logger.error(',
      stat: 'console.error'
    },
    // console.warn → logger.warn
    {
      pattern: /console\.warn\(/g,
      replacement: 'logger.warn(',
      stat: 'console.warn'
    },
    // console.debug → logger.debug
    {
      pattern: /console\.debug\(/g,
      replacement: 'logger.debug(',
      stat: 'console.debug'
    },
    // console.info → logger.info
    {
      pattern: /console\.info\(/g,
      replacement: 'logger.info(',
      stat: 'console.info'
    }
  ];

  replacements.forEach(({ pattern, replacement, stat }) => {
    const matches = (modified.match(pattern) || []).length;
    if (matches > 0) {
      modified = modified.replace(pattern, replacement);
      stats.replacements[stat] += matches;
      changesMade = true;
    }
  });

  return { content: modified, changed: changesMade };
}

/**
 * Process a single file
 */
function processFile(filePath) {
  stats.filesProcessed++;

  const content = fs.readFileSync(filePath, 'utf8');

  // Skip if no console statements
  if (!content.match(/console\.(log|error|warn|debug|info)\(/)) {
    return;
  }

  // Replace console calls
  let { content: newContent, changed } = replaceConsoleCalls(content);

  if (!changed) {
    return;
  }

  // Add logger import if needed
  newContent = addLoggerImport(newContent, filePath);

  // Write back
  fs.writeFileSync(filePath, newContent, 'utf8');
  stats.filesModified++;

  const relativePath = path.relative(SRC_DIR, filePath);
  console.log(`✅ Modified: ${relativePath}`);
}

/**
 * Recursively process directory
 */
function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules, build, etc.
      if (['node_modules', 'build', 'dist', '.git'].includes(entry.name)) {
        continue;
      }
      processDirectory(fullPath);
    } else if (entry.isFile()) {
      // Check file extension
      const ext = path.extname(entry.name);
      if (!FILE_EXTENSIONS.includes(ext)) {
        continue;
      }

      // Check excluded files
      if (EXCLUDED_FILES.includes(entry.name)) {
        continue;
      }

      processFile(fullPath);
    }
  }
}

// Main execution
console.log('🚀 Starting console → logger migration...\n');
console.log(`📁 Processing directory: ${SRC_DIR}\n`);

try {
  processDirectory(SRC_DIR);

  console.log('\n✅ Migration completed!\n');
  console.log('📊 Statistics:');
  console.log(`   Files processed: ${stats.filesProcessed}`);
  console.log(`   Files modified: ${stats.filesModified}`);
  console.log(`\n   Replacements:`);
  Object.entries(stats.replacements).forEach(([type, count]) => {
    if (count > 0) {
      console.log(`      ${type}: ${count}`);
    }
  });

  const totalReplacements = Object.values(stats.replacements).reduce((a, b) => a + b, 0);
  console.log(`\n   Total replacements: ${totalReplacements}`);

} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}
