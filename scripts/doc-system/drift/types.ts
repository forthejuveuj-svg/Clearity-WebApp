/**
 * Type definitions for the Documentation Drift Prevention module
 */

export interface FileChange {
  filePath: string;
  changeType: 'added' | 'modified' | 'deleted' | 'renamed';
  oldPath?: string; // For renamed files
  timestamp: Date;
}

export interface AffectedDocumentation {
  docPath: string;
  reason: string;
  changeType: 'update_required' | 'delete_required' | 'create_required';
  affectedSections: string[];
}

export interface ChangeDetectionResult {
  changes: FileChange[];
  affectedDocs: AffectedDocumentation[];
  summary: {
    totalChanges: number;
    docsToUpdate: number;
    docsToCreate: number;
    docsToDelete: number;
  };
}

export interface WatcherConfig {
  rootPath: string;
  docsPath: string;
  ignorePatterns: string[];
  debounceMs: number;
}

export interface DriftReport {
  generatedAt: string;
  drifts: DriftItem[];
  summary: DriftSummary;
}

export interface DriftItem {
  filePath: string;
  docPath: string;
  driftType: 'signature' | 'missing' | 'orphaned' | 'outdated' | 'renamed';
  severity: 'critical' | 'warning' | 'info';
  details: string;
  suggestedAction: string;
}

export interface DriftSummary {
  totalDrifts: number;
  criticalDrifts: number;
  warningDrifts: number;
  infoDrifts: number;
  filesAffected: number;
}

export interface AutoUpdateResult {
  filePath: string;
  docPath: string;
  updateType: 'signature' | 'rename' | 'delete' | 'create';
  success: boolean;
  error?: string;
  preservedContent?: string[];
}
