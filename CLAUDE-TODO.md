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

#### Phase 15.8: Canadian English Support (Stretch Goal - Low Priority)
**Goal**: Add Canadian English regional variant with distinctive Canadian vocabulary and maple leaf flag

- [ ] Add en-CA language code to configuration system
- [ ] Create Canadian English translations in things.json and emojis.json
- [ ] Add distinctive Canadian vocabulary differences:
  - "Grey" vs "Gray" (Canadian spelling like British)
  - "Colour" vs "Color" (Canadian spelling like British)  
  - "Centre" vs "Center" (Canadian spelling like British)
  - "Toque" for winter hat (distinctly Canadian)
  - "Loonie" and "Toonie" for Canadian coins
  - "Chesterfield" for sofa/couch (older Canadian term)
- [ ] Add maple leaf flag (🍁) as spawnable object for en-CA
- [ ] Update ConfigManager to support en-CA in language selection
- [ ] Test en-CA language switching and flag spawning
- [ ] Add Canadian cultural content (maple syrup, hockey, etc.)

**Expected Outcomes:**
- **Cultural Authenticity**: Proper Canadian English spellings and vocabulary
- **Flag Representation**: Maple leaf (🍁) appears when Canadian English is enabled  
- **Educational Value**: Children learn regional language differences
- **Inclusive Design**: Supports Canadian families with familiar terms and references

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
- [ ] Each thing when spawned gets a timer (configurable in config). That timer resets if the thing is interacted with. If the timer expires, the thing despawns with a cute sound effect (maybe a pop?) and particle effects (fireworks?)
- [ ] Add smooth fade-out animation before object removal
- [ ] Ensure cleanup respects currently speaking objects (don't remove during speech)
- [ ] Add cute despawn sound effect (pop sound)
- [ ] Add despawn particle effects (fireworks/celebration style)

#### Phase 16.3: Testing & Polish
- [ ] Write tests for auto-cleanup functionality
- [ ] Test edge cases (objects being cleaned up during interaction)
- [ ] Add visual feedback when objects are about to be cleaned up
- [ ] Ensure cleanup doesn't interfere with drag operations or speech

### Phase 17: Object Counting Number Mode (Medium Priority)

**Goal**: Implement a new number display mode using visual object counting to help toddlers understand place value concepts through familiar objects.

**Design**: Use emoji objects to represent place values:
- 🍎 (Apple) = 1s place
- 🛍️ (Shopping Bag) = 10s place  
- 📦 (Box) = 100s place
- 🚛 (Truck) = 1000s place

**Examples**:
- Number 5: Display 5 apples stacked vertically
- Number 15: Display 1 shopping bag with 5 apples stacked above it
- Number 234: Display 2 boxes, 3 shopping bags, 4 apples (stacked in columns)
- Number 1,567: Display 1 truck, 5 boxes, 6 shopping bags, 7 apples

#### Phase 17.1: Core Implementation
- [ ] Write failing test for object counting numeral rendering
- [ ] Create `renderObjectCountingNumeral()` method in game.js
- [ ] Implement place value decomposition (extract 1s, 10s, 100s, 1000s digits)
- [ ] Create vertical stacking layout for each place value column
- [ ] Add proper spacing between place value columns (left to right: 1000s, 100s, 10s, 1s)
- [ ] Ensure objects are properly sized and aligned for readability

#### Phase 17.2: Configuration Integration  
- [ ] Add objectCounting toggle to numberModes configuration in ConfigManager
- [ ] Update ConfigScreen advanced section to include Object Counting checkbox
- [ ] Add object counting to getNumberModes() method
- [ ] Test configuration persistence and UI toggle functionality

#### Phase 17.3: Game Engine Integration
- [ ] Update spawnObjectAt() to call renderObjectCountingNumeral() when enabled
- [ ] Add object counting components to componentLayout system for movement preservation
- [ ] Ensure object counting numerals move as cohesive unit during dragging
- [ ] Add proper cleanup for object counting components in removeObject()

#### Phase 17.4: Testing & Polish
- [ ] Write comprehensive tests for place value decomposition logic
- [ ] Test edge cases: 0, 1, 10, 100, 1000, 9999, etc.
- [ ] Test visual layout with browser testing (Playwright)
- [ ] Ensure object counting works with speech synthesis (reads main number, not individual objects)
- [ ] Test interaction with other number modes (should display alongside binary, Kaktovik, Cistercian)

**Expected Outcome**: 
- Numbers display with intuitive object counting visualization
- Toddlers can count individual objects to understand place value
- Objects stack neatly in columns without overlapping
- Configuration toggle works properly in admin interface
- Object counting numerals move cohesively with main number during dragging

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

### Phase 18: Code Refactoring (High Priority)

**Goal**: Refactor large files to follow the "wide and shallow" principle (files kept under 300 lines) for better maintainability and separation of concerns.

**Files Requiring Refactoring:**
- `/src/game.js` - 2,640 lines (needs major refactoring)
- `/src/config/ConfigScreen.js` - 1,864 lines (needs refactoring)
- `/src/config/ConfigManager.js` - 397 lines (over limit)

#### Phase 18.1: Game.js Refactoring (High Priority)
- [ ] Write tests for all game.js methods to enable safe refactoring
- [ ] Extract audio system to `src/audio/AudioManager.js`
- [ ] Extract input handling to `src/input/InputManager.js`
- [ ] Extract rendering system to `src/rendering/RenderManager.js`
- [ ] Extract object management to `src/objects/ObjectManager.js`
- [ ] Extract speech system to `src/speech/SpeechManager.js`
- [ ] Create proper module imports/exports for all extracted systems
- [ ] Update tests to work with new modular structure
- [ ] Ensure all 165 unit tests continue passing after refactoring

#### Phase 18.2: ConfigScreen.js Refactoring (Medium Priority)
- [ ] Extract form section builders to separate methods
- [ ] Create UI component classes for reusable elements
- [ ] Split large rendering methods into smaller focused methods
- [ ] Extract styling to separate CSS module
- [ ] Ensure configuration functionality remains intact

#### Phase 18.3: ConfigManager.js Optimization (Low Priority)
- [ ] Review and optimize validation logic
- [ ] Extract migration logic to separate module if needed
- [ ] Ensure clean separation between data management and business logic

#### Phase 18.4: File Organization Cleanup (Completed ✅)
- [x] Remove outdated `/src/emojis.json` (duplicate file)
- [x] Update service worker cache paths from `/src/` to `/public/` for data files
- [x] Update Jest configuration to exclude correct file paths
- [x] Verify all file references point to correct locations

**Expected Outcome**: 
- All source files under 300 lines following "wide and shallow" principle
- Better separation of concerns and modularity
- Easier maintenance and testing
- Preserved functionality with all tests passing

### Notes

- Following TDD: Write failing test first, implement minimal code to pass, commit, repeat
- Each feature tested independently
- Code files kept under 300 lines (VIOLATION: game.js=2640, ConfigScreen.js=1864, ConfigManager.js=397)
- Need to develop an optional "Grid" mode that makes a grid (larger or smaller depending on screen size) with an array of things for the baby to poke and make voice. Things don't move in grid mode.Must discuss.
- Frequent commits with clear messages
- All tests passing ✅
- Ready for core functionality deployment, enhancement phases in progress
- User wants to flesh out and implement: We need a configureation screen, but I' not sure how I want it to work yet, but it should have some sort of differnt age ranges that reveal different things (youngest maybe omits numbers, or only shows 0-10, and uses numbers of common obejects to encourage counting instead of binary - might still include kartovic, might not too, also maybe lowercase letters aren't introduced until a later age - later ages maybe unlock even more emojis, of more sophisticated and less familiar things.

### Phase 19: Voice Recognition Integration (Stretch Goal - Low Priority)

**Goal**: Implement voice recognition that listens for spoken words and highlights matching objects with particle effects.

**Features**:
- Always-on voice recognition mode (configurable, default off)
- Real-time speech-to-text using Web Speech API
- Automatic word matching against displayed object labels
- Visual highlighting of matching words with special particle effects
- Multi-language voice recognition support for all enabled languages

#### Phase 19.1: Core Voice Recognition
- [ ] Add voice recognition toggle to configuration screen
- [ ] Implement Web Speech API integration with continuous listening
- [ ] Create word matching algorithm that compares spoken words to displayed labels
- [ ] Add voice recognition permissions handling and error states
- [ ] Test cross-browser compatibility (Chrome, Firefox, Safari, Edge)

#### Phase 19.2: Visual Feedback System
- [ ] Create special particle effect for voice-activated highlighting
- [ ] Implement word highlighting animation when voice match detected
- [ ] Add audio feedback (pleasant chime) when word is recognized
- [ ] Create visual indicator showing voice recognition is active/listening
- [ ] Add confidence threshold for voice recognition accuracy

#### Phase 19.3: Multi-language Support
- [ ] Map voice recognition languages to enabled toy languages
- [ ] Handle accent and pronunciation variations
- [ ] Add fuzzy matching for close-but-not-exact pronunciations
- [ ] Test voice recognition accuracy across different languages
- [ ] Add vocabulary training/learning mode

#### Phase 19.4: Advanced Features
- [ ] Add phrase recognition (e.g., "red car", "big dog")
- [ ] Implement context-aware matching (prioritize recently spawned objects)
- [ ] Add voice command support ("clear all", "spawn car", "change language")
- [ ] Create voice recognition analytics and learning improvements
- [ ] Add background noise filtering and voice isolation

### Phase 20: Physics & Gravity System (Stretch Goal - Low Priority)

**Goal**: Add realistic physics simulation with device accelerometer support for gravity-based object movement.

**Features**:
- Real-time accelerometer data integration
- Realistic physics simulation using Phaser physics engine
- Objects fall and move according to device orientation
- Collision detection between objects
- Bounce, friction, and gravity effects

#### Phase 20.1: Accelerometer Integration
- [ ] Add device orientation API integration
- [ ] Request accelerometer permissions with fallback handling
- [ ] Create smooth gravity vector calculation from accelerometer data
- [ ] Add calibration system for different device orientations
- [ ] Test accelerometer support across devices (mobile, tablet, laptop)

#### Phase 20.2: Physics Engine Setup
- [ ] Enable Phaser Matter.js physics in game scene
- [ ] Convert all spawned objects to physics bodies
- [ ] Add realistic mass, bounce, and friction properties to objects
- [ ] Implement object-to-object collision detection
- [ ] Add world boundaries and edge collision handling

#### Phase 20.3: Gravity Effects Implementation
- [ ] Map accelerometer data to physics world gravity vector
- [ ] Add smooth gravity transitions when device orientation changes
- [ ] Implement object stacking and pile formation
- [ ] Add gentle physics dampening to prevent chaos
- [ ] Create gravity toggle for devices without accelerometer support

#### Phase 20.4: Advanced Physics Features
- [ ] Add object size/mass variation based on content type
- [ ] Implement magnetic attraction effects between related objects
- [ ] Add wind/air resistance simulation
- [ ] Create object clustering behaviors (similar objects attract)
- [ ] Add physics-based animations for spawn/despawn effects

#### Phase 20.5: User Experience Polish
- [ ] Add physics enable/disable toggle in configuration
- [ ] Create visual indicators showing gravity direction
- [ ] Add haptic feedback for collisions (on supported devices)
- [ ] Implement smooth transitions between physics and static modes
- [ ] Add physics-based sound effects for collisions and movements

#### Phase 20.6: Performance Optimization
- [ ] Optimize physics calculations for mobile devices
- [ ] Add object sleeping/waking for inactive objects
- [ ] Implement efficient collision detection algorithms
- [ ] Add frame rate monitoring and physics quality scaling
- [ ] Create physics LOD (level of detail) system for many objects

**Expected Outcomes**:
- **Voice Recognition**: Natural speech interaction where saying "dog" highlights any dog emojis on screen with special effects
- **Physics & Gravity**: Objects realistically fall toward the bottom of the device when tilted, creating an engaging physical play experience
- **Enhanced Immersion**: Combined with existing features creates a truly interactive learning environment
- **Accessibility**: Voice recognition provides alternative interaction method for users with motor difficulties

### Phase 21: Multi-Mode Game System Architecture (High Priority)

**Goal**: Create an extensible game mode system that transforms ToddleToy from a single sandbox experience into a comprehensive collection of educational mini-games.

#### Phase 21.1: Core Mode Registry System
- [ ] Create `src/modes/index.js` with extensible mode registry exporting array of mode objects `{ id, name, initFn }`
- [ ] Add "Game Mode" selector to admin configuration panel
- [ ] Implement persistent game mode selection with settings storage
- [ ] Create hot-swap system to switch between modes without page reload
- [ ] Add `settings.enableStretchModes` toggle to show/hide advanced modes
- [ ] Ensure current "Sandbox" free-play remains as default mode (`id: 'sandbox'`)

#### Phase 21.2: Mode Lifecycle Management
- [ ] Implement mode initialization system with `initFn(game)` interface
- [ ] Create mode disposal system to clean up listeners/sprites when switching modes
- [ ] Add mode state management to prevent conflicts between different game modes
- [ ] Ensure all modes respect current language settings and numeral systems
- [ ] Maintain compatibility with existing input systems (touch, keyboard, gamepad)

### Phase 22: Six Educational Game Modes (High Priority)

**Implementation Order**: Build in exact priority order for optimal learning progression.

#### Phase 22.1: Find & Pop Mode (`id: 'findPop'`)
**Concept**: Voice-guided object identification with positive reinforcement
- [ ] Write failing test for Find & Pop game loop
- [ ] Implement object spawning system (6-10 random objects respecting content filters)
- [ ] Create target selection and voice prompt system ("Find the blue circle!")
- [ ] Add correct tap detection with "pop" animation and celebration
- [ ] Implement gentle feedback for wrong taps (speak object name, continue waiting)
- [ ] Support all input methods (touch, mouse, controller "A" button)
- [ ] Add self-correction mechanics with no penalties - child retries until success

#### Phase 22.2: Animal Parade Mode (`id: 'animalParade'`)
**Concept**: Sequential memory game with drag-and-drop animal ordering
- [ ] Write failing test for Animal Parade sequence verification
- [ ] Create side-tray system with 6+ animal emoji selection
- [ ] Implement voice ordering system (e.g., "Cat, Dog, Monkey")
- [ ] Add drag-and-drop mechanics for parade line positioning
- [ ] Create sequence verification system that checks order after each drop
- [ ] Implement gentle correction hints for wrong order placement
- [ ] Add victory celebration with confetti effects and new order generation

#### Phase 22.3: Emoji Countdown Mission (`id: 'countdown'`)
**Concept**: Number sequence learning with rocket launch reward
- [ ] Write failing test for countdown sequence validation
- [ ] Create rocket sprite display system at top-center
- [ ] Implement shuffled number display (1-10 or user-configurable max)
- [ ] Add descending tap sequence detection and validation
- [ ] Create voice feedback for each number tap with fueling bar animation
- [ ] Implement rocket launch sequence with fireworks when reaching "0"
- [ ] Add automatic restart cycle for continuous play

#### Phase 22.4: Counting Adventure - Feed the Animal (`id: 'feedAnimal'`)
**Concept**: Quantity matching with drag-and-drop food counting
- [ ] Write failing test for food counting validation
- [ ] Create friendly animal emoji positioning system (left side)
- [ ] Implement random count (1-10) and food emoji selection
- [ ] Add voice prompting ("Feed the monkey 5 bananas!") with numeral display
- [ ] Create drag-and-drop food item system with mouth hit-box detection
- [ ] Implement live counting feedback ("one... two...") during dragging
- [ ] Add exact match detection with happy animal animation and celebration
- [ ] Provide continuous counting feedback until correct amount reached

#### Phase 22.5: Emoji Pizza Kitchen (`id: 'pizzaKitchen'`)
**Concept**: Multi-ingredient counting with visual recipe completion
- [ ] Write failing test for pizza order completion validation
- [ ] Create pizza crust canvas system in center area
- [ ] Implement side-tray topping selection (🍄,🫑,🧀, etc.)
- [ ] Add order generation system (up to 3 toppings, 1-6 units each)
- [ ] Create voice ordering ("Two mushrooms, three peppers!")
- [ ] Implement drag-and-drop topping placement with live counters
- [ ] Add order completion detection with "Perfect pizza!" celebration
- [ ] Create pizza slice animation and automatic new order generation

#### Phase 22.6: Emoji Orchard Mode (`id: 'emojiOrchard'`)
**Concept**: Category sorting and counting with fruit collection
- [ ] Write failing test for fruit collection validation
- [ ] Create fruit tree system (🍎,🍌,🍇) with random fruit quantities
- [ ] Implement labeled basket system for each fruit type
- [ ] Add Goal Variant A: Category sorting ("Pick all the apples")
- [ ] Add Goal Variant B: Quantity collection ("Collect 4 bananas")
- [ ] Create drag-and-drop mechanics from trees to appropriate baskets
- [ ] Implement basket glow effects and count voicing on completion
- [ ] Add automatic new layout generation for continuous play

### Phase 23: Advanced Mode Features (Medium Priority)

#### Phase 23.1: Mode Persistence & Settings
- [ ] Implement mode selection persistence across browser sessions
- [ ] Add mode-specific configuration options (difficulty levels, content filters)
- [ ] Create mode progress tracking and achievements system
- [ ] Add parental controls for mode accessibility

#### Phase 23.2: Cross-Mode Compatibility
- [ ] Ensure all modes work with existing multilingual speech system
- [ ] Test all modes with different numeral display systems (Cistercian, Binary, etc.)
- [ ] Verify controller, keyboard, and touch input compatibility across all modes
- [ ] Add accessibility features for each mode (screen reader support, motor assistance)

#### Phase 23.3: Mode Analytics & Learning
- [ ] Add learning analytics for each mode (completion rates, error patterns)
- [ ] Implement adaptive difficulty based on child's performance
- [ ] Create progress visualization for parents/educators
- [ ] Add educational value documentation for each mode

### Phase 24: Future Mode Extensibility (Low Priority)

#### Phase 24.1: Mode Development Framework
- [ ] Create mode development template and documentation
- [ ] Add hot-reload support for mode development
- [ ] Create mode testing utilities and helpers
- [ ] Implement mode validation system for quality assurance

#### Phase 24.2: Community & Expansion
- [ ] Design API for community-contributed modes
- [ ] Create mode sharing and import system
- [ ] Add mode rating and review system
- [ ] Implement age-appropriate mode recommendations

**Expected Outcomes**:
- **Comprehensive Learning Platform**: Transform single sandbox into 7 distinct educational experiences
- **Progressive Skill Development**: Modes ordered by complexity for optimal learning progression  
- **Extensible Architecture**: Easy addition of new modes through registry system
- **Maintained Compatibility**: All existing features (multilingual, numerals, inputs) work across all modes
- **Educational Value**: Each mode targets specific learning objectives (identification, sequencing, counting, categorization)
- **Positive Reinforcement**: All modes use encouragement-based learning with no penalties

### Phase 25: Family Photo Mode & Custom Emoji Features (Medium Priority)

**Goal**: Enable parents to photograph or upload family member photos and add them as interactive objects for their child to touch and name.

#### Phase 25.1: Family Photo Mode (`id: 'familyPhoto'`)
**Concept**: Personal family member photo integration with speech recognition

- [ ] Write failing tests for photo upload and family member management
- [ ] Implement camera API integration for taking family photos
- [ ] Add file upload system for existing family photos  
- [ ] Create family member naming interface with text input
- [ ] Implement photo cropping/resizing system (square format optimized)
- [ ] Add family member gallery management (add/edit/delete)
- [ ] Create on-device storage system (localStorage + IndexedDB for photos)
- [ ] Implement import/export functionality for family data backup
- [ ] Add photo-as-spawnable-object integration with existing game engine
- [ ] Ensure speech synthesis reads family member names correctly
- [ ] Add privacy controls and data deletion options

#### Phase 25.2: Custom Unicode Emoji Feature
**Concept**: User-selectable custom Unicode emojis beyond the default set

- [ ] Write failing tests for custom emoji management
- [ ] Create Unicode emoji picker interface with search functionality
- [ ] Implement custom emoji category system (user-defined groups)
- [ ] Add custom emoji storage and persistence (localStorage)
- [ ] Integrate custom emojis with existing weighted spawning system
- [ ] Create custom emoji import/export for sharing between devices
- [ ] Add emoji validation to ensure proper Unicode support
- [ ] Implement custom emoji weight configuration 
- [ ] Ensure custom emojis work with speech synthesis
- [ ] Add custom emoji management interface (organize, rename, delete)

#### Phase 25.3: Advanced Family Features
- [ ] Add relationship labels (Mom, Dad, Grandpa, etc.) with multilingual support
- [ ] Implement family member grouping (immediate family, extended family, friends)
- [ ] Create family tree visualization mode
- [ ] Add voice recording for family member names (parents can record pronunciations)
- [ ] Implement age-appropriate family member filtering
- [ ] Add family story mode (sequence family members in stories)

#### Phase 25.4: Data Management & Privacy
- [ ] Implement secure on-device photo storage with encryption
- [ ] Add photo compression for efficient storage
- [ ] Create backup/restore functionality for family data
- [ ] Implement data deletion and privacy controls
- [ ] Add export format for transferring between devices
- [ ] Ensure COPPA compliance for child data protection
- [ ] Add parental controls for family member visibility

**Expected Outcomes:**
- **Personal Connection**: Children can interact with photos of their actual family members
- **Learning Enhancement**: Familiar faces reinforce name recognition and family relationships
- **Custom Content**: Parents can add culturally relevant emojis and family photos
- **Privacy First**: All family data stored locally with optional encrypted backup
- **Extensible System**: Framework supports adding custom visual content beyond family photos
- **Educational Value**: Reinforces family relationships, names, and personal identity development

### Notes

- Following TDD: Write failing test first, implement minimal code to pass, commit, repeat
- Each feature tested independently
- Code files kept under 300 lines (VIOLATION: game.js=2640, ConfigScreen.js=1864, ConfigManager.js=397)
- Need to develop an optional "Grid" mode that makes a grid (larger or smaller depending on screen size) with an array of things for the baby to poke and make voice. Things don't move in grid mode.Must discuss.
- Frequent commits with clear messages
- All tests passing ✅
- Ready for core functionality deployment, enhancement phases in progress
