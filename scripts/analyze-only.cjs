#!/usr/bin/env node

/* eslint-env node */
const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

/**
 * SAFE CODE ANALYSIS SCRIPT
 * Analyzes code quality issues WITHOUT modifying any files
 * Use this to understand what needs fixing before running automated scripts
 */

const ANALYSIS_EXTENSIONS = ['*.tsx', '*.ts', '*.jsx', '*.js'];
const SRC_PATTERN = 'src/**/{' + ANALYSIS_EXTENSIONS.join(',') + '}';

class CodeAnalyzer {
  constructor() {
    this.results = {
      filesAnalyzed: 0,
      unusedStyles: [],
      anyTypes: [],
      hookIssues: [],
      generalIssues: [],
    };
  }

  /**
   * Analyze unused styles in a file (READ-ONLY)
   */
  analyzeUnusedStyles(content, filePath) {
    if (!content.includes('StyleSheet.create')) return [];

    const issues = [];
    
    // Extract style keys
    const styleKeyRegex = /StyleSheet\.create\s*\(\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}\s*\)/gs;
    const keyRegex = /^\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/gm;
    
    const matches = content.match(styleKeyRegex);
    if (!matches) return [];

    matches.forEach(match => {
      let keyMatch;
      while ((keyMatch = keyRegex.exec(match)) !== null) {
        const styleName = keyMatch[1];
        
        // Check if style is used
        const usagePatterns = [
          new RegExp(`styles\\.${styleName}\\b`, 'g'),
          new RegExp(`style={styles\\.${styleName}}`, 'g'),
          new RegExp(`\\[styles\\.${styleName}[,\\]]`, 'g'),
        ];

        const isUsed = usagePatterns.some(pattern => pattern.test(content));
        if (!isUsed) {
          issues.push({
            type: 'unused-style',
            file: filePath,
            styleName,
            severity: 'low',
            description: `Unused style: ${styleName}`,
          });
        }
      }
      keyRegex.lastIndex = 0;
    });

