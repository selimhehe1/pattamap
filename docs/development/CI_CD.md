# CI/CD Documentation

## Overview

PattaMap uses GitHub Actions for Continuous Integration and Continuous Deployment (CI/CD). Every push and pull request triggers automated tests, linting, and coverage reports.

## Table of Contents

- [Workflow Overview](#workflow-overview)
- [Triggered Events](#triggered-events)
- [Jobs](#jobs)
- [Coverage Reports](#coverage-reports)
- [Status Badges](#status-badges)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

---

## Workflow Overview

Our CI/CD pipeline consists of **4 parallel jobs** that run automatically:

1. **Backend Tests** - Run all backend tests with coverage
2. **Frontend Tests** - Run all frontend tests with coverage
3. **Lint** - Check code quality with ESLint
4. **Type Check** - Verify TypeScript compilation

**Workflow File**: `.github/workflows/test.yml`

---

## Triggered Events

### Automatic Triggers

```yaml
on:
  push:
    branches: [master, main]
  pull_request:
    branches: [master, main]
```

- **Push to `master` or `main`**: Full CI/CD pipeline runs
- **Pull Request**: All checks must pass before merging
- **Manual Trigger**: Can be run manually from GitHub Actions tab

---

## Jobs

### 1. Backend Tests

**Purpose**: Ensure all backend tests pass and meet coverage thresholds

```yaml
backend-tests:
  runs-on: ubuntu-latest
  steps:
    - Checkout code
    - Setup Node.js 18.x
    - Install dependencies (npm ci)
    - Run tests with coverage
    - Upload coverage to Codecov
```

**Commands**:
```bash
npm ci                                    # Install dependencies
npm test -- --ci --coverage --maxWorkers=2  # Run tests
```

**Coverage Thresholds**:
- Global: 70% statements, 65% branches, 70% functions
- Services: 80-90% depending on criticality

**Artifacts**:
- Coverage reports uploaded to Codecov
- Test summary in GitHub Actions UI

---

### 2. Frontend Tests

**Purpose**: Run React component tests and ensure UI reliability

```yaml
frontend-tests:
  runs-on: ubuntu-latest
  steps:
    - Checkout code
    - Setup Node.js 18.x
    - Install dependencies (npm ci)
    - Run tests with coverage
    - Upload coverage to Codecov
```

**Commands**:
```bash
npm ci
npm test -- --ci --coverage --maxWorkers=2
```

**Environment**:
- `CI=true` - Runs in CI mode (no watch mode)

---

### 3. Lint

**Purpose**: Enforce code quality standards with ESLint

```yaml
lint:
  runs-on: ubuntu-latest
  steps:
    - Checkout code
    - Setup Node.js 18.x
    - Install backend dependencies
    - Run ESLint
```

**Commands**:
```bash
npm run lint --if-present
```

**What It Checks**:
- Code style violations
- Unused variables
- TypeScript best practices
- Import/export errors

---

### 4. Type Check

**Purpose**: Verify TypeScript compilation without emitting files

```yaml
type-check:
  runs-on: ubuntu-latest
  steps:
    - Checkout code
    - Setup Node.js 18.x
    - Install backend dependencies
    - Run TypeScript compiler
```

**Commands**:
```bash
npx tsc --noEmit
```

**What It Checks**:
- Type errors
- Missing type definitions
- Incorrect type usage
- Module resolution issues

---

## Coverage Reports

### Codecov Integration

Coverage reports are automatically uploaded to [Codecov](https://codecov.io) after each test run.

**Setup**:
1. Add `CODECOV_TOKEN` to GitHub repository secrets
2. Coverage uploads happen in `backend-tests` and `frontend-tests` jobs

**Viewing Reports**:
- Go to Codecov dashboard
- View coverage trends over time
- See line-by-line coverage for each file
- Track coverage changes in PRs

### Local Coverage

Run coverage locally:

```bash
# Backend coverage
cd backend
npm test -- --coverage

# View HTML report
open coverage/index.html

# Frontend coverage
npm test -- --coverage
open coverage/index.html
```

---

## Status Badges

Add status badges to README.md:

### Tests Badge
```markdown
[![Tests](https://github.com/your-org/pattaya-directory/actions/workflows/test.yml/badge.svg)](https://github.com/your-org/pattaya-directory/actions/workflows/test.yml)
```

### Coverage Badge
```markdown
[![codecov](https://codecov.io/gh/your-org/pattaya-directory/branch/master/graph/badge.svg)](https://codecov.io/gh/your-org/pattaya-directory)
```

---

## Configuration

### Node.js Version

Currently using **Node.js 18.x**:

```yaml
strategy:
  matrix:
    node-version: [18.x]
```

To support multiple versions:
```yaml
strategy:
  matrix:
    node-version: [16.x, 18.x, 20.x]
```

### NPM Caching

NPM packages are cached to speed up builds:

```yaml
- uses: actions/setup-node@v4
  with:
    cache: 'npm'
    cache-dependency-path: backend/package-lock.json
```

**Benefits**:
- Faster build times (30-60 seconds faster)
- Reduced GitHub Actions minutes usage

### Environment Variables

**Required Secrets** (add in GitHub repository settings):
- `CODECOV_TOKEN` - For coverage uploads (optional but recommended)

**No secrets needed for**:
- Running tests
- Linting
- Type checking

---

## Troubleshooting

### Tests Failing in CI but Passing Locally

**Common Causes**:
1. **Environment differences**: CI runs in clean Ubuntu environment
2. **Timing issues**: Use `jest.setTimeout()` for slow tests
3. **Missing dependencies**: Check `package-lock.json` is committed

**Solution**:
```bash
# Run tests in CI mode locally
npm test -- --ci

# Check for flaky tests
npm test -- --runInBand
```

### Coverage Threshold Failures

**Error**: `Jest: "global" coverage threshold for statements (70%) not met: 65%`

**Solutions**:
1. Add more tests to increase coverage
2. Remove dead code
3. Adjust thresholds in `jest.config.js` (temporarily)

```javascript
// backend/jest.config.js
coverageThreshold: {
  global: {
    statements: 65, // Lowered from 70
    branches: 65,
    functions: 70,
    lines: 70
  }
}
```

### Workflow Not Triggering

**Checklist**:
- ✅ Workflow file is in `.github/workflows/` directory
- ✅ File has `.yml` or `.yaml` extension
- ✅ YAML syntax is valid (use YAML validator)
- ✅ Branch matches trigger conditions (`master` or `main`)

**Test Locally**:
```bash
# Install act to run GitHub Actions locally
brew install act

# Run workflow
act push
```

### Codecov Upload Failures

**Error**: `Codecov token not found`

**Solution**:
1. Get token from https://codecov.io
2. Add `CODECOV_TOKEN` to GitHub Secrets:
   - Go to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `CODECOV_TOKEN`
   - Value: `your-token-here`

**Note**: `fail_ci_if_error: false` means CI won't fail if Codecov upload fails

### Linting Failures

**Error**: `npm run lint exited with code 1`

**Fix Issues**:
```bash
# Auto-fix most issues
cd backend
npm run lint -- --fix

# Check what will be fixed
npm run lint -- --fix --dry-run
```

### Type Check Failures

**Error**: `Property 'foo' does not exist on type 'Bar'`

**Solutions**:
1. Fix the type error
2. Add proper type definitions
3. Use type assertions (as last resort)

```typescript
// Fix type error
const bar: Bar = { foo: 'value' }; // Add missing property

// Or assert type
const bar = unknownValue as Bar;
```

---

## GitHub Actions Usage

### Viewing Workflow Runs

1. Go to repository on GitHub
2. Click "Actions" tab
3. See list of workflow runs
4. Click on a run to see details

### Re-running Failed Jobs

1. Open failed workflow run
2. Click "Re-run jobs" button
3. Select "Re-run failed jobs" or "Re-run all jobs"

### Canceling Running Jobs

1. Open running workflow
2. Click "Cancel workflow" button (top right)

---

## Best Practices

### ✅ DO

- Keep tests fast (< 10 seconds per test suite)
- Use `--maxWorkers=2` to limit resource usage
- Cache dependencies with `npm ci`
- Write descriptive commit messages
- Check CI status before merging PRs

### ❌ DON'T

- Don't commit `node_modules/`
- Don't commit `.env` files
- Don't ignore failing tests
- Don't merge PRs with failing CI
- Don't skip coverage thresholds

---

## Optimization Tips

### Speed Up Tests

```yaml
# Use --maxWorkers to limit parallelization
npm test -- --ci --maxWorkers=2

# Run only changed tests
npm test -- --onlyChanged

# Use test sharding for large test suites
npm test -- --shard=1/4  # Run 1st quarter of tests
```

### Reduce Build Time

```yaml
# Use matrix strategy for parallel jobs
strategy:
  matrix:
    test-group: [unit, integration, e2e]

# Skip unnecessary steps
if: steps.changed-files.outputs.backend == 'true'
```

---

## Future Enhancements

### Planned Improvements

- [ ] **E2E Tests**: Add Playwright for end-to-end testing
- [ ] **Performance Tests**: Add Lighthouse CI for performance monitoring
- [ ] **Deployment**: Auto-deploy to staging on master push
- [ ] **Slack Notifications**: Alert team when CI fails
- [ ] **Dependabot**: Auto-update dependencies

### Adding Deployment

Example deployment job:

```yaml
deploy:
  needs: [backend-tests, frontend-tests, lint, type-check]
  if: github.ref == 'refs/heads/master'
  runs-on: ubuntu-latest
  steps:
    - name: Deploy to production
      run: ./deploy.sh
```

---

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Jest CI Configuration](https://jestjs.io/docs/configuration#ci-boolean)
- [Codecov Documentation](https://docs.codecov.com/)
- [Testing Best Practices](./TESTING.md)
- [Service Testing Guide](./SERVICE_TESTING_GUIDE.md)

---

**Last Updated**: 2025-01-31
**Maintained by**: Development Team
**Questions?** Open an issue or contact the dev team
