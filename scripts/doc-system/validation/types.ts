/**
 * Type definitions for the Validation Engine module
 */

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: ValidationSummary;
}

export interface ValidationError {
  type: 'missing_doc' | 'outdated_doc' | 'invalid_format' | 'broken_reference' | 'empty_purpose';
  filePath: string;
  message: string;
  severity: 'error' | 'warning';
  line?: number;
}

export interface ValidationWarning {
  type: string;
  filePath: string;
  message: string;
  line?: number;
}

export interface ValidationSummary {
  totalFiles: number;
  validFiles: number;
  filesWithErrors: number;
  filesWithWarnings: number;
  errorCount: number;
  warningCount: number;
}

export interface ValidationRule {
  name: string;
  description: string;
  check: (context: ValidationContext) => Promise<ValidationError[]>;
  severity: 'error' | 'warning';
  enabled: boolean;
}

export interface ValidationContext {
  filePath: string;
  docPath?: string;
  sourceContent?: string;
  docContent?: string;
  rootPath: string;
}

export interface DocumentationDrift {
  filePath: string;
  docPath: string;
  driftType: 'signature' | 'missing' | 'orphaned' | 'outdated';
  details: string;
}
