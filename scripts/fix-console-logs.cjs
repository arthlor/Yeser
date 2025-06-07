#!/usr/bin/env node

/**
 * Script to replace console.log statements with proper logger calls
 * Automatically fixes console logging throughout the codebase
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const SOURCE_DIRS = ['src/**/*.{ts,tsx}'];
const EXCLUDE_PATTERNS = ['**/*.test.{ts,tsx}', '**/__tests__/**', '**/node_modules/**'];

// Logger import patterns
const LOGGER_IMPORTS = {
  withLogger: "import { logger } from '@/utils/debugConfig';",
  withoutImport: ''
};

// Replacement patterns
const CONSOLE_REPLACEMENTS = [
  {
    pattern: /console\.log\(/g,
    replacement: 'logger.debug(',
    level: 'debug'
  },
  {
    pattern: /console\.info\(/g,
    replacement: 'logger.info(',
    level: 'info'
  },
  {
    pattern: /console\.warn\(/g,
    replacement: 'logger.warn(',
    level: 'warn'
  },
  {
    pattern: /console\.error\(/g,
    replacement: 'logger.error(',
    level: 'error'
  }
];

function findFilesToProcess() {
  const files = [];
  
  SOURCE_DIRS.forEach(pattern => {
    const matches = glob.sync(pattern, {
      ignore: EXCLUDE_PATTERNS
    });
    files.push(...matches);
  });
  
  return [...new Set(files)]; // Remove duplicates
}

function hasConsoleStatements(content) {
  return CONSOLE_REPLACEMENTS.some(replacement => 
    replacement.pattern.test(content)
  );
}

function hasLoggerImport(content) {
  return content.includes("from '@/utils/debugConfig'") || 
         content.includes('from "../utils/debugConfig"') ||
         content.includes('from "../../utils/debugConfig"');
}

function addLoggerImport(content, filePath) {
  // Determine relative path to logger
  const fileDir = path.dirname(filePath);
  const srcDir = path.resolve('src');
  const relativePath = path.relative(fileDir, path.join(srcDir, 'utils/debugConfig'));
  const importPath = relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
  
  // Use absolute import if in src directory
  const loggerImport = filePath.includes('src/') 
    ? "import { logger } from '@/utils/debugConfig';"
    : `import { logger } from '${importPath}';`;
  
  // Find the last import statement
  const lines = content.split('\n');
  let lastImportIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ') && !lines[i].includes('type')) {
      lastImportIndex = i;
    }
  }
  
  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, loggerImport);
  } else {
    // Add at the beginning if no imports found
    lines.unshift(loggerImport, '');
  }
  
  return lines.join('\n');
}

function replaceConsoleStatements(content) {
  let modifiedContent = content;
  
  CONSOLE_REPLACEMENTS.forEach(replacement => {
    modifiedContent = modifiedContent.replace(replacement.pattern, replacement.replacement);
  });
  
  return modifiedContent;
}

function processFile(filePath) {
  console.log(`Processing: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  if (hasConsoleStatements(content)) {
    // Add logger import if needed
    if (!hasLoggerImport(content)) {
      content = addLoggerImport(content, filePath);
      modified = true;
    }
    
    // Replace console statements
    const originalContent = content;
    content = replaceConsoleStatements(content);
    
    if (content !== originalContent) {
      modified = true;
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${filePath}`);
    return true;
  }
  
  return false;
}

function main() {
  console.log('🔍 Finding files with console statements...');
  
  const files = findFilesToProcess();
  console.log(`📁 Found ${files.length} files to check`);
  
  let processedCount = 0;
  let modifiedCount = 0;
  
  files.forEach(file => {
    processedCount++;
    if (processFile(file)) {
      modifiedCount++;
    }
  });
  
  console.log('\n📊 Summary:');
  console.log(`   Processed: ${processedCount} files`);
  console.log(`   Modified: ${modifiedCount} files`);
  console.log(`   Skipped: ${processedCount - modifiedCount} files`);
  
  if (modifiedCount > 0) {
    console.log('\n✅ Console.log cleanup completed!');
    console.log('🔧 Run ESLint to verify all console warnings are fixed.');
  } else {
    console.log('\n✨ No console statements found to fix.');
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { processFile, replaceConsoleStatements, hasConsoleStatements }; 