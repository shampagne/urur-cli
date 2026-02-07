# Test Requirements Coverage Rules

## Purpose

Ensure every acceptance criteria in requirements.md has corresponding test coverage, preventing implementation gaps from being discovered late in development.

## Core Principles

### 1. Requirements-First Testing

Every acceptance criteria MUST have at least one corresponding test.

**Test Types by Requirement Type**:
| Requirement Type | Primary Test | Secondary Test |
|------------------|--------------|----------------|
| UI/Display | E2E test | Integration test |
| Data fetching/query | Integration test | E2E test |
| Business logic | Unit test | Integration test |
| Navigation/routing | E2E test | - |
| Security/auth | Integration test | E2E test |
| Error handling | Unit test | E2E test |

### 2. Test Naming Convention

Test descriptions MUST reference the requirement ID being tested.

**Format**:
```typescript
describe('Feature Name - Requirement X.Y', () => {
  it('should [acceptance criteria description] (Req X.Y)', () => {
    // test implementation
  })
})
```

**Example**:
```typescript
describe('Auth Navigation - Requirement 3.2, 3.3', () => {
  it('should show user info when logged in (Req 3.2)', async () => {
    // ...
  })

  it('should show login button when not logged in (Req 3.3)', async () => {
    // ...
  })
})
```

### 3. Test File Organization

**Structure**:
```
tests/
├── integration/
│   ├── {feature-name}.test.ts       # Feature-specific integration tests
│   └── {cross-cutting}.test.ts      # Cross-cutting concern tests
├── e2e/
│   ├── {feature-name}.spec.ts       # Feature-specific E2E tests
│   └── {cross-cutting}.spec.ts      # Cross-cutting E2E tests
```

**File Header Comment**:
```typescript
/**
 * Tests for {feature-name}
 * Covers requirements from {spec-name} spec:
 * - X.Y: [brief description]
 * - X.Z: [brief description]
 */
```

### 4. Cross-Spec Requirements

Some requirements span multiple specs (e.g., auth state shown on all pages).

**Handling Cross-Spec Requirements**:
1. Create a dedicated test file for cross-cutting concerns
2. Reference ALL specs the requirement affects
3. Test the requirement in ALL relevant contexts

**Example**:
- `github-oauth-auth` spec requires auth state in navigation
- This affects: homepage, services list, service detail, user profile
- Create: `tests/e2e/auth-navigation.spec.ts` testing ALL pages

### 5. Coverage Verification

**Before Implementation Completion**:
1. List all acceptance criteria from requirements.md
2. Map each to corresponding test(s)
3. Verify no orphaned requirements exist

**Coverage Matrix Format** (in tasks.md):
```markdown
## Requirements Coverage Matrix

| Requirement ID | Task Coverage | Test Coverage |
|----------------|---------------|---------------|
| 1.1 | 1.1, 4.1 | auth-navigation.test.ts |
| 1.2 | 1.1, 4.2 | auth-navigation.spec.ts |
```

### 6. Test-First Implementation

**Recommended Workflow**:
1. Read requirements.md for the feature
2. Create test file(s) with failing tests
3. Implement feature to pass tests
4. Verify all requirements are covered

**Benefits**:
- Catches implementation gaps early
- Ensures requirements are testable
- Documents expected behavior

## Implementation Checklist

When implementing a feature, verify:

- [ ] All acceptance criteria have corresponding tests
- [ ] Test descriptions reference requirement IDs
- [ ] Cross-spec requirements are tested in all contexts
- [ ] Test file headers document covered requirements
- [ ] Coverage matrix in tasks.md is updated

## Anti-Patterns to Avoid

1. **Orphaned Requirements**: Requirements with no test coverage
2. **Unnamed Tests**: Tests without requirement ID references
3. **Single-Page Testing**: Testing cross-cutting features on only one page
4. **Post-Implementation Testing**: Writing tests after full implementation
5. **Partial Coverage**: Testing happy path only, ignoring edge cases

## Enforcement

### During Task Generation (`/kiro:spec-tasks`)
- Include test tasks for EVERY requirement
- Map tests to requirements in coverage matrix

### During Implementation (`/kiro:spec-impl`)
- Create tests before or alongside implementation
- Reference requirements in test descriptions

### During Validation (`/kiro:validate-impl`)
- Verify all requirements have test coverage
- Check cross-spec requirements are tested everywhere
- Flag any orphaned requirements
