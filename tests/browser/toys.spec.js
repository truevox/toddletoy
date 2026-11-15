import { test, expect } from '@playwright/test';
import { gotoSelector, skipOnboarding, collectErrors, ORRERY_CARD, GLOBE_CARD } from './helpers/app.js';

/**
 * Orrery (/orrery) and Globe (/globe) are separate canvas toys. The shared
 * checks are structural (container, no errors, a tap opens an info card, Back
 * returns to the selector, no leaked containers); the toy-specific blocks at
 * the bottom cover each toy's own play features.
 */
const TOYS = [
    { name: 'Orrery', card: ORRERY_CARD, route: /\/orrery$/, container: '#orrery-toy' },
    { name: 'Globe', card: GLOBE_CARD, route: /\/globe$/, container: '#globe-toy' },
];

/**
 * Select something in the toy and return the text of the info card it opens.
 * Orrery: tap the Sun in the middle of the canvas. Globe: tap points across
 * the canvas until one lands on a country (ocean taps open nothing).
 */
async function tapUntilInfoPanel(page, container) {
    const vp = page.viewportSize();
    const card = container === '#orrery-toy'
        ? page.locator('#orrery-toy .orr-card')
        : page.locator('#globe-toy .gt-card.gt-show');
    for (const fy of [0.5, 0.4, 0.6, 0.45, 0.55]) {
        for (const fx of [0.5, 0.4, 0.6, 0.3, 0.7]) {
            await page.mouse.click(vp.width * fx, vp.height * fy);
            try {
                await expect(card).toBeVisible({ timeout: 1200 });
                const text = (await card.textContent()).trim();
                // An ocean tap opens an "Ocean" card; keep looking for land.
                if (text && !/^\S*\s*Ocean$/.test(text)) return text;
            } catch { /* nothing selectable there; try the next point */ }
        }
    }
    return null;
}

for (const toy of TOYS) {
    test.describe(`${toy.name} toy`, () => {
        test.beforeEach(async ({ context }) => {
            await skipOnboarding(context);
        });

        test('loads from the selector without errors and shows one container + canvas', async ({ page }) => {
            const c = collectErrors(page);
            await gotoSelector(page);
            await page.locator(toy.card).click();
            await expect(page).toHaveURL(toy.route);
            await expect(page.locator(toy.container)).toBeVisible();
            await expect(page.locator(`${toy.container} canvas`).first()).toBeVisible();
            await expect(page.locator('#toy-mode-selector')).toBeHidden();
            expect(await page.locator(toy.container).count()).toBe(1);
            // Nothing from the sandbox leaks onto this screen.
            await expect(page.locator('.parent-exit-btn')).toBeHidden();
            expect(c.all()).toEqual([]);
        });

        test('can be opened directly by URL', async ({ page }) => {
            const c = collectErrors(page);
            await page.goto(toy.route.source.replace('\\/', '/').replace('$', ''));
            await expect(page.locator(toy.container)).toBeVisible();
            expect(c.all()).toEqual([]);
        });

        test('a tap reveals an info panel with text', async ({ page }) => {
            const c = collectErrors(page);
            await gotoSelector(page);
            await page.locator(toy.card).click();
            await expect(page.locator(`${toy.container} canvas`).first()).toBeVisible();
            await page.waitForTimeout(500); // first frame so hit-testing buffers are drawn
            const text = await tapUntilInfoPanel(page, toy.container);
            expect(text, 'no tap produced an info panel').toBeTruthy();
            expect(c.all()).toEqual([]);
        });

        test('Back returns to the selector and hides the toy', async ({ page }) => {
            await gotoSelector(page);
            await page.locator(toy.card).click();
            await expect(page.locator(toy.container)).toBeVisible();
            await page.locator(`${toy.container} button:has-text("Back")`).click();
            await expect(page).toHaveURL(/\/$/);
            await expect(page.locator('#toy-mode-selector')).toBeVisible();
            await expect(page.locator(toy.container)).toBeHidden();
        });

        test('navigating away and back 5 times leaves exactly one container', async ({ page }) => {
            const c = collectErrors(page);
            await gotoSelector(page);
            for (let i = 0; i < 5; i++) {
                await page.locator(toy.card).click();
                await expect(page.locator(toy.container)).toBeVisible();
                await page.locator(`${toy.container} button:has-text("Back")`).click();
                await expect(page.locator('#toy-mode-selector')).toBeVisible();
                await expect(page.locator(toy.container)).toBeHidden();
            }
            expect(await page.locator(toy.container).count()).toBe(1);
            expect(await page.locator('#toy-mode-selector').count()).toBe(1);
            expect(c.all()).toEqual([]);
        });
    });
}

