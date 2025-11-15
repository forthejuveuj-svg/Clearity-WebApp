/**
 * Configuration interfaces and default configuration for the Documentation System
 */

export interface GroupingRule {
  name: string;
  pattern: RegExp;
  targetDirectory: string;
  priority: number;
}

export interface AnalyzerConfig {
  excludePatterns: string[];
  complexityThreshold: number;
  mixedLogicThreshold: number;
}

export interface ReorganizerConfig {
  dryRun: boolean;
  createBackup: boolean;
  groupingRules: GroupingRule[];
}

export interface DocumentationConfig {
  outputDir: string;
  templatesDir: string;
  preserveManual: boolean;
  generateIndex: boolean;
}

export interface ValidationConfig {
  requirePurpose: boolean;
  checkSignatures: boolean;
  allowPlaceholders: boolean;
}

export interface AIConfig {
  enableRAG: boolean;
  generateEmbeddings: boolean;
  embeddingModel: string;
}

export interface DocSystemConfig {
  analyzer: AnalyzerConfig;
  reorganizer: ReorganizerConfig;
  documentation: DocumentationConfig;
  validation: ValidationConfig;
  ai: AIConfig;
}

/**
 * Default grouping rules for organizing code files
 */
export const DEFAULT_GROUPING_RULES: GroupingRule[] = [
  {
    name: 'Supabase',
    pattern: /supabase|database|db/i,
    targetDirectory: 'lib/supabase',
    priority: 1,
  },
  {
    name: 'Search',
    pattern: /search|filter|query/i,
    targetDirectory: 'lib/search',
    priority: 2,
  },
  {
    name: 'Hooks',
    pattern: /^use[A-Z]/,
    targetDirectory: 'hooks',
    priority: 3,
  },
  {
    name: 'Services',
    pattern: /service|api|client/i,
    targetDirectory: 'services',
    priority: 4,
  },
  {
    name: 'Context',
    pattern: /context|provider/i,
    targetDirectory: 'contexts',
    priority: 5,
  },
  {
    name: 'UI',
    pattern: /component|ui/i,
    targetDirectory: 'components',
    priority: 6,
  },
  {
    name: 'Utils',
    pattern: /util|helper|common/i,
    targetDirectory: 'utils',
    priority: 7,
  },
];

/**
 * Default configuration for the Documentation System
 */
export const DEFAULT_CONFIG: DocSystemConfig = {
  analyzer: {
    excludePatterns: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
    ],
    complexityThreshold: 10,
    mixedLogicThreshold: 3,
  },
  reorganizer: {
    dryRun: true,
    createBackup: true,
    groupingRules: DEFAULT_GROUPING_RULES,
  },
  documentation: {
    outputDir: 'docs',
    templatesDir: 'scripts/doc-system/templates',
    preserveManual: true,
    generateIndex: true,
  },
  validation: {
    requirePurpose: true,
    checkSignatures: true,
    allowPlaceholders: false,
  },
  ai: {
    enableRAG: true,
    generateEmbeddings: false,
    embeddingModel: 'text-embedding-ada-002',
  },
};

/**
 * Merge user configuration with default configuration
 */
export function mergeConfig(
  userConfig: Partial<DocSystemConfig>
): DocSystemConfig {
  return {
    analyzer: {
      ...DEFAULT_CONFIG.analyzer,
      ...userConfig.analyzer,
    },
    reorganizer: {
      ...DEFAULT_CONFIG.reorganizer,
      ...userConfig.reorganizer,
      groupingRules:
        userConfig.reorganizer?.groupingRules ||
        DEFAULT_CONFIG.reorganizer.groupingRules,
    },
    documentation: {
      ...DEFAULT_CONFIG.documentation,
      ...userConfig.documentation,
    },
    validation: {
      ...DEFAULT_CONFIG.validation,
      ...userConfig.validation,
    },
    ai: {
      ...DEFAULT_CONFIG.ai,
      ...userConfig.ai,
    },
  };
}

/**
 * Validate configuration against schema
 */
export function validateConfig(config: Partial<DocSystemConfig>): string[] {
  const errors: string[] = [];
  
  // Validate analyzer config
  if (config.analyzer) {
    if (config.analyzer.complexityThreshold !== undefined && 
        (config.analyzer.complexityThreshold < 1 || config.analyzer.complexityThreshold > 100)) {
      errors.push('analyzer.complexityThreshold must be between 1 and 100');
    }
    if (config.analyzer.mixedLogicThreshold !== undefined && 
        (config.analyzer.mixedLogicThreshold < 1 || config.analyzer.mixedLogicThreshold > 20)) {
      errors.push('analyzer.mixedLogicThreshold must be between 1 and 20');
    }
  }
  
  // Validate reorganizer config
  if (config.reorganizer?.groupingRules) {
    config.reorganizer.groupingRules.forEach((rule, index) => {
      if (!rule.name || !rule.pattern || !rule.targetDirectory) {
        errors.push(`groupingRules[${index}] must have name, pattern, and targetDirectory`);
      }
      if (rule.priority !== undefined && (rule.priority < 1 || rule.priority > 100)) {
        errors.push(`groupingRules[${index}].priority must be between 1 and 100`);
      }
    });
  }
  
  // Validate documentation config
  if (config.documentation) {
    if (config.documentation.outputDir && config.documentation.outputDir.includes('..')) {
      errors.push('documentation.outputDir cannot contain ".."');
    }
  }
  
  return errors;
}

/**
 * Load configuration from file or use defaults
 * Supports .docsystemrc.json, .docsystemrc.js, and package.json config
 */
export async function loadConfig(
  configPath?: string
): Promise<DocSystemConfig> {
  try {
    // If explicit config path provided, load it directly
    if (configPath) {
      const { readFile } = await import('fs/promises');
      const path = await import('path');
      
      const fullPath = path.resolve(process.cwd(), configPath);
      const fileContent = await readFile(fullPath, 'utf-8');
      const userConfig = JSON.parse(fileContent);
      
      // Validate configuration
      const errors = validateConfig(userConfig);
      if (errors.length > 0) {
        console.error('❌ Configuration validation failed:');
        errors.forEach(error => console.error(`  - ${error}`));
        throw new Error('Invalid configuration');
      }
      
      return mergeConfig(userConfig);
    }
    
    // Otherwise, use cosmiconfig to search for config files
    const { cosmiconfig } = await import('cosmiconfig');
    const explorer = cosmiconfig('docsystem', {
      searchPlaces: [
        '.docsystemrc.json',
        '.docsystemrc.js',
        '.docsystemrc.cjs',
        'docsystem.config.js',
        'docsystem.config.cjs',
        'package.json',
      ],
    });
    
    const result = await explorer.search();
    
    if (result && result.config) {
      // Validate configuration
      const errors = validateConfig(result.config);
      if (errors.length > 0) {
        console.error('❌ Configuration validation failed:');
        errors.forEach(error => console.error(`  - ${error}`));
        throw new Error('Invalid configuration');
      }
      
      console.log(`📋 Loaded configuration from: ${result.filepath}`);
      return mergeConfig(result.config);
    }
    
    // No config found, use defaults
    console.log('📋 Using default configuration');
    return DEFAULT_CONFIG;
    
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.warn(`⚠️  Configuration file not found: ${configPath}`);
    } else if ((error as Error).message === 'Invalid configuration') {
      throw error;
    } else {
      console.error(`⚠️  Error loading configuration: ${error}`);
    }
    console.log('📋 Using default configuration');
    return DEFAULT_CONFIG;
  }
}
