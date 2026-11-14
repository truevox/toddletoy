# Contributing to ToddleToy

This is the practical guide for working on the code. For the product itself see [README.md](./README.md); for how the app is put together see [docs/README.md](./docs/README.md).

## Prerequisites

- Node 20 (CI and the Netlify build use 20; `.nvmrc` still says 18, so prefer 20).
- npm (ships with Node).
- For end-to-end tests only: Chromium, installed with `npx playwright install chromium`.

## Commands

Run these from the repository root after `npm install`. Every command below is defined in `package.json`.

| Command | What it does |
| --- | --- |
| `npm install` | Installs dependencies and sets up the Husky git hooks (`prepare`). |
| `npm run dev` | Vite dev server on http://localhost:4001. No service worker in dev. |
| `npm run build` | Production build into `dist/`, including the service worker. |
| `npm run preview` | Serves the production build locally. |
| `npm test` | Jest unit tests (jsdom). |
| `npm run test:e2e` | Playwright specs in `tests/browser/` across all five projects (Chromium, Firefox, WebKit, Pixel 5, iPhone 12). Needs every browser installed. |
| `npm run test:e2e:chromium` | Same specs, Chromium only. This is what CI runs. |
| `npm run test:all` | `npm test` followed by `npm run test:e2e`. |
| `npm run lint` | ESLint over `src/`. |

The Playwright config starts `npm run dev` itself (reusing a running server outside CI), so you do not need a server running first.

## Project layout

```
src/
  main.js              entry: service worker registration and update flow, starts AppRoutes
  routes/              Router.js (history, toy lock), routes.js (screens, lazy imports)
  modes/               ToyModeSelector.js, the "/" screen with the three toy cards
  config/              ConfigScreen.js, ConfigManager.js, HelpSystem.js, constants.js
    ui/                form sections (content types, languages, advanced, ...)
    help/              help topics, modals, icons, documentation viewer
    manager/           defaults, migration, validation, weights for ConfigManager
  game.js              GameScene (Phaser scene for the sandbox), kept as a thin coordinator
  game/
    ResponsiveGameManager.js   creates the Phaser game and handles resize/visibility
    systems/           one class per concern: input, speech, audio, particles, grid, ...
    objects/           spawning, object state, shape construction
    utils/             localization, number ranges, colour helpers
  positioning/         BoundsClamp.js (keep objects on screen), PositioningSystem.js
  toys/                Solar System (OrreryToy.js + orrery-*.js) and World Globe
                       (GlobeToy.js + globe-*.js); toy-speech.js is shared by both
  ui/                  ParentExitButton.js (hold-to-exit), ResourceBar.js
  utils/               safeStorage.js, languageUtils.js, platformUtils.js, ErrorReporter.js
public/
  emojis.json          emoji content (see "Adding content")
  things.json          colours, shapes, letters, numbers, flags, languages
  manifest.json        web app manifest
  icons/               app icons
fonts/                 GentiumKaktovik.ttf (Kaktovik numerals) and its OFL licence
tests/
  *.test.js            Jest unit tests (also tests/unit/*.test.js)
  setup.js             global mocks for AudioContext, speechSynthesis, canvas
  browser/*.spec.js    Playwright end-to-end specs
sw.js                  service worker source; vite-plugin-pwa (injectManifest) builds it
```

## Conventions

- Plain JavaScript with ES modules. No TypeScript, no framework UI libraries; rendering goes through Phaser or ordinary DOM.
- Manager classes take the scene (or toy, or screen) in their constructor, so tests can pass mocks.
- Keep pure logic in its own module with no DOM or Phaser imports (for example `globe-math.js`, `orrery-time.js`, `CistercianGlyph.js`, `numberRangeGenerator.js`) so it can be unit-tested directly.
- Keep files roughly under 300 lines. Several files are still larger; do not grow them further, split them.
- All storage goes through `src/utils/safeStorage.js`. It never throws and falls back to memory, so do not call `localStorage` directly.
- Speech must degrade silently. Speech and audio code must never throw when the browser lacks voices or an AudioContext (see `toy-speech.js`).
- Input handlers must never throw. An exception in a pointer or key handler can freeze the toy in front of a child.
- Match the indentation of the file you are editing; the codebase is not uniform.

## Testing

