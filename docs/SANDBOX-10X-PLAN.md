# Sandbox 10x plan

Written 2026-11-15 against v2.0.1, after playing the sandbox in a real browser at phone, tablet and
desktop sizes and surveying the code under `src/game/`. Status of each stage is tracked in
`CLAUDE-TODO.md` (Phase 26).

## What the sandbox is like today

A toddler who taps gets a small, static glyph on a black screen, a flat buzzing tone that never
stops, and a caption. Specifically:

| # | Finding | Evidence |
|---|---------|----------|
| 1 | **One finger only.** A second finger or a whole palm does nothing. | single `pointerIsDown`/`draggedObject`; no `activePointers` |
| 2 | **The sound is a raw oscillator**: no envelope, hard cut-off, 200–800 Hz linear (not musical), plays until the object is removed. No spawn, drag or despawn sounds. | `AudioManager.js` |
| 3 | **Objects are small and lifeless.** Glyphs are a fixed 64 px (5 % of a desktop screen), appear instantly, never move by themselves, and vanish instantly. | `ObjectFactory.js`, `ObjectLifecycle.js` |
| 4 | **Blurry on every phone and tablet.** The canvas renders at 1× on a 2.75× screen. | no DPR handling in `ResponsiveGameManager.js` |
| 5 | **Cluttered.** All five number displays are on by default, so one number draws Cistercian + Kaktovik + binary hearts + two caption lines + apples/bags/boxes/trucks. On a phone, objects and their decorations overlap into an unreadable pile. | phone screenshot; `ConfigDefaults.js` |
| 6 | **An empty black void on entry**, with nothing inviting a first touch and no idle behaviour. | — |
| 7 | **Speech is cut off by every new tap**, uses whichever voice the browser picks first, and says colour-then-noun in every language ("Rojo Círculo"; Spanish wants "Círculo rojo"). | `SpeechManager.js`, `localization.js` |
| 8 | **Thin content.** 57 emoji in total; "vehicles" has 4. Repeats arrive within a minute. | `public/emojis.json` |
| 9 | **Nothing to discover.** Tapping an object only starts a drag. Objects never react to each other, to being thrown, or to being tapped again. | `SceneInputHandler.js` |
| 10 | **Dead weight.** `ObjectManager` (355 lines) and `PositioningSystem` (342) are unused; restore polls on a timer; auto-cleanup ignores config changes; unused weight fields. | survey |

## What "10x" means here

Not ten times the features. The same simple toy, but every touch is rewarded more, by more of the
senses, for more fingers, and it stays interesting for ten minutes instead of one.

Targets we can test:

- Ten simultaneous fingers each produce a response.
- First response (visual and audible) within 100 ms of touch; 60 fps with 30 objects on a mid-range phone.
- Main glyph is at least 18 % of the short screen edge, and crisp at device resolution.
- No two objects overlap after settling, on a 360 × 640 screen with 12 objects.
- Any sequence of taps sounds pleasant (everything in one musical scale).
- No repeat of the same item within 20 spawns.
- A screen left alone for 8 seconds does something that invites a touch.

## Design principles

1. **Cause and effect first.** Every input gets an immediate, proportionate, multi-sensory answer.
2. **No wrong moves.** No fail states, no text a child must read, nothing that can be broken.
3. **One thing at a time is big and clear**; extra information is something you uncover, not wallpaper.
4. **Calm by default.** Short sounds, soft colours, effects that settle. Honour `prefers-reduced-motion` and the mute switches.
5. **Parents configure, children play.** Nothing new on the play screen for a child to get lost in.

## Stages

Each stage is a shippable release, verified with unit tests and `npm run test:e2e:ci`, and reviewed
before merging. Order is by impact per unit of risk.

### Stage 0 — Clear the ground (v2.0.2, chore)
- Delete `ObjectManager`, `PositioningSystem` and the dead functions listed in the survey, with their tests.
- Replace the restore polling with one awaited "ready" promise (data + fonts + config); fix the config hand-off race.
- Make auto-cleanup re-read config when it changes.
- Add a tiny debug hook (`scene.debugSnapshot()`) so browser tests can assert sizes, overlap and audio events.

### Stage 1 — Sharp and big (v2.1.0)
- Render at device pixel ratio (capped at 3) through one `DisplayScale` module that every text and shape goes through.
- Glyph size becomes relative to the screen (about 20 % of the short edge; smaller automatically as the screen fills).
- Captions shrink to a clear secondary size; one caption line per language, max two visible.
- A soft, slowly shifting background in place of black, with a few faint drifting shapes.

### Stage 2 — It feels alive (v2.2.0)
- Spawn: pop in with overshoot and a small squash. Despawn: shrink, float up and pop, instead of vanishing.
- Idle: each object breathes and bobs slightly, out of phase with the others.
- Tap an existing object: it jumps, spins or wiggles (per type) and says its name again.
- Throwing: release a drag with speed and the object glides, bounces softly off the edges and settles.
- Objects nudge each other apart so nothing overlaps (replaces the fixed clamp-only placement).
- Richer, type-coloured particles; all effects pooled.

