# Contributing to XARF JavaScript Parser

Thank you for your interest in contributing to the XARF JavaScript/TypeScript parser! We welcome contributions from the community and appreciate your help in making this project better.

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to contact@xarf.org.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue on GitHub with the following information:

- **Clear title and description** of the issue
- **Steps to reproduce** the problem
- **Expected behavior** vs. **actual behavior**
- **Code samples** or test cases that demonstrate the issue
- **Version** of the library you're using
- **Node.js version** and operating system

### Suggesting Features

We welcome feature requests! Please create an issue with:

- **Clear description** of the feature
- **Use case** explaining why this feature would be useful
- **Example code** showing how the feature might work
- **Compatibility considerations** with the XARF specification

### Pull Requests

We actively welcome pull requests! Here's how to contribute:

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following our coding standards
3. **Add tests** for any new functionality
4. **Ensure all tests pass** and coverage remains >80%
5. **Update documentation** as needed
6. **Submit a pull request** with a clear description of changes

## Development Setup

### Prerequisites

- **Node.js**: Version 16.0.0 or higher
- **npm**: Version 7.0.0 or higher
- **Git**: Latest stable version

### Getting Started

1. **Clone your fork:**

   ```bash
   git clone https://github.com/YOUR_USERNAME/xarf-javascript.git
   cd xarf-javascript
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Build the project:**

   ```bash
   npm run build
   ```

4. **Run tests:**
   ```bash
   npm test
   ```

### Development Commands

- `npm run build` - Compile TypeScript to JavaScript
- `npm test` - Run the test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate code coverage report
- `npm run lint` - Check code style with ESLint
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run typecheck` - Run TypeScript type checking

## Testing Requirements

All contributions must maintain or improve test coverage:

- **Coverage thresholds** are enforced by Jest — see [jest.config.js](jest.config.js) for current values
- **Unit tests**: Required for all new functions and classes
- **Integration tests**: Required for parser and generator functionality
- **Test file location**: Tests should be in the `tests/` directory
- **Test naming**: Use descriptive names that explain what is being tested

### Running Tests

```bash
npm test                  # Run all tests
npm run test:watch        # Run tests in watch mode during development
npm run test:coverage     # Generate coverage report
```

### Writing Tests

We use Jest for testing. Example test structure:

```typescript
import { parse } from '../src/parser';

describe('parse', () => {
  it('should parse a valid XARF report', () => {
    const input = {
      // ... valid XARF data
    };

    const { report, errors } = parse(input);

    expect(errors).toHaveLength(0);
    expect(report.category).toBeDefined();
    expect(report.type).toBeDefined();
  });

  it('should return errors for invalid data', () => {
    const { errors } = parse({});

    expect(errors.length).toBeGreaterThan(0);
  });
});
```

## Code Style Guidelines

### TypeScript Standards

- **Language version**: TypeScript 5.3+
- **Target**: ES2020
- **Module system**: CommonJS
- **Strict mode**: Enabled

See [tsconfig.json](tsconfig.json) for the full compiler configuration.

### Naming Conventions

- **Functions**: camelCase (e.g., `parse`, `createReport`, `createEvidence`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `SPEC_VERSION`)
- **Interfaces/Types**: PascalCase with descriptive names (e.g., `ParseResult`, `XARFReport`, `ReportInput`)
- **Type aliases**: PascalCase (e.g., `ReportInput`, `ConnectionReportInput`)

### Code Organization

- **One module per file** for main components
- **Related types** can be grouped in a single file
- **Export from index.ts** for public API
- **Use barrel exports** for cleaner imports

### Formatting and Linting

We use Prettier for formatting and ESLint with TypeScript support for linting. Configuration lives in [.prettierrc](.prettierrc) and [.eslintrc.json](.eslintrc.json).

```bash
npm run format:check      # Check formatting
npm run format            # Auto-format
npm run lint              # Check linting
npm run lint:fix          # Auto-fix linting issues
```

A pre-commit hook (via Husky + lint-staged) runs both automatically on staged files.

### Documentation

- **JSDoc comments** for all public APIs
- **Type annotations** on all parameters and return values
- **Inline comments** for complex logic
- **README updates** for new features

## Commit Message Conventions

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring without feature changes
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates

### Examples

```
feat(parser): add support for XARF v4.1 reports

Implement parsing logic for new fields introduced in v4.1 specification.
Maintains backward compatibility with v4.0 reports.

Closes #123
```

```
fix(validator): correct email validation regex

The previous regex was too permissive and allowed invalid email formats.
Updated to follow RFC 5322 more strictly.

Fixes #456
```

```
docs(readme): update installation instructions

Added information about TypeScript types and peer dependencies.
```

## Pull Request Process

1. **Update documentation** for any changed functionality
2. **Add tests** covering your changes
3. **Ensure all tests pass**: `npm test`
4. **Verify coverage**: `npm run test:coverage`
5. **Check linting**: `npm run lint`
6. **Verify formatting**: `npm run format:check`
7. **Run type checking**: `npm run typecheck`
8. **Update CHANGELOG.md** if applicable
9. **Create pull request** with clear description

### Pull Request Template

Your PR description should include:

- **What**: Brief description of changes
- **Why**: Motivation and context
- **How**: Implementation approach
- **Testing**: How you tested the changes
- **Breaking changes**: Any breaking changes (if applicable)
- **Related issues**: Link to related issues

### Code Review

All pull requests require review before merging:

- At least **one approval** from a maintainer
- All **CI checks must pass**
- **No unresolved discussions**
- **Merge conflicts resolved**

## XARF Specification Compliance

All implementations must conform to the [XARF specification](https://xarf.org/spec/):

- Parse all **required fields**
- Validate **data types** correctly
- Support all **standard report types**
- Handle **optional fields** appropriately
- Implement proper **error handling**
- Maintain **backward compatibility** when possible

## Release Process

Releases are managed by maintainers:

1. Version bumped following [Semantic Versioning](https://semver.org/)
2. CHANGELOG.md updated with changes
3. Git tag created for the version
4. Package published to npm registry

## Getting Help

- **Documentation**: Check the [README](README.md) and code comments
- **Issues**: Search existing issues or create a new one
- **Discussions**: Use GitHub Discussions for questions
- **Email**: Contact the maintainers at contact@xarf.org

## License

By contributing to XARF JavaScript Parser, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

Thank you for contributing to XARF! Your efforts help make abuse reporting more effective and standardized across the internet.
