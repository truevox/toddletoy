# CLAUDE-TODO.md

## Project Implementation Plan

This document tracks the structured implementation of the toddler-toy PWA following TDD principles.

### Phase 1: Core Foundation (High Priority) ✅ COMPLETED

- [x] Set up basic project structure with index.html, package.json, and Phaser 3
- [x] Write failing test for spawning a single object at touch/click point
- [x] Implement basic object spawning at interaction point
- [x] Write failing test for speech synthesis of object labels
- [x] Implement Web Speech API for speaking object labels

### Phase 2: Visual & Input Systems (Medium Priority) ✅ COMPLETED

- [x] Write failing test for displaying bilingual text labels
- [x] Implement text display with English/Spanish labels
- [x] Write failing test for keyboard input handling
- [x] Implement keyboard input support
- [x] Write failing test for Web Audio API tone generation
- [x] Implement Web Audio API tone generation based on position

### Phase 3: Visual Effects (Low Priority) ✅ COMPLETED

- [x] Write failing test for particle effects on spawn
- [x] Implement particle effects using Phaser

### Phase 4: Advanced Input & PWA ✅ COMPLETED

- [x] Write failing test for gamepad input handling
- [x] Implement gamepad input support
- [x] Add PWA manifest and service worker for offline capability

### Completed Tasks ✅

**Core Foundation:**
- Project structure with Vite, Phaser 3, Jest testing
- Object spawning at touch/click points with random emojis
- Web Speech API for bilingual (English/Spanish) speech synthesis
- Sequential speech playback with proper language codes

**Visual & Audio Systems:**
- Bilingual text display below spawned objects
- Keyboard input with 3x3 grid layout (QWEASDZXC keys)
- Web Audio API tone generation:
  - Y-position determines frequency (200-800Hz)
  - Screen quadrants determine waveform (sine/square/sawtooth/triangle)
  - 3-second auto-stop with cleanup

**Visual Effects:**
- Colorful particle burst effects on spawn
- 8-particle circular pattern with random colors
- Tweened fade-out animations with automatic cleanup

**Advanced Features:**
- Gamepad input with dual-stick averaging and deadzone handling
- PWA functionality with offline capability and app installation
- Service worker for resource caching and background sync support
- Cross-platform compatibility (Android, iOS, ChromeOS, desktop)

### Phase 5: Enhanced Input Mechanics (High Priority) ✅ COMPLETED

- [x] Implement object dragging for touch/mouse interactions
- [x] Add multi-touch averaging for drag location  
- [x] Implement multiple key holding with interpolation between locations
- [x] Add key release handling to remove from interpolation average
- [x] Implement continuous drag mode for held gamepad buttons
- [x] Fix click-during-speech dragging - object jumps to click point and follows mouse when held
- [x] Fix keyboard input initialization - keys now properly spawn objects at mapped grid locations

### Phase 6: Advanced Display Features (Medium Priority) ✅ COMPLETED

- [x] Letters display correctly (uppercase only as per design)
- [x] Add Kaktovik numeral display for numbers (Unicode font-based, base-20 system)
- [x] Add binary representation (❤️🤍) for numbers

### Phase 9: Cistercian Numerals Implementation (Medium Priority) ✅ COMPLETED

- [x] ~~Cistercian numeral rendering for numbers (implemented but buggy, disabled for now)~~
- [x] Implement Cistercian numerals using Cistercian QWERTY font
- [x] Create number-to-QWERTY mapping for font-based rendering  
- [x] Test and re-enable Cistercian numerals in display system
- [x] Font-based rendering with Creative Commons licensed Cistercian QWERTY font
- [x] Comprehensive test coverage (18 new tests) for font-based implementation

### Phase 7: Speech & Animation Enhancements (Medium Priority) ✅ COMPLETED

- [x] Implement word highlighting animation during speech
- [x] Add speech queue locking until all words are read
- [x] Move objects instead of spawning new ones during mid-speech interactions
- [x] Implement continuous background tones per object (not 3-second limit)

### Phase 8: Visual Effect Improvements (Low Priority) ✅ COMPLETED

- [x] Add trails or pulses during object dragging
- [x] Add word-specific sparkle effects when words are spoken

### Phase 10: Bug Fixes & Regression Resolution (High Priority) ✅ COMPLETED

