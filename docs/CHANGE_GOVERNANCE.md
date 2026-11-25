# FinCore Change Governance Policy

## 1. Purpose
This document defines the change management and version control process for the FinCore project to ensure changes are traceable, reviewed, tested, and safely integrated.

## 2. Branching Strategy
FinCore uses the following branches:

- master: stable branch containing baseline and release-ready code.
- develop: integration branch for ongoing development.
- feature/*: branches for new features and assessment work.
- hotfix/*: branches for urgent fixes to production-critical issues.

## 3. Change Workflow
All changes follow this workflow:

1. Create a feature branch from develop.
2. Implement the required change.
3. Run relevant tests and validation checks.
4. Review the changes using Git diff.
5. Commit changes using meaningful commit messages.
6. Merge the feature branch into develop after validation.
7. Merge release-ready changes into master.
8. Tag releases to identify stable versions.

## 4. Commit Message Convention
Commit messages should be clear and follow this format:

type: short description

Examples:
- feat: add transaction risk scoring
- fix: validate transfer amount
- test: add wallet concurrency tests
- docs: document change governance
- chore: configure Docker environment

## 5. Code Review
Before merging changes, the reviewer should verify:

- Code readability and maintainability.
- Correctness of business logic.
- Security and sensitive data handling.
- Appropriate test coverage.
- No unnecessary files or secrets.
- No unintended changes.

For this academic project, self-review using Git diff and automated checks is documented when a second reviewer is unavailable.

## 6. Testing and Validation
Changes should be validated using appropriate checks:

- Unit tests.
- Integration tests where applicable.
- API endpoint verification.
- Database migration validation.
- Docker configuration validation.
- Manual smoke testing.

Failed checks must be investigated and resolved before merging.

## 7. Change Documentation
Each significant change should document:

- Change description.
- Reason for the change.
- Files or components affected.
- Testing performed.
- Risks or limitations.

## 8. Security Controls
- Environment secrets must not be committed.
- Environment-specific configuration must use environment variables.
- The .env.example file must contain placeholders only.
- Changes involving authentication, authorization, financial transactions, or database integrity require additional review.

## 9. Release Management
Release versions follow Semantic Versioning:

MAJOR.MINOR.PATCH

Examples:
- v0.1.0: initial project baseline
- v0.2.0: new functionality
- v0.2.1: bug fix

A release should include validated changes, a clean working tree, and a Git tag.

## 10. Rollback Procedure
If a change introduces a critical issue:

1. Identify the problematic commit or release.
2. Revert the change using Git revert.
3. Validate the reverted version.
4. Document the rollback and root cause.
5. Implement and validate a corrective fix.

## 11. Emergency Hotfixes
Critical fixes may use a hotfix branch:

hotfix/short-description

The fix must be validated and merged into both master and develop to prevent divergence.

## 12. Governance Responsibilities
The developer is responsible for implementing changes, testing them, documenting them, and ensuring sensitive information is excluded from version control.

## 13. Compliance
All project changes should follow this policy to maintain traceability, consistency, and quality.
