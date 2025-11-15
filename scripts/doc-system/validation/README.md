# Validation Engine

The Validation Engine ensures documentation completeness and accuracy by checking that all exported functions have proper documentation and that the documentation stays in sync with the code.

## Features

- **Project-wide Validation**: Validate all TypeScript/JavaScript files in your project
- **File-level Validation**: Validate individual files
- **Pre-commit Hooks**: Automatically validate documentation before commits
- **CI Integration**: Generate CI configurations for GitHub Actions, GitLab CI, and CircleCI
- **Documentation Drift Detection**: Detect when code changes but documentation doesn't
- **Configurable Rules**: Enable/disable validation rules based on your needs

## Validation Rules

### 1. Missing Documentation (Error)
Checks that every exported function has a corresponding documentation file.

**Example Error:**
```
Missing documentation for exported function 'calculateTotal'. 
Run 'npm run doc-system document' to generate documentation.
```

### 2. Outdated Signature (Error)
Checks that function signatures in code match the documentation.

**Example Error:**
```
Function signature for 'processData' does not match documentation. 
Expected parameters: data: string, options?: ProcessOptions, 
but documentation shows: data: string
```

### 3. Empty Purpose (Warning)
Checks that the Purpose section contains meaningful content, not placeholders.

**Example Warning:**
```
Documentation for 'formatDate' has an empty or placeholder Purpose section
```

### 4. Broken References (Warning)
Checks that all "Used In" references point to existing files.

**Example Warning:**
```
Documentation for 'validateInput' references non-existent file: src/utils/validator.ts
```

## Usage

### CLI Commands

#### Validate Project
```bash
# Validate all files
npm run doc-system validate

# Validate with strict mode (fail on warnings)
npm run doc-system validate --strict

# Output results in JSON format
npm run doc-system validate --json

# Specify custom paths
npm run doc-system validate --path ./src --docs ./docs
```

#### Install Pre-commit Hook
```bash
# Install the hook
npm run doc-system install

# Uninstall the hook
npm run doc-system install --uninstall
```

#### Generate CI Configuration
```bash
# Generate GitHub Actions workflow
npm run doc-system ci --platform github

# Generate GitLab CI configuration
npm run doc-system ci --platform gitlab

# Generate CircleCI configuration
npm run doc-system ci --platform circleci

# Specify custom output path
npm run doc-system ci --platform github --output .github/workflows/docs.yml
```

### Programmatic Usage

```typescript
import { ValidationEngine } from './validation/ValidationEngine.js';

// Create validator
const validator = new ValidationEngine('./src', './docs');

// Validate entire project
const result = await validator.validateProject();

if (!result.valid) {
  console.log(`Found ${result.errors.length} errors`);
  for (const error of result.errors) {
    console.log(`${error.filePath}: ${error.message}`);
  }
}

// Validate single file
const fileErrors = await validator.validateFile('./src/utils/helpers.ts');

// Detect documentation drift
const drifts = await validator.detectDocumentationDrift(
  './src/utils/helpers.ts',
  './docs/utils/helpers/calculateTotal.md'
);

// Install pre-commit hook
await validator.installPreCommitHook();

// Generate CI configuration
await validator.generateCIConfig('github');
```

## Pre-commit Hook

The pre-commit hook validates documentation for changed files before allowing a commit.

### Behavior

- **Blocks commits** when critical documentation is missing (errors)
- **Allows commits** with warnings but displays them
- **Provides instructions** for generating missing documentation
- **Can be bypassed** with `git commit --no-verify` (not recommended)

### Installation

```bash
npm run doc-system install
```

This creates a `.git/hooks/pre-commit` file that runs validation automatically.

### Example Output

```
🔍 Validating documentation...

❌ Documentation validation failed!

Please fix the following issues before committing:

  [missing_doc] src/utils/calculator.ts
    Missing documentation for exported function 'add'. 
    Run 'npm run doc-system document' to generate documentation.

To generate missing documentation, run:
  npm run doc-system document
```

## CI Integration

The Validation Engine can generate CI configuration files for popular CI platforms.

### GitHub Actions

```bash
npm run doc-system ci --platform github
```

Creates `.github/workflows/validate-docs.yml` that:
- Runs on push and pull requests
- Validates all documentation
- Generates coverage reports
- Uploads validation results as artifacts

### GitLab CI

```bash
npm run doc-system ci --platform gitlab
```

Creates `.gitlab-ci.yml` with a validation job that:
- Runs on main, develop, and merge requests
- Validates documentation
- Generates coverage reports
- Stores validation results as artifacts

### CircleCI

```bash
npm run doc-system ci --platform circleci
```

Creates `.circleci/config.yml` with a validation workflow that:
- Runs on main and develop branches
- Validates documentation
- Generates coverage reports
- Stores validation results as artifacts

## Validation Result Format

### JSON Output

```json
{
  "valid": false,
  "errors": [
    {
      "type": "missing_doc",
      "filePath": "src/utils/calculator.ts",
      "message": "Missing documentation for exported function 'add'",
      "severity": "error"
    }
  ],
  "warnings": [
    {
      "type": "empty_purpose",
      "filePath": "src/utils/formatter.ts",
      "message": "Documentation for 'formatDate' has an empty Purpose section",
      "severity": "warning"
    }
  ],
  "summary": {
    "totalFiles": 50,
    "validFiles": 45,
    "filesWithErrors": 3,
    "filesWithWarnings": 2,
    "errorCount": 5,
    "warningCount": 3
  }
}
```

## Documentation Drift Detection

Documentation drift occurs when code changes but documentation doesn't get updated.

### Drift Types

1. **signature**: Function signature has changed
2. **missing**: Source file exists but documentation is missing
3. **orphaned**: Documentation exists but source file is missing
4. **outdated**: Function not found in source file

### Example

```typescript
const drifts = await validator.detectDocumentationDrift(
  './src/utils/helpers.ts',
  './docs/utils/helpers/calculateTotal.md'
);

for (const drift of drifts) {
  console.log(`${drift.driftType}: ${drift.details}`);
}
```

## Configuration

Validation rules can be configured in `.docsystemrc.json`:

```json
{
  "validation": {
    "requirePurpose": true,
    "checkSignatures": true,
    "allowPlaceholders": false
  }
}
```

## Best Practices

1. **Install pre-commit hook** to catch issues early
2. **Enable CI validation** to prevent merging undocumented code
3. **Use strict mode** in CI to enforce high documentation standards
4. **Run validation regularly** during development
5. **Fix errors immediately** to prevent documentation debt
6. **Review warnings** and address them when possible

## Troubleshooting

### Hook not running
- Check that `.git/hooks/pre-commit` exists and is executable
- On Windows, ensure Git is configured to use hooks
- Try reinstalling: `npm run doc-system install`

### False positives
- Check that function names match between code and documentation
- Ensure documentation files are in the correct location
- Verify that the docs path is configured correctly

### CI failing unexpectedly
- Run validation locally first: `npm run doc-system validate`
- Check that all dependencies are installed in CI
- Ensure the docs directory is committed to the repository

## Related Modules

- **Code Analyzer**: Detects code quality issues
- **Documentation Generator**: Creates documentation files
- **Import Graph Builder**: Tracks function dependencies