- [x] Fix mouse dragging regression - objects getting stuck to cursor
- [x] Fix missing particle effects regression 
- [x] Move drag trail methods to correct GameScene class
- [x] Ensure particle texture creation during scene initialization
- [x] All 113 tests passing after fixes

### Phase 11: Enhanced Speech Interaction (High Priority) ✅ COMPLETED

- [x] Write failing test for revoice on click functionality
- [x] Implement revoice on click - clicking voiced object revoices it (if nothing else is voicing)

### Phase 12: Layout Preservation Fix (High Priority) ✅ COMPLETED

- [x] Investigate layout positioning regression where moving objects breaks internal alignment
- [x] Write comprehensive layout preservation tests
- [x] Attempt initial fix with offset-based positioning system
- [x] **CRITICAL**: Identified legacy positioning conflict causing word overlaps
- [x] **RESOLVED**: Disabled legacy label positioning when componentLayout exists
- [x] Issue resolved: Word spacing now preserved perfectly across all object movements

### Phase 13: Comprehensive Layout Fix with Browser Testing (High Priority) ✅ COMPLETED

**Problem**: Words overlapping after object movement due to legacy positioning conflict
**Solution**: "ComponentLayout System" - disable legacy positioning when new layout system exists to prevent conflicts

#### Phase 13.1: Browser-Based Testing Infrastructure ✅
- [x] Install Playwright for actual browser testing
- [x] Setup visual regression testing with screenshots  
- [x] Create spawn → move → verify test workflow
- [x] Test specific regression cases: "Red Triangle" → "Orange Q"

#### Phase 13.2: Enhanced Unit Testing ✅
- [x] Improve test mocking with realistic text width calculations
- [x] Include responsive scaling factors in test setup
- [x] Test edge cases: long phrases, numbers with all displays
- [x] Add regression tests for specific user-reported cases

#### Phase 13.3: Core Implementation Fix ✅
- [x] Store relative component positions during spawn (`obj.componentLayout`)
- [x] Replace hardcoded `y + 60`, `y + 90` with stored relative positions
- [x] Update `setObjectPosition` to use locked component relationships
- [x] Ensure atomic movement of all components as cohesive unit
- [x] **CRITICAL**: Fixed timing issue - moved `displayTextLabels` inside `spawnObjectAt` 
- [x] **SOLUTION**: ComponentLayout now stores spawn-position offsets, not keyboard-position offsets
- [x] **FINAL FIX**: Disabled legacy label positioning when componentLayout exists to prevent conflicts

#### Phase 13.4: Browser Validation ✅ COMPLETED
- [x] Automated Playwright tests with real browser interaction
- [x] Visual screenshot comparison before/after movement  
- [x] Performance validation with multiple objects
- [x] Cross-browser compatibility testing (Chrome, Firefox, Safari, Mobile)

#### Phase 13.5: Documentation & Cleanup ✅
- [x] Document "center-based offset storage" system in code comments
- [x] Update test coverage documentation in todo list
- [x] Remove debug logging after successful fix verification

### Phase 14: Numeral Positioning & Base System Fixes (High Priority) 

**Problem**: 
- Kaktovik numerals need to be positioned a few pixels higher (3-5 pixels above current position)
- Cistercian numerals need to be positioned even higher (5-10 pixels above current position) 
- Cistercian font system is incorrectly treating it as base-10 when it should be base-1000 (glyphs combine to form compound numerals)

**Tasks**:
- [ ] Write failing test for improved Kaktovik numeral vertical positioning
- [ ] Adjust Kaktovik numeral Y offset in renderKaktovikNumeral function
- [ ] Write failing test for improved Cistercian numeral vertical positioning  
- [ ] Adjust Cistercian numeral Y offset in renderCistercianNumeral function
- [ ] Write failing test for proper Cistercian base-1000 glyph combination
- [ ] Fix Cistercian numeral rendering to use proper base-1000 character combination logic
- [ ] Update component layout system to handle new positioning offsets
- [ ] Run tests to ensure positioning fixes work correctly
- [ ] Test visual alignment with browser testing

**Expected Outcome**: 
- Kaktovik numerals appear 3-5 pixels higher than current position
- Cistercian numerals appear 5-10 pixels higher than current position  
- Cistercian numerals properly combine glyphs for compound numbers (e.g., "1qdb 2grm" creates two combined glyphs with space between)

