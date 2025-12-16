# Security Recommendations for XARF JavaScript Library

This document provides comprehensive security recommendations for maintaining and improving the security posture of the XARF JavaScript library.

## Table of Contents

1. [Repository Security](#repository-security)
2. [Dependency Management](#dependency-management)
3. [Code Security](#code-security)
4. [CI/CD Security](#cicd-security)
5. [Vulnerability Response](#vulnerability-response)
6. [Security Monitoring](#security-monitoring)

## Repository Security

### Branch Protection Rules

**Recommended settings for `main` branch:**

```yaml
Require pull request reviews: ✓
  Required approving reviews: 2
  Dismiss stale reviews: ✓
  Require review from Code Owners: ✓

Require status checks before merging: ✓
  Required checks:
    - CI / Test Node.js 20
    - CI / Lint and Format
    - CI / Security Audit
    - CodeQL / Analyze
    - Dependency Review

Require branches to be up to date: ✓
Require signed commits: ✓ (recommended)
Include administrators: ✓
Restrict pushes: ✓
  - Only allow specified users/teams
  - xarf/maintainers
```

### Security Features to Enable

Enable these GitHub repository settings:

1. **Dependabot alerts** - ✓ Already enabled
2. **Dependabot security updates** - ✓ Enable for automatic fixes
3. **Secret scanning** - ✓ Enable (private repos)
4. **Push protection** - ✓ Prevent accidental secret commits
5. **Code scanning (CodeQL)** - ✓ Already configured
6. **Dependency graph** - ✓ Enable for better insights

### Access Control

- **Minimum permission principle**: Grant least privilege needed
- **Team-based access**: Use GitHub teams, not individual access
- **2FA required**: Enforce for all contributors
- **Deploy keys**: Use for automated deployments only
- **Personal access tokens**: Regular rotation, scoped permissions

## Dependency Management

### Current Configuration

✅ **Dependabot** configured for:
- Daily npm dependency checks
- Weekly GitHub Actions updates
- Automatic grouping of minor/patch updates
- Security updates prioritized

### Best Practices

1. **Review before merging**
   - Check changelogs for breaking changes
   - Review security advisories
   - Test thoroughly in staging

2. **Pin dependencies** (when needed)
   ```json
   {
     "resolutions": {
       "vulnerable-package": "^1.2.3"
     }
   }
   ```

3. **Audit regularly**
   ```bash
   npm audit
   npm audit fix
   npm audit fix --force  # Use with caution
   ```

4. **License compliance**
   - Monitor license changes
   - Block copyleft licenses (already configured)
   - Keep license inventory updated

## Code Security

### Secure Coding Practices

1. **Input Validation**
   ```typescript
   // ✅ Good: Validate all inputs
   function parse(input: unknown): XARFReport {
     if (typeof input !== 'object' || input === null) {
       throw new ValidationError('Invalid input type');
     }
     // Validate structure...
   }

   // ❌ Bad: Assume input is valid
   function parse(input: any): XARFReport {
     return input as XARFReport;
   }
   ```

2. **Avoid Dynamic Code Execution**
   - Never use `eval()`
   - Be cautious with `Function()` constructor
   - Sanitize user input before processing

3. **Error Handling**
   ```typescript
   // ✅ Good: Don't leak sensitive information
   catch (error) {
     logger.error('Parse failed', {
       reason: error.message // Generic message only
     });
     throw new UserFacingError('Invalid XARF format');
   }

   // ❌ Bad: Expose internal details
   catch (error) {
     throw error; // May contain sensitive paths, data
   }
   ```

4. **Data Sanitization**
   - Redact PII in logs
   - Sanitize error messages
   - Validate email formats
   - Check URL schemes

### TypeScript Security

1. **Strict mode**: Already enabled in `tsconfig.json`
   ```json
   {
     "compilerOptions": {
       "strict": true,
       "noImplicitAny": true,
       "strictNullChecks": true
     }
   }
   ```

2. **Type safety**
   - Avoid `any` types (except in tests)
   - Use branded types for sensitive data
   - Validate at runtime, not just compile-time

## CI/CD Security

### Current Workflows

✅ **Security workflows configured:**
- CodeQL analysis (2x weekly + on push)
- Dependency Review (on PRs)
- Security Scanning (daily + on push)
- OSSF Scorecard (weekly)

### Workflow Permissions

All workflows follow **principle of least privilege**:

```yaml
permissions:
  contents: read        # Default
  security-events: write  # Only for security uploads
  pull-requests: write    # Only for PR comments
```

### Action Security

1. **Pin actions to commit SHA** (most secure)
   ```yaml
   # ✅ Best: Pin to commit SHA
   uses: actions/checkout@8ade135a41bc03ea155e62e844d188df1ea18608 # v4.1.0

   # ⚠️ Acceptable: Pin to major version
   uses: actions/checkout@v4

   # ❌ Avoid: Floating tags
   uses: actions/checkout@main
   ```

2. **Review third-party actions**
   - Check source code
   - Verify maintainer reputation
   - Monitor for updates

3. **Secrets management**
   - Use GitHub Secrets
   - Rotate regularly
   - Scope appropriately
   - Never log secrets

## Vulnerability Response

### Process

1. **Detection**
   - Dependabot alerts
   - CodeQL findings
   - Security researcher reports
   - User reports

2. **Triage** (within 48 hours)
   - Assess severity (CVSS score)
   - Determine impact
   - Plan response

3. **Fix** (timeline by severity)
   - Critical: 24-48 hours
   - High: 1 week
   - Moderate: 2 weeks
   - Low: Next release

4. **Disclosure**
   - Create GitHub Security Advisory
   - Coordinate with reporter
   - Release patch
   - Publish advisory
   - Update SECURITY.md

### Severity Levels

| Level | CVSS | Response Time | Example |
|-------|------|---------------|---------|
| Critical | 9.0-10.0 | 24-48 hours | RCE, Auth bypass |
| High | 7.0-8.9 | 1 week | Data exposure, XSS |
| Moderate | 4.0-6.9 | 2 weeks | DoS, Info leak |
| Low | 0.1-3.9 | Next release | Minor info disclosure |

## Security Monitoring

### Automated Monitoring

✅ **Currently implemented:**
- Daily security scans
- Twice-weekly CodeQL analysis
- Daily dependency checks
- Weekly OSSF Scorecard
- PR-based dependency review

### Manual Reviews

**Monthly:**
- Review open security alerts
- Check OSSF Scorecard results
- Review access logs
- Update dependencies

**Quarterly:**
- Comprehensive security audit
- Review and update SECURITY.md
- Test incident response procedures
- Review access controls

**Annually:**
- External security audit
- Penetration testing
- Security policy review
- Team security training

### Metrics to Track

1. **Vulnerability metrics**
   - Mean time to detect (MTTD)
   - Mean time to resolve (MTTR)
   - Number of open vulnerabilities
   - Severity distribution

2. **Dependency metrics**
   - Dependencies count
   - Outdated dependencies
   - Known vulnerabilities
   - License compliance

3. **Code metrics**
   - CodeQL findings
   - Test coverage
   - Code complexity
   - Security test coverage

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [npm Security Best Practices](https://docs.npmjs.com/security-best-practices)
- [GitHub Security Features](https://docs.github.com/en/code-security)
- [OSSF Scorecard](https://github.com/ossf/scorecard)

## Contact

For security questions or concerns:
- Email: security@xarf.org
- GitHub Security Advisories: [Report privately](https://github.com/xarf/xarf-javascript/security/advisories/new)
