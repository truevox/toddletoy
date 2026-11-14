# Project Context

ToddleToy is a Montessori-aligned, multi-sensory interactive learning PWA for toddlers (ages 1–4+). Children tap, click, or drag to spawn interactive elements that respond with visual shapes/emojis, position-based synthesized audio tones, spoken labels in 13 languages, and particle effects. The app runs entirely client-side with no backend, collects no data, and works offline.

## Technology Profile

- **Language:** JavaScript (ES6+ modules) — no TypeScript
- **Game Engine:** Phaser 3 (`^3.70.0` in package.json; 3.90 in the lockfile). Canvas-based rendering, scene lifecycle, input handling
- **Build Tool:** Vite 5 (`^5.0.0`; dev server on port 4001, `dist/` output)
- **Unit Testing:** Jest 29 with `jest-environment-jsdom` and Babel transpilation
- **E2E Testing:** Playwright (`@playwright/test`, five projects: Chromium, Firefox, WebKit, Pixel 5, iPhone 12)
- **Linting:** ESLint 8
- **Git Hooks:** Husky 9.1.7
- **PWA:** Service worker `sw.js`, built by `vite-plugin-pwa` (injectManifest) with precaching and runtime caching; web manifest at `public/manifest.json`

## Architectural Patterns

- **Entry point:** `src/main.js` registers the service worker (production builds only), wires the update flow, and creates `AppRoutes`.
- **Screens and toys:** `src/routes/routes.js` shows the toy selector, config screen, sandbox, Solar System and Globe. The sandbox's Phaser game (`src/game.js`, `GameScene`) and the two canvas toys are loaded lazily.
- **Game logic:** `src/game.js` is the `GameScene` Phaser scene class, now mostly a coordinator; the logic lives in `src/game/`. See `docs/README.md` for the module map.
- **Manager/System pattern:** Each concern lives in its own class under `src/game/systems/` (e.g., `AudioManager.js`, `InputManager.js`, `SpeechManager.js`, `ParticleManager.js`). Keep managers single-responsibility and under 300 lines.
- **Object lifecycle:** `src/game/objects/ObjectLifecycle.js` handles spawning, announcing and removal; `src/game/objects/ObjectManager.js` tracks object state.
- **Configuration:** `src/config/ConfigManager.js` persists user settings through `src/utils/safeStorage.js` (localStorage with an in-memory fallback). Config UI sections live in `src/config/ui/`.
- **Routing:** `src/routes/Router.js` and `src/routes/routes.js` handle navigation.
- **Positioning/collision:** `src/positioning/PositioningSystem.js`.
- **Utilities:** `src/utils/` for language helpers, platform detection, and error reporting.
- **Static assets:** `public/` holds `emojis.json`, `things.json`, `manifest.json` and `icons/`. The Kaktovik font lives in `fonts/`.
- **Service worker:** `sw.js` at project root is the source; `vite-plugin-pwa` (configured in `vite.config.js`) builds it into `dist/sw.js`.
- **Tests:** `tests/` directory with unit tests at root level (and `tests/unit/`) and E2E tests in `tests/browser/`. `tests/setup.js` mocks `AudioContext`, `speechSynthesis`, `SpeechSynthesisUtterance` and `HTMLCanvasElement.getContext`.

## Coding Standards

- Match the indentation of the file you are editing (the codebase mixes 2- and 4-space indentation).
- Use **camelCase** for variables, functions, and methods.
- Use **PascalCase** for class names and manager/component file names (e.g., `AudioManager.js`). The toy modules are the exception: `src/toys/globe-*.js` and `orrery-*.js` use lowercase kebab-case.
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
- **Mock setup:** `tests/setup.js` provides global mocks for `AudioContext`, `speechSynthesis`, `SpeechSynthesisUtterance` and `HTMLCanvasElement.getContext`.
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
- **Never bypass the version bump rule.** Update the version in `package.json` before any commit that ships behavioral changes. The `sw.js` cache name is derived from that version at build time, so it needs no separate edit.
- **Do not delete content during refactors.** Follow the zero-loss principle: reorganize without removing substance.
- **Avoid files over 300 lines.** Split into focused modules instead.
- **Do not commit build output (`dist/`), `node_modules/`, or temporary files.** Verify `.gitignore` before every commit.