test('switching between the two toys never shows both at once', async ({ page, context }) => {
    await skipOnboarding(context);
    await gotoSelector(page);
    await page.locator(ORRERY_CARD).click();
    await expect(page.locator('#orrery-toy')).toBeVisible();
    await page.locator('#orrery-toy button:has-text("Back")').click();
    await page.locator(GLOBE_CARD).click();
    await expect(page.locator('#globe-toy')).toBeVisible();
    await expect(page.locator('#orrery-toy')).toBeHidden();
});

test.describe('Solar System play features', () => {
    test.beforeEach(async ({ page, context }) => {
        await skipOnboarding(context);
        await page.goto('/orrery');
        await expect(page.locator('#orrery-toy canvas').first()).toBeVisible();
    });

    test('the planet strip selects a planet and the card names it', async ({ page }) => {
        await page.locator('#orrery-toy button[aria-label="Saturn"]').click();
        const card = page.locator('#orrery-toy .orr-card');
        await expect(card).toBeVisible();
        await expect(card).toContainText('Saturn');
        await page.locator('#orrery-toy button[aria-label="More facts"]').click();
        await expect(card).toContainText('not to scale');
    });

    test('pause, slower and faster are real buttons with touch-sized targets', async ({ page }) => {
        for (const label of ['Slower', 'Pause', 'Faster', 'Find it game', 'Compare planet sizes', 'Back to the toy menu']) {
            const box = await page.locator(`#orrery-toy button[aria-label="${label}"]`).boundingBox();
            expect(box, label).toBeTruthy();
            expect(Math.min(box.width, box.height), label).toBeGreaterThanOrEqual(44);
        }
    });

    test('compare sizes switches view and back without errors', async ({ page }) => {
        const c = collectErrors(page);
        const live = page.locator('#orrery-toy [aria-live]');
        await page.locator('#orrery-toy button[aria-label="Compare planet sizes"]').click();
        await expect(live).toContainText('Comparing real sizes');
        await page.locator('#orrery-toy button[aria-label="Compare planet sizes"]').click();
        await expect(live).toContainText('Back to the orbits');
        expect(c.all()).toEqual([]);
    });

    test('Find it asks for the Sun first and celebrates the right answer', async ({ page }) => {
        await page.locator('#orrery-toy button[aria-label="Find it game"]').click();
        const live = page.locator('#orrery-toy [aria-live]');
        await expect(live).toContainText(/Sun/);
        await page.locator('#orrery-toy button[aria-label="Sun"]').click();
        await expect(live).toContainText(/found/i);
    });
});

test.describe('World Globe play features', () => {
    test.beforeEach(async ({ page, context }) => {
        await skipOnboarding(context);
        await page.goto('/globe');
        await expect(page.locator('#globe-toy canvas').first()).toBeVisible();
        await expect(page.locator('#globe-toy')).toHaveAttribute('data-lon', /.+/);
    });

    test('tapping a country selects it, fills the card and stamps the passport', async ({ page }) => {
        const text = await tapUntilInfoPanel(page, '#globe-toy');
        expect(text).toBeTruthy();
        await expect(page.locator('#globe-toy .gt-badge')).toHaveText('1');
        // The passport survives a reload.
        await page.reload();
        await expect(page.locator('#globe-toy .gt-badge')).toHaveText('1');
    });

    test('dragging turns the globe', async ({ page }) => {
        const root = page.locator('#globe-toy');
        const lon0 = await root.getAttribute('data-lon');
        const vp = page.viewportSize();
        await page.mouse.move(vp.width * 0.5, vp.height * 0.5);
        await page.mouse.down();
        await page.mouse.move(vp.width * 0.3, vp.height * 0.5, { steps: 8 });
        await page.mouse.up();
        await expect(root).not.toHaveAttribute('data-lon', lon0);
    });

    test('zoom buttons zoom in and home returns to the whole globe', async ({ page }) => {
        const root = page.locator('#globe-toy');
        const zoom = async () => Number(await root.getAttribute('data-zoom'));
        const z0 = await zoom();
        await page.locator('#globe-toy button[aria-label="Zoom in"]').click();
        await expect.poll(zoom).toBeGreaterThan(z0);
        await page.locator('#globe-toy button[aria-label="Zoom out all the way"]').click();
        await expect.poll(zoom).toBeCloseTo(z0, 1);
    });

    test('Find it starts a round with a spoken-style prompt', async ({ page }) => {
        await page.locator('#globe-toy .gt-find').click();
        await expect(page.locator('#globe-toy')).toHaveAttribute('data-game', /.+/);
        await expect(page.locator('#globe-toy [role="status"]')).toContainText(/find/i);
    });
});
