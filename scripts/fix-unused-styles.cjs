#!/usr/bin/env node

/**
 * Script to remove unused StyleSheet properties
 * Uses ESLint's react-native/no-unused-styles rule to identify and fix issues
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runESLintFix() {
  console.log('🔧 Running ESLint auto-fix for unused styles...');
  
  try {
    // Run ESLint with auto-fix specifically for React Native style rules
    execSync('npx eslint src/ --fix --quiet --rule "react-native/no-unused-styles: error"', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log('✅ ESLint auto-fix completed for unused styles');
    return true;
  } catch (error) {
    console.error('❌ ESLint auto-fix failed:', error.message);
    return false;
  }
}

function getUnusedStylesReport() {
  console.log('📊 Generating unused styles report...');
  
  try {
    const result = execSync(
      'npx eslint src/ --format=json --rule "react-native/no-unused-styles: error"',
      { encoding: 'utf8', cwd: process.cwd() }
    );
    
    const lintResults = JSON.parse(result);
    const unusedStylesFiles = lintResults
      .filter(file => file.messages.some(msg => msg.ruleId === 'react-native/no-unused-styles'))
      .map(file => ({
        filePath: file.filePath,
        unusedStyles: file.messages.filter(msg => msg.ruleId === 'react-native/no-unused-styles')
      }));
    
    return unusedStylesFiles;
  } catch (error) {
    console.warn('⚠️ Could not generate unused styles report:', error.message);
    return [];
  }
}

function main() {
  console.log('🧹 Starting unused styles cleanup...\n');
  
  // Get initial report
  const beforeReport = getUnusedStylesReport();
  console.log(`📋 Found ${beforeReport.length} files with unused styles\n`);
  
  // Run auto-fix
  const success = runESLintFix();
  
  if (success) {
    // Get after report
    const afterReport = getUnusedStylesReport();
    
    console.log('\n📊 Cleanup Summary:');
    console.log(`   Files before: ${beforeReport.length}`);
    console.log(`   Files after: ${afterReport.length}`);
    console.log(`   Files fixed: ${beforeReport.length - afterReport.length}`);
    
    if (afterReport.length > 0) {
      console.log('\n⚠️ Files still needing manual attention:');
      afterReport.forEach(file => {
        const relativePath = path.relative(process.cwd(), file.filePath);
        console.log(`   - ${relativePath} (${file.unusedStyles.length} unused styles)`);
      });
      
      console.log('\n💡 Manual fix suggestions:');
      console.log('   1. Review the StyleSheet objects in the listed files');
      console.log('   2. Remove styles that are not referenced in JSX');
      console.log('   3. Check for dynamic style references that ESLint might miss');
    } else {
      console.log('\n✅ All unused styles have been cleaned up!');
    }
  }
  
  console.log('\n🎯 Next steps:');
  console.log('   Run: npm run lint:check');
  console.log('   To verify all style warnings are resolved');
}

if (require.main === module) {
  main();
}

module.exports = { runESLintFix, getUnusedStylesReport }; 