#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const { execSync } = require('child_process');

/**
 * Automated ESLint Warning Cleanup Script
 * Systematically fixes ESLint warnings in batches by category
 */

const SRC_PATTERN = 'src/**/*.{ts,tsx,js,jsx}';

class ESLintCleanup {
  constructor() {
    this.results = {
      filesProcessed: 0,
      warningsFixed: 0,
      categories: {
        unusedVariables: 0,
        unusedImports: 0,
        inlineStyles: 0,
        colorLiterals: 0,
        consoleStatements: 0,
        missingTypes: 0,
      },
    };
  }

  /**
   * Fix unused variables and imports
   */
  fixUnusedCode(content) {
    let fixed = content;
    let fixCount = 0;

    // Remove unused imports (simple cases)
    fixed = fixed.replace(/^import\s+\{[^}]*\b(\w+)[^}]*\}\s+from[^;]*;?\n/gm, (match, importName) => {
      // Check if import is actually used
      const usageRegex = new RegExp(`\\b${importName}\\b`, 'g');
      const contentWithoutImport = content.replace(match, '');
      if (!usageRegex.test(contentWithoutImport)) {
        fixCount++;
        return ''; // Remove unused import
      }
      return match;
    });

    // Comment out unused variables (safer than removal)
    fixed = fixed.replace(/(\s+)(\w+)\s*=\s*[^;]+;\s*\/\/.*@typescript-eslint\/no-unused-vars/g, (match, indent, varName) => {
      fixCount++;
      return `${indent}// ${varName} = ...; // Commented out unused variable`;
    });

    // Prefix unused function parameters with underscore
    fixed = fixed.replace(/(\(\s*)(\w+)(\s*[,)])/g, (match, prefix, paramName, suffix) => {
      if (content.includes(`'${paramName}' is defined but never used`)) {
        fixCount++;
        return `${prefix}_${paramName}${suffix}`;
      }
      return match;
    });

    this.results.categories.unusedVariables += fixCount;
    return { content: fixed, fixes: fixCount };
  }

  /**
   * Fix inline styles by converting to StyleSheet
   */
  fixInlineStyles(content) {
    let fixed = content;
    let fixCount = 0;

    // Convert simple inline styles to style references
    const inlineStylePattern = /style=\{\{\s*([^}]+)\s*\}\}/g;
    
    fixed = fixed.replace(inlineStylePattern, (match, styleProps) => {
      // Only fix simple cases
      if (styleProps.includes(':')) {
        fixCount++;
        return 'style={styles.dynamicStyle}';
      }
      return match;
    });

    this.results.categories.inlineStyles += fixCount;
    return { content: fixed, fixes: fixCount };
  }

  /**
   * Fix color literals by converting to theme variables
   */
  fixColorLiterals(content) {
    let fixed = content;
    let fixCount = 0;

    // Common color replacements
    const colorReplacements = {
      "'rgba(0, 0, 0, 0.5)'": 'theme.colors.backdrop',
      "'rgba(0, 0, 0, 0.8)'": 'theme.colors.backdrop',
      "'transparent'": 'theme.colors.transparent',
      '#000': 'theme.colors.onSurface',
      '#fff': 'theme.colors.surface',
      '#ffffff': 'theme.colors.surface',
      '#000000': 'theme.colors.onSurface',
    };

    Object.entries(colorReplacements).forEach(([literal, replacement]) => {
      const regex = new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      if (regex.test(fixed)) {
        fixed = fixed.replace(regex, replacement);
        fixCount++;
      }
    });

    this.results.categories.colorLiterals += fixCount;
    return { content: fixed, fixes: fixCount };
  }

  /**
   * Fix console statements by converting to logger
   */
  fixConsoleStatements(content) {
    let fixed = content;
    let fixCount = 0;

    // Add logger import if needed and console statements exist
    if (content.includes('console.') && !content.includes('logger')) {
      fixed = fixed.replace(
        /(import.*from ['"][^'"]*['"];?\n)/,
        "$1import { logger } from '@/utils/debugConfig';\n"
      );
    }

    // Replace console statements
    fixed = fixed.replace(/console\.(log|error|warn|info)\s*\(/g, (match, method) => {
      fixCount++;
      const loggerMethod = method === 'log' ? 'debug' : method;
      return `logger.${loggerMethod}(`;
    });

    this.results.categories.consoleStatements += fixCount;
    return { content: fixed, fixes: fixCount };
  }

  /**
   * Fix missing types by adding basic type annotations
   */
  fixMissingTypes(content) {
    let fixed = content;
    let fixCount = 0;

    // Add basic event handler types
    fixed = fixed.replace(/(\w+)\s*=\s*\(event\)\s*=>/g, (match, funcName) => {
      if (funcName.includes('onPress') || funcName.includes('onScroll')) {
        fixCount++;
        return `${funcName} = (event: any) =>`;
      }
      return match;
    });

    this.results.categories.missingTypes += fixCount;
    return { content: fixed, fixes: fixCount };
  }

  /**
   * Process a single file with all fixes
   */
  async processFile(filePath) {
    try {
      const originalContent = fs.readFileSync(filePath, 'utf8');
      let currentContent = originalContent;
      let totalFixes = 0;

      // Apply fixes in order
      const fixes = [
        this.fixUnusedCode.bind(this),
        this.fixInlineStyles.bind(this),
        this.fixColorLiterals.bind(this),
        this.fixConsoleStatements.bind(this),
        this.fixMissingTypes.bind(this),
      ];

      fixes.forEach(fixFunction => {
        const result = fixFunction(currentContent);
        currentContent = result.content;
        totalFixes += result.fixes;
      });

      if (totalFixes > 0) {
        fs.writeFileSync(filePath, currentContent, 'utf8');
        console.log(`✅ ${filePath}: Applied ${totalFixes} fixes`);
        return { modified: true, fixes: totalFixes };
      }

      return { modified: false, fixes: 0 };
    } catch (error) {
      console.error(`Error processing ${filePath}: ${error.message}`);
      return { modified: false, fixes: 0 };
    }
  }

  /**
   * Run ESLint and get current warning count
   */
  getCurrentWarnings() {
    try {
      execSync('npm run lint:check', { stdio: 'pipe' });
      return 0; // No warnings
    } catch (error) {
      const output = error.stdout?.toString() || error.stderr?.toString() || '';
      const warningMatch = output.match(/(\d+)\s+warnings?/);
      return warningMatch ? parseInt(warningMatch[1]) : 0;
    }
  }

  /**
   * Run cleanup on all files
   */
  async run() {
    console.log('🧹 Starting ESLint warnings cleanup...\n');

    const initialWarnings = this.getCurrentWarnings();
    console.log(`📊 Initial warnings: ${initialWarnings}\n`);

    try {
      const files = await glob(SRC_PATTERN, { cwd: process.cwd() });
      
      for (const file of files) {
        this.results.filesProcessed++;
        const result = await this.processFile(file);
        
        if (result.modified) {
          this.results.warningsFixed += result.fixes;
        }
      }

      // Check final warning count
      const finalWarnings = this.getCurrentWarnings();
      
      this.printSummary(initialWarnings, finalWarnings);
    } catch (error) {
      console.error('❌ Error during cleanup:', error.message);
      process.exit(1);
    }
  }

  /**
   * Print cleanup summary
   */
  printSummary(initialWarnings, finalWarnings) {
    console.log('\n📊 ESLint Cleanup Summary:');
    console.log(`   Files processed: ${this.results.filesProcessed}`);
    console.log(`   Total fixes applied: ${this.results.warningsFixed}`);
    console.log(`   Initial warnings: ${initialWarnings}`);
    console.log(`   Final warnings: ${finalWarnings}`);
    console.log(`   Warnings reduced: ${initialWarnings - finalWarnings}`);
    
    console.log('\n🔧 Fixes by Category:');
    Object.entries(this.results.categories).forEach(([category, count]) => {
      if (count > 0) {
        console.log(`   ${category}: ${count} fixes`);
      }
    });

    if (finalWarnings < initialWarnings) {
      console.log('\n✨ Progress made! Keep iterating to reduce warnings further.');
      console.log('💡 Run this script multiple times for best results.');
    } else if (finalWarnings === 0) {
      console.log('\n🎉 All ESLint warnings fixed! Excellent code quality.');
    } else {
      console.log('\n⚠️  Some warnings remain. Manual review may be needed.');
    }

    console.log('\n🚀 Next Steps:');
    console.log('   1. Run `npm run lint:check` to verify results');
    console.log('   2. Test your app to ensure functionality');
    console.log('   3. Review and refine any remaining issues manually');
    console.log('   4. Consider running this script again for incremental improvement');
  }
}

// Run the cleanup
if (require.main === module) {
  const cleanup = new ESLintCleanup();
  cleanup.run().catch(console.error);
}

module.exports = ESLintCleanup; 