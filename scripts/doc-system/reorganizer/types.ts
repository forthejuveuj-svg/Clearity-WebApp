/**
 * Type definitions for the File Reorganizer module
 */

export interface ReorganizationPlan {
  moves: FileMove[];
  splits: FileSplit[];
  merges: FileMerge[];
  deletions: FileDeletion[];
}

export interface FileMove {
  sourcePath: string;
  targetPath: string;
  reason: string;
  affectedImports: string[];
}

export interface FileSplit {
  sourcePath: string;
  targetFiles: TargetFile[];
  reason: string;
}

export interface TargetFile {
  path: string;
  content: string;
  entities: string[];
}

export interface FileMerge {
  sourcePaths: string[];
  targetPath: string;
  reason: string;
}

export interface FileDeletion {
  filePath: string;
  reason: string;
  impact: string;
}
