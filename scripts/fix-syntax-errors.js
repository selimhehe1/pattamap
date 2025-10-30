/**
 * Fix syntax errors caused by automated ARIA fixes
 * Corrects malformed onClick handlers
 */

const fs = require('fs');
const path = require('path');

function findTSXFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!filePath.includes('node_modules') && !filePath.includes('build')) {
        findTSXFiles(filePath, fileList);
      }
    } else if (file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

let fixed = 0;

const srcDir = path.join(process.cwd(), 'src');
const files = findTSXFiles(srcDir);

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;

  // Fix pattern: onClick={() = role="button" tabIndex={0}>
  // Should be: role="button" tabIndex={0} onClick={() =>
  content = content.replace(
    /onClick=\{(\([^)]*\))\s*=\s*role="button"\s*tabIndex=\{0\}>\s*/g,
    'role="button" tabIndex={0} onClick={$1 => '
  );

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Fixed ${path.relative(process.cwd(), filePath)}`);
    fixed++;
  }
});

console.log(`\n✅ Fixed ${fixed} files`);