- Write a failing test first, run it and see it fail, then write the smallest code that passes it.
- Unit tests with mocks are not enough for anything visual or interactive. Verify UI changes in a real browser (Playwright, or `npm run dev` and look). Several past bugs were hidden by mocks that did not match Phaser's real API.
- Do not skip, delete or weaken a test to get green. Change a test only if it is testing the wrong thing, and say so in the commit message.
- Run `npm test` and `npm run lint` before committing. Run `npm run test:e2e:chromium` when you touch the sandbox, routing, or anything in `tests/browser/`.

## Versioning

- `package.json` `"version"` is the app version. It is shown in logs and used for the service worker cache name.
- Bump it with every commit that changes code. The Husky pre-commit hook (`.husky/pre-commit` running `scripts/verify-version-bump.js`) fails the commit if code under `src/`, `tests/` or `package.json` changed without a higher version. Docs-only commits are exempt.
- The project is past 1.0.0. Use patch bumps (1.0.x) unless the maintainer asks for something else.

## Adding content

### Emojis: `public/emojis.json`

A JSON array. Each entry has one key per language plus the type and filter fields. One real entry:

```json
{"emoji":"🐶","en":"Dog","es":"Perro","zh":"狗","hi":"कुत्ता","ar":"كلب","fr":"Chien","bn":"কুকুর","pt":"Cão","ru":"Собака","id":"Anjing","tlh":"Ha'DIbaH","jbo":"gerku","eo":"Hundo","type":"emoji","categories":["animals","nature"],"colors":["brown"]}
```

- `categories` must be one or more of `animals`, `nature`, `food`, `objects`, `vehicles`, `faces`. These are the toggles in the settings screen.
- A missing language key falls back to English, so add all thirteen keys where you can.

### Things: `public/things.json`

Top-level sections: `colorCategories`, `colors`, `shapes`, `letters`, `numbers`, `flags`, `languages`. Examples from the real file:

```json
{"value":"Red","en-US":"Red","en-GB":"Red","es":"Rojo","zh":"红色","hi":"लाल","ar":"أحمر","fr":"Rouge","bn":"লাল","pt":"Vermelho","ru":"Красный","id":"Merah","tlh":"Doq","jbo":"xunre","eo":"Ruĝa","category":"primary","hex":"#ff0000"}
{"value":"A","case":"upper","categories":["vowels","letters"],"weight":10}
{"value":0,"en":"Zero","es":"Cero","zh":"零","hi":"शून्य","ar":"صفر","fr":"Zéro","bn":"শূন্য","pt":"Zero","ru":"Ноль","id":"Nol","tlh":"pagh","jbo":"no","eo":"Nulo","categories":["counting","basic"],"weight":10}
```

- Colours use `category` (one of `primary`, `secondary`, `neutral`) and `hex`. Shapes and colours use `en-US` / `en-GB` keys; numbers and emojis use `en`.
- Adding entries to an existing section is data-only; `ContentSelector` reads the arrays and filters them by category.
- New languages are a code change too: add the code to `src/config/manager/ConfigDefaults.js` (available list), `src/config/constants.js` (flag, rank, learning hours) and the speech tag map in `src/game/systems/SpeechManager.js`.

## Adding a toy

A toy is a class with `show()`, `hide()` and `destroy()`, loaded lazily so its code stays out of the entry chunk. Use `src/toys/OrreryToy.js` or `src/toys/GlobeToy.js` as the model.

1. Create the class (`constructor(router, configManager)`) and its modules under `src/toys/`. Keep pure maths in separate files.
2. In `src/routes/routes.js`, register a route in `setupRoutes()`, add a `show<Name>Screen()` method that uses a dynamic `import()`, and add a case for the new screen name in `hideCurrentScreen()`.
3. In `src/modes/ToyModeSelector.js`, add a card to the `cards` array (`mode`, `emoji`, `title`, `desc`, colours) and a branch in `_selectMode()` that calls `router.navigate('/<path>')`.
4. Add unit tests for the pure modules and a Playwright spec in `tests/browser/` that opens the route and checks it renders.

## Privacy and network rule

- No analytics, tracking, accounts or network requests at runtime. The app loads its code and data once and then works offline. Do not add a `fetch` or a third-party script or font.
- Settings and progress stay in the browser's own storage.

## Licence

- The project is MIT licensed (see [LICENSE](./LICENSE)).
- Any third-party asset (font, data, image, sound) must have a licence compatible with MIT and must be listed in [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md). Do not add assets that are non-commercial only or no-derivatives.
