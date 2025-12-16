# Publishing to NPM

## Current Status
✅ Package ready for publishing
✅ All tests passing (207/207)
✅ Zero linting warnings
✅ Build successful
✅ LICENSE file present
✅ .npmignore configured

## Package Details
- **Size**: 65.3 kB (compressed)
- **Unpacked**: 320 kB
- **Files**: 70 files
- **Dependencies**: ajv, ajv-formats

## Publishing Steps

### For Scoped Package (@xarf/javascript) - RECOMMENDED

1. **Login to NPM**
   ```bash
   npm login
   ```

2. **Update package name** (if choosing scoped)
   ```bash
   # I can do this for you - just let me know
   # Changes "xarf" to "@xarf/javascript" in package.json
   ```

3. **Dry run** (verify package contents)
   ```bash
   npm pack --dry-run
   ```

4. **Publish as public scoped package**
   ```bash
   npm publish --access public
   ```

5. **Verify**
   ```bash
   npm view @xarf/javascript
   ```

### For Simple Package (xarf)

1. **Login to NPM**
   ```bash
   npm login
   ```

2. **Dry run**
   ```bash
   npm pack --dry-run
   ```

3. **Publish**
   ```bash
   npm publish
   ```

4. **Verify**
   ```bash
   npm view xarf
   ```

## After Publishing

### Update README badges (if package name changed)
The README currently references "xarf" - update if using "@xarf/javascript"

### Test installation
```bash
npm install xarf
# or
npm install @xarf/javascript
```

### Create GitHub release
Tag the version and create release notes on GitHub

## Version Management

Current version: **1.0.0**

For future updates:
- Patch (1.0.x): Bug fixes → `npm version patch`
- Minor (1.x.0): New features → `npm version minor`
- Major (x.0.0): Breaking changes → `npm version major`

Then:
```bash
npm publish
git push --tags
```
