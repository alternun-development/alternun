# Alternun Monorepo

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/alternun-development/alternun/workflows/CI/badge.svg)](https://github.com/alternun-development/alternun/actions)
[![codecov](https://codecov.io/gh/alternun-development/alternun/branch/main/graph/badge.svg)](https://codecov.io/gh/alternun-development/alternun)
[![Docs Status](https://github.com/alternun-development/alternun/actions/workflows/deploy.yml/badge.svg)](https://github.com/alternun-development/alternun/actions/workflows/deploy.yml)
[![Documentation](https://img.shields.io/badge/docs-latest-blue.svg)](https://alternun-development.github.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Turbo](https://img.shields.io/badge/Turbo-1.9+-ff6d00.svg)](https://turbo.build/)
[![Node.js](https://img.shields.io/badge/Node.js-22.22.0+-green.svg)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

> **Alternun** - #ReDeFine the future with sustainable technology and innovation

This is the official monorepo for Alternun, containing all critical codebase components across multiple platforms and technologies. Built with TypeScript as the primary language, this repository supports web, mobile, and documentation applications using modern development practices.

## 🏗️ Architecture Overview

### Monorepo Structure

This repository uses **Turborepo** for efficient monorepo management with the following structure:

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

### Technology Stack

- **Primary Language**: TypeScript 5.0+
- **Build System**: Turborepo 1.9+
- **Web Framework**: Next.js 13.4+ with React 18.2+
- **Mobile Framework**: React Native 0.71+ with Expo 48+
- **Documentation**: Docusaurus 3.5+ with i18n support
- **Styling**: Tailwind CSS 3.3+
- **3D Graphics**: Three.js 0.169+ with React Three Fiber
- **Package Manager**: pnpm 9.0.0

## 🚀 Quick Start

### Prerequisites

- Node.js 22.22.0 or higher
- pnpm 9.0.0 or higher
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/alternun-development/alternun.git
cd alternun

# Install dependencies
pnpm install

# Start development servers
pnpm dev
```

### Development Commands

````bash
# Build all packages and applications
pnpm build

# Start all development servers
pnpm dev

# Run linting across all packages
pnpm lint

# Format code with Prettier
pnpm format

# Run tests
pnpm test

# Check code coverage
pnpm test:coverage

# Security audit
pnpm audit

## 🌿 Git Workflow

### Branch Protection Rules

This repository enforces a strict Git workflow to ensure code quality and proper review:

#### � Master Branch Protection
- **No direct pushes** to master branch are allowed
- **All changes** must go through pull requests
- **PRs to master** must come from develop branch only

#### 📝 Required Workflow
1. **Create feature branch** from develop
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Make changes** and test locally
   ```bash
   # Make your changes
   pnpm dev
   pnpm test
   pnpm lint
   ```

3. **Create PR to develop**
   - Push feature branch: `git push origin feature/your-feature-name`
   - Create pull request targeting develop branch
   - Get code review and approval

4. **Merge to develop**
   - After approval, merge to develop branch
   - This updates the development environment

5. **Create PR to master**
   - Create pull request from develop to master
   - This is for production releases
   - Requires additional review and testing

#### 🔒 Enforcement Mechanisms
- **GitHub Actions**: Block direct pushes to master
- **Branch Protection**: Only allow PRs from develop to master
- **Automated Checks**: CI/CD must pass before merging
- **Code Review**: At least one approval required

#### 🎯 Why This Workflow?
- **🔍 Code Quality**: All changes get reviewed
- **🚀 Stability**: Master branch always stable
- **🧪 Testing**: Changes tested in develop first
- **📊 Traceability**: Clear history of changes
- **👥 Collaboration**: Team visibility into changes

## 🔄 Version Management

This monorepo uses `@edcalderon/versioning` for comprehensive version control and release management.

### Version Management Commands

```bash
# Validate version sync across monorepo
pnpm version:validate

# Sync versions across all packages
pnpm version:sync

# Bump version (patch, minor, major)
pnpm version:bump

# Generate changelog from commits
pnpm version:changelog

# Clean up repository and remove unused files
pnpm version:cleanup

# Check for secrets in staged files
pnpm version:check-secrets
````

### Versioning Features

- **🔄 Automatic Sync**: Keeps versions consistent across all packages
- **🌿 Branch Awareness**: Different versioning strategies per branch
  - `master`: Semantic versioning for production releases
  - `develop`: Development builds with dev versions
  - `feature/*`: Feature branch versioning
  - `hotfix/*`: Hotfix versioning
- **📝 Changelog Generation**: Automatic changelog from conventional commits
- **🔒 Security Scanning**: Built-in secret detection
- **🧹 Repository Cleanup**: Automated cleanup utilities

### Versioning Workflow

1. **Development**: Work on feature branches with automatic version tracking
2. **Validation**: Pre-push hooks validate version consistency
3. **Release**: Use semantic versioning for production releases
4. **Documentation**: Auto-generated changelogs for releases

### Security & Cleanup Guards

The versioning system includes built-in protection:

- **🔒 Secret Detection**: Scans for API keys, passwords, and sensitive data
- **🧹 Cleanup Utilities**: Removes temporary files and unused dependencies
- **✅ Validation**: Ensures all packages have consistent versions
- **🚫 Private Package Check**: Prevents accidental publishing of private packages
- **📊 Dependency Sync**: Maintains dependency consistency across monorepo

### Configuration

Versioning is configured in `versioning.config.json`:

- Monorepo package patterns (`apps/*/package.json`, `packages/*/package.json`)
- Branch-specific strategies
- Conventional commit support
- Automatic dependency synchronization

## 📱 Applications

### Web Application (`apps/web`)

- **Framework**: Next.js 13.4+ with App Router
- **Styling**: Tailwind CSS
- **UI Components**: @alternun/ui
- **Features**: Responsive design, SSR/SSG, API routes

### Mobile Application (`apps/mobile`)

- **Framework**: React Native 0.71+ with Expo 48+
- **Cross-platform**: iOS, Android, Web
- **UI Components**: @alternun/ui
- **Features**: Native performance, Expo services

### Documentation (`apps/docs`)

- **Framework**: Docusaurus 3.5+
- **Features**: Multi-language support (EN, ES, TH)
- **Deployment**: GitHub Pages
- **Content**: Markdown with MDX support

## 📦 Packages

### UI Components (`packages/ui`)

Cross-platform React components compatible with:

- React DOM (Web)
- React Native (Mobile)
- TypeScript definitions included

## 🔧 Development Workflow

### Adding New Applications

1. Create new directory in `apps/`
2. Initialize with appropriate framework
3. Add to `package.json` workspaces
4. Configure in `turbo.json`
5. Update CI/CD workflows

### Adding New Packages

1. Create new directory in `packages/`
2. Initialize with TypeScript
3. Add to `package.json` workspaces
4. Configure build scripts in `turbo.json`

### Integration Guidelines

#### Sub-modules Integration

- Use workspace references (`@alternun/package-name`)
- Maintain semantic versioning
- Share types through TypeScript declaration files
- Use peer dependencies for framework-specific packages

#### Cross-package Dependencies

```json
{
  "dependencies": {
    "@alternun/ui": "*",
    "@alternun/shared": "workspace:*"
  }
}
```

## 🛡️ Security Guidelines

### Code Security

- **Input Validation**: All user inputs must be validated and sanitized
- **Dependency Management**: Regular security audits with `npm audit`
- **Environment Variables**: Never commit sensitive data to version control
- **API Keys**: Use environment variables and secret management services

### Development Security

- **Branch Protection**: Main branch requires PR reviews and CI checks
- **Commit Signing**: Consider GPG signing for commits
- **Access Control**: Implement least-privilege access for team members
- **Secret Scanning**: Enable GitHub secret scanning

### Production Security

- **HTTPS Enforcement**: All production endpoints must use HTTPS
- **CORS Configuration**: Properly configure Cross-Origin Resource Sharing
- **Rate Limiting**: Implement API rate limiting
- **Monitoring**: Set up security monitoring and alerting

## 🎨 Style Guide

### Code Style

- **Language**: TypeScript for all new code
- **Formatting**: Prettier with configuration in `.prettierrc`
- **Linting**: ESLint with TypeScript rules
- **Naming**: camelCase for variables, PascalCase for components/types

### Component Guidelines

- **File Structure**: One component per file with index exports
- **Props Interface**: Always define TypeScript interfaces for props
- **Documentation**: JSDoc comments for all public APIs
- **Testing**: Unit tests for all utility functions

### Git Workflow

- **Branch Naming**: `feature/feature-name`, `fix/bug-description`, `docs/update`
- **Commit Messages**: Conventional Commits format
- **PR Templates**: Use provided templates in `.github/`
- **Code Reviews**: Required for all changes

## 📚 Documentation

### Project Documentation

- **API Documentation**: Auto-generated from TypeScript definitions
- **Architecture Docs**: Located in `docs/architecture/`
- **Deployment Guides**: Platform-specific deployment instructions
- **Contributing Guide**: Detailed contribution guidelines

### Internationalization

- **Supported Languages**: English (default), Spanish, Thai
- **Translation Files**: Located in `i18n/` directories
- **Locale Detection**: Browser-based with manual override
- **Contributing**: Use Crowdin for community translations

## 🚀 Deployment

### Production Deployment

- **Web**: Vercel/Netlify with automatic deployments
- **Mobile**: App Store and Google Play Store
- **Documentation**: GitHub Pages with custom domain
- **CI/CD**: GitHub Actions for automated testing and deployment

### Environment Configuration

```bash
# Development
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3001

# Production
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.alternun.io
```

## 🤝 Contributing

We welcome contributions from the community! Please read our [Contributing Guide](CONTRIBUTING.md) for detailed guidelines.

### Getting Started

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Code of Conduct

Please follow our [Code of Conduct](CODE_OF_CONDUCT.md) to ensure a welcoming environment for all contributors.

## 📄 Licensing

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### Why MIT License?

The MIT license was chosen for Alternun because it:

- **Business Friendly**: Allows commercial use and modification
- **Permissive**: Minimal restrictions on usage and distribution
- **Startup Compatible**: Suitable for proprietary and open-source development
- **Community Friendly**: Encourages contributions while protecting IP

## 🆘 Support

- **Documentation**: [alternun-development.github.io](https://alternun-development.github.io)
- **Issues**: [GitHub Issues](https://github.com/alternun-development/alternun/issues)
- **Discussions**: [GitHub Discussions](https://github.com/alternun-development/alternun/discussions)
- **Discord**: [Join our community](https://discord.gg/DQmQbzcbER)
- **Email**: support@alternun.io

## 🌟 Acknowledgments

- **Turborepo**: For excellent monorepo management
- **AWS**: For hosting and deployment infrastructure
- **Open Source Community**: For the amazing tools and libraries

---

**© 2026 Alternun, Inc. All rights reserved.**

Built with ❤️ by the Alternun team and contributors.

[Edit in StackBlitz next generation editor ⚡️](https://stackblitz.com/~/github.com/edward-alternun/alternun-monorepo)
