```markdown
# alternun Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the `alternun` TypeScript codebase. It covers file and code style, commit patterns, testing approaches, and recommended workflows to ensure consistency and maintainability. While no specific framework is detected, the repository follows clear TypeScript best practices and conventional commit standards.

## Coding Conventions

### File Naming
- Use **camelCase** for all file names.
  - Example: `userProfile.ts`, `dataFetcher.test.ts`

### Import Style
- Use **relative imports** for modules within the project.
  - Example:
    ```typescript
    import { fetchData } from './dataFetcher';
    ```

### Export Style
- Use **named exports** for all modules.
  - Example:
    ```typescript
    // In dataFetcher.ts
    export function fetchData() { /* ... */ }

    // In another file
    import { fetchData } from './dataFetcher';
    ```

### Commit Messages
- Use **conventional commits** with the `feat` prefix for new features.
  - Example:
    ```
    feat: add user authentication to login page
    ```
- Average commit message length: ~59 characters.

## Workflows

### Feature Development
**Trigger:** When adding a new feature to the codebase  
**Command:** `/feature`

1. Create a new branch for your feature.
2. Implement the feature using camelCase file naming and named exports.
3. Use relative imports for any internal modules.
4. Write or update corresponding test files (`*.test.ts`).
5. Commit changes using the `feat` prefix and a descriptive message.
6. Open a pull request for review.

### Testing Code
**Trigger:** When validating code changes or before merging  
**Command:** `/test`

1. Locate or create test files matching the `*.test.ts` pattern.
2. Write tests for new or updated features.
3. Run the test suite using the project's test runner (framework unknown; check project scripts).
4. Ensure all tests pass before committing or merging.

## Testing Patterns

- Test files are named using the `*.test.ts` pattern and placed alongside or near the code they test.
- The specific test framework is not detected; check project documentation or scripts for details.
- Example test file:
  ```typescript
  // dataFetcher.test.ts
  import { fetchData } from './dataFetcher';

  describe('fetchData', () => {
    it('should return expected data', () => {
      // test implementation
    });
  });
  ```

## Commands
| Command   | Purpose                                   |
|-----------|-------------------------------------------|
| /feature  | Start a new feature development workflow  |
| /test     | Run or write tests for your code changes  |
```
