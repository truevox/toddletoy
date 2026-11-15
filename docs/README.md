# ToddleToy architecture

This describes how the app is built today: the routes and screens, the sandbox engine and its modules, configuration, the two canvas toys, the PWA layer and the test layers. Paths are relative to the repository root. For product behaviour see [../README.md](../README.md); for setup and conventions see [../CONTRIBUTING.md](../CONTRIBUTING.md); for every settings option see [CONFIG-GUIDE.md](./CONFIG-GUIDE.md).

## Stack

- Vite 5 with `vite-plugin-pwa` (injectManifest strategy) and plain JavaScript ES modules.
- Phaser 3 for the sandbox (`phaser` in `package.json` is `^3.70.0`; the lockfile resolves 3.90).
- Web Audio, Web Speech API (`speechSynthesis`) and DOM/Canvas 2D for the two canvas toys.
- `topojson-client` and `world-atlas` for the globe's country outlines (bundled, not fetched).
- No backend, no runtime network requests. The Kaktovik font is served from `fonts/`.

## Entry point and routes

`index.html` loads `src/main.js`. `main.js` registers the service worker (production builds only), wires the update flow, and on `DOMContentLoaded` creates `AppRoutes` (`src/routes/routes.js`). `AppRoutes` owns a `Router` (`src/routes/Router.js`), registers the routes below and renders one screen at a time. The page title changes per screen.

| Path | Screen | Notes |
| --- | --- | --- |
| `/` | `ToyModeSelector` (`src/modes/ToyModeSelector.js`) | Three cards. Sandbox goes to `/toy` if skip-config is on, otherwise to `/config`. Solar System goes to `/orrery`, Globe to `/globe`. |
| `/config` | `ConfigScreen` | Redirects to `/toy` when `advanced.skipConfig` is true. |
| `/toy` | Sandbox (Phaser) | Locked. Reachable only after `/config` or the selector grants access; otherwise redirects to `/`. |
| `/orrery` | `OrreryToy` | Lazy-loaded. |
| `/globe` | `GlobeToy` | Lazy-loaded. |
| `/admin` | `ConfigScreen` (admin) | Always shows the settings screen, even when skip-config is on. |

### Screen lifecycle

- Each screen has `show()` and `hide()`. `AppRoutes.hideCurrentScreen()` hides whatever `currentScreen` is before a new one shows.
- Leaving the sandbox stops speech and tones, then pauses the Phaser scene. Returning resumes the scene and resets toy state.
- The sandbox's hold-to-exit control (`src/ui/ParentExitButton.js`) is shown only on `/toy`. Holding it for 2 seconds calls `exitToy()`, which clears the scene and navigates to `/`.
- Lazy loading: the game bundle (`src/game.js`) is imported on first open of the sandbox and warmed while the settings screen is open. `OrreryToy.js` and `GlobeToy.js` are loaded with dynamic `import()` the first time their routes are visited. Keeping them out of the entry chunk keeps first load small.

### Router lock

While on `/toy`, the router blocks back/forward (popstate) navigation and blocks unknown paths, replacing them with `/toy`. A programmatic `navigate()` to a registered route unlocks the toy and proceeds. On a reload from `/toy` with saved state and config present, `Router` keeps the toy access so the child returns to the sandbox.

## Sandbox engine (`/toy`)

`src/game.js` exports `GameScene`, a Phaser scene that is now mostly a coordinator: almost every method is a one-line delegate to a module that receives the scene in its constructor. The Phaser game itself is created by `ResponsiveGameManager` (`src/game/ResponsiveGameManager.js`), which also handles visibility, WebGL and resize. `game.js` re-exports it as `ToddlerToyGame`, which is what `routes.js` instantiates.

Modules and what each owns (from their file headers):

