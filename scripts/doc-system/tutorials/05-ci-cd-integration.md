# Tutorial: Integrating with CI/CD

This tutorial shows you how to integrate documentation validation into your CI/CD pipeline to ensure documentation stays up-to-date.

## Prerequisites

- CI/CD system (GitHub Actions, GitLab CI, CircleCI, etc.)
- Generated documentation
- Git repository

## Overview

CI integration:
- Validates documentation on every push/PR
- Fails builds if documentation is missing or outdated
- Generates documentation coverage reports
- Prevents merging code without docs

## GitHub Actions Integration

### Step 1: Create Workflow File

Create `.github/workflows/documentation.yml`:

```yaml
name: Documentation Validation

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  validate-docs:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build documentation system
        run: |
          cd scripts/doc-system
          npx tsc
          cd ../..
      
      - name: Validate documentation
        run: node scripts/doc-system/cli.js validate --strict
      
      - name: Check documentation coverage
        run: |
          COVERAGE=$(node scripts/doc-system/cli.js validate --coverage)
          echo "Documentation coverage: $COVERAGE%"
          if [ "$COVERAGE" -lt 90 ]; then
            echo "Documentation coverage is below 90%"
            exit 1
          fi
      
      - name: Generate coverage report
        if: always()
        run: node scripts/doc-system/cli.js validate --report coverage-report.json
      
      - name: Upload coverage report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: documentation-coverage
          path: coverage-report.json
```

### Step 2: Add PR Comment with Results

Create `.github/workflows/documentation-pr.yml`:

```yaml
name: Documentation PR Check

on:
  pull_request:
    branches: [ main, develop ]

jobs:
  check-docs:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      
      - name: Validate documentation
        id: validate
        run: |
          OUTPUT=$(node scripts/doc-system/cli.js validate --format json)
          echo "result=$OUTPUT" >> $GITHUB_OUTPUT
        continue-on-error: true
      
      - name: Comment PR
        uses: actions/github-script@v6
        with:
          script: |
            const result = ${{ steps.validate.outputs.result }};
            const body = `## Documentation Validation
            
            ${result.valid ? '✅ All documentation is up-to-date!' : '❌ Documentation issues found'}
            
            **Coverage:** ${result.coverage}%
            **Errors:** ${result.errors.length}
            **Warnings:** ${result.warnings.length}
            
            ${result.errors.length > 0 ? '### Errors\n' + result.errors.map(e => `- ${e.message}`).join('\n') : ''}
            ${result.warnings.length > 0 ? '### Warnings\n' + result.warnings.map(w => `- ${w.message}`).join('\n') : ''}
            `;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });
```

### Step 3: Add Status Check

Configure branch protection in GitHub:

1. Go to Settings → Branches
2. Add rule for `main` branch
3. Enable "Require status checks to pass"
4. Select "Documentation Validation"
5. Enable "Require branches to be up to date"

Now PRs can't be merged without passing documentation validation!

## GitLab CI Integration

### Step 1: Create Pipeline Configuration

Create `.gitlab-ci.yml`:

```yaml
stages:
  - validate
  - report

variables:
  NODE_VERSION: "18"

validate-documentation:
  stage: validate
  image: node:${NODE_VERSION}
  
  before_script:
    - npm ci
    - cd scripts/doc-system && npx tsc && cd ../..
  
  script:
    - node scripts/doc-system/cli.js validate --strict
  
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == "main"'
    - if: '$CI_COMMIT_BRANCH == "develop"'

documentation-coverage:
  stage: report
  image: node:${NODE_VERSION}
  
  before_script:
    - npm ci
  
  script:
    - node scripts/doc-system/cli.js validate --coverage > coverage.txt
    - cat coverage.txt
  
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage.txt
  
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
```

### Step 2: Add Merge Request Widget

Create a custom widget showing documentation status:

```yaml
documentation-widget:
  stage: report
  image: node:${NODE_VERSION}
  
  script:
    - |
      RESULT=$(node scripts/doc-system/cli.js validate --format json)
      echo "$RESULT" > documentation-status.json
  
  artifacts:
    reports:
      metrics: documentation-status.json
```

## CircleCI Integration

### Step 1: Create Configuration

Create `.circleci/config.yml`:

```yaml
version: 2.1

orbs:
  node: circleci/node@5.0

jobs:
  validate-documentation:
    docker:
      - image: cimg/node:18.0
    
    steps:
      - checkout
      
      - node/install-packages:
          pkg-manager: npm
      
      - run:
          name: Build documentation system
          command: |
            cd scripts/doc-system
            npx tsc
            cd ../..
      
      - run:
          name: Validate documentation
          command: node scripts/doc-system/cli.js validate --strict
      
      - run:
          name: Generate coverage report
          command: node scripts/doc-system/cli.js validate --report coverage.json
          when: always
      
      - store_artifacts:
          path: coverage.json
          destination: documentation-coverage

workflows:
  version: 2
  validate:
    jobs:
      - validate-documentation:
          filters:
            branches:
              only:
                - main
                - develop
```

## Jenkins Integration

### Step 1: Create Jenkinsfile

Create `Jenkinsfile`:

