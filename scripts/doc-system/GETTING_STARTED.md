# Getting Started with the Documentation System

Welcome! This guide will help you understand and use the documentation system that was just implemented.

## What Is This?

This is an automated documentation and code organization system that:
- **Analyzes** your codebase to understand its structure
- **Reorganizes** files into logical folders based on their purpose
- **Generates** documentation automatically from your code
- **Maintains** documentation as your code changes

## Quick Start (3 Steps)

### 1. Analyze Your Code
First, see what the system found in your codebase:

```bash
npm run doc-system analyze
```

This creates `analysis-report.txt` showing all your components, hooks, utilities, etc.

### 2. Reorganize Your Files (Optional)
If your files are messy, let the system organize them:

```bash
npm run doc-system reorganize
```

This moves files into proper folders like `components/`, `hooks/`, `utils/`, etc.

### 3. Generate Documentation
Create beautiful documentation from your code:

```bash
npm run doc-system generate
```

This creates markdown files documenting your components and their relationships.

## Understanding the System

### 📚 Core Documentation

Start here to understand the big picture:

1. **[README.md](./README.md)** - Overview and basic usage
2. **[COMPREHENSIVE_README.md](./COMPREHENSIVE_README.md)** - Detailed features and configuration
3. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - How the system works internally
4. **[CLI.md](./CLI.md)** - All available commands

### 🎓 Step-by-Step Tutorials

Follow these in order to learn the system:

1. **[Analyzing Your Codebase](./tutorials/01-analyzing-codebase.md)** - Understanding what you have
2. **[Reorganizing Files](./tutorials/02-reorganizing-files.md)** - Cleaning up your structure
3. **[Generating Documentation](./tutorials/03-generating-documentation.md)** - Creating docs
4. **[Pre-commit Hooks](./tutorials/04-precommit-hooks.md)** - Auto-update docs on commit
5. **[CI/CD Integration](./tutorials/05-ci-cd-integration.md)** - Automate in your pipeline
6. **[RAG & AI Integration](./tutorials/06-rag-ai-integration.md)** - AI-powered code search

### 🔧 Feature Documentation

Deep dives into specific features:

- **[Code Analyzer](./analyzer/types.ts)** - How code analysis works
- **[Import Graph Builder](./graph/README.md)** - Understanding dependencies
- **[Documentation Generator](./generator/README.md)** - How docs are created
- **[File Reorganizer](./reorganizer/README.md)** - File organization logic
- **[Drift Detection](./drift/README.md)** - Keeping docs in sync
- **[AI Integration](./ai/README.md)** - RAG and embeddings
- **[Performance](./performance/README.md)** - Optimization features
- **[Monitoring](./monitoring/README.md)** - Logging and metrics

## Configuration

The system uses `.docsystemrc.json` in your project root. Here's a minimal config:

```json
{
  "srcDir": "src",
  "outputDir": "docs",
  "includePatterns": ["**/*.ts", "**/*.tsx"],
  "excludePatterns": ["**/*.test.ts", "node_modules/**"]
}
```

See **[COMPREHENSIVE_README.md](./COMPREHENSIVE_README.md)** for all configuration options.

## Common Tasks

### Fix My Code Structure
```bash
# 1. See current structure
npm run doc-system analyze

# 2. Preview changes (dry run)
npm run doc-system reorganize -- --dry-run

# 3. Apply changes
npm run doc-system reorganize
```

### Add Documentation to Components
```bash
# Generate docs for all components
npm run doc-system generate

# Generate docs for specific folder
npm run doc-system generate -- --path src/components
```

### Keep Docs Updated Automatically
```bash
# Set up pre-commit hook
npm run doc-system setup-hooks

# Now docs update automatically when you commit!
```

### Understand Dependencies
```bash
# Build import graph
npm run doc-system graph

# See what depends on a specific file
npm run doc-system graph -- --file src/components/Button.tsx
```

## Examples

Check the `examples/` folder for real output:
- **[analyzer-report.txt](./examples/analyzer-report.txt)** - Sample analysis report
- **[group-doc-example.md](./examples/group-doc-example.md)** - Sample generated documentation
- **[documentation-index.json](./examples/documentation-index.json)** - Documentation index format

## Need Help?

### I want to...

**...understand my current code structure**
→ Run `npm run doc-system analyze` and read the report

**...organize my messy files**
→ Follow [Tutorial 02: Reorganizing Files](./tutorials/02-reorganizing-files.md)

**...create documentation**
→ Follow [Tutorial 03: Generating Documentation](./tutorials/03-generating-documentation.md)

**...keep docs updated automatically**
→ Follow [Tutorial 04: Pre-commit Hooks](./tutorials/04-precommit-hooks.md)

**...understand how it works**
→ Read [ARCHITECTURE.md](./ARCHITECTURE.md)

**...configure advanced features**
→ Read [COMPREHENSIVE_README.md](./COMPREHENSIVE_README.md)

**...integrate with AI/RAG**
→ Follow [Tutorial 06: RAG & AI Integration](./tutorials/06-rag-ai-integration.md)

## Troubleshooting

### "Command not found"
Make sure you've installed dependencies:
```bash
npm install
```

### "No files found"
Check your `.docsystemrc.json` - make sure `srcDir` points to your source folder.

### "Permission denied"
On Unix systems, you may need to make the CLI executable:
```bash
chmod +x scripts/doc-system/cli.ts
```

## Next Steps

1. **Start with analysis**: Run `npm run doc-system analyze` to see what you have
2. **Read Tutorial 01**: [Analyzing Your Codebase](./tutorials/01-analyzing-codebase.md)
3. **Try reorganizing**: Follow [Tutorial 02](./tutorials/02-reorganizing-files.md) if needed
4. **Generate docs**: Follow [Tutorial 03](./tutorials/03-generating-documentation.md)
5. **Automate**: Set up hooks with [Tutorial 04](./tutorials/04-precommit-hooks.md)

## Questions?

- Check [COMPREHENSIVE_README.md](./COMPREHENSIVE_README.md) for detailed documentation
- Look at [examples/](./examples/) for sample outputs
- Read the [tutorials/](./tutorials/) for step-by-step guides
- Review [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the internals

---

**Ready to start?** Run `npm run doc-system analyze` and see what the system finds! 🚀
