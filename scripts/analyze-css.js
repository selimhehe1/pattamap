/**
 * CSS Dead Code Analysis Script
 *
 * Analyzes nightlife-theme.css and other CSS files to identify unused classes
 * Uses PurgeCSS to scan all React components and report unused selectors
 *
 * Usage: node analyze-css.js
 */

const { PurgeCSS } = require('purgecss');
const fs = require('fs');
const path = require('path');

async function analyzeCss() {
  console.log('🔍 Starting CSS Dead Code Analysis...\n');

  const purgeCSSResults = await new PurgeCSS().purge({
    content: [
      './src/**/*.tsx',
      './src/**/*.ts',
      './src/**/*.jsx',
      './src/**/*.js',
      './public/index.html'
    ],
    css: ['./src/styles/nightlife-theme.css'],
    safelist: {
      standard: [
        /^framer-/,
        /^Toastify/,
        /^is-/,
        /^has-/,
        /^mobile-/,
        /^tablet-/,
        /^desktop-/,
        /^theme-/,
        /^nightlife-/,
        /^sr-only/,
        /^focus-/,
        /^animate-/,
        /^fade-/,
        /^slide-/,
        /^modal-/,
        /^overlay-/,
      ],
      deep: [/Toastify/, /framer-/],
      greedy: [/data-/, /aria-/]
    },
    rejected: true,
    rejectedCss: true,
    variables: true,
    keyframes: true,
    fontFace: true
  });

  // Analyze results
  const result = purgeCSSResults[0];

  // Count original CSS size
  const originalCss = fs.readFileSync('./src/styles/nightlife-theme.css', 'utf8');
  const originalLines = originalCss.split('\n').length;
  const originalSize = (originalCss.length / 1024).toFixed(2); // KB

  // Count purged CSS size
  const purgedSize = (result.css.length / 1024).toFixed(2); // KB
  const purgedLines = result.css.split('\n').length;

  // Calculate savings
  const sizeReduction = ((originalSize - purgedSize) / originalSize * 100).toFixed(1);
  const lineReduction = ((originalLines - purgedLines) / originalLines * 100).toFixed(1);

  // Count rejected selectors
  const rejectedCount = result.rejected ? result.rejected.length : 0;

  // Print report
  console.log('📊 CSS DEAD CODE ANALYSIS REPORT');
  console.log('================================\n');

  console.log('📁 File Analyzed: src/styles/nightlife-theme.css\n');

  console.log('📈 Size Analysis:');
  console.log(`   Original:  ${originalSize} KB (${originalLines} lines)`);
  console.log(`   Purged:    ${purgedSize} KB (${purgedLines} lines)`);
  console.log(`   Reduction: ${sizeReduction}% size, ${lineReduction}% lines\n`);

  console.log('🗑️  Unused Selectors:');
  console.log(`   Total Rejected: ${rejectedCount} selectors\n`);

  if (result.rejected && result.rejected.length > 0) {
    console.log('🔴 Top 50 Unused Selectors:');
    console.log('---------------------------');
    result.rejected.slice(0, 50).forEach((selector, index) => {
      console.log(`${String(index + 1).padStart(3, ' ')}. ${selector}`);
    });

    if (result.rejected.length > 50) {
      console.log(`\n... and ${result.rejected.length - 50} more unused selectors\n`);
    }
  }

  // Save detailed report
  const reportPath = './CSS_DEAD_CODE_ANALYSIS.md';
  const reportContent = generateMarkdownReport({
    originalSize,
    originalLines,
    purgedSize,
    purgedLines,
    sizeReduction,
    lineReduction,
    rejectedCount,
    rejectedSelectors: result.rejected || []
  });

  fs.writeFileSync(reportPath, reportContent, 'utf8');
  console.log(`\n✅ Detailed report saved to: ${reportPath}`);

  // Save purged CSS for reference
  const purgedCssPath = './purgecss-output.css';
  fs.writeFileSync(purgedCssPath, result.css, 'utf8');
  console.log(`✅ Purged CSS saved to: ${purgedCssPath} (for reference only)\n`);

  console.log('🎯 Recommendation:');
  if (sizeReduction > 20) {
    console.log(`   HIGH IMPACT: ${sizeReduction}% reduction possible! Prioritize cleanup.`);
  } else if (sizeReduction > 10) {
    console.log(`   MEDIUM IMPACT: ${sizeReduction}% reduction possible. Consider cleanup.`);
  } else {
    console.log(`   LOW IMPACT: ${sizeReduction}% reduction. CSS is already well optimized.`);
  }

  console.log('\n✨ Analysis complete!\n');
}