    return issues;
  }

  /**
   * Analyze TypeScript any types (READ-ONLY)
   */
  analyzeAnyTypes(content, filePath) {
    const issues = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      if (line.includes(': any')) {
        let severity = 'medium';
        let suggestion = 'Replace with proper type';

        // Categorize by context
        if (line.includes('event') || line.includes('onScroll') || line.includes('onPress')) {
          severity = 'high';
          suggestion = 'Use NativeSyntheticEvent<> or GestureResponderEvent';
        } else if (line.includes('navigation') || line.includes('route')) {
          severity = 'high';
          suggestion = 'Use NavigationProp<> or RouteProp<>';
        } else if (line.includes('theme')) {
          severity = 'medium';
          suggestion = 'Use AppTheme type';
        }

        issues.push({
          type: 'any-type',
          file: filePath,
          line: index + 1,
          content: line.trim(),
          severity,
          suggestion,
        });
      }
    });

    return issues;
  }

  /**
   * Analyze hook dependency issues (READ-ONLY)
   */
  analyzeHookDependencies(content, filePath) {
    const issues = [];
    
    // Simple pattern matching for common hook dependency issues
    const hookPatterns = [
      {
        pattern: /useEffect\s*\([^,]+,\s*\[[^\]]*\]\s*\)/g,
        type: 'useEffect'
      },
      {
        pattern: /useCallback\s*\([^,]+,\s*\[[^\]]*\]\s*\)/g,
        type: 'useCallback'
      },
      {
        pattern: /useMemo\s*\([^,]+,\s*\[[^\]]*\]\s*\)/g,
        type: 'useMemo'
      }
    ];

    hookPatterns.forEach(({ pattern, type }) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        // This is a simplified analysis - actual dependency checking is complex
        if (match[0].includes('[]') && match[0].length > 50) {
          issues.push({
            type: 'hook-dependency',
            file: filePath,
            hookType: type,
            severity: 'medium',
            description: `Potential missing dependencies in ${type}`,
            suggestion: 'Review hook dependencies manually',
          });
        }
      }
    });

    return issues;
  }

  /**
   * Analyze general issues (READ-ONLY)
   */
  analyzeGeneralIssues(content, filePath) {
    const issues = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Unused variables pattern (simplified)
      if (line.includes('is defined but never used')) {
        issues.push({
          type: 'unused-variable',
          file: filePath,
          line: index + 1,
          severity: 'low',
          description: 'Unused variable detected',
        });
      }

      // Inline styles
      if (line.includes('style={{') && !line.includes('StyleSheet')) {
        issues.push({
          type: 'inline-style',
          file: filePath,
          line: index + 1,
          severity: 'low',
          description: 'Inline style usage',
          suggestion: 'Convert to StyleSheet',
        });
      }

      // Color literals
      if (line.includes('rgba(') || line.includes('#000') || line.includes('#fff')) {
        issues.push({
          type: 'color-literal',
          file: filePath,
          line: index + 1,
          severity: 'low',
          description: 'Color literal usage',
          suggestion: 'Use theme colors',
        });
      }

      // Console statements
      if (line.includes('console.') && !line.includes('logger')) {
        issues.push({
          type: 'console-statement',
          file: filePath,
          line: index + 1,
          severity: 'medium',
          description: 'Console statement usage',
          suggestion: 'Use logger utility',
        });
      }
    });

    return issues;
  }

  /**
   * Analyze a single file (READ-ONLY)
   */
  async analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      const unusedStyles = this.analyzeUnusedStyles(content, filePath);
      const anyTypes = this.analyzeAnyTypes(content, filePath);
      const hookIssues = this.analyzeHookDependencies(content, filePath);
      const generalIssues = this.analyzeGeneralIssues(content, filePath);

      this.results.unusedStyles.push(...unusedStyles);
      this.results.anyTypes.push(...anyTypes);
      this.results.hookIssues.push(...hookIssues);
      this.results.generalIssues.push(...generalIssues);

      const totalIssues = unusedStyles.length + anyTypes.length + hookIssues.length + generalIssues.length;
      
      if (totalIssues > 0) {
        console.log(`📄 ${filePath}: ${totalIssues} issues found`);
        
        if (unusedStyles.length > 0) {
          console.log(`   🎨 ${unusedStyles.length} unused styles`);
        }
        if (anyTypes.length > 0) {
          console.log(`   🔧 ${anyTypes.length} any types`);
        }
        if (hookIssues.length > 0) {
          console.log(`   ⚡ ${hookIssues.length} hook issues`);
        }
        if (generalIssues.length > 0) {
          console.log(`   📋 ${generalIssues.length} general issues`);
        }
      }

      return totalIssues;
    } catch (error) {
      console.error(`Error analyzing ${filePath}: ${error.message}`);
      return 0;
    }
  }

  /**
   * Run analysis on all files (READ-ONLY)
   */
  async run() {
    console.log('🔍 Starting SAFE code analysis (no files will be modified)...\n');

    try {
      const files = await glob(SRC_PATTERN, { cwd: process.cwd() });
      
      for (const file of files) {
        this.results.filesAnalyzed++;
        await this.analyzeFile(file);
      }

      this.printReport();
    } catch (error) {
      console.error('❌ Error during analysis:', error.message);
      process.exit(1);
    }
  }

  /**
   * Print comprehensive analysis report
   */
  printReport() {
    const totalIssues = 
      this.results.unusedStyles.length +
      this.results.anyTypes.length +
      this.results.hookIssues.length +
      this.results.generalIssues.length;

    console.log('\n' + '='.repeat(60));
    console.log('📊 CODE QUALITY ANALYSIS REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n📈 Overview:`);
    console.log(`   Files analyzed: ${this.results.filesAnalyzed}`);
    console.log(`   Total issues found: ${totalIssues}`);
    
    // Breakdown by category
    console.log(`\n🎨 Unused Styles: ${this.results.unusedStyles.length} issues`);
    console.log(`🔧 TypeScript Any Types: ${this.results.anyTypes.length} issues`);
    console.log(`⚡ Hook Dependencies: ${this.results.hookIssues.length} issues`);
    console.log(`📋 General Issues: ${this.results.generalIssues.length} issues`);

    // Top 10 problematic files
    const fileIssueCount = {};
    [...this.results.unusedStyles, ...this.results.anyTypes, ...this.results.hookIssues, ...this.results.generalIssues]
      .forEach(issue => {
        fileIssueCount[issue.file] = (fileIssueCount[issue.file] || 0) + 1;
      });

    const topFiles = Object.entries(fileIssueCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    if (topFiles.length > 0) {
      console.log(`\n🔥 Top 10 Files Needing Attention:`);
      topFiles.forEach(([file, count], index) => {
        console.log(`   ${index + 1}. ${file}: ${count} issues`);
      });
    }

    // High severity issues
    const highSeverityIssues = [...this.results.anyTypes, ...this.results.hookIssues]
      .filter(issue => issue.severity === 'high')
      .slice(0, 5);

    if (highSeverityIssues.length > 0) {
      console.log(`\n⚠️  High Priority Issues (Top 5):`);
      highSeverityIssues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue.file}:${issue.line || 'unknown'}`);
        console.log(`      ${issue.description}`);
        console.log(`      💡 ${issue.suggestion || 'Manual review needed'}\n`);
      });
    }

    // Recommendations
    console.log(`\n💡 Recommendations:`);
    
    if (this.results.unusedStyles.length > 50) {
      console.log(`   🎨 HIGH IMPACT: Remove ${this.results.unusedStyles.length} unused styles`);
      console.log(`      Command: npm run cleanup:styles`);
    }
    
    if (this.results.anyTypes.length > 0) {
      console.log(`   🔧 IMPORTANT: Fix ${this.results.anyTypes.length} TypeScript any types`);
      console.log(`      Command: npm run cleanup:types (review suggestions first)`);
    }
    
    if (this.results.hookIssues.length > 0) {
      console.log(`   ⚡ CAREFUL: Review ${this.results.hookIssues.length} hook dependency issues`);
      console.log(`      Command: npm run cleanup:hooks (test thoroughly)`);
    }

    console.log(`\n🛡️ Safety First:`);
    console.log(`   1. Create git branch: git checkout -b phase2-code-cleanup`);
    console.log(`   2. Run scripts one by one with testing between each`);
    console.log(`   3. Read docs/phase2-safety-guide.md for complete safety protocol`);
    
    if (totalIssues > 100) {
      console.log(`\n⚠️ WARNING: ${totalIssues} issues detected. Proceed with caution!`);
      console.log(`   Consider manual fixes for high-priority issues first.`);
    } else if (totalIssues > 0) {
      console.log(`\n✅ Manageable: ${totalIssues} issues can be addressed systematically.`);
    } else {
      console.log(`\n🎉 Excellent: No major code quality issues detected!`);
    }
  }
}

// Run the analysis
if (require.main === module) {
  const analyzer = new CodeAnalyzer();
  analyzer.run().catch(console.error);
}

module.exports = CodeAnalyzer; 