| Module | Owns |
| --- | --- |
| `game/systems/InputManager.js` | Unified pointer, keyboard and gamepad input; emits `input:*` events on the scene. |
| `game/systems/SceneInputHandler.js` | Reacts to input events: spawn-or-drag decision, dragging, key and gamepad handling. |
| `game/systems/ContentSelector.js` | Random choice of type, emoji, shape, letter, colour and number from the enabled content. |
| `game/objects/ObjectLifecycle.js` | Spawning, announcing and removing objects. |
| `game/objects/ObjectFactory.js` | Builds the primary display object (text, emoji, or shape). |
| `game/objects/ShapeFactory.js` | Builds the container for shape toys (circle, square, triangle, star, diamond, heart). |
| `game/objects/ObjectManager.js` | Tracking and cleanup of all live objects. |
| `game/systems/RenderManager.js` | Text labels, numerals and the display systems. |
| `game/systems/TextLayoutManager.js` | Responsive text size and per-language label positions. |
| `game/systems/NumberModeRenderer.js` | Draws the alternate numeral systems for a number object. |
| `game/systems/NumberModeLayout.js` | Non-overlapping vertical stack for rows above a numeral. |
| `game/systems/ObjectCountingRenderer.js` | Place-value stacks of apples, bags, boxes and trucks. |
| `game/systems/CistercianGlyph.js` | Pure model of Cistercian numerals (line segments). |
| `game/systems/CistercianNumeral.js` | Phaser drawing layer for Cistercian numerals. |
| `game/systems/FontManager.js` | Preloads the Kaktovik font. |
| `game/systems/SpeechManager.js` | Speech queue, word highlighting and language sequencing. |
| `game/systems/AudioManager.js` | Web Audio tones that follow object position. |
| `game/systems/ParticleManager.js` | Spawn bursts, drag trails and word sparkles. |
| `game/systems/EffectRenderer.js` | Cleanup effects and fallback graphics. |
| `game/systems/MovementManager.js` | Smooth movement of objects; clamps them to the visible area. |
| `positioning/BoundsClamp.js` | Keeps a whole composite (glyph, labels, number rows) inside the screen; keep-out rectangles. |
| `positioning/PositioningSystem.js` | Collision checks between number-mode components. |
| `game/systems/AutoCleanupManager.js` | Removes objects not touched for the configured time. |
| `game/systems/GameStateStore.js` | Saves and restores objects; resets toy state. |
| `game/systems/GridModeController.js`, `GridManager.js`, `GridFit.js` | Grid mode: fixed cells, overlay, per-cell spawning, and fitting objects to cells on resize. |
| `game/utils/*` | Localisation helpers, number-range generation, outline colour. |

### Spawn flow

1. **Input.** `InputManager` emits `input:pointerDown` with the canvas coordinates.
2. **Decision.** `SceneInputHandler` checks grid mode first (map the point to a cell, spawn there). In free-form mode, a tap on empty space spawns only if nothing is being spoken and at least 200 ms have passed since the last move. A tap on an object starts a drag, subject to a post-spawn lock (the triggering input must be released and 200 ms must pass).
3. **Type.** `ObjectLifecycle.spawnObjectAt` calls `selectSpawnType()`, a weighted pick over the enabled content types in `config.content`.
4. **Content.** `ContentSelector` returns the item. Letters and shapes get a colour from the enabled colour categories.
5. **Object.** `ObjectFactory` builds the display object; the object gets an `id` and `lastTouchedTime` and is pushed onto `scene.objects`.
6. **Number rows.** For numbers, `NumberModeRenderer` draws any enabled alternate systems (binary hearts, Kaktovik, Cistercian, and the object-counting or apples views) and stacks them with `NumberModeLayout`.
7. **Labels.** `RenderManager.displayTextLabels` adds one label per enabled language, offset by the component layout.
8. **Bounds.** `keepObjectInBounds` pulls the whole composite inside the visible area, avoiding the parent-exit corner.
9. **Saved state.** The spawn timestamps are set and `saveGameState()` writes the list.
10. **Announce.** `announceObject` (called by `spawnAndAnnounce`) speaks the labels through `SpeechManager`, starts a continuous tone through `AudioManager` at the object's position, and fires a particle burst.

Other paths: `handleScaleResize` (orientation or window change) remaps positions proportionally, clamps every object, and saves. `AutoCleanupManager.checkAutoCleanup` runs from the scene's `update()` once a second.

### Saved sandbox state

`GameStateStore` writes `toddleToyGameState` as `{ objects: [{ id, x, y, text, itemData, type, lastTouchedTime }], timestamp }`. It removes the key when there are no objects. `create()` restores it through `restoreObject`.

## Configuration

- **Screen:** `src/config/ConfigScreen.js` builds the page from sections in `src/config/ui/`: `ContentTypes`, `EmojiCategories`, `LanguageSection` (drag-and-drop language order), `AdvancedSection`, `ParentGuidance`, `PlayingTips`, and `PWAInstall`. `ConfigForm.js` loads values into the form and collects them back; `ConfigEvents.js` wires buttons and sliders; `domHelpers.js` makes lookups null-tolerant so a missing element disables one control rather than the whole screen.
- **Help:** `HelpSystem.js` coordinates `src/config/help/` (topics, modals, icons, documentation viewer). Help text is in `DocumentationContent.js` and `HelpTopics.js`.
- **Manager:** `src/config/ConfigManager.js` stores the config under `toddleToyConfig` through `safeStorage`. The helpers in `src/config/manager/` do the work: `ConfigDefaults.js` (defaults), `ConfigMigration.js` (migrate saved config and merge it with defaults), `ConfigValidation.js`, and `ConfigWeights.js` (weight calculations).
- **Shape:** top-level keys are `content`, `emojiCategories`, `colorCategories`, `languages` (`enabled` and `available`), `audio`, `speech`, `advanced` (`skipConfig`, `numberModes`, `autoCleanup`) and `gridMode`.
- **Constants:** `src/config/constants.js` holds language flags, difficulty ranks and learning-hour estimates.
- **Dev only:** in development mode `clearToddleToyCache()` is exposed on `window`, and a force-refresh clears the stored config.

