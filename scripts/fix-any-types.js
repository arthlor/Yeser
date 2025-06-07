#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

/**
 * Automated Any Types Fixer Script
 * Detects and suggests proper TypeScript interfaces for 'any' types
 */

const TS_EXTENSIONS = ['*.tsx', '*.ts'];
const SRC_PATTERN = 'src/**/{' + TS_EXTENSIONS.join(',') + '}';

class AnyTypeFixer {
  constructor() {
    this.results = {
      filesProcessed: 0,
      anyTypesFound: 0,
      filesModified: 0,
      suggestions: [],
    };
    
    // Common patterns and their proper types
    this.typeReplacements = {
      // Event handlers
      'event: any': 'event: React.FormEvent<HTMLInputElement>',
      'e: any': 'e: React.FormEvent',
      'onScroll.*: any': 'event: NativeSyntheticEvent<NativeScrollEvent>',
      
      // Navigation
      'navigation: any': 'navigation: NavigationProp<ParamListBase>',
      'route: any': 'route: RouteProp<ParamListBase>',
      
      // Theme/Style objects
      'theme: any': 'theme: AppTheme',
      'style: any': 'style: StyleProp<ViewStyle>',
      'styles: any': 'styles: Record<string, ViewStyle | TextStyle | ImageStyle>',
      
      // Common props
      'props: any': 'props: ComponentProps',
      'children: any': 'children: React.ReactNode',
      
      // Data structures
      'data: any': 'data: unknown',
      'item: any': 'item: Record<string, unknown>',
      'value: any': 'value: unknown',
    };
  }