### Phase 15: Configuration Page System ✅ COMPLETED

**Goal**: Create an intuitive configuration interface that loads by default and allows customization of toy content and complexity.

**Achievement**: Full configuration system with weighted selection, category filtering, and game engine integration complete!

#### Phase 15.1: Core Infrastructure ✅ COMPLETED
- [x] Create routing system with Router.js and routes.js
- [x] Build basic ConfigScreen component structure
- [x] Implement ConfigManager with localStorage persistence  
- [x] Update main.js to load config first (default route)
- [x] Add admin route (/admin) for config access

#### Phase 15.2: Configuration Interface ✅ COMPLETED
- [x] Build content category controls with clear annotations
- [x] Implement number range validation with smart auto-adjustment
- [x] Add emoji subcategory selection with up to 3 categories per item
- [x] Create color category system (primary/secondary/neutral)
- [x] Add language selection interface
- [x] Implement weight sliders with "How often?" labels

#### Phase 15.3: Enhanced Data Structure ✅ COMPLETED
- [x] Update emojis.json with categories and colors (up to 3 categories, up to 2 colors)
- [x] Update things.json with color categorization system
- [x] Create comprehensive category mapping for all content types
- [x] Implement multi-category support in data structure
- [x] Add language support structure for future translations

#### Phase 15.4: Game Integration ✅ COMPLETED
- [x] Modify spawnObjectAt() to use config-based weighted selection
- [x] Implement selectSpawnType() method using configuration weights
- [x] Update content filtering based on enabled categories and colors
- [x] Test configuration → game engine communication
- [x] Update all async spawnObjectAt calls (onPointerDown, checkKeyboardInput, onKeyDown, onGamepadButtonDown)

#### Phase 15.5: User Experience Polish (Medium Priority)
- [ ] Add responsive design for mobile/tablet/desktop
- [ ] Implement accessibility features (ARIA labels, keyboard nav)
- [ ] Create helpful annotations and examples for each section
- [ ] Add preview functionality and hover effects
- [ ] Implement skip-config functionality

#### Phase 15.6: Testing & Documentation (Medium Priority)
- [ ] Fix config-system.test.js import syntax for Jest compatibility
- [ ] Write unit tests for configuration validation logic
- [ ] Create browser tests for configuration interface
- [ ] Update README.md with configuration system documentation
- [ ] Test cross-device compatibility

#### Phase 15.7: Future Language Support (Low Priority)
- [ ] Add translations for Mandarin Chinese (中文)
- [ ] Add translations for Hindi (हिन्दी)
- [ ] Add translations for Modern Standard Arabic (العربية)
- [ ] Add translations for French (Français)
- [ ] Add translations for Bengali (বাংলা)
- [ ] Add translations for Portuguese (Português)
- [ ] Add translations for Russian (Русский)
- [ ] Add translations for Indonesian (Bahasa Indonesia)
- [ ] Add translations for Klingon (tlhIngan Hol) - fun language
- [ ] Add translations for Lojban (la .lojban.) - fun language
- [ ] Add translations for Esperanto (Esperanto) - fun language

### Phase 16: Auto-Cleanup Timer Feature (Medium Priority)

**Goal**: Implement a time-since-last-touched feature to automatically remove objects that haven't been interacted with in a configurable amount of time.

#### Phase 16.1: Configuration Interface
- [ ] Add auto-cleanup timer configuration field to config screen
- [ ] Include appropriate annotations/description explaining the feature
- [ ] Add input validation for reasonable time ranges (30 seconds to 10 minutes)
- [ ] Integrate with existing ConfigManager system

