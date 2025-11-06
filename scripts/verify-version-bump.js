#!/usr/bin/env node

/**
 * Pre-commit hook to verify version was bumped
 *
 * CLAUDE.md requirement: "ALWAYS BUMP THE VERSION NUMBER BEFORE YOU TELL ME
 * SOMETHING IS FIXED OR IMPLEMENTED OR NEEDS TESTING OR BEFORE A COMMIT!"
 *
 * This script ensures version in package.json was incremented for code changes.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Read current package.json version
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;

console.log(`📦 Current version in package.json: ${currentVersion}`);

// Get last committed version
let lastCommittedVersion;
try {
    const lastPackageJson = execSync('git show HEAD:package.json', { encoding: 'utf8' });
    lastCommittedVersion = JSON.parse(lastPackageJson).version;
    console.log(`📜 Last committed version: ${lastCommittedVersion}`);
} catch (error) {
    // No previous commit (initial commit)
    console.log('✅ Initial commit - no version check needed');
    process.exit(0);
}

// Get staged files
const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);

// Check if staged files include code changes (not just docs/config)
const codeChanges = stagedFiles.some(file =>
    file.startsWith('src/') ||
    file.startsWith('tests/') ||
    file.endsWith('.js') ||
    file.endsWith('.css') ||
    file.endsWith('.html') ||
    file === 'package.json'
);

// Exclude documentation-only changes
const isDocsOnly = stagedFiles.every(file =>
    file.startsWith('docs/') ||
    file.endsWith('.md') ||
    file.endsWith('.txt') ||
    file === 'README.md' ||
    file === 'CLAUDE.md' ||
    file === 'CLAUDE-TODO.md' ||
    file === 'CLAUDE-TODONE.md'
);

if (isDocsOnly) {
    console.log('ℹ️  Documentation-only changes - skipping version check');
    process.exit(0);
}

if (!codeChanges) {
    console.log('ℹ️  No code changes detected - skipping version check');
    console.log('   (Only config/docs changes)');
    process.exit(0);
}

// Compare versions
if (currentVersion === lastCommittedVersion) {
    console.error('\n❌ ERROR: Version not bumped!');
    console.error(`   Current version: ${currentVersion}`);
    console.error(`   Last commit version: ${lastCommittedVersion}`);
    console.error('\n   CLAUDE.md requires version bump with EVERY code commit.');
    console.error('   Please update version in package.json before committing.\n');
    console.error('   Example: 1.0.45 → 1.0.46\n');
    process.exit(1);
}

// Verify version is higher (semantic versioning check)
const current = currentVersion.split('.').map(Number);
const last = lastCommittedVersion.split('.').map(Number);

let isHigher = false;
for (let i = 0; i < 3; i++) {
    if (current[i] > last[i]) {
        isHigher = true;
        break;
    }
    if (current[i] < last[i]) {
        break;
    }
}

if (!isHigher) {
    console.error('\n❌ ERROR: New version must be higher than previous!');
    console.error(`   Current: ${currentVersion}`);
    console.error(`   Previous: ${lastCommittedVersion}`);
    console.error('\n   Please use a higher version number.\n');
    process.exit(1);
}

console.log(`✅ Version bumped: ${lastCommittedVersion} → ${currentVersion}`);
console.log('✅ Pre-commit check passed!\n');
process.exit(0);
