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

### Phase 9: Deferred Features (Low Priority) 🔄 ON HOLD

- [ ] Cistercian numeral rendering for numbers (implemented but buggy, disabled for now)

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

#### Phase 13.4: Browser Validation 📋 (Optional)
- [ ] Automated Playwright tests with real browser interaction
- [ ] Visual screenshot comparison before/after movement
- [ ] Performance validation with multiple objects
- [ ] Cross-browser compatibility testing

#### Phase 13.5: Documentation & Cleanup ✅
- [x] Document "center-based offset storage" system in code comments
- [x] Update test coverage documentation in todo list
- [x] Remove debug logging after successful fix verification

### Current Status 🎯 LAYOUT PRESERVATION COMPLETED - CORE FUNCTIONALITY STABLE

**Fully functional enhanced experience with:**
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
  - Cistercian numerals (implemented but on hold due to bugs)
- Enhanced speech features:
  - Word highlighting animation with yellow tints during speech
  - Speech queue locking prevents new spawns during speech
  - Speaking objects move instead of spawning new ones during speech
  - Continuous background tones per object (no 3-second timeout)
  - Word-specific sparkle effects during speech highlighting
- Comprehensive test coverage (147 tests across 24 suites)
- Revoice on click functionality - clicking existing objects re-voices them  
- **FIXED**: Perfect layout preservation - moving objects maintains exact word spacing and alignment
- **FIXED**: Center-based offset storage system prevents word overlaps during movement

**Critical Bug Fixed**: Word overlap issue where "Orange Q" became "OraQge" after movement
- Root cause: Legacy positioning system conflicting with new componentLayout system
- Solution: Disable legacy englishLabel/spanishLabel positioning when componentLayout exists
- Result: Perfect layout preservation across all object movements and interactions

**All core features completed!** ✅

- Advanced visual effects during interaction (trails ✅, sparkles ✅)

### Notes

- Following TDD: Write failing test first, implement minimal code to pass, commit, repeat
- Each feature tested independently
- Code files kept under 300 lines
- Frequent commits with clear messages
- All tests passing ✅
- Ready for core functionality deployment, enhancement phases in progress
- User wants to flesh out and implement: We need a configureation screen, but I' not sure how I want it to work yet, but it should have some sort of differnt age ranges that reveal different things (youngest maybe omits numbers, or only shows 0-10, and uses numbers of common obejects to encourage counting instead of binary - might still include kartovic, might not too, also maybe lowercase letters aren't introduced until a later age - later ages maybe unlock even more emojis, of more sophisticated and less familiar things.
