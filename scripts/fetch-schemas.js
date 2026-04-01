#!/usr/bin/env node
/**
 * Fetch XARF schemas from the official xarf-spec repository
 *
 * This script downloads JSON schemas from a specific tagged release
 * of https://github.com/xarf/xarf-spec and extracts them to a local directory.
 *
 * The version is configured in package.json under "xarfSpec.version"
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const tar = require('tar');

// Configuration
const GITHUB_REPO = 'xarf/xarf-spec';
const SCHEMAS_DIR = path.join(__dirname, '..', 'src', 'schemas');
const PACKAGE_JSON = path.join(__dirname, '..', 'package.json');

/**
 * Get the xarf-spec version from package.json
 * @returns {string} Version string (e.g., "v4.1.0")
 */
function getConfiguredVersion() {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf-8'));
  const version = pkg.xarfSpec?.version;

  if (!version) {
    throw new Error(
      'xarfSpec.version not found in package.json. Please add:\n' +
        '  "xarfSpec": { "version": "v4.1.0" }'
    );
  }

  return version;
}

/**
 * Download a file from a URL, following redirects
 * @param {string} url - URL to download
 * @returns {Promise<Buffer>} Downloaded content
 */
function download(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : require('http');

    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        download(response.headers.location).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${url}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });

    request.on('error', reject);
    request.setTimeout(60000, () => {
      request.destroy();
      reject(new Error(`Timeout downloading ${url}`));
    });
  });
}

/**
 * Ensure a directory exists
 * @param {string} dir - Directory path
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Remove a directory recursively
 * @param {string} dir - Directory path
 */
function removeDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Write version info file
 * @param {string} version - Version string
 */
function writeVersionInfo(version) {
  const versionFile = path.join(SCHEMAS_DIR, '.version');
  fs.writeFileSync(
    versionFile,
    JSON.stringify(
      {
        version,
        fetchedAt: new Date().toISOString(),
        source: `https://github.com/${GITHUB_REPO}/tree/${version}`,
      },
      null,
      2
    )
  );
}

/**
 * Check if schemas need to be fetched
 * @param {string} version - Target version
 * @returns {boolean} True if fetch is needed
 */
function needsFetch(version) {
  const versionFile = path.join(SCHEMAS_DIR, '.version');
  if (!fs.existsSync(versionFile)) {
    return true;
  }

  try {
    const info = JSON.parse(fs.readFileSync(versionFile, 'utf-8'));
    return info.version !== version;
  } catch {
    return true;
  }
}

/**
 * Extract schemas from tarball buffer
 * @param {Buffer} tarballBuffer - Downloaded tarball
 * @param {string} version - Version being extracted (for path matching)
 */
async function extractSchemas(tarballBuffer, version) {
  const tempDir = path.join(__dirname, '..', '.xarf-temp');

  // Clean temp dir
  removeDir(tempDir);
  ensureDir(tempDir);

  // Write tarball to temp file
  const tarballPath = path.join(tempDir, 'xarf-spec.tar.gz');
  fs.writeFileSync(tarballPath, tarballBuffer);

  // Extract using tar
  await tar.extract({
    file: tarballPath,
    cwd: tempDir,
  });

  // Find the extracted directory (named xarf-spec-{version without v})
  const versionWithoutV = version.replace(/^v/, '');
  const extractedDir = path.join(tempDir, `xarf-spec-${versionWithoutV}`);

  if (!fs.existsSync(extractedDir)) {
    // Try to find any extracted directory
    const dirs = fs.readdirSync(tempDir).filter((f) => {
      const fullPath = path.join(tempDir, f);
      return fs.statSync(fullPath).isDirectory();
    });

    if (dirs.length === 0) {
      throw new Error('No directory found in extracted tarball');
    }

    const foundDir = path.join(tempDir, dirs[0]);
    await copySchemas(foundDir);
  } else {
    await copySchemas(extractedDir);
  }

  // Clean up temp dir
  removeDir(tempDir);
}

/**
 * Copy schemas from extracted directory to schemas dir
 * @param {string} extractedDir - Path to extracted xarf-spec directory
 */
async function copySchemas(extractedDir) {
  const sourceSchemas = path.join(extractedDir, 'schemas', 'v4');

  if (!fs.existsSync(sourceSchemas)) {
    throw new Error(`Schemas directory not found at ${sourceSchemas}`);
  }

  // Clean and recreate target schemas directory
  removeDir(SCHEMAS_DIR);
  ensureDir(SCHEMAS_DIR);
  ensureDir(path.join(SCHEMAS_DIR, 'types'));

  // Copy core schemas
  const coreFiles = fs.readdirSync(sourceSchemas);
  for (const file of coreFiles) {
    const sourcePath = path.join(sourceSchemas, file);
    const stat = fs.statSync(sourcePath);

    if (stat.isFile() && file.endsWith('.json')) {
      const destPath = path.join(SCHEMAS_DIR, file);
      fs.copyFileSync(sourcePath, destPath);
      console.log(`[xarf]   - ${file}`);
    }
  }

  // Copy type-specific schemas
  const typesDir = path.join(sourceSchemas, 'types');
  if (fs.existsSync(typesDir)) {
    const typeFiles = fs.readdirSync(typesDir);
    for (const file of typeFiles) {
      if (file.endsWith('.json')) {
        const sourcePath = path.join(typesDir, file);
        const destPath = path.join(SCHEMAS_DIR, 'types', file);
        fs.copyFileSync(sourcePath, destPath);
        console.log(`[xarf]   - types/${file}`);
      }
    }
  }
}

/**
 * Main function to fetch schemas
 */
async function fetchSchemas() {
  const version = getConfiguredVersion();

  console.log(`[xarf] Checking schemas for xarf-spec ${version}...`);

  // Check if we already have the correct version
  if (!needsFetch(version)) {
    console.log(`[xarf] Schemas already up to date (${version})`);
    return;
  }

  console.log(`[xarf] Fetching schemas from xarf-spec ${version}...`);

  try {
    // Download the release tarball
    const tarballUrl = `https://github.com/${GITHUB_REPO}/archive/refs/tags/${version}.tar.gz`;
    console.log(`[xarf] Downloading ${tarballUrl}...`);

    const tarballBuffer = await download(tarballUrl);
    console.log(`[xarf] Downloaded ${(tarballBuffer.length / 1024).toFixed(1)} KB`);

    // Extract schemas from tarball
    console.log('[xarf] Extracting schemas...');
    await extractSchemas(tarballBuffer, version);

    // Write version info
    writeVersionInfo(version);

    console.log(`[xarf] Successfully fetched schemas for xarf-spec ${version}`);
  } catch (error) {
    console.error(`[xarf] Error fetching schemas: ${error.message}`);
    console.error('[xarf] You may need to run this script manually: npm run fetch-schemas');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  fetchSchemas().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { fetchSchemas, getConfiguredVersion };
