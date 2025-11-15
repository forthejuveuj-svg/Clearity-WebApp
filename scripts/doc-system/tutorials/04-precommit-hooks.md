# Tutorial: Setting Up Pre-commit Hooks

This tutorial shows you how to set up Git pre-commit hooks to automatically validate documentation before each commit.

## Prerequisites

- Git repository
- Generated documentation
- Documentation system installed

## Overview

Pre-commit hooks:
- Run automatically before each commit
- Validate documentation completeness
- Check for outdated signatures
- Prevent commits with missing docs
- Provide clear error messages

## Step 1: Install the Pre-commit Hook

Run the installation command:

```bash
node scripts/doc-system/cli.js install-hook
```

**Expected output:**
```
Installing pre-commit hook...
✓ Created .git/hooks/pre-commit
✓ Made hook executable
✓ Hook installed successfully

The pre-commit hook will now validate documentation before each commit.
To bypass the hook, use: git commit --no-verify
```

## Step 2: Verify Installation

Check that the hook was created:

```bash
ls -la .git/hooks/pre-commit
```

Output:
```
-rwxr-xr-x  1 user  staff  1234 Jan 15 10:30 .git/hooks/pre-commit
```

View the hook content:

```bash
cat .git/hooks/pre-commit
```

## Step 3: Test the Hook

### Test 1: Commit with Complete Documentation

Create a new function with documentation:

```typescript
// src/utils/test.ts
export function testFunction(input: string): string {
  return input.toUpperCase();
}
```

Generate documentation:

```bash
node scripts/doc-system/cli.js document --incremental
```

Fill in the purpose:

```bash
# Edit docs/utils/test.md
# Add purpose description
```

Try to commit:

```bash
git add .
git commit -m "feat: add test function"
```

**Expected output:**
```
Running documentation validation...
✓ All documentation is complete and up-to-date
[main abc1234] feat: add test function
 2 files changed, 45 insertions(+)
```

### Test 2: Commit with Missing Documentation

Create a function without documentation:

```typescript
// src/utils/another.ts
export function anotherFunction(x: number): number {
  return x * 2;
}
```

Try to commit without generating docs:

```bash
git add .
git commit -m "feat: add another function"
```

**Expected output:**
```
Running documentation validation...

✗ Documentation validation failed!

Errors:
  1. Missing documentation for exported function: anotherFunction
     File: src/utils/another.ts
     Action: Run 'node scripts/doc-system/cli.js document --incremental'

Please fix the documentation issues and try again.
To bypass this check, use: git commit --no-verify
```

The commit is blocked!

### Test 3: Fix and Retry

Generate the missing documentation:

```bash
node scripts/doc-system/cli.js document --incremental
```

Fill in the purpose section, then commit:

```bash
git add .
git commit -m "feat: add another function"
```

Now it succeeds!

## Step 4: Configure Hook Behavior

Create a `.docsystemrc.json` to customize validation:

```json
{
  "validation": {
    "requirePurpose": true,
    "checkSignatures": true,
    "allowPlaceholders": false,
    "strictMode": false
  }
}
```

### Configuration Options

- `requirePurpose`: Require non-empty purpose sections (default: true)
- `checkSignatures`: Validate function signatures match code (default: true)
- `allowPlaceholders`: Allow TODO placeholders (default: false)
- `strictMode`: Fail on warnings, not just errors (default: false)

## Step 5: Handle Different Scenarios

### Scenario 1: Urgent Hotfix (Bypass Hook)

For urgent fixes, bypass the hook:

```bash
git commit --no-verify -m "hotfix: critical bug fix"
```

**Important:** Document the code after the hotfix!

### Scenario 2: Work in Progress (WIP Commits)

For WIP commits, you can:

**Option A:** Allow placeholders temporarily:
```json
{
  "validation": {
    "allowPlaceholders": true
  }
}
```

**Option B:** Use --no-verify for WIP:
```bash
git commit --no-verify -m "wip: work in progress"
```

**Option C:** Generate docs with placeholders:
```bash
node scripts/doc-system/cli.js document --incremental
git add .
git commit -m "wip: work in progress"
```

### Scenario 3: Refactoring Existing Code

When refactoring:

1. Make code changes
2. Update documentation:
   ```bash
   node scripts/doc-system/cli.js document --incremental
   ```
3. Validate:
   ```bash
   node scripts/doc-system/cli.js validate
   ```
4. Commit:
   ```bash
   git commit -m "refactor: improve function structure"
   ```

### Scenario 4: Deleting Functions

When deleting functions:

1. Delete the code
2. Delete the documentation:
   ```bash
   rm docs/path/to/function.md
   ```
3. Regenerate index:
   ```bash
   node scripts/doc-system/cli.js document --incremental
   ```
4. Commit:
   ```bash
   git commit -m "refactor: remove unused function"
   ```

## Step 6: Team Setup

### For Team Leads

1. Install the hook in the repository:
   ```bash
   node scripts/doc-system/cli.js install-hook
   ```

2. Commit the configuration:
   ```bash
   git add .docsystemrc.json
   git commit -m "chore: add documentation validation config"
   ```

