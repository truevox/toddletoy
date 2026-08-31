/**
 * Regression guard for offline PWA data loading.
 *
 * Cache-busting query strings (e.g. `/emojis.json?v=${Date.now()}`) defeat both the
 * Workbox precache (which matches on exact URL) and the runtime NetworkFirst cache
 * (which treats each unique query string as a fresh, uncached key). Offline, this
 * makes every data fetch fail and forces spawns to fall back to hardcoded constants
 * (🎯 Target, Circle, "A", White, 1).
 *
 * This test builds the production bundle and asserts no `.json` fetch URL in the
 * emitted output carries a query string, so this bug class cannot silently return.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('Production build: no cache-busted JSON fetch URLs', () => {
    const distDir = path.join(__dirname, '..', 'dist');

    beforeAll(() => {
        execSync('npm run build', { cwd: path.join(__dirname, '..'), stdio: 'pipe' });
    }, 60000);

    it('emits no bundle containing a .json?... fetch URL', () => {
        const assetsDir = path.join(distDir, 'assets');
        const jsFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.js'));
        expect(jsFiles.length).toBeGreaterThan(0);

        const offenders = [];
        for (const file of jsFiles) {
            const content = fs.readFileSync(path.join(assetsDir, file), 'utf-8');
            if (/\.json\?/.test(content)) {
                offenders.push(file);
            }
        }

        expect(offenders).toEqual([]);
    });
});
