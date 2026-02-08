# Project Context

ToddleToy is a Montessori-aligned, multi-sensory interactive learning PWA for toddlers (ages 1–4+). Children tap, click, or drag to spawn interactive elements that respond with visual shapes/emojis, position-based synthesized audio tones, spoken labels in 13 languages, and particle effects. The app runs entirely client-side with no backend, collects no data, and works offline.

## Technology Profile

- **Language:** JavaScript (ES6+ modules) — no TypeScript
- **Game Engine:** Phaser 3.70.0 (canvas-based rendering, scene lifecycle, input handling)
- **Build Tool:** Vite 5.0.0 (dev server on port 4001, `dist/` output)
- **Unit Testing:** Jest 29 with `jest-environment-jsdom` and Babel transpilation
- **E2E Testing:** Playwright 1.53.1 (Chromium, Firefox, WebKit)
- **Linting:** ESLint 8
- **Git Hooks:** Husky 9.1.7
- **PWA:** Custom service worker (`sw.js`) with cache-first strategy, `manifest.json`

## Architectural Patterns

- **Entry point:** `src/main.js` registers the service worker and bootstraps the Phaser game.
- **Game logic:** `src/game.js` contains the main `GameScene` Phaser scene class.
- **Manager/System pattern:** Each concern lives in its own class under `src/game/systems/` (e.g., `AudioManager.js`, `InputManager.js`, `SpeechManager.js`, `ParticleManager.js`). Keep managers single-responsibility and under 300 lines.
- **Object lifecycle:** `src/game/objects/ObjectManager.js` handles spawning and cleanup.
- **Configuration:** `src/config/ConfigManager.js` persists user settings to `localStorage`. Config UI sections live in `src/config/ui/`.
- **Routing:** `src/routes/Router.js` and `src/routes/routes.js` handle navigation.
- **Positioning/collision:** `src/positioning/PositioningSystem.js`.
- **Utilities:** `src/utils/` for language helpers, platform detection, and error reporting.
- **Static assets:** `public/` holds `emojis.json`, `things.json`, and icons. Custom fonts live in `fonts/`.
- **Service worker:** `sw.js` at project root; Vite copies it to `dist/` on build via a custom plugin in `vite.config.js`.
- **Tests:** `tests/` directory with unit tests at root level and E2E tests in `tests/browser/`. Test setup mocks Web Audio, Speech Synthesis, and Canvas APIs in `tests/setup.js`.

## Coding Standards

- Use **2-space indentation**.
- Use **camelCase** for variables, functions, and methods.
- Use **PascalCase** for class names and manager/component file names (e.g., `AudioManager.js`).
- Use **ES6 module syntax** (`import`/`export`); never use CommonJS `require()` in source files.
- Prefer `const` over `let`; avoid `var`.
- Use `async`/`await` over raw Promise chains.
- Wrap fallible operations in `try`/`catch` and log errors with `console.error` and contextual messages — never swallow errors silently.
- Keep source files under **300 lines**. Extract new managers or utility modules when a file grows beyond this threshold.
- Add JSDoc comments for public class methods and non-obvious logic.
- Use `Map` and `Set` for dynamic key-value and unique-collection state.
- Follow the existing manager constructor pattern: accept dependencies (e.g., the Phaser `scene`) as constructor arguments.

## Testing Strategy

- **Unit tests:** Place test files in `tests/` with the naming convention `<feature>.test.js`. Use Jest with the jsdom environment.
- **E2E tests:** Place Playwright specs in `tests/browser/` with the `.spec.js` extension.
- **Run unit tests:** `npm test`
- **Run E2E tests:** `npm run test:e2e`
- **Run all tests:** `npm run test:all`
- **Mock setup:** `tests/setup.js` provides global mocks for `AudioContext`, `speechSynthesis`, `HTMLCanvasElement.getContext`, and other browser APIs not available in jsdom.
- **TDD workflow:** Write a failing test first, implement just enough code to pass it, then refactor. Never modify a test solely to make it pass.
- Test template:
  ```javascript
  describe('FeatureName', () => {
    beforeEach(() => { /* setup */ });

    test('should do X when given Y', () => {
      const instance = new ClassName(mockDep);
      expect(instance.method(input)).toBe(expectedOutput);
    });
  });
  ```

## Negative Constraints

- **No hardcoded secrets or API keys.** The app is fully client-side with zero external service calls.
- **No data collection.** Never add analytics, tracking pixels, or any network requests that transmit user data.
- **No external links in the game UI.** The app must be child-safe; all navigation stays within the PWA.
- **No `console.log` in production code.** Use `console.error` or `console.warn` only for genuine error/warning conditions.
- **No TypeScript** — the project uses plain JavaScript. Do not introduce `.ts` or `.tsx` files.
- **No class components or framework-specific UI libraries** — all rendering goes through Phaser's scene graph.
- **Never bypass the version bump rule.** Update the version in `package.json` (and keep `sw.js` cache name in sync) before any commit that ships behavioral changes.
- **Do not delete content during refactors.** Follow the zero-loss principle: reorganize without removing substance.
- **Avoid files over 300 lines.** Split into focused modules instead.
- **Do not commit build output (`dist/`), `node_modules/`, or temporary files.** Verify `.gitignore` before every commit.