3. Document the process in your README:
   ```markdown
   ## Development Setup
   
   After cloning, install the pre-commit hook:
   \`\`\`bash
   node scripts/doc-system/cli.js install-hook
   \`\`\`
   ```

### For Team Members

After cloning the repository:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install the pre-commit hook:
   ```bash
   node scripts/doc-system/cli.js install-hook
   ```

3. Verify it works:
   ```bash
   # Make a change and try to commit
   ```

## Step 7: Customize Hook Behavior

### Custom Validation Rules

Edit `.docsystemrc.json` to add custom rules:

```json
{
  "validation": {
    "requirePurpose": true,
    "checkSignatures": true,
    "allowPlaceholders": false,
    "strictMode": false,
    "customRules": [
      {
        "name": "require-examples",
        "check": "hasExamples",
        "severity": "warning",
        "message": "Consider adding usage examples"
      },
      {
        "name": "require-notes",
        "check": "hasNotes",
        "severity": "warning",
        "message": "Consider adding notes for complex functions"
      }
    ]
  }
}
```

### Exclude Certain Files

Exclude files from validation:

```json
{
  "validation": {
    "excludePatterns": [
      "**/*.test.ts",
      "**/*.spec.ts",
      "**/test-utils/**"
    ]
  }
}
```

### Validation Levels

Set different validation levels:

```json
{
  "validation": {
    "level": "strict"  // "strict", "normal", or "lenient"
  }
}
```

- **Strict**: Fail on any issues (errors + warnings)
- **Normal**: Fail on errors only (default)
- **Lenient**: Warn but don't block commits

## Step 8: Troubleshooting

### Issue: Hook doesn't run

**Cause:** Hook not executable or not in correct location

**Solution:**
```bash
chmod +x .git/hooks/pre-commit
ls -la .git/hooks/pre-commit
```

### Issue: Hook runs but doesn't validate

**Cause:** Node.js not in PATH or script error

**Solution:** Check the hook script:
```bash
cat .git/hooks/pre-commit
```

Ensure it has:
```bash
#!/bin/sh
node scripts/doc-system/cli.js validate --staged
```

### Issue: Hook blocks valid commits

**Cause:** Validation too strict or false positives

**Solution:** Adjust validation settings:
```json
{
  "validation": {
    "strictMode": false,
    "allowPlaceholders": true
  }
}
```

### Issue: Hook is too slow

**Cause:** Validating entire codebase

**Solution:** Validate only staged files:
```bash
# Edit .git/hooks/pre-commit
node scripts/doc-system/cli.js validate --staged --fast
```

### Issue: Team members bypass the hook

**Cause:** Hook not enforced or too restrictive

**Solution:**
1. Make validation reasonable (not too strict)
2. Document the importance
3. Use CI validation as backup (see Tutorial 05)
4. Review commits for --no-verify usage

## Advanced Usage

### Conditional Validation

Validate only certain file types:

```bash
#!/bin/sh
# .git/hooks/pre-commit

# Get list of staged TypeScript files
STAGED_TS_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep '\.ts$')

if [ -n "$STAGED_TS_FILES" ]; then
  echo "Validating documentation for TypeScript files..."
  node scripts/doc-system/cli.js validate --files "$STAGED_TS_FILES"
else
  echo "No TypeScript files to validate"
  exit 0
fi
```

### Auto-fix on Commit

Automatically generate missing docs:

```bash
#!/bin/sh
# .git/hooks/pre-commit

echo "Checking documentation..."
node scripts/doc-system/cli.js validate --staged

if [ $? -ne 0 ]; then
  echo "Generating missing documentation..."
  node scripts/doc-system/cli.js document --incremental --staged
  
  # Add generated docs to commit
  git add docs/
  
  echo "Documentation generated and added to commit"
fi
```

### Integration with Other Hooks

Combine with linting and formatting:

```bash
#!/bin/sh
# .git/hooks/pre-commit

# Run linter
echo "Running ESLint..."
npm run lint

# Run formatter
echo "Running Prettier..."
npm run format

# Validate documentation
echo "Validating documentation..."
node scripts/doc-system/cli.js validate --staged

# If any step fails, block commit
if [ $? -ne 0 ]; then
  echo "Pre-commit checks failed!"
  exit 1
fi
```

## Best Practices

1. **Keep validation fast**: Only check staged files
2. **Provide clear errors**: Show exactly what's wrong and how to fix
3. **Allow bypassing**: Use --no-verify for emergencies
4. **Document the process**: Explain to team members
5. **Use CI as backup**: Don't rely solely on pre-commit hooks
6. **Be reasonable**: Don't make validation too strict
7. **Auto-fix when possible**: Generate docs automatically

## Summary

You've learned how to:
- ✅ Install pre-commit hooks
- ✅ Test hook behavior
- ✅ Configure validation rules
- ✅ Handle different scenarios
- ✅ Set up for teams
- ✅ Troubleshoot issues
- ✅ Customize hook behavior

Next: [Tutorial 05: Integrating with CI/CD](./05-ci-cd-integration.md)
