#!/usr/bin/env node
/**
 * Backend migration script:
 * Replace console.log/error with logger.debug/error
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SRC_DIR = path.join(__dirname, 'src');
const FILE_EXTENSIONS = ['.ts'];

// Statistics
let stats = {
  filesProcessed: 0,
  filesModified: 0,
  replacements: {
    'console.log': 0,
    'console.error': 0,
    'console.warn': 0
  }
};

/**
 * Replace console statements with logger
 */
function replaceConsoleCalls(content) {
  let modified = content;
  let changesMade = false;

  const replacements = [
    {
      pattern: /console\.log\(/g,
      replacement: 'logger.debug(',
      stat: 'console.log'
    },
    {
      pattern: /console\.error\(/g,
      replacement: 'logger.error(',
      stat: 'console.error'
    },
    {
      pattern: /console\.warn\(/g,
      replacement: 'logger.warn(',
      stat: 'console.warn'
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
  if (!content.match(/console\.(log|error|warn)\(/)) {
    return;
  }

  // Replace console calls
  let { content: newContent, changed } = replaceConsoleCalls(content);

  if (!changed) {
    return;
  }

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
      if (['node_modules', 'build', 'dist'].includes(entry.name)) {
        continue;
      }
      processDirectory(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (!FILE_EXTENSIONS.includes(ext)) {
        continue;
      }

      // Skip logger.ts itself
      if (entry.name === 'logger.ts') {
        continue;
      }

      processFile(fullPath);
    }
  }
}

// Main execution
console.log('🚀 Starting backend console → logger migration...\n');

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
