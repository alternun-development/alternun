# Contributing to Alternun

Thank you for your interest in contributing to Alternun! This guide will help you get started with contributing to our monorepo.

## 🚀 Getting Started

### Prerequisites

- Node.js 14.0.0 or higher
- npm 8.19.2 or higher
- Git
- GitHub account

### Setup

1. **Fork the Repository**
   ```bash
   # Fork on GitHub and clone your fork
   git clone https://github.com/YOUR_USERNAME/alternun.git
   cd alternun
   ```

2. **Add Upstream Remote**
   ```bash
   git remote add upstream https://github.com/alternun-development/alternun.git
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Start Development**
   ```bash
   npm run dev
   ```

## 📁 Repository Structure

```
alternun/
├── apps/                    # Applications
│   ├── web/                # Next.js web application
│   ├── mobile/             # React Native/Expo mobile app
│   └── docs/               # Docusaurus documentation site
├── packages/               # Shared packages
│   └── ui/                 # Cross-platform UI components
├── .github/                # GitHub workflows and templates
└── turbo.json             # Turborepo configuration
```

## 🌿 Branch Strategy

### Branch Naming

- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/update-description` - Documentation updates
- `refactor/component-name` - Code refactoring
- `test/add-tests` - Adding tests

### Git Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow the coding standards
   - Add tests if applicable
   - Update documentation

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

4. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## 📝 Commit Message Convention

We use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```bash
feat(ui): add button component
fix(web): resolve navigation issue
docs(readme): update installation guide
test(ui): add unit tests for button component
```

## 🎨 Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define interfaces for all props and data structures
- Use strict mode in `tsconfig.json`
- Avoid `any` type when possible

### Code Style

- Use Prettier for formatting (configured in `.prettierrc`)
- Use ESLint for linting (configured in `.eslintrc.js`)
- Follow the existing naming conventions:
  - Components: PascalCase (`Button.tsx`)
  - Functions/Variables: camelCase (`getUserData`)
  - Constants: UPPER_SNAKE_CASE (`API_BASE_URL`)
  - Files: kebab-case (`user-service.ts`)

### Component Guidelines

- One component per file
- Export components as default
- Use TypeScript interfaces for props
- Add JSDoc comments for public APIs
- Include unit tests for utility functions

```typescript
/**
 * Button component with customizable styling
 * @param children - Button content
 * @param variant - Button style variant
 * @param onClick - Click handler
 */
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  onClick,
}) => {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick}>
      {children}
    </button>
  );
};
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

- Write unit tests for all utility functions
- Test component rendering and interactions
- Use Jest and React Testing Library
- Aim for high code coverage

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

## 📦 Adding New Packages

### Creating a New Package

1. **Create Package Directory**
   ```bash
   mkdir packages/new-package
   cd packages/new-package
   ```

2. **Initialize Package**
   ```bash
   npm init -y
   ```

3. **Setup TypeScript**
   ```bash
   npm install --save-dev typescript @types/node
   npx tsc --init
   ```

4. **Configure package.json**
   ```json
   {
     "name": "@alternun/new-package",
     "version": "0.1.0",
     "main": "dist/index.js",
     "types": "dist/index.d.ts",
     "scripts": {
       "build": "tsc",
       "dev": "tsc -w"
     }
   }
   ```

5. **Update Root package.json**
   Add to workspaces array:
   ```json
   "workspaces": [
     "apps/*",
     "packages/*"
   ]
   ```

6. **Configure turbo.json**
   ```json
   {
     "pipeline": {
       "build": {
         "dependsOn": ["^build"],
         "outputs": ["dist/**"]
       }
     }
   }
   ```

## 📱 Adding New Applications

### Creating a New App

1. **Create App Directory**
   ```bash
   mkdir apps/new-app
   cd apps/new-app
   ```

2. **Initialize with Framework**
   ```bash
   # For Next.js
   npx create-next-app@latest . --typescript --tailwind --eslint

   # For React Native
   npx create-expo-app . --template
   ```

3. **Update Dependencies**
   Add shared packages as needed:
   ```json
   {
     "dependencies": {
       "@alternun/ui": "*",
       "@alternun/shared": "workspace:*"
     }
   }
   ```

4. **Configure turbo.json**
   Add app-specific pipeline configuration.

## 🔧 Development Workflow

### Before Submitting

1. **Run Tests**
   ```bash
   npm run test
   ```

2. **Run Linting**
   ```bash
   npm run lint
   ```

3. **Format Code**
   ```bash
   npm run format
   ```

4. **Build Project**
   ```bash
   npm run build
   ```

### Pull Request Process

1. **Create Pull Request**
   - Use descriptive title
   - Fill out the PR template
   - Link relevant issues

2. **Code Review**
   - Address all review comments
   - Update tests if needed
   - Keep PRs focused and small

3. **Merge**
   - Squash commits when merging
   - Delete feature branch after merge

## 🐛 Bug Reports

### Reporting Bugs

1. **Search Existing Issues**
   - Check if bug is already reported
   - Add to existing issue if found

2. **Create New Issue**
   - Use bug report template
   - Provide detailed information
   - Include reproduction steps

3. **Bug Report Template**
   ```markdown
   ## Bug Description
   Brief description of the bug
   
   ## Steps to Reproduce
   1. Go to...
   2. Click on...
   3. See error
   
   ## Expected Behavior
   What should happen
   
   ## Actual Behavior
   What actually happens
   
   ## Environment
   - OS: [e.g. macOS 13.0]
   - Browser: [e.g. Chrome 108]
   - Node.js: [e.g. 18.0.0]
   ```

## 💡 Feature Requests

### Requesting Features

1. **Discuss First**
   - Open an issue for discussion
   - Get team feedback
   - Consider impact and priority

2. **Feature Request Template**
   ```markdown
   ## Feature Description
   Clear description of the feature
   
   ## Problem Statement
   What problem does this solve?
   
   ## Proposed Solution
   How should this be implemented?
   
   ## Alternatives Considered
   What other approaches were considered?
   
   ## Additional Context
   Any other relevant information
   ```

## 📚 Documentation

### Updating Documentation

- Update README.md for major changes
- Add inline documentation for new features
- Update API documentation
- Add examples for new components

### Documentation Style

- Use clear, concise language
- Include code examples
- Add screenshots for UI changes
- Use proper markdown formatting

## 🤝 Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Maintain professional communication

### Getting Help

- Join our [Discord community](https://discord.gg/DQmQbzcbER)
- Create GitHub discussions
- Check existing documentation
- Reach out to maintainers

## 🏆 Recognition

### Contributors

- All contributors are recognized in our README
- Top contributors get special recognition
- Contributors may be invited to join the core team

### Ways to Contribute

- Code contributions
- Documentation improvements
- Bug reports and feature requests
- Community support and mentoring
- Design and UX feedback

## 📞 Contact

- **Discord**: [Join our community](https://discord.gg/DQmQbzcbER)
- **GitHub Issues**: [Create an issue](https://github.com/alternun-development/alternun/issues)
- **Email**: dev@alternun.io

---

Thank you for contributing to Alternun! Your contributions help us build better technology for a sustainable future.
