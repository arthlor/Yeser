#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

/**
 * Automated Unused Styles Cleanup Script
 * Detects and removes unused styles from React Native StyleSheet.create objects
 */

const STYLE_EXTENSIONS = ['*.tsx', '*.ts', '*.jsx', '*.js'];
const SRC_PATTERN = 'src/**/{' + STYLE_EXTENSIONS.join(',') + '}';

class UnusedStylesDetector {
  constructor() {
    this.results = {
      filesProcessed: 0,
      stylesRemoved: 0,
      filesModified: 0,
      warnings: [],
    };
  }

  /**
   * Extract style object keys from StyleSheet.create calls
   */
  extractStyleKeys(content) {
    const styleKeyRegex = /StyleSheet\.create\s*\(\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}\s*\)/gs;
    const keyRegex = /^\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/gm;
    
    const matches = content.match(styleKeyRegex);
    if (!matches) {return [];}

    const allKeys = [];
    matches.forEach(match => {
      let keyMatch;
      while ((keyMatch = keyRegex.exec(match)) !== null) {
        allKeys.push(keyMatch[1]);
      }
      keyRegex.lastIndex = 0;
    });

    return allKeys;
  }

  /**
   * Find actual usage of style keys in component code
   */
  findStyleUsages(content, styleKeys) {
    const usedStyles = new Set();
    
    styleKeys.forEach(key => {
      // Check for styles.key or style={styles.key} patterns
      const usagePatterns = [
        new RegExp(`styles\\.${key}\\b`, 'g'),
        new RegExp(`style={styles\\.${key}}`, 'g'),
        new RegExp(`\\[styles\\.${key}[,\\]]`, 'g'),
      ];

      const hasUsage = usagePatterns.some(pattern => pattern.test(content));
      if (hasUsage) {
        usedStyles.add(key);
      }
    });

    return usedStyles;
  }

  /**
   * Remove unused style definitions from StyleSheet.create
   */
  removeUnusedStyles(content, unusedKeys) {
    if (unusedKeys.length === 0) {return content;}

    let modifiedContent = content;

    // Remove each unused style key and its definition
    unusedKeys.forEach(key => {
      // Pattern to match: key: { ... }, (including multi-line objects)
      const keyPattern = new RegExp(
        `^\\s*${key}\\s*:\\s*\\{[^{}]*(?:\\{[^{}]*\\}[^{}]*)*\\}\\s*,?\\s*$`,
        'gm'
      );
      
      modifiedContent = modifiedContent.replace(keyPattern, '');
    });

    // Clean up extra commas and formatting
    modifiedContent = modifiedContent.replace(/,(\s*[,}])/g, '$1');
    modifiedContent = modifiedContent.replace(/{\s*,/g, '{');

    return modifiedContent;
  }

  /**
   * Process a single file
   */
  async processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Skip files without StyleSheet
      if (!content.includes('StyleSheet.create')) {
        return { modified: false, removedCount: 0 };
      }

      const styleKeys = this.extractStyleKeys(content);
      if (styleKeys.length === 0) {
        return { modified: false, removedCount: 0 };
      }

      const usedStyles = this.findStyleUsages(content, styleKeys);
      const unusedKeys = styleKeys.filter(key => !usedStyles.has(key));

      if (unusedKeys.length === 0) {
        return { modified: false, removedCount: 0 };
      }

      const modifiedContent = this.removeUnusedStyles(content, unusedKeys);
      
      // Only write if content actually changed
      if (modifiedContent !== content) {
        fs.writeFileSync(filePath, modifiedContent, 'utf8');
        
        console.log(`✅ ${filePath}: Removed ${unusedKeys.length} unused styles`);
        console.log(`   Removed: ${unusedKeys.join(', ')}`);
        
        return { modified: true, removedCount: unusedKeys.length };
      }

      return { modified: false, removedCount: 0 };
    } catch (error) {
      this.results.warnings.push(`Error processing ${filePath}: ${error.message}`);
      return { modified: false, removedCount: 0 };
    }
  }

  /**
   * Run cleanup on all matching files
   */
  async run() {
    console.log('🧹 Starting unused styles cleanup...\n');

    try {
      const files = await glob(SRC_PATTERN, { cwd: process.cwd() });
      
      for (const file of files) {
        this.results.filesProcessed++;
        const result = await this.processFile(file);
        
        if (result.modified) {
          this.results.filesModified++;
          this.results.stylesRemoved += result.removedCount;
        }
      }

      this.printSummary();
    } catch (error) {
      console.error('❌ Error during cleanup:', error.message);
      process.exit(1);
    }
  }

  /**
   * Print cleanup summary
   */
  printSummary() {
    console.log('\n📊 Cleanup Summary:');
    console.log(`   Files processed: ${this.results.filesProcessed}`);
    console.log(`   Files modified: ${this.results.filesModified}`);
    console.log(`   Styles removed: ${this.results.stylesRemoved}`);
    
    if (this.results.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.results.warnings.forEach(warning => console.log(`   ${warning}`));
    }

    if (this.results.stylesRemoved > 0) {
      console.log('\n✨ Bundle size should be reduced!');
      console.log('💡 Run `npm run lint:check` to verify no new issues were introduced');
    } else {
      console.log('\n✅ No unused styles found - codebase is clean!');
    }
  }
}

// Run the cleanup
if (require.main === module) {
  const detector = new UnusedStylesDetector();
  detector.run().catch(console.error);
}

module.exports = UnusedStylesDetector; 