## Canvas toys

### Solar System (`/orrery`)

`src/toys/OrreryToy.js` is the class (`show`, `hide`, `destroy`). Behaviour lives in `orrery-actions.js` (selection, camera follow, speed, compare view, Find it, keyboard); DOM in `orrery-ui.js` and `orrery-css.js`. Pure modules: `orrery-data.js` (bodies, real orbital periods, facts), `orrery-time.js` (time model and scrub gesture), `orrery-camera.js`, `orrery-layout.js`, `orrery-math.js`, `orrery-compare.js`, `orrery-game.js` (Find it state machine), `orrery-gesture.js` (tap, drag and pinch classifier). Drawing: `orrery-render.js` and `orrery-render-compare.js` on top of cached sprites from `orrery-sprites.js` and `orrery-paint.js`, with background life from `orrery-sky.js`. Sound: `orrery-audio.js`. Speech goes through `toy-speech.js`.

### World Globe (`/globe`)

`src/toys/GlobeToy.js` is the class. `globe-play.js` is the play layer (Surprise me, Find it, passport, hints, keyboard), `globe-ui.js` the DOM and `globe-style.js` the scoped CSS. `globe-data.js` decodes the Natural Earth 1:110m outlines lazily and memoises them. Pure maths and logic: `globe-math.js` (spherical projection), `globe-anim.js` (easing, fly-to, zoom clamps), `globe-input.js` (drag, pinch, tap, double-tap), `globe-pick.js` (tap to country, with snapping for small islands), `globe-game.js` (Find it state and weighted country pick), `globe-labels.js` (non-overlapping labels), `globe-layout.js` (portrait and landscape). Presentation: `globe-render.js` (canvas), `globe-fx.js` (particle pool), `globe-audio.js`, `globe-names.js` (flags and ISO codes), `globe-intl.js` (localised names through `Intl.DisplayNames` with English fallback), `globe-meta.js` (continent and capital), `globe-passport.js`.

Globe storage: `toddletoy_globe_passport_v1` (visited countries) and `toddletoy_globe_learned_v1`, both through `safeStorage`.

## PWA and service worker

- `index.html` links `/manifest.json` (`public/manifest.json`) and the icons in `public/icons/`.
- `vite.config.js` uses `VitePWA({ strategies: 'injectManifest', srcDir: '.', filename: 'sw.js', injectRegister: false, manifest: false })`. The service worker source is the root `sw.js`; the build injects the precache manifest into it and writes `dist/sw.js`.
- Precache covers `**/*.{js,css,html,ico,png,svg,json,woff2,ttf,otf}` from the build, except `emojis.json` and `things.json`, which are bundled into the JavaScript at build time and never fetched.
- Runtime routes in `sw.js`: navigations serve `/index.html`; scripts, styles and workers use StaleWhileRevalidate; fonts use CacheFirst (30 days); local `.json` uses NetworkFirst with a 3-second timeout. Cache names include the app version (`toddler-toy-v<version>`), which comes from `package.json` at build time. Caches from older versions are deleted on activate.
- `src/main.js` registers `/sw.js` on `load`, only when `import.meta.env.PROD` is true, so `npm run dev` has no service worker. It checks for updates every 60 minutes. When a new worker is installed it changes the `#update-app-btn` label to "Update Now". The button (in the settings screen) dispatches `app-update-requested`; `main.js` then posts `SKIP_WAITING` to the waiting worker and reloads on `controllerchange`. It reloads only if the page already had a controller at load, so a first visit is not interrupted.
- `netlify.toml` configures the hosted build: it publishes `dist/`, rewrites all paths to `/index.html`, and sets the manifest content type and long-lived caching for `*.js`.

## Testing layers

| Layer | Where | Runs with |
| --- | --- | --- |
| Lint | `src/` (ESLint 8 config in `.eslintrc.cjs`) | `npm run lint` |
| Unit | `tests/*.test.js`, `tests/unit/*.test.js` (Jest, jsdom, Babel) | `npm test` |
| End-to-end | `tests/browser/*.spec.js` (Playwright, five projects) | `npm run test:e2e:ci` (desktop + mobile Chromium), `npm run test:e2e` (all five) |
| Version gate | `scripts/verify-version-bump.js` via `.husky/pre-commit` | every commit |

`tests/setup.js` provides global stand-ins for `AudioContext`, `speechSynthesis`, `SpeechSynthesisUtterance` and `HTMLCanvasElement.getContext`. Playwright builds the app and serves the production bundle with `vite preview` itself. CI (`.github/workflows/ci.yml`) runs lint, unit tests and the build, then the Chromium end-to-end suite.
