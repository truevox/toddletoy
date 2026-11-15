# PICK-UP-HERE.md
**Context Recovery Document for Next Session**

## 🟢 CURRENT STATUS (v2.0.1, branch `claude/optimistic-brown-xmf2t5`)

The November 2026 rehabilitation pass is complete and pushed. Nothing is in flight.

**What the app is now**
- **Toy selector** (`/`) → **Toddler Sandbox** (`/config` → `/toy`), **Solar System** (`/orrery`), **World Globe** (`/globe`).
- **Sandbox**: reliable spawning (tap, any key, gamepad), objects kept on screen, measured numeral stacking, procedural Cistercian numerals, grid mode that fits the real canvas, silent fallback without speech, hold-for-2-seconds parent exit, browser Back locked without disturbing play, state restored on reload.
- **Solar System** (`src/toys/OrreryToy.js` + `orrery-*.js`): procedural planets, time scrub and speed steps, planet strip, info cards, true-size comparison, Find it game.
- **World Globe** (`src/toys/GlobeToy.js` + `globe-*.js`): Natural Earth globe, tap-to-fly, info card in the enabled languages, zoom, Surprise me, Find it game, passport.
- **Repo**: MIT `LICENSE`, `THIRD-PARTY-NOTICES.md`, PWA icons/manifest, CI (`.github/workflows/ci.yml`), README with real screenshots, `CONTRIBUTING.md`, `docs/README.md` (architecture).

**Verification at v2.0.1**
- `npm test`: 1243 passing, 225 skipped (optional grid enhancements). `npm run lint`: clean. `npm run build`: succeeds.
- `npm run test:e2e:ci`: 136 Playwright tests × desktop Chromium and Pixel 5 emulation, all passing against the production build. No `test.fail`/`fixme` marks.
- Firefox, WebKit and real devices have **not** been run. CI has not yet executed on GitHub (it triggers on `main`/`dev` pushes and pull requests).

**Known gaps / next candidates** (none block play)
1. Run the suite on Firefox/WebKit and try real phones/tablets (speech voices, touch, performance).
2. Sandbox canvas renders at 1× device pixel ratio, so text is soft on high-DPI phones.
3. Globe labels and Solar System card text are English-only (spoken names are localised); flag emoji show as letter codes on Windows.
4. 13 `npm audit` advisories remain, all in dev tooling (need Vite/Jest major upgrades).
5. Netlify build moved to Node 20 but the deploy itself is untested.
6. Files still over ~300 lines (see CLAUDE-TODO.md Phase 18).
7. No git tag or GitHub release exists for 2.0.x yet (owner's call).

**Owner decisions on record (Marvin, 2026-11-15)**
- `main` was fast-forwarded to v2.0.1 on 2026-11-15. First CI run and first Node 20 Netlify deploy follow from that push; neither result had been checked when this was written.
- MIT licence with "Copyright (c) 2025 Marvin Bentley II" is confirmed.
- Geography follows conventional, reality-based naming: Taiwan is a country (own flag, capital Taipei); if gulf/sea labels are ever added it is "Gulf of Mexico". Palestine, Kosovo and Western Sahara stay separate places. Capitals stay blank only where the capital itself is the dispute (Israel, Palestine, Western Sahara). Russia is listed under Europe.
- "Feel" calls are delegated to the agent. Current choices: the planet strip wraps to two rows on phones (keeps buttons finger-sized); Neptune's slow orbit is kept because the speed ratios are real.
- Do not tag, release or open a PR without being asked.

## 🕰️ OLDER STATUS (v1.0.55)

**Recent Fixes (Config, Stacking, Interactions)**:
- **Version**: v1.0.55
- **ConfigScreen**: Fixed console errors (`updateEmojiMasterCheckbox`, `createParentGuidanceSection`).
- **Stacking**: Fixed "counts condensing to center" issue in `game.js` (proper offset calculation).
- **Interactions**: Fixed ambiguity where clicking empty space would both spawn and move objects (added 300ms debounce).

## 📋 PREVIOUS CRITICAL ISSUES (RESOLVED)
- The "Input System Completely Broken" issue referenced in v0.2.16 appears resolved in this version. Input debugging tests pass.
- Auto-cleanup is implemented and functional.
- Object counting layout logic is verified by tests.

## 🎯 IMMEDIATE NEXT STEPS
- Continue monitoring interaction stability.
- Verify "Game Refactoring" status (game.js is ~1680 lines, goal is <300).
- Proceed with further TDD cycles as needed.

## 🧪 TEST STATUS
- `npm test` passing (55/61 tests).
- `input-debug.test.js` passing.
- `object-counting-layout.test.js` passing.

## 📝 NOTES
- `AGENTS.md` is current.
- Linting config is missing (`npm run lint` fails), should be addressed in future cleanup.