### Stage 3 — It sounds good (v2.3.0)
- New sound engine: short enveloped notes on a pentatonic scale, so any mashing is tuneful. Pitch still follows height, timbre follows the kind of object.
- Dedicated sounds for spawn, pick-up, drop, bounce and despawn, synthesised (no audio files, stays offline-tiny).
- Unlock audio on the first gesture once, not on every note.
- Speech: a short queue instead of cutting off (latest wins after two waiting), best-available voice per language, correct adjective order per language, caption highlighting driven by real word-boundary events where the browser gives them.

### Stage 4 — Many fingers, many keys (v2.4.0)
- True multi-touch: each finger spawns or drags independently (up to 10); a palm is treated as one soft touch, not ten spawns.
- Baby keyboard mode: every key gives a big response; holding a key does not machine-gun.
- Gamepad: all connected pads, with a visible friendly cursor.
- Object cap with graceful recycling (oldest pops) so a mashing session never slows down.

### Stage 5 — Something to discover (v2.5.0)
- Calm numbers: a number shows the numeral and its caption; tapping it again cycles through the other ways of showing it (counting objects, hearts, Kaktovik, Cistercian), one at a time, counted aloud. Existing settings are respected; only the default changes, through a config migration.
- Little surprises: two of the same thing touching celebrate; a letter dropped on a matching emoji ("B" on a bear) gets a cheer; shaking the device or a long idle gently scatters things.
- Attract mode: after 8 quiet seconds, one object drifts in and waves.
- Content: emoji from 57 to about 250 across the six categories, all 13 languages, with a no-recent-repeats picker; wire up the weight fields that exist but are ignored.

### Stage 6 — Parents (v2.6.0)
- Three one-tap presets above the settings: **Baby** (big, slow, emoji and shapes, no captions), **Toddler** (default), **Preschool** (letters, numbers, both languages, number exploring).
- A live miniature preview so a setting change is seen before starting.
- In-app docs updated for everything above.

### Deliberately not in this plan
Game modes (Phases 21–24), voice recognition, accelerometer gravity, family photos, analytics. They
build on a sandbox that already feels great; they do not make it feel great.

## How the work is split

I own design, integration, review and browser verification. Subagents work in isolated worktrees,
merge the working branch first, commit each verified stage, and never share a file within a stage.

| Stage | Parallel tracks (model) | Files owned |
|-------|-------------------------|-------------|
| 0 | A: dead code removal (Haiku) · B: ready-promise and config races (Sonnet) | A: `objects/ObjectManager`, `positioning/`, dead fns · B: `game.js`, `GameStateStore`, `ResponsiveGameManager`, `AutoCleanupManager` |
| 1 | A: DPR and sizing (Sonnet) · B: background (Haiku) | A: `DisplayScale`, factories, `TextLayoutManager` · B: new `Backdrop` |
| 2 | A: motion and reactions (Sonnet) · B: throw/settle/separation (Sonnet) · C: particles (Haiku) | A: new `ObjectMotion` · B: new `SoftPhysics`, `MovementManager` · C: `ParticleManager`, `EffectRenderer` |
| 3 | A: sound engine (Sonnet) · B: speech queue, voices, word order (Sonnet) | A: `AudioManager` + new `audio/` · B: `SpeechManager`, `localization` |
| 4 | A: multi-touch (Sonnet) · B: keyboard and gamepad (Haiku) | A: `SceneInputHandler`, pointer state · B: `InputManager` |
| 5 | A: number exploring + migration (Sonnet) · B: surprises and attract mode (Sonnet) · C: content expansion and translations (Sonnet, reviewed by a second agent) | A: `NumberMode*`, `ConfigMigration` · B: new `Surprises`, `AttractMode` · C: `public/*.json`, `ContentSelector` |
| 6 | A: presets and preview (Sonnet) · B: docs (Haiku) | A: `src/config/ui/*` · B: docs |

Every stage ends with: unit tests, lint, build, the full browser suite on desktop and phone
profiles, new browser tests for the stage's targets, screenshots compared before and after, a
skeptical review by a separate agent, then a version bump and commit.

## Risks

- **Device-pixel rendering** touches every size in the scene; it goes first so later stages are built on it, and it is guarded by screenshot comparisons.
- **Multi-touch** changes assumptions throughout the input code and many tests; Stage 0's cleanup and the debug hook make that tractable.
- **Speech** differs by browser and cannot be heard in headless tests; logic is unit-tested, and it needs a listen on a real phone.
- **Changing defaults** (calm numbers) alters what existing users see; handled by migration that keeps any setting a parent has explicitly changed.
- **Translations** for ~190 new emoji in 13 languages need a second-pass review; errors here are embarrassing, not dangerous.
- **Real devices.** Everything is verified in emulation; feel on an actual tablet in small hands is the one thing only a person can judge. A five-minute play test after Stages 2, 3 and 4 is worth more than any test here.
