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

### Phase 8: Visual Effect Improvements (Low Priority) 📋 PENDING

- [ ] Add trails or pulses during object dragging
- [ ] Add word-specific sparkle effects when words are spoken

### Current Status 🎯 SPEECH ENHANCEMENTS COMPLETE - VISUAL EFFECTS PENDING

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
- Comprehensive test coverage (95 tests across 17 suites)

**Remaining features from README.md specification:**
- Advanced visual effects during interaction (trails, sparkles)

### Notes

- Following TDD: Write failing test first, implement minimal code to pass, commit, repeat
- Each feature tested independently
- Code files kept under 300 lines
- Frequent commits with clear messages
- All tests passing ✅
- Ready for core functionality deployment, enhancement phases in progress