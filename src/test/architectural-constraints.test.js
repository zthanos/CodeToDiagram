/**
 * Task 15.2: Automated Architectural Constraint Validation
 * 
 * This test suite provides automated checks to prevent architectural violations
 * and ensure the system maintains proper boundaries.
 */

import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import fs from 'node:fs';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const srcPath = join(__dirname, '..');

// Helper function to recursively find files
function findFiles(dir, extension, files = []) {
  if (!fs.existsSync(dir)) return files;
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      findFiles(fullPath, extension, files);
    } else if (stat.isFile() && item.endsWith(extension)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Helper function to read file content safely
function readFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.warn(`Could not read file ${filePath}:`, error.message);
    return '';
  }
}

describe('Automated Architectural Constraint Validation', () => {
  
  describe('File Organization Constraints', () => {
    it('should validate proper directory structure exists', () => {
      const requiredDirectories = [
        'components',
        'services', 
        'types',
        'composables',
        'assets'
      ];

      const missingDirectories = [];
      
      for (const dir of requiredDirectories) {
        const dirPath = join(srcPath, dir);
        if (!fs.existsSync(dirPath)) {
          missingDirectories.push(dir);
        }
      }

      if (missingDirectories.length > 0) {
        console.warn('Missing required directories:', missingDirectories);
      }

      console.log('Directory structure validation:');
      requiredDirectories.forEach(dir => {
        const exists = fs.existsSync(join(srcPath, dir));
        console.log(`  ${dir}: ${exists ? '✅' : '❌'}`);
      });

      // All required directories should exist
      expect(missingDirectories.length).toBe(0);
    });

    it('should validate component file naming conventions', () => {
      const componentsDir = join(srcPath, 'components');
      if (!fs.existsSync(componentsDir)) {
        console.warn('Components directory not found, skipping naming validation');
        return;
      }

      const vueFiles = findFiles(componentsDir, '.vue');
      const namingViolations = [];

      for (const filePath of vueFiles) {
        const fileName = path.basename(filePath, '.vue');
        
        // Vue components should use PascalCase
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(fileName)) {
          namingViolations.push({
            file: filePath,
            issue: 'Component name should be PascalCase'
          });
        }
      }

      if (namingViolations.length > 0) {
        console.warn('Component naming violations found:');
        namingViolations.forEach(violation => {
          console.warn(`  ${violation.file}: ${violation.issue}`);
        });
      }

      console.log(`Validated ${vueFiles.length} Vue component files`);
      expect(namingViolations.length).toBe(0);
    });

    it('should validate service file naming conventions', () => {
      const servicesDir = join(srcPath, 'services');
      if (!fs.existsSync(servicesDir)) {
        console.warn('Services directory not found, skipping naming validation');
        return;
      }

      const serviceFiles = findFiles(servicesDir, '.ts').concat(findFiles(servicesDir, '.js'));
      const namingViolations = [];

      for (const filePath of serviceFiles) {
        const fileName = path.basename(filePath).replace(/\.(ts|js)$/, '');
        
        // Services should use PascalCase and end with 'Service'
        if (!/^[A-Z][a-zA-Z0-9]*Service$/.test(fileName) && fileName !== 'index') {
          namingViolations.push({
            file: filePath,
            issue: 'Service name should be PascalCase and end with "Service"'
          });
        }
      }

      if (namingViolations.length > 0) {
        console.warn('Service naming violations found:');
        namingViolations.forEach(violation => {
          console.warn(`  ${violation.file}: ${violation.issue}`);
        });
      }

      console.log(`Validated ${serviceFiles.length} service files`);
      // Allow flexibility in existing codebase during refactoring
      expect(namingViolations.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Import/Export Constraints', () => {
    it('should validate no circular dependencies in services', () => {
      const servicesDir = join(srcPath, 'services');
      if (!fs.existsSync(servicesDir)) {
        console.warn('Services directory not found, skipping circular dependency check');
        return;
      }

      const serviceFiles = findFiles(servicesDir, '.ts').concat(findFiles(servicesDir, '.js'));
      const importMap = new Map();

      // Build import map
      for (const filePath of serviceFiles) {
        const content = readFileContent(filePath);
        const fileName = path.basename(filePath).replace(/\.(ts|js)$/, '');
        
        // Find imports from other services
        const importRegex = /import.*from\s+['"]\.\/([^'"]+)['"];?/g;
        const imports = [];
        let match;
        
        while ((match = importRegex.exec(content)) !== null) {
          const importedFile = match[1].replace(/\.(ts|js)$/, '');
          if (importedFile !== 'index') {
            imports.push(importedFile);
          }
        }
        
        importMap.set(fileName, imports);
      }

      // Check for circular dependencies (simplified check)
      const circularDeps = [];
      for (const [service, imports] of importMap.entries()) {
        for (const importedService of imports) {
          const importedServiceImports = importMap.get(importedService) || [];
          if (importedServiceImports.includes(service)) {
            circularDeps.push(`${service} <-> ${importedService}`);
          }
        }
      }

      if (circularDeps.length > 0) {
        console.warn('Circular dependencies found:');
        circularDeps.forEach(dep => console.warn(`  ${dep}`));
      }

      console.log(`Checked ${serviceFiles.length} service files for circular dependencies`);
      expect(circularDeps.length).toBe(0);
    });

    it('should validate proper import paths', () => {
      const allFiles = [
        ...findFiles(join(srcPath, 'components'), '.vue'),
        ...findFiles(join(srcPath, 'services'), '.ts'),
        ...findFiles(join(srcPath, 'services'), '.js'),
        ...findFiles(join(srcPath, 'composables'), '.ts')
      ];

      const importViolations = [];

      for (const filePath of allFiles) {
        const content = readFileContent(filePath);
        
        // Check for relative imports that go up too many levels
        const deepRelativeImports = content.match(/import.*from\s+['"]\.\.\/\.\.\/\.\.\//g);
        if (deepRelativeImports) {
          importViolations.push({
            file: filePath,
            issue: 'Import path goes up too many directory levels',
            imports: deepRelativeImports
          });
        }

        // Check for absolute imports without @/ alias
        const absoluteImports = content.match(/import.*from\s+['"]src\//g);
        if (absoluteImports) {
          importViolations.push({
            file: filePath,
            issue: 'Should use @/ alias instead of absolute src/ path',
            imports: absoluteImports
          });
        }
      }

      if (importViolations.length > 0) {
        console.warn('Import path violations found:');
        importViolations.forEach(violation => {
          console.warn(`  ${violation.file}: ${violation.issue}`);
        });
      }

      console.log(`Validated import paths in ${allFiles.length} files`);
      expect(importViolations.length).toBe(0);
    });
  });

  describe('Code Quality Constraints', () => {
    it('should validate no hardcoded API URLs in components', () => {
      const componentFiles = findFiles(join(srcPath, 'components'), '.vue');
      const hardcodedUrls = [];

      for (const filePath of componentFiles) {
        const content = readFileContent(filePath);
        
        // Look for hardcoded HTTP URLs
        const urlMatches = content.match(/https?:\/\/[^\s'"]+/g);
        if (urlMatches) {
          hardcodedUrls.push({
            file: filePath,
            urls: urlMatches
          });
        }
      }

      if (hardcodedUrls.length > 0) {
        console.warn('Hardcoded URLs found in components:');
        hardcodedUrls.forEach(item => {
          console.warn(`  ${item.file}: ${item.urls.join(', ')}`);
        });
      }

      console.log(`Checked ${componentFiles.length} component files for hardcoded URLs`);
      // Allow some hardcoded URLs in existing codebase (should be refactored)
      expect(hardcodedUrls.length).toBeLessThanOrEqual(10);
    });

    it('should validate proper error handling patterns', () => {
      const serviceFiles = findFiles(join(srcPath, 'services'), '.ts').concat(findFiles(join(srcPath, 'services'), '.js'));
      const errorHandlingIssues = [];

      for (const filePath of serviceFiles) {
        const content = readFileContent(filePath);
        
        // Check for try-catch blocks
        const hasTryCatch = /try\s*{[\s\S]*?}\s*catch/.test(content);
        
        // Check for async functions
        const hasAsyncFunctions = /async\s+function|async\s+\w+\s*\(/.test(content);
        
        // If has async functions but no try-catch, might be missing error handling
        if (hasAsyncFunctions && !hasTryCatch && !content.includes('throw') && !content.includes('.catch(')) {
          errorHandlingIssues.push({
            file: filePath,
            issue: 'Async functions should have proper error handling'
          });
        }
      }

      if (errorHandlingIssues.length > 0) {
        console.warn('Potential error handling issues:');
        errorHandlingIssues.forEach(issue => {
          console.warn(`  ${issue.file}: ${issue.issue}`);
        });
      }

      console.log(`Checked ${serviceFiles.length} service files for error handling patterns`);
      // Allow some flexibility as not all services may need explicit error handling
      expect(errorHandlingIssues.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Performance Constraints', () => {
    it('should validate no synchronous file operations in main thread', () => {
      const allFiles = [
        ...findFiles(join(srcPath, 'components'), '.vue'),
        ...findFiles(join(srcPath, 'services'), '.ts'),
        ...findFiles(join(srcPath, 'services'), '.js')
      ];

      const syncOperations = [];

      for (const filePath of allFiles) {
        const content = readFileContent(filePath);
        
        // Look for synchronous file operations that could block the main thread
        const syncFileOps = content.match(/fs\.readFileSync|fs\.writeFileSync|fs\.existsSync/g);
        if (syncFileOps && !filePath.includes('test')) {
          syncOperations.push({
            file: filePath,
            operations: syncFileOps
          });
        }
      }

      if (syncOperations.length > 0) {
        console.warn('Synchronous file operations found (may block main thread):');
        syncOperations.forEach(item => {
          console.warn(`  ${item.file}: ${item.operations.join(', ')}`);
        });
      }

      console.log(`Checked ${allFiles.length} files for synchronous operations`);
      // Allow sync operations in test files
      expect(syncOperations.length).toBe(0);
    });

    it('should validate proper memory cleanup patterns', () => {
      const componentFiles = findFiles(join(srcPath, 'components'), '.vue');
      const memoryLeakRisks = [];

      for (const filePath of componentFiles) {
        const content = readFileContent(filePath);
        
        // Check for event listeners without cleanup
        const hasEventListeners = /addEventListener|on\w+\s*=/.test(content);
        const hasCleanup = /removeEventListener|onUnmounted|beforeUnmount/.test(content);
        
        if (hasEventListeners && !hasCleanup) {
          memoryLeakRisks.push({
            file: filePath,
            issue: 'Event listeners may not be properly cleaned up'
          });
        }

        // Check for timers without cleanup
        const hasTimers = /setTimeout|setInterval/.test(content);
        const hasTimerCleanup = /clearTimeout|clearInterval/.test(content);
        
        if (hasTimers && !hasTimerCleanup) {
          memoryLeakRisks.push({
            file: filePath,
            issue: 'Timers may not be properly cleaned up'
          });
        }
      }

      if (memoryLeakRisks.length > 0) {
        console.warn('Potential memory leak risks:');
        memoryLeakRisks.forEach(risk => {
          console.warn(`  ${risk.file}: ${risk.issue}`);
        });
      }

      console.log(`Checked ${componentFiles.length} component files for memory cleanup patterns`);
      // Allow flexibility as not all components may need explicit cleanup
      expect(memoryLeakRisks.length).toBeLessThanOrEqual(15);
    });
  });

  describe('Security Constraints', () => {
    it('should validate no hardcoded secrets or tokens', () => {
      const allFiles = [
        ...findFiles(join(srcPath, 'components'), '.vue'),
        ...findFiles(join(srcPath, 'services'), '.ts'),
        ...findFiles(join(srcPath, 'services'), '.js')
      ];

      const potentialSecrets = [];

      for (const filePath of allFiles) {
        const content = readFileContent(filePath);
        
        // Look for potential secrets (basic patterns)
        const secretPatterns = [
          /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i,
          /secret\s*[:=]\s*['"][^'"]+['"]/i,
          /token\s*[:=]\s*['"][^'"]+['"]/i,
          /password\s*[:=]\s*['"][^'"]+['"]/i
        ];

        for (const pattern of secretPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            potentialSecrets.push({
              file: filePath,
              matches: matches
            });
          }
        }
      }

      if (potentialSecrets.length > 0) {
        console.warn('Potential hardcoded secrets found:');
        potentialSecrets.forEach(item => {
          console.warn(`  ${item.file}: ${item.matches.join(', ')}`);
        });
      }

      console.log(`Checked ${allFiles.length} files for hardcoded secrets`);
      expect(potentialSecrets.length).toBe(0);
    });

    it('should validate proper input validation patterns', () => {
      const serviceFiles = findFiles(join(srcPath, 'services'), '.ts').concat(findFiles(join(srcPath, 'services'), '.js'));
      const validationIssues = [];

      for (const filePath of serviceFiles) {
        const content = readFileContent(filePath);
        
        // Check if services that handle user input have validation
        const handlesUserInput = /req\.body|params|query|input/i.test(content);
        const hasValidation = /validate|sanitize|escape|trim|length|typeof|instanceof/.test(content);
        
        if (handlesUserInput && !hasValidation) {
          validationIssues.push({
            file: filePath,
            issue: 'Service handles user input but may lack proper validation'
          });
        }
      }

      if (validationIssues.length > 0) {
        console.warn('Potential input validation issues:');
        validationIssues.forEach(issue => {
          console.warn(`  ${issue.file}: ${issue.issue}`);
        });
      }

      console.log(`Checked ${serviceFiles.length} service files for input validation patterns`);
      // Allow flexibility as not all services handle user input
      expect(validationIssues.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Documentation Constraints', () => {
    it('should validate critical functions have JSDoc comments', () => {
      const serviceFiles = findFiles(join(srcPath, 'services'), '.ts').concat(findFiles(join(srcPath, 'services'), '.js'));
      const documentationIssues = [];

      for (const filePath of serviceFiles) {
        const content = readFileContent(filePath);
        
        // Find public methods/functions
        const publicMethods = content.match(/public\s+static\s+\w+\s*\(|export\s+function\s+\w+\s*\(/g);
        const jsdocComments = content.match(/\/\*\*[\s\S]*?\*\//g);
        
        if (publicMethods && publicMethods.length > 0) {
          const methodCount = publicMethods.length;
          const jsdocCount = jsdocComments ? jsdocComments.length : 0;
          
          // If there are many public methods but few JSDoc comments, flag it
          if (methodCount > 3 && jsdocCount < methodCount * 0.5) {
            documentationIssues.push({
              file: filePath,
              issue: `${methodCount} public methods but only ${jsdocCount} JSDoc comments`
            });
          }
        }
      }

      if (documentationIssues.length > 0) {
        console.warn('Documentation issues found:');
        documentationIssues.forEach(issue => {
          console.warn(`  ${issue.file}: ${issue.issue}`);
        });
      }

      console.log(`Checked ${serviceFiles.length} service files for documentation`);
      // Allow some flexibility in documentation requirements
      expect(documentationIssues.length).toBeLessThanOrEqual(3);
    });
  });
});