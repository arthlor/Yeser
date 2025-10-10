#!/usr/bin/env node

/**
 * Script to detect hardcoded accessibility and user-facing strings in the codebase
 * This helps maintain consistent i18n usage across the application
 */

const fs = require('fs');
const path = require('path');

// Patterns to detect hardcoded strings in accessibility labels and user-facing text
const HARDCODED_PATTERNS = [
  // Accessibility labels with hardcoded English/Turkish text (but not t() calls)
  /accessibilityLabel=["'`](?!.*t\(.*\))[^"'`{]*[A-Za-z\s]{4,}[^"'`{]*["'`]/g,
  /accessibilityHint=["'`](?!.*t\(.*\))[^"'`{]*[A-Za-z\s]{4,}[^"'`{]*["'`]/g,

  // Alert.alert with hardcoded strings (but not t() calls)
  /Alert\.alert\(\s*["'`](?!.*t\(.*\))[^"'`{]*[A-Za-z\s]{4,}[^"'`{]*["'`]/g,

  // placeholder attributes with hardcoded text (but not t() calls)
  /placeholder=["'`](?!.*t\(.*\))[^"'`{]*[A-Za-z\s]{4,}[^"'`{]*["'`]/g,

  // title attributes with hardcoded text (but not t() calls)
  /title=["'`](?!.*t\(.*\))[^"'`{]*[A-Za-z\s]{4,}[^"'`{]*["'`]/g,
];

// Files to ignore (config files, generated files, etc.)
const IGNORE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /dist/,
  /build/,
  /coverage/,
  /\.expo/,
  /android/,
  /ios/,
  /\.bundle/,
  /\.config\./,
  /\.test\./,
  /\.spec\./,
  /types.*\.ts$/,
  /\.d\.ts$/,
  /migration.*\.sql$/,
];

// Allowed hardcoded patterns (development only, component names, etc.)
const ALLOWED_PATTERNS = [
  /displayName\s*=\s*["'`]/,
  /name\s*=\s*["'`][a-z-]+["'`]/, // component names
  /"[A-Z][a-zA-Z]*"/, // Component names in strings
  /console\.(log|warn|error|debug)/, // console statements
  /testID=/, // React Native test IDs
  /accessibilityRole=/, // accessibility roles are standard strings
  /\bt\(['"]/, // Already using t() function
  /import.*useTranslation/, // Files that import useTranslation
  /Promise</, // TypeScript Promise types
  /Array</, // TypeScript Array types
  />[\s]*[A-Z][\w\s]*</, // JSX content that's component names
  /interface\s+\w+/, // TypeScript interfaces
  /type\s+\w+/, // TypeScript types
  /\*.*\w+.*\*/, // Comments
  //.*\w+/, // Single line comments
];

function shouldIgnoreFile(filePath) {
  return IGNORE_PATTERNS.some((pattern) => pattern.test(filePath));
}

function isAllowedHardcodedString(match, context) {
  return ALLOWED_PATTERNS.some((pattern) => pattern.test(context));
}

function checkFile(filePath) {
  if (shouldIgnoreFile(filePath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const violations = [];

    HARDCODED_PATTERNS.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineNumber = content.slice(0, match.index).split('\n').length;
        const lineContent = content.split('\n')[lineNumber - 1];

        // Skip if this is an allowed pattern
        if (!isAllowedHardcodedString(match[0], lineContent)) {
          violations.push({
            file: filePath,
            line: lineNumber,
            match: match[0],
            context: lineContent.trim(),
            pattern: pattern.toString(),
          });
        }
      }
    });

    return violations;
  } catch (error) {
    console.warn(`Warning: Could not read file ${filePath}: ${error.message}`);
    return [];
  }
}

function getAllFiles(dir, extensions = ['.tsx', '.ts', '.js', '.jsx']) {
  let files = [];

  try {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !shouldIgnoreFile(fullPath)) {
        files = files.concat(getAllFiles(fullPath, extensions));
      } else if (stat.isFile() && extensions.some((ext) => fullPath.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read directory ${dir}: ${error.message}`);
  }

  return files;
}

function main() {
  console.log(
    '🔍 Checking for hardcoded strings in accessibility labels and user-facing text...\n'
  );

  const srcDir = path.join(__dirname, '..', 'src');
  const files = getAllFiles(srcDir);

  let totalViolations = 0;
  const violationsByFile = {};

  files.forEach((file) => {
    const violations = checkFile(file);
    if (violations.length > 0) {
      violationsByFile[file] = violations;
      totalViolations += violations.length;
    }
  });

  if (totalViolations === 0) {
    console.log(
      '✅ No hardcoded strings found! All user-facing text appears to be properly localized.'
    );
    process.exit(0);
  }

  console.log(`❌ Found ${totalViolations} potential hardcoded strings:\n`);

  Object.entries(violationsByFile).forEach(([file, violations]) => {
    console.log(`📄 ${file.replace(process.cwd(), '.')}`);
    violations.forEach((violation) => {
      console.log(`   Line ${violation.line}: ${violation.match}`);
      console.log(`   Context: ${violation.context}`);
      console.log('   💡 Consider using t() function with a translation key\n');
    });
  });

  console.log('💡 Tips:');
  console.log('   - Use t("key") for accessibility labels');
  console.log('   - Use t("key", { variable }) for dynamic content');
  console.log('   - Add new keys to both en.json and tr.json files');
  console.log('   - Test in both languages after making changes\n');

  process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = { checkFile, getAllFiles };
