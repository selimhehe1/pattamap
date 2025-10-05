#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function addLoggerImport(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  // Skip if logger already imported
  if (content.includes("import { logger } from") || content.includes("import {logger} from")) {
    console.log(`✓ Skip: ${filePath} (already has import)`);
    return;
  }

  // Skip if doesn't use logger
  if (!content.match(/\blogger\./)) {
    return;
  }

  // Find the last import statement
  const lines = content.split('\n');
  let lastImportIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^import .+ from/)) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex === -1) {
    console.log(`✗ Skip: ${filePath} (no imports found)`);
    return;
  }

  // Determine correct import path
  const relativePath = path.relative(path.dirname(filePath), path.join(srcDir, 'utils', 'logger.ts'));
  const importPath = relativePath.replace(/\\/g, '/').replace('.ts', '');

  // Insert logger import after last import
  lines.splice(lastImportIndex + 1, 0, `import { logger } from '${importPath}';`);

  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log(`✓ Fixed: ${filePath}`);
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (file.endsWith('.ts')) {
      addLoggerImport(fullPath);
    }
  }
}

console.log('🔧 Fixing logger imports...\n');
walkDir(srcDir);
console.log('\n✅ Done!');
