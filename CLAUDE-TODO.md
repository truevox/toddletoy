# CLAUDE-TODO.md

## Project Implementation Plan

This document tracks the structured implementation of the toddler-toy PWA following TDD principles.

### Phase 1: Core Foundation (High Priority)  COMPLETED
- [x] Set up basic project structure with index.html, package.json, and Phaser 3
- [x] Write failing test for spawning a single object at touch/click point
- [x] Implement basic object spawning at interaction point
- [x] Write failing test for speech synthesis of object labels
- [x] Implement Web Speech API for speaking object labels

### Phase 2: Visual & Input Systems (Medium Priority)  COMPLETED
- [x] Write failing test for displaying bilingual text labels
- [x] Implement text display with English/Spanish labels
- [x] Write failing test for keyboard input handling
- [x] Implement keyboard input support
- [x] Write failing test for Web Audio API tone generation
- [x] Implement Web Audio API tone generation based on position

### Phase 3: Visual Effects (Low Priority)  COMPLETED
- [x] Write failing test for particle effects on spawn
- [x] Implement particle effects using Phaser

### Phase 4: Advanced Input & PWA (Remaining Tasks)
- [ ] Write failing test for gamepad input handling
- [ ] Implement gamepad input support
- [ ] Add PWA manifest and service worker for offline capability

### Completed Tasks 
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

### Current Status <¯
**Fully functional interactive experience with:**
- Touch/click and keyboard interactions
- Bilingual speech synthesis
- Position-based audio tones
- Visual particle effects
- Comprehensive test coverage (25 tests across 6 suites)

### Notes
- Following TDD: Write failing test first, implement minimal code to pass, commit, repeat
- Each feature tested independently
- Code files kept under 300 lines
- Frequent commits with clear messages
- All tests passing 