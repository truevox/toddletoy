# PICK-UP-HERE.md
**Context Recovery Document for Next Session**

## 🟢 CURRENT STATUS (v1.0.87, branch `claude/optimistic-brown-xmf2t5`)

Rehabilitation pass in progress. Integrated, browser-verified and pushed:

- **Sandbox**: heart shapes spawn; silent fallback when the Web Speech API is missing; objects stay on screen (spawn, drag, restore, resize); any printable key spawns; numeral rows no longer overlap; shapes sized like emojis; debug logging removed.
- **Config / storage**: saved config is type-checked and merged over defaults; `src/utils/safeStorage.js` wraps all storage; config DOM wiring tolerates missing elements; phone layouts fixed; START PLAYING and "All toys" at the top of settings.
- **Navigation**: hold-for-2-seconds parent exit from the sandbox (`src/ui/ParentExitButton.js`); the toy really pauses/resets when left; no self-reload on first visit.
- **World Globe**: real orthographic globe from Natural Earth data (`src/toys/globe-*.js`).
- **Loading**: Phaser bundle lazy-loaded when the sandbox opens (entry chunk ~135 kB).
- **Repo**: MIT `LICENSE`, `THIRD-PARTY-NOTICES.md`, PNG PWA icons + `public/manifest.json`, `.github/workflows/ci.yml`.
- **Tests**: `npm test` → 1103 passing, 225 skipped (optional grid enhancements). Lint 0 errors.

In flight (separate worktrees under `.claude/worktrees/`, not yet merged):

1. Procedural Cistercian numerals (replaces the CC BY-NC-ND font), grid-mode fit, exit-button keep-out, outlines for dark colours.
2. World Globe UX overhaul (zoom, fly-to, info card, Find-it game, passport).
3. Solar System UX overhaul (procedural planets, time scrub, planet strip, compare sizes, Find-it game).
4. Playwright E2E rehabilitation (the old suite predates the toy selector; 1 of ~85 tests passed).

Then: clear the lint warnings, rewrite README/contributor docs with real screenshots, final skeptical review.

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