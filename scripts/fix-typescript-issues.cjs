#!/usr/bin/env node

/**
 * Script to identify and help fix TypeScript issues
 * Focuses on any types, unused variables, and React Hook dependencies
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getTypeScriptIssues() {
  console.log('🔍 Analyzing TypeScript issues...');
  
  try {
    const result = execSync(
      'npx eslint src/ --format=json',
      { encoding: 'utf8', cwd: process.cwd() }
    );
    
    const lintResults = JSON.parse(result);
    
    const tsIssues = {
      anyTypes: [],
      unusedVars: [],
      hookDependencies: [],
      missingTypes: []
    };
    
    lintResults.forEach(file => {
      file.messages.forEach(message => {
        const issue = {
          file: path.relative(process.cwd(), file.filePath),
          line: message.line,
          column: message.column,
          message: message.message,
          ruleId: message.ruleId
        };
        
        switch (message.ruleId) {
          case '@typescript-eslint/no-explicit-any':
            tsIssues.anyTypes.push(issue);
            break;
          case '@typescript-eslint/no-unused-vars':
            tsIssues.unusedVars.push(issue);
            break;
          case 'react-hooks/exhaustive-deps':
            tsIssues.hookDependencies.push(issue);
            break;
          case '@typescript-eslint/no-non-null-assertion':
            tsIssues.missingTypes.push(issue);
            break;
        }
      });
    });
    
    return tsIssues;
  } catch (error) {
    console.error('❌ Failed to analyze TypeScript issues:', error.message);
    return null;
  }
}

function generateFixSuggestions(issues) {
  console.log('\n📋 TypeScript Issues Report:\n');
  
  // Any types
  if (issues.anyTypes.length > 0) {
    console.log(`🔴 Explicit 'any' types (${issues.anyTypes.length} issues):`);
    issues.anyTypes.slice(0, 10).forEach(issue => {
      console.log(`   ${issue.file}:${issue.line} - ${issue.message}`);
    });
    if (issues.anyTypes.length > 10) {
      console.log(`   ... and ${issues.anyTypes.length - 10} more`);
    }
    
    console.log('\n💡 Fix suggestions for any types:');
    console.log('   1. Replace any with specific types (string, number, object)');
    console.log('   2. Create interfaces for object types');
    console.log('   3. Use union types for known variations');
    console.log('   4. Use generic types for reusable components\n');
  }
  
  // Unused variables
  if (issues.unusedVars.length > 0) {
    console.log(`🟡 Unused variables (${issues.unusedVars.length} issues):`);
    issues.unusedVars.slice(0, 10).forEach(issue => {
      console.log(`   ${issue.file}:${issue.line} - ${issue.message}`);
    });
    if (issues.unusedVars.length > 10) {
      console.log(`   ... and ${issues.unusedVars.length - 10} more`);
    }
    
    console.log('\n💡 Fix suggestions for unused variables:');
    console.log('   1. Remove unused imports and variables');
    console.log('   2. Prefix with _ if needed for future use');
    console.log('   3. Remove unused props or destructure only needed ones\n');
  }
  
  // Hook dependencies
  if (issues.hookDependencies.length > 0) {
    console.log(`🟠 React Hook dependencies (${issues.hookDependencies.length} issues):`);
    issues.hookDependencies.slice(0, 10).forEach(issue => {
      console.log(`   ${issue.file}:${issue.line} - ${issue.message}`);
    });
    if (issues.hookDependencies.length > 10) {
      console.log(`   ... and ${issues.hookDependencies.length - 10} more`);
    }
    
    console.log('\n💡 Fix suggestions for hook dependencies:');
    console.log('   1. Add missing dependencies to dependency arrays');
    console.log('   2. Use useCallback for functions passed to other hooks');
    console.log('   3. Consider extracting stable references outside components');
    console.log('   4. Use ESLint auto-fix: npx eslint --fix src/path/to/file.tsx\n');
  }
}

function runAutoFixes() {
  console.log('🔧 Running automated TypeScript fixes...');
  
  const fixes = [
    {
      name: 'Unused variables',
      command: 'npx eslint src/ --fix --quiet --rule "@typescript-eslint/no-unused-vars: error"'
    },
    {
      name: 'React Hook dependencies',
      command: 'npx eslint src/ --fix --quiet --rule "react-hooks/exhaustive-deps: error"'
    }
  ];
  
  fixes.forEach(fix => {
    try {
      console.log(`   Fixing: ${fix.name}...`);
      execSync(fix.command, { stdio: 'pipe', cwd: process.cwd() });
      console.log(`   ✅ ${fix.name} - auto-fixes applied`);
    } catch (error) {
      console.log(`   ⚠️ ${fix.name} - some issues need manual attention`);
    }
  });
}

function main() {
  console.log('🔬 TypeScript Issues Analysis & Fixes\n');
  
  const issues = getTypeScriptIssues();
  
  if (!issues) {
    console.log('❌ Could not analyze issues. Please check ESLint configuration.');
    return;
  }
  
  generateFixSuggestions(issues);
  
  // Run auto-fixes
  runAutoFixes();
  
  // Generate updated report
  console.log('\n🔄 Checking remaining issues...');
  const remainingIssues = getTypeScriptIssues();
  
  if (remainingIssues) {
    const totalRemaining = 
      remainingIssues.anyTypes.length + 
      remainingIssues.unusedVars.length + 
      remainingIssues.hookDependencies.length;
      
    console.log(`\n📊 Remaining TypeScript issues: ${totalRemaining}`);
    console.log(`   - Any types: ${remainingIssues.anyTypes.length}`);
    console.log(`   - Unused variables: ${remainingIssues.unusedVars.length}`);
    console.log(`   - Hook dependencies: ${remainingIssues.hookDependencies.length}`);
    
    if (totalRemaining > 0) {
      console.log('\n🎯 These require manual fixes. Review the suggestions above.');
    } else {
      console.log('\n✅ All TypeScript issues have been resolved!');
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { getTypeScriptIssues, generateFixSuggestions, runAutoFixes }; 