  /**
   * Detect any types in file content
   */
  detectAnyTypes(content, filePath) {
    const anyTypePatterns = [
      // Function parameters: (param: any)
      /(\w+)\s*:\s*any\b/g,
      // Variable declarations: const x: any
      /(?:const|let|var)\s+(\w+)\s*:\s*any\b/g,
      // Interface/type properties: prop: any
      /(\w+)\s*:\s*any(?:\s*[,;])/g,
      // Generic types: <any>
      /<any>/g,
    ];

    const findings = [];
    const lineNumber = 1;
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      anyTypePatterns.forEach(pattern => {
        const matches = line.match(pattern);
        if (matches) {
          findings.push({
            line: index + 1,
            content: line.trim(),
            matches: matches,
            filePath,
          });
        }
      });
    });

    return findings;
  }

  /**
   * Generate proper type suggestions based on context
   */
  generateTypeSuggestions(finding) {
    const { content, matches } = finding;
    const suggestions = [];

    // Event handler patterns
    if (content.includes('onScroll') || content.includes('onPress')) {
      suggestions.push({
        original: content,
        suggested: content.replace(/:\s*any/, ': NativeSyntheticEvent<any>'),
        reason: 'React Native event handler',
      });
    }

    // Navigation patterns
    if (content.includes('navigation') || content.includes('route')) {
      suggestions.push({
        original: content,
        suggested: content.replace(/:\s*any/, ': NavigationProp<any>'),
        reason: 'React Navigation prop',
      });
    }

    // Theme patterns
    if (content.includes('theme')) {
      suggestions.push({
        original: content,
        suggested: content.replace(/:\s*any/, ': AppTheme'),
        reason: 'App theme object',
      });
    }

    // Style patterns
    if (content.includes('style') || content.includes('Style')) {
      suggestions.push({
        original: content,
        suggested: content.replace(/:\s*any/, ': StyleProp<ViewStyle>'),
        reason: 'React Native style prop',
      });
    }

    // Generic fallback
    if (suggestions.length === 0) {
      suggestions.push({
        original: content,
        suggested: content.replace(/:\s*any/, ': unknown'),
        reason: 'Safe unknown type',
      });
    }

    return suggestions;
  }

  /**
   * Process a single file
   */
  async processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Skip files without 'any' types
      if (!content.includes(': any')) {
        return { modified: false, anyCount: 0 };
      }

      const findings = this.detectAnyTypes(content, filePath);
      if (findings.length === 0) {
        return { modified: false, anyCount: 0 };
      }

      // Generate suggestions for each finding
      findings.forEach(finding => {
        const suggestions = this.generateTypeSuggestions(finding);
        this.results.suggestions.push({
          filePath,
          line: finding.line,
          findings: suggestions,
        });
      });

      console.log(`🔍 ${filePath}: Found ${findings.length} any types`);
      
      return { modified: false, anyCount: findings.length };
    } catch (error) {
      console.error(`Error processing ${filePath}: ${error.message}`);
      return { modified: false, anyCount: 0 };
    }
  }

  /**
   * Create TypeScript interface definitions
   */
  generateInterfaceFile() {
    const interfaceContent = `// Generated TypeScript interfaces for replacing 'any' types
// Add these to your existing type definition files

import { ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { NavigationProp, RouteProp, ParamListBase } from '@react-navigation/native';
import { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

// Event handler types
export interface ScrollEventHandler {
  (event: NativeSyntheticEvent<NativeScrollEvent>): void;
}

export interface PressEventHandler {
  (event: GestureResponderEvent): void;
}

// Component prop types
export interface ComponentProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// Style utility types
export type StyleObject = Record<string, ViewStyle | TextStyle | ImageStyle>;

// Navigation types (extend your existing param lists)
export interface AppNavigationProp extends NavigationProp<ParamListBase> {}
export interface AppRouteProp extends RouteProp<ParamListBase> {}

// Generic data types
export interface DataItem {
  id: string | number;
  [key: string]: unknown;
}

export type ApiResponse<T = unknown> = {
  data: T;
  error?: string;
  success: boolean;
};
`;

    const outputPath = 'src/types/generated-interfaces.ts';
    fs.writeFileSync(outputPath, interfaceContent);
    console.log(`📝 Generated interface file: ${outputPath}`);
  }

  /**
   * Run analysis on all matching files
   */
  async run() {
    console.log('🔍 Starting any types analysis...\n');

    try {
      const files = await glob(SRC_PATTERN, { cwd: process.cwd() });
      
      for (const file of files) {
        this.results.filesProcessed++;
        const result = await this.processFile(file);
        
        this.results.anyTypesFound += result.anyCount;
        if (result.anyCount > 0) {
          this.results.filesModified++;
        }
      }

      this.generateInterfaceFile();
      this.printSummary();
    } catch (error) {
      console.error('❌ Error during analysis:', error.message);
      process.exit(1);
    }
  }

  /**
   * Print analysis summary with actionable suggestions
   */
  printSummary() {
    console.log('\n📊 Any Types Analysis Summary:');
    console.log(`   Files processed: ${this.results.filesProcessed}`);
    console.log(`   Files with any types: ${this.results.filesModified}`);
    console.log(`   Total any types found: ${this.results.anyTypesFound}`);
    
    if (this.results.suggestions.length > 0) {
      console.log('\n🔧 Suggested Fixes (Top 10):');
      
      // Group suggestions by file
      const fileGroups = {};
      this.results.suggestions.forEach(suggestion => {
        if (!fileGroups[suggestion.filePath]) {
          fileGroups[suggestion.filePath] = [];
        }
        fileGroups[suggestion.filePath].push(suggestion);
      });

      // Show top 10 most critical files
      Object.entries(fileGroups)
        .slice(0, 10)
        .forEach(([filePath, suggestions]) => {
          console.log(`\n   📄 ${filePath}:`);
          suggestions.slice(0, 3).forEach(suggestion => {
            suggestion.findings.forEach(finding => {
              console.log(`      Line ${suggestion.line}: ${finding.original}`);
              console.log(`      Suggested: ${finding.suggested}`);
              console.log(`      Reason: ${finding.reason}\n`);
            });
          });
        });

      console.log('\n💡 Next Steps:');
      console.log('   1. Review generated interfaces in src/types/generated-interfaces.ts');
      console.log('   2. Import and use appropriate types in your components');
      console.log('   3. Replace any types gradually, starting with event handlers');
      console.log('   4. Run TypeScript compiler to verify changes');
      console.log('   5. Consider using unknown instead of any for safety');
    } else {
      console.log('\n✅ No any types found - excellent type safety!');
    }
  }
}

// Run the analysis
if (require.main === module) {
  const fixer = new AnyTypeFixer();
  fixer.run().catch(console.error);
}

module.exports = AnyTypeFixer; 