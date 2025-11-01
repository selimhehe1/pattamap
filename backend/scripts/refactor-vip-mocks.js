#!/usr/bin/env node
/**
 * Script de refactoring automatique pour remplacer les mocks manuels
 * par createMockChain dans les tests VIP
 *
 * Usage: node scripts/refactor-vip-mocks.js <file-path>
 */

const fs = require('fs');
const path = require('path');

function refactorMocks(content) {
  let modified = content;
  let changeCount = 0;

  // Pattern 1: mockImplementationOnce avec select/eq/single
  // Avant: (supabase.from as jest.Mock).mockImplementationOnce(() => ({
  //   select: jest.fn().mockReturnThis(),
  //   eq: jest.fn().mockReturnThis(),
  //   single: jest.fn().mockResolvedValue({ data: mockData, error: null })
  // }));
  //
  // Après: (supabase.from as jest.Mock).mockReturnValueOnce(
  //   createMockChain({ data: [mockData], error: null })
  // );

  const pattern1 = /\(supabase\.from as jest\.Mock\)\.mockImplementationOnce\(\(\) => \(\{[\s\S]*?select: jest\.fn\(\)\.mockReturnThis\(\),[\s\S]*?(?:eq|ilike|or|and|order|range|limit): jest\.fn\(\)\.mockReturnThis\(\),?[\s\S]*?single: jest\.fn\(\)\.mockResolvedValue\(\{ data: ([^,]+), error: null \}\)[\s\S]*?\}\)\);/g;

  modified = modified.replace(pattern1, (match, dataVar) => {
    changeCount++;
    return `(supabase.from as jest.Mock).mockReturnValueOnce(\n        createMockChain({ data: [${dataVar}], error: null })\n      );`;
  });

  // Pattern 2: mockImplementationOnce avec insert/select/single
  const pattern2 = /\(supabase\.from as jest\.Mock\)\.mockImplementationOnce\(\(\) => \(\{[\s\S]*?insert: jest\.fn\(\)\.mockReturnThis\(\),[\s\S]*?select: jest\.fn\(\)\.mockReturnThis\(\),[\s\S]*?single: jest\.fn\(\)\.mockResolvedValue\(\{ data: ([^,]+), error: null \}\)[\s\S]*?\}\)\);/g;

  modified = modified.replace(pattern2, (match, dataVar) => {
    changeCount++;
    return `(supabase.from as jest.Mock).mockReturnValueOnce(\n        createMockChain({ data: [${dataVar}], error: null })\n      );`;
  });

  // Pattern 3: mockImplementationOnce avec update/eq (pas de single)
  const pattern3 = /\(supabase\.from as jest\.Mock\)\.mockImplementationOnce\(\(\) => \(\{[\s\S]*?update: jest\.fn\(\)\.mockReturnThis\(\),[\s\S]*?(?:eq|ilike|or): jest\.fn\(\)\.mockResolvedValue\(\{ data: ([^,}]+), error: ([^}]+) \}\)[\s\S]*?\}\)\);/g;

  modified = modified.replace(pattern3, (match, dataVar, errorVar) => {
    changeCount++;
    return `(supabase.from as jest.Mock).mockReturnValueOnce(\n        createMockChain({ data: ${dataVar}, error: ${errorVar} })\n      );`;
  });

  // Pattern 4: mockImplementationOnce avec delete/eq
  const pattern4 = /\(supabase\.from as jest\.Mock\)\.mockImplementationOnce\(\(\) => \(\{[\s\S]*?delete: jest\.fn\(\)\.mockReturnThis\(\),[\s\S]*?eq: jest\.fn\(\)\.mockResolvedValue\(\{ data: ([^,}]+), error: ([^}]+) \}\)[\s\S]*?\}\)\);/g;

  modified = modified.replace(pattern4, (match, dataVar, errorVar) => {
    changeCount++;
    return `(supabase.from as jest.Mock).mockReturnValueOnce(\n        createMockChain({ data: ${dataVar}, error: ${errorVar} })\n      );`;
  });

  return { modified, changeCount };
}

function addImportIfNeeded(content) {
  // Check if import already exists
  if (content.includes("from '../../test-helpers/supabaseMockChain'") ||
      content.includes('from "../../test-helpers/supabaseMockChain"')) {
    return content;
  }

  // Check if createDefaultChain is imported and replace it
  if (content.includes("from '../../test-helpers/createDefaultChain'")) {
    return content.replace(
      /import { createDefaultChain } from '\.\.\/\.\.\/test-helpers\/createDefaultChain';/,
      "import { createMockChain } from '../../test-helpers/supabaseMockChain';"
    );
  }

  // Add new import after supabase import
  const supabaseImportRegex = /(import.*from '\.\.\/\.\.\/config\/supabase';)/;
  if (supabaseImportRegex.test(content)) {
    return content.replace(
      supabaseImportRegex,
      "$1\nimport { createMockChain } from '../../test-helpers/supabaseMockChain';"
    );
  }

  return content;
}

// Main execution
if (process.argv.length < 3) {
  console.error('Usage: node refactor-vip-mocks.js <file-path>');
  process.exit(1);
}

const filePath = process.argv[2];

try {
  console.log(`📖 Reading file: ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf8');

  console.log(`🔄 Refactoring mocks...`);
  const { modified, changeCount } = refactorMocks(content);

  console.log(`📝 Adding/updating imports...`);
  const final = addImportIfNeeded(modified);

  if (changeCount > 0) {
    console.log(`✅ Made ${changeCount} replacements`);

    // Backup original
    const backupPath = filePath + '.backup';
    fs.writeFileSync(backupPath, content, 'utf8');
    console.log(`💾 Backup saved to: ${backupPath}`);

    // Write modified content
    fs.writeFileSync(filePath, final, 'utf8');
    console.log(`✅ File updated: ${filePath}`);
  } else {
    console.log(`⚠️  No patterns found to replace`);
  }

} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  process.exit(1);
}