```groovy
pipeline {
    agent any
    
    tools {
        nodejs 'NodeJS 18'
    }
    
    stages {
        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }
        
        stage('Build Documentation System') {
            steps {
                sh '''
                    cd scripts/doc-system
                    npx tsc
                    cd ../..
                '''
            }
        }
        
        stage('Validate Documentation') {
            steps {
                sh 'node scripts/doc-system/cli.js validate --strict'
            }
        }
        
        stage('Generate Coverage Report') {
            steps {
                sh 'node scripts/doc-system/cli.js validate --report coverage.json'
            }
            post {
                always {
                    archiveArtifacts artifacts: 'coverage.json', fingerprint: true
                }
            }
        }
    }
    
    post {
        failure {
            emailext (
                subject: "Documentation Validation Failed: ${env.JOB_NAME} - ${env.BUILD_NUMBER}",
                body: "Documentation validation failed. Please check the build logs.",
                to: "${env.CHANGE_AUTHOR_EMAIL}"
            )
        }
    }
}
```

## Advanced CI Features

### Auto-generate Documentation on CI

Automatically generate missing documentation:

```yaml
# GitHub Actions
- name: Generate missing documentation
  run: |
    node scripts/doc-system/cli.js document --incremental
    
    if [ -n "$(git status --porcelain)" ]; then
      echo "Documentation was generated"
      git config user.name "Documentation Bot"
      git config user.email "bot@example.com"
      git add docs/
      git commit -m "docs: auto-generate missing documentation [skip ci]"
      git push
    fi
```

### Documentation Drift Detection

Detect when documentation is outdated:

```yaml
- name: Check for documentation drift
  run: |
    DRIFT=$(node scripts/doc-system/cli.js validate --check-drift)
    if [ "$DRIFT" != "0" ]; then
      echo "::warning::$DRIFT files have outdated documentation"
    fi
```

### Coverage Trending

Track documentation coverage over time:

```yaml
- name: Track coverage trend
  run: |
    COVERAGE=$(node scripts/doc-system/cli.js validate --coverage)
    echo "coverage=$COVERAGE" >> $GITHUB_ENV
    
    # Store in database or metrics system
    curl -X POST https://metrics.example.com/api/coverage \
      -d "project=myapp&coverage=$COVERAGE&commit=$GITHUB_SHA"
```

### Parallel Validation

Speed up validation by running in parallel:

```yaml
jobs:
  validate-services:
    runs-on: ubuntu-latest
    steps:
      - run: node scripts/doc-system/cli.js validate --root ./src/services
  
  validate-components:
    runs-on: ubuntu-latest
    steps:
      - run: node scripts/doc-system/cli.js validate --root ./src/components
  
  validate-utils:
    runs-on: ubuntu-latest
    steps:
      - run: node scripts/doc-system/cli.js validate --root ./src/utils
```

## Notifications and Reporting

### Slack Notifications

Send validation results to Slack:

```yaml
- name: Notify Slack
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: |
      Documentation validation failed!
      Branch: ${{ github.ref }}
      Author: ${{ github.actor }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Email Reports

Send detailed reports via email:

```yaml
- name: Generate detailed report
  if: always()
  run: node scripts/doc-system/cli.js validate --report report.html --format html

- name: Send email report
  if: always()
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: smtp.gmail.com
    server_port: 465
    username: ${{ secrets.EMAIL_USERNAME }}
    password: ${{ secrets.EMAIL_PASSWORD }}
    subject: Documentation Validation Report
    body: See attached report
    to: team@example.com
    from: ci@example.com
    attachments: report.html
```

### Dashboard Integration

Push metrics to a dashboard:

```yaml
- name: Push to dashboard
  run: |
    RESULT=$(node scripts/doc-system/cli.js validate --format json)
    curl -X POST https://dashboard.example.com/api/metrics \
      -H "Content-Type: application/json" \
      -d "$RESULT"
```

## Best Practices

1. **Fail fast**: Validate documentation early in the pipeline
2. **Provide context**: Show what's wrong and how to fix it
3. **Track trends**: Monitor coverage over time
4. **Automate fixes**: Generate docs automatically when possible
5. **Notify team**: Alert on failures
6. **Cache dependencies**: Speed up builds
7. **Run in parallel**: Validate different parts concurrently

## Troubleshooting

### Issue: CI is too slow

**Solution:** Cache dependencies and build artifacts:

```yaml
- uses: actions/cache@v3
  with:
    path: |
      node_modules
      scripts/doc-system/dist
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

### Issue: False positives in CI

**Solution:** Use same validation config as local:

```yaml
- name: Copy validation config
  run: cp .docsystemrc.json scripts/doc-system/
```

### Issue: CI passes but local fails

**Solution:** Ensure same Node.js version:

```yaml
- uses: actions/setup-node@v3
  with:
    node-version-file: '.nvmrc'
```

### Issue: Documentation bot creates infinite loops

**Solution:** Skip CI on bot commits:

```yaml
- name: Check if bot commit
  run: |
    if [[ "${{ github.event.head_commit.message }}" == *"[skip ci]"* ]]; then
      echo "Skipping CI for bot commit"
      exit 0
    fi
```

## Summary

You've learned how to:
- ✅ Integrate with GitHub Actions
- ✅ Integrate with GitLab CI
- ✅ Integrate with CircleCI and Jenkins
- ✅ Add advanced CI features
- ✅ Set up notifications and reporting
- ✅ Follow best practices

Next: [Tutorial 06: Using RAG Exports with AI Tools](./06-rag-ai-integration.md)