function generateMarkdownReport(data) {
  return `# 🗑️ CSS Dead Code Analysis Report - nightlife-theme.css

**Date**: ${new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
**File**: \`src/styles/nightlife-theme.css\`
**Tool**: PurgeCSS v6.0.0

---

## 📊 Executive Summary

**Impact**: ${data.sizeReduction >= 20 ? '🔴 HIGH' : data.sizeReduction >= 10 ? '🟡 MEDIUM' : '🟢 LOW'}

| Metric | Original | After PurgeCSS | Reduction |
|--------|----------|----------------|-----------|
| **File Size** | ${data.originalSize} KB | ${data.purgedSize} KB | **-${data.sizeReduction}%** |
| **Lines** | ${data.originalLines} | ${data.purgedLines} | **-${data.lineReduction}%** |
| **Unused Selectors** | - | ${data.rejectedCount} selectors | - |

---

## 🔍 Analysis

### Findings

${data.sizeReduction >= 20
  ? `**HIGH IMPACT**: ${data.sizeReduction}% of CSS is unused! This represents ${(data.originalSize - data.purgedSize).toFixed(2)} KB that can be removed.

**Recommendation**: Prioritize cleanup. Manual review and removal of unused selectors will significantly improve bundle size.`
  : data.sizeReduction >= 10
  ? `**MEDIUM IMPACT**: ${data.sizeReduction}% of CSS is unused. This represents ${(data.originalSize - data.purgedSize).toFixed(2)} KB that can be removed.

**Recommendation**: Consider cleanup during next refactoring session.`
  : `**LOW IMPACT**: Only ${data.sizeReduction}% of CSS is unused. The \`nightlife-theme.css\` file is already well-optimized thanks to Phases 3B-4 migrations.

**Recommendation**: No urgent cleanup needed. CSS is in good shape.`}

### Unused Selectors Breakdown

**Total Rejected**: ${data.rejectedCount} selectors

${data.rejectedSelectors.length > 0 ? `
#### Top 50 Unused Selectors

\`\`\`css
${data.rejectedSelectors.slice(0, 50).map((s, i) => `${String(i + 1).padStart(3, ' ')}. ${s}`).join('\n')}
\`\`\`

${data.rejectedSelectors.length > 50 ? `\n... and ${data.rejectedSelectors.length - 50} more unused selectors (see \`purgecss-output.css\` for full list)\n` : ''}
` : ''}

---

## 🎯 Recommendations

### Immediate Actions

${data.sizeReduction >= 20
  ? `1. **Manual Review**: Go through top 50 unused selectors and verify they're truly unused
2. **Remove Dead Code**: Create PR to remove unused classes (est. ${Math.round(data.lineReduction / 2)}% reduction)
3. **Test Thoroughly**: Ensure no dynamic classes are accidentally removed`
  : data.sizeReduction >= 10
  ? `1. **Schedule Cleanup**: Plan 30-60 min session to remove unused selectors
2. **Verify Safelist**: Ensure dynamic classes are safelisted (framer-motion, toastify, etc.)`
  : `1. **Monitor**: Continue monitoring CSS growth with periodic PurgeCSS runs
2. **Maintain**: Keep Phase 3B-4 architecture standards (component-level CSS)`}

### Long-term Strategy

1. **Component-Level CSS**: Continue migrating to component-scoped CSS (as done in Phases 3B-4)
2. **CSS Modules**: Consider CSS Modules or Styled Components for future components
3. **Periodic Audits**: Run PurgeCSS analysis quarterly to catch new dead code

---

## 📁 Files Generated

1. **This Report**: \`CSS_DEAD_CODE_ANALYSIS.md\`
2. **Purged CSS**: \`purgecss-output.css\` (reference only, DO NOT use in production)
3. **Configuration**: \`purgecss.config.js\` (reusable for future analysis)

---

## ⚠️ Important Notes

1. **Safelist Configured**: Dynamic classes (framer-motion, toastify, modals) are safelisted
2. **Manual Verification Required**: Always verify unused selectors before removing
3. **Don't Use Purged CSS Directly**: This analysis is for identifying dead code only

---

**Analysis Completed**: ${new Date().toLocaleString('fr-FR')}
**Tool**: PurgeCSS with custom safelist configuration
**Status**: ${data.sizeReduction >= 20 ? '🔴 Action Required' : data.sizeReduction >= 10 ? '🟡 Review Recommended' : '✅ CSS Optimized'}
`;
}

// Run analysis
analyzeCss().catch(err => {
  console.error('❌ Error during analysis:', err);
  process.exit(1);
});