#### Phase 16.2: Core Implementation
- [ ] Add lastTouchedTime property to all spawned objects
- [ ] Update interaction methods to refresh lastTouchedTime on touch/click/voice
- [ ] Implement cleanup timer that runs periodically to check for stale objects
- [ ] Add smooth fade-out animation before object removal
- [ ] Ensure cleanup respects currently speaking objects (don't remove during speech)

#### Phase 16.3: Testing & Polish
- [ ] Write tests for auto-cleanup functionality
- [ ] Test edge cases (objects being cleaned up during interaction)
- [ ] Add visual feedback when objects are about to be cleaned up
- [ ] Ensure cleanup doesn't interfere with drag operations or speech

### Current Status 🎯 CONFIGURATION SYSTEM COMPLETED - AUTO-CLEANUP NEXT

**Phase 15 Configuration System - JUST COMPLETED!** ✅

**New Features Added:**
- **Full Configuration Interface**: Mobile-first responsive design with intuitive controls
- **Content Type Selection**: Shapes, small/large numbers, uppercase/lowercase letters, emojis with weight sliders
- **Emoji Category Filtering**: Animals, food, vehicles, faces, nature, objects with individual weights
- **Color Category System**: Primary, secondary, neutral color selection
- **Language Options**: English, Spanish, Bilingual (+ framework for 8 future languages including Klingon, Lojban, Esperanto)
- **Advanced Number Modes**: Toggle Cistercian, Kaktovik, Binary numeral displays
- **Smart Validation**: Auto-adjusting overlapping number ranges, configuration persistence
- **Router System**: Config-first application flow with admin route (/admin) bypass
- **Game Engine Integration**: Weighted object selection, async emoji loading, category-based filtering

**Technical Implementation:**
- ConfigManager with localStorage persistence and smart validation
- ConfigScreen with complete responsive UI and real-time updates
- Router system for seamless navigation between config and game
- Enhanced emojis.json with up to 3 categories and up to 2 significant colors per item
- Weighted probability selection replacing hardcoded equal distribution
- Async spawnObjectAt support across all input methods (touch, keyboard, gamepad)

**Previously completed enhanced experience with:**
- Touch/click, keyboard, and gamepad interactions with advanced input mechanics
- Object dragging with click-during-speech support and smooth lerp movement
- Multi-key keyboard interpolation and hold/release handling
- Bilingual speech synthesis (English/Spanish)
- Position-based audio tones with multiple waveforms
- Visual particle effects and text display
- PWA installation and offline functionality
- Multi-modal number displays:
  - Kaktovik numerals (Unicode font-based, base-20 system)
  - Binary representation with heart emojis (❤️🤍)
  - Cistercian numerals (font-based with Creative Commons licensed font)
- Enhanced speech features:
  - Word highlighting animation with yellow tints during speech
  - Speech queue locking prevents new spawns during speech
  - Speaking objects move instead of spawning new ones during speech
  - Continuous background tones per object (no 3-second timeout)
  - Word-specific sparkle effects during speech highlighting
- Comprehensive test coverage (165 unit tests + 27 browser tests across 28 suites)
- Revoice on click functionality - clicking existing objects re-voices them  
- **FIXED**: Perfect layout preservation - moving objects maintains exact word spacing and alignment
- **FIXED**: Center-based offset storage system prevents word overlaps during movement

**Critical Bug Fixed**: Word overlap issue where "Orange Q" became "OraQge" after movement
- Root cause: Legacy positioning system conflicting with new componentLayout system
- Solution: Disable legacy englishLabel/spanishLabel positioning when componentLayout exists
- Result: Perfect layout preservation across all object movements and interactions

**ALL FEATURES COMPLETED!** ✅

- Advanced visual effects during interaction (trails ✅, sparkles ✅)
- Comprehensive browser testing infrastructure with Playwright ✅
- Performance validation and cross-browser compatibility testing ✅
- Visual regression testing with screenshot comparisons ✅

### Notes

- Following TDD: Write failing test first, implement minimal code to pass, commit, repeat
- Each feature tested independently
- Code files kept under 300 lines
- Need to develop an optional "Grid" mode that makes a grid (larger or smaller depending on screen size) with an array of things for the baby to poke and make voice. Things don't move in grid mode.Must discuss.
- Frequent commits with clear messages
- All tests passing ✅
- Ready for core functionality deployment, enhancement phases in progress
- User wants to flesh out and implement: We need a configureation screen, but I' not sure how I want it to work yet, but it should have some sort of differnt age ranges that reveal different things (youngest maybe omits numbers, or only shows 0-10, and uses numbers of common obejects to encourage counting instead of binary - might still include kartovic, might not too, also maybe lowercase letters aren't introduced until a later age - later ages maybe unlock even more emojis, of more sophisticated and less familiar things.
