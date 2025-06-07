#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

/**
 * Automated Hook Dependencies Fixer Script
 * Detects and fixes missing dependencies in useEffect, useCallback, useMemo hooks
 */

const REACT_EXTENSIONS = ['*.tsx', '*.ts', '*.jsx', '*.js'];
const SRC_PATTERN = 'src/**/{' + REACT_EXTENSIONS.join(',') + '}';

class HookDependencyFixer {
  constructor() {
    this.results = {
      filesProcessed: 0,
      hooksAnalyzed: 0,
      issuesFound: 0,
      filesModified: 0,
      fixes: [],
    };
  }

  /**
   * Extract hook usage patterns from file content
   */
  extractHooks(content) {
    const hookPatterns = [
      // useEffect with dependency array
      /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}\s*,\s*\[([^\]]*)\]/gs,
      // useCallback with dependency array
      /useCallback\s*\(\s*[^,]+,\s*\[([^\]]*)\]/gs,
      // useMemo with dependency array
      /useMemo\s*\(\s*[^,]+,\s*\[([^\]]*)\]/gs,
    ];

    const hooks = [];
    let match;

    hookPatterns.forEach((pattern, patternIndex) => {
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(content)) !== null) {
        const hookType = ['useEffect', 'useCallback', 'useMemo'][patternIndex];
        const hookBody = match[1] || match[0];
        const dependencies = match[match.length - 1] || '';
        
        hooks.push({
          type: hookType,
          body: hookBody,
          dependencies: dependencies.trim(),
          fullMatch: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    });

    return hooks;
  }

  /**
   * Extract variable and function references from hook body
   */
  extractReferences(hookBody) {
    const references = new Set();
    
    // Pattern to match variable/function usage
    const referencePatterns = [
      // Function calls: functionName(
      /(\w+)\s*\(/g,
      // Variable access: variableName
      /(?<!\.)\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b(?!\s*[:(])/g,
      // Object property access: object.property
      /(\w+)\.(\w+)/g,
    ];

    referencePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(hookBody)) !== null) {
        // Filter out React hooks, literals, and keywords
        const ref = match[1];
        if (ref && !this.isBuiltInOrKeyword(ref)) {
          references.add(ref);
        }
      }
    });

    return Array.from(references);
  }

  /**
   * Check if a reference is a built-in or keyword
   */
  isBuiltInOrKeyword(ref) {
    const builtIns = [
      'console', 'window', 'document', 'setTimeout', 'setInterval',
      'React', 'useState', 'useEffect', 'useCallback', 'useMemo',
      'true', 'false', 'null', 'undefined', 'this', 'return',
      'if', 'else', 'for', 'while', 'do', 'switch', 'case',
      'const', 'let', 'var', 'function', 'class', 'import', 'export',
    ];
    
    return builtIns.includes(ref) || /^[A-Z]/.test(ref); // Exclude components (PascalCase)
  }

  /**
   * Parse current dependencies from dependency array string
   */
  parseDependencies(depString) {
    if (!depString || depString.trim() === '') {
      return [];
    }
    
    return depString
      .split(',')
      .map(dep => dep.trim().replace(/['"]/g, ''))
      .filter(dep => dep !== '');
  }

  /**
   * Generate fixed dependency array
   */
  generateFixedDependencies(currentDeps, requiredRefs) {
    const existingDeps = new Set(currentDeps);
    const allDeps = new Set([...currentDeps, ...requiredRefs]);
    
    // Sort dependencies for consistency
    return Array.from(allDeps).sort();
  }

  /**
   * Fix hook dependencies in content
   */
  fixHookDependencies(content, hooks) {
    let modifiedContent = content;
    let issuesFixed = 0;
    const fixes = [];

    // Process hooks in reverse order to maintain string indices
    hooks.reverse().forEach(hook => {
      const references = this.extractReferences(hook.body);
      const currentDeps = this.parseDependencies(hook.dependencies);
      const missingDeps = references.filter(ref => !currentDeps.includes(ref));

      if (missingDeps.length > 0) {
        const fixedDeps = this.generateFixedDependencies(currentDeps, missingDeps);
        const newDepArray = `[${fixedDeps.map(dep => `'${dep}'`).join(', ')}]`;
        
        // Replace the dependency array in the hook
        const oldDepArrayPattern = /\[([^\]]*)\]$/;
        const newHookString = hook.fullMatch.replace(oldDepArrayPattern, newDepArray);
        
        modifiedContent = 
          modifiedContent.slice(0, hook.startIndex) +
          newHookString +
          modifiedContent.slice(hook.endIndex);

        fixes.push({
          type: hook.type,
          missingDeps,
          fixedDeps,
          oldDeps: currentDeps,
        });

        issuesFixed++;
      }
    });

    return { modifiedContent, issuesFixed, fixes };
  }

  /**
   * Process a single file
   */
  async processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Skip files without React hooks
      if (!content.includes('useEffect') && 
          !content.includes('useCallback') && 
          !content.includes('useMemo')) {
        return { modified: false, issuesFixed: 0, hooks: 0 };
      }

      const hooks = this.extractHooks(content);
      if (hooks.length === 0) {
        return { modified: false, issuesFixed: 0, hooks: 0 };
      }

      const { modifiedContent, issuesFixed, fixes } = this.fixHookDependencies(content, hooks);
      
      if (issuesFixed > 0) {
        fs.writeFileSync(filePath, modifiedContent, 'utf8');
        
        console.log(`✅ ${filePath}: Fixed ${issuesFixed} hook dependency issues`);
        fixes.forEach(fix => {
          console.log(`   ${fix.type}: Added [${fix.missingDeps.join(', ')}]`);
        });
        
        this.results.fixes.push({
          filePath,
          fixes,
        });
        
        return { modified: true, issuesFixed, hooks: hooks.length };
      }

      return { modified: false, issuesFixed: 0, hooks: hooks.length };
    } catch (error) {
      console.error(`Error processing ${filePath}: ${error.message}`);
      return { modified: false, issuesFixed: 0, hooks: 0 };
    }
  }

  /**
   * Run hook dependency fixes on all matching files
   */
  async run() {
    console.log('🔧 Starting hook dependency fixes...\n');

    try {
      const files = await glob(SRC_PATTERN, { cwd: process.cwd() });
      
      for (const file of files) {
        this.results.filesProcessed++;
        const result = await this.processFile(file);
        
        this.results.hooksAnalyzed += result.hooks;
        this.results.issuesFound += result.issuesFixed;
        
        if (result.modified) {
          this.results.filesModified++;
        }
      }

      this.printSummary();
    } catch (error) {
      console.error('❌ Error during hook dependency fixes:', error.message);
      process.exit(1);
    }
  }

  /**
   * Print fix summary
   */
  printSummary() {
    console.log('\n📊 Hook Dependencies Fix Summary:');
    console.log(`   Files processed: ${this.results.filesProcessed}`);
    console.log(`   Hooks analyzed: ${this.results.hooksAnalyzed}`);
    console.log(`   Issues found and fixed: ${this.results.issuesFound}`);
    console.log(`   Files modified: ${this.results.filesModified}`);
    
    if (this.results.fixes.length > 0) {
      console.log('\n🔧 Applied Fixes:');
      
      this.results.fixes.slice(0, 5).forEach(({ filePath, fixes }) => {
        console.log(`\n   📄 ${filePath}:`);
        fixes.forEach(fix => {
          console.log(`      ${fix.type}: Added dependencies [${fix.missingDeps.join(', ')}]`);
          console.log(`      Complete deps: [${fix.fixedDeps.join(', ')}]`);
        });
      });

      if (this.results.fixes.length > 5) {
        console.log(`\n   ... and ${this.results.fixes.length - 5} more files`);
      }

      console.log('\n💡 Next Steps:');
      console.log('   1. Test your app to ensure functionality still works');
      console.log('   2. Review fixes to ensure no over-dependencies were added');
      console.log('   3. Run ESLint to verify hook dependencies are correct');
      console.log('   4. Some dependencies might need useCallback wrapping');
    } else {
      console.log('\n✅ No hook dependency issues found - excellent React practices!');
    }
  }
}

// Run the fixer
if (require.main === module) {
  const fixer = new HookDependencyFixer();
  fixer.run().catch(console.error);
}

module.exports = HookDependencyFixer; 