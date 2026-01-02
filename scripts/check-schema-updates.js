#!/usr/bin/env node
/**
 * Check for updates to the xarf-spec schemas
 *
 * Compares the configured version in package.json against the latest
 * release on GitHub and reports if an update is available.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const GITHUB_REPO = 'xarf/xarf-spec';
const PACKAGE_JSON = path.join(__dirname, '..', 'package.json');
const SCHEMAS_DIR = path.join(__dirname, '..', 'schemas');

/**
 * Get the configured xarf-spec version from package.json
 * @returns {string} Version string (e.g., "v4.1.0")
 */
function getConfiguredVersion() {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf-8'));
  return pkg.xarfSpec?.version || null;
}

/**
 * Get the installed version from the .version file
 * @returns {string|null} Version string or null if not installed
 */
function getInstalledVersion() {
  const versionFile = path.join(SCHEMAS_DIR, '.version');
  if (!fs.existsSync(versionFile)) {
    return null;
  }
  try {
    const info = JSON.parse(fs.readFileSync(versionFile, 'utf-8'));
    return info.version || null;
  } catch {
    return null;
  }
}

/**
 * Fetch the latest release version from GitHub
 * @returns {Promise<{version: string, date: string, url: string}>}
 */
function getLatestRelease() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_REPO}/releases/latest`,
      headers: {
        'User-Agent': 'xarf-javascript',
        Accept: 'application/vnd.github.v3+json',
      },
    };

    const request = https.get(options, (response) => {
      if (response.statusCode === 404) {
        reject(new Error('No releases found'));
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`GitHub API returned ${response.statusCode}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString());
          resolve({
            version: data.tag_name,
            date: data.published_at,
            url: data.html_url,
          });
        } catch (error) {
          reject(new Error('Failed to parse GitHub response'));
        }
      });
      response.on('error', reject);
    });

    request.on('error', reject);
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Fetch all releases from GitHub
 * @returns {Promise<Array<{version: string, date: string}>>}
 */
function getAllReleases() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_REPO}/releases`,
      headers: {
        'User-Agent': 'xarf-javascript',
        Accept: 'application/vnd.github.v3+json',
      },
    };

    const request = https.get(options, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`GitHub API returned ${response.statusCode}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString());
          resolve(
            data.map((r) => ({
              version: r.tag_name,
              date: r.published_at,
            }))
          );
        } catch (error) {
          reject(new Error('Failed to parse GitHub response'));
        }
      });
      response.on('error', reject);
    });

    request.on('error', reject);
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Compare semantic versions
 * @param {string} a - Version string (e.g., "v4.1.0")
 * @param {string} b - Version string (e.g., "v4.0.0")
 * @returns {number} -1 if a < b, 0 if a == b, 1 if a > b
 */
function compareVersions(a, b) {
  const parseVersion = (v) => {
    const match = v.match(/v?(\d+)\.(\d+)\.(\d+)/);
    if (!match) return [0, 0, 0];
    return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
  };

  const [aMajor, aMinor, aPatch] = parseVersion(a);
  const [bMajor, bMinor, bPatch] = parseVersion(b);

  if (aMajor !== bMajor) return aMajor > bMajor ? 1 : -1;
  if (aMinor !== bMinor) return aMinor > bMinor ? 1 : -1;
  if (aPatch !== bPatch) return aPatch > bPatch ? 1 : -1;
  return 0;
}

/**
 * Format a date string
 * @param {string} isoDate - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const showAll = args.includes('--all') || args.includes('-a');

  console.log('[xarf] Checking for schema updates...\n');

  const configuredVersion = getConfiguredVersion();
  const installedVersion = getInstalledVersion();

  if (!configuredVersion) {
    console.error('[xarf] Error: xarfSpec.version not found in package.json');
    process.exit(1);
  }

  console.log(`  Configured version: ${configuredVersion}`);
  console.log(`  Installed version:  ${installedVersion || '(not installed)'}`);

  if (installedVersion && installedVersion !== configuredVersion) {
    console.log('\n  ⚠️  Installed version differs from configured version.');
    console.log('     Run "npm run fetch-schemas" to sync.\n');
  }

  try {
    const latest = await getLatestRelease();
    console.log(`  Latest release:     ${latest.version} (${formatDate(latest.date)})`);

    const comparison = compareVersions(latest.version, configuredVersion);

    if (comparison > 0) {
      console.log('\n  ✨ Update available!');
      console.log(`     ${configuredVersion} → ${latest.version}`);
      console.log(`\n  To update, edit package.json:`);
      console.log(`     "xarfSpec": { "version": "${latest.version}" }`);
      console.log(`  Then run: npm install`);
      console.log(`\n  Release notes: ${latest.url}`);
    } else if (comparison === 0) {
      console.log('\n  ✅ You are using the latest version.');
    } else {
      console.log('\n  ℹ️  You are using a newer version than the latest release.');
    }

    if (showAll) {
      console.log('\n  Available releases:');
      const releases = await getAllReleases();
      for (const release of releases.slice(0, 10)) {
        const marker = release.version === configuredVersion ? ' ← configured' : '';
        console.log(`     ${release.version} (${formatDate(release.date)})${marker}`);
      }
    }
  } catch (error) {
    console.error(`\n[xarf] Error checking for updates: ${error.message}`);
    console.error('[xarf] This may be due to GitHub API rate limiting.');
    process.exit(1);
  }
}

main();
