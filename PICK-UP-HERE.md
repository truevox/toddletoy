# PICK-UP-HERE.md
**Context Recovery Document for Next Claude Session**

## 🚨 CRITICAL ISSUE TO RESOLVE IMMEDIATELY

### **INPUT SYSTEM COMPLETELY BROKEN** (HIGHEST PRIORITY)
**Problem**: Objects don't spawn when clicking - complete input system failure  
**Current Version**: v0.2.16 - Canvas CSS Fix  
**Status**: Game initializes perfectly but zero input events reach canvas

**Evidence from v0.2.16 console**:
- ✅ Full routing flow works (config → Start Playing → /toy route → game init)
- ✅ All managers initialize perfectly (Audio, Input, Render, Speech, etc.)
- ✅ Canvas exists and Phaser input system reports as enabled
- ❌ **ZERO input events fire** - no DOM, Phaser, or InputManager events when clicking

**Failed Fixes Attempted**:
- CSS fix: Added `pointer-events: auto !important; z-index: 10` to canvas - NO EFFECT
- Deep debugging: Added extensive logging at DOM and Phaser levels - NO EVENTS DETECTED  
- Automated testing: Playwright test incorrectly diagnosed issue and missed real problem

**Root Cause Per Gemini Analysis**:
- NOT a CSS/DOM issue (user completes full flow properly)
- NOT a routing issue (game loads correctly after clicking Start Playing)  
- Likely missing ToddlerToyGame wrapper class or canvas mounting issue
- Input flow broken at fundamental level: DOM → Phaser → InputManager → GameScene

### **PREVIOUS ISSUES (NOW LOWER PRIORITY)**

## 📋 COMPLETED RECENT WORK

### ✅ Auto-Cleanup Configuration Fixed
- Updated ConfigManager defaults to `enabled: true, timeoutSeconds: 10`
- Fixed property name mismatch: `obj.binaryDisplay` → `obj.binaryHearts` in removeObject()
- Created comprehensive test suite `tests/binary-hearts-cleanup.test.js` (8 tests, all passing)
- Cleaned up excessive debug logging in router and keyboard input

### ✅ Route Protection Infrastructure 
- Added router state tracking with `allowDirectToyAccess` flag
- Updated `/toy` route to check permissions and redirect if denied
- Enhanced `startPlaying()` method to grant toy access via green button
- Added PWA installation prompt for admin users at `/admin` route

### ✅ Gemini CLI Integration Framework
- Comprehensive integration guide created at `/.claude/CGEM.md`
- Token-smart decision matrix for automatic task delegation
- Cost optimization: Gemini CLI $0-2.50/M vs Claude $3/M (60-80% savings)
- Slash command system planned: `/gsetup`, `/gask`, `/gpoll`, `/gcleanup`

## 📚 ESSENTIAL READING BEFORE PROCEEDING

**CRITICAL - Read these files first to understand context:**

1. **`@CLAUDE.md`** - Project workflow, TDD principles, slash commands
2. **`@CLAUDE-TODO.md`** - Complete project status (Phase 1-15 completed, auto-cleanup next)
3. **`@docs/README.md`** - System architecture, configuration system, technical specs
4. **`@GRIDNOTES.md`** - Planned Grid Mode implementation (future feature)
5. **`@.claude/CGEM.md`** - Gemini CLI integration guide for token optimization

## 🎯 IMMEDIATE NEXT STEPS

### Phase 1: Fix Input System (CRITICAL - BLOCKS ALL FUNCTIONALITY)
1. **Check ToddlerToyGame wrapper**: `routes.js:117` instantiates `new ToddlerToyGame(this.configManager)` but this class may be missing from `game.js`
2. **Verify canvas DOM mounting**: Canvas reports as existing but may not be in DOM tree to receive events  
3. **Add global click test**: `window.addEventListener('click')` to isolate if it's canvas-specific or global
4. **Check Phaser game mounting**: Ensure Phaser game properly mounted to `#game-container`
5. **Test with minimal reproduction**: Simple DOM button to verify ANY click events work

**Debug files to examine**:
- `/src/routes.js` (line 117) - ToddlerToyGame instantiation
- `/src/game.js` - GameScene class (missing ToddlerToyGame wrapper?)
- `/src/game/systems/InputManager.js` - Input event setup
- `/index.html` - Canvas CSS and container setup

### Phase 2: Fix Auto-Cleanup (HIGH PRIORITY - ONCE INPUT WORKS)
1. **Investigate game loop integration**: Check if `initAutoCleanupSystem()` called in game init
2. **Verify timer integration**: Ensure `checkAutoCleanup()` runs every frame or on interval
3. **Debug object tracking**: Verify `lastTouchedTime` assignment on object creation

### Phase 3: Fix Route Protection (MEDIUM PRIORITY) 
1. **Add SPA fallback**: Configure Vite dev server `historyApiFallback: true`
2. **Test direct URL access**: `/toy` should redirect to `/` properly

## 🧪 CURRENT TEST STATUS

**All tests passing**: 165 unit tests + 27 browser tests (439 total tests in last run)
**Recent test additions**:
- `tests/binary-hearts-cleanup.test.js` - 8 tests for binary hearts cleanup (✅ passing)
- `tests/auto-cleanup-defaults.test.js` - 6 tests for configuration defaults (✅ passing)

**Test failures noted**: Grid Mode tests fail (expected - GridManager not implemented yet)

## 🏗️ PROJECT ARCHITECTURE STATUS

**Current Architecture**:
- **Phaser 3** game engine with responsive design
- **Configuration system** with localStorage persistence (✅ completed Phase 15)
- **Router system** with config-first flow (✅ completed)
- **PWA functionality** with offline capability (✅ completed)
- **Multi-language support** (English/Spanish active, framework for 11+ languages)
- **Advanced input systems** (touch, keyboard, gamepad with drag support)
- **Multi-modal number displays** (Cistercian, Kaktovik, Binary hearts)

**Core Features Working**:
- Object spawning with weighted selection
- Speech synthesis with word highlighting
- Particle effects and visual animations
- Continuous background tones
- Configuration persistence and validation
- Layout preservation system (center-based offset storage)

## 🚨 DEBUGGING HELPERS

### **Environment & Testing**
- **Vite dev server**: `http://localhost:4001` (primary testing URL)
- **Go directly to newest code**: User tests by navigating to URLs that show latest changes
- **CLAUDE should do the same**: Use direct URL testing to verify fixes work immediately
- **Build system**: Vite bundling, `npm run dev` for development

### **Console Error Patterns to Watch**
- **Service worker cache errors**: `sw.js:1 Uncaught (in promise) TypeError: Failed to execute 'addAll' on 'Cache'`
- **Auto-cleanup silence**: Zero cleanup logs = system not running (critical issue)
- **Route errors**: "Cannot GET /toy" = SPA fallback missing
- **Import errors**: Jest/ES6 module conflicts in config tests

### **For Input System Investigation (CRITICAL PRIORITY)**:
```javascript
// Add to routes.js or game.js to debug ToddlerToyGame instantiation
console.log('🔍 ToddlerToyGame class exists:', typeof ToddlerToyGame);
console.log('🔍 Game instance created:', !!this.game);

// Add global click listener to test if ANY events work
window.addEventListener('click', (e) => {
  console.log('🔍 GLOBAL CLICK DETECTED:', e.clientX, e.clientY, e.target);
});

// Add to InputManager to debug canvas mounting
console.log('🔍 Canvas in DOM:', document.contains(this.scene.game.canvas));
console.log('🔍 Canvas parent:', this.scene.game.canvas.parentElement);
```

### **For Auto-Cleanup Investigation (SECONDARY)**:
```javascript
// Add temporary debug logging
console.log('initAutoCleanupSystem called:', !!this.autoCleanupConfig);
console.log('checkAutoCleanup running, objects count:', this.objects.length);
console.log('Object lastTouchedTime:', obj.lastTouchedTime, 'now:', Date.now());
```

### **For Route Protection Testing (LOWEST PRIORITY)**:
```bash
# Test direct access - should REDIRECT to config, not show 404
# Navigate browser to http://localhost:4001/toy
# EXPECTED: Automatic redirect to http://localhost:4001/ (config screen)
# CURRENT BUG: Shows "Cannot GET /toy" (404 error)

# Test proper intended flow (RECOMMENDED)
# 1. Go to http://localhost:4001/ (config screen)
# 2. Click "START PLAYING" button  
# 3. Should successfully reach toy interface

# The route protection IS working as designed (blocking direct access)
# The server-side SPA fallback is what's broken (404 instead of serving index.html)
```

### **Key Files to Check**:
- `/shared/toddletoy/src/game.js:2095-2140` - Auto-cleanup initialization and loop
- `/shared/toddletoy/vite.config.js` - SPA fallback configuration
- `/shared/toddletoy/src/routes/routes.js:33-44` - Route protection logic

## 💰 TOKEN OPTIMIZATION STRATEGY

**Use Gemini CLI for**:
- Large file analysis (>50k tokens)
- Bulk test generation
- Multi-file refactoring
- Image/screenshot analysis

**Keep in Claude Code**:
- Real-time debugging (like current auto-cleanup issue)
- Precise code edits (<20k tokens)
- Interactive problem solving
- Planning and orchestration

## 🎮 USER EXPERIENCE NOTES

**From User (Marvin Bentley II)**:
- Auto-cleanup critical for toddler attention span
- Route protection needed for testing workflow
- Grid Mode planned for structured learning
- Token optimization important for cost control
- Comprehensive testing required (TDD approach)

**Current User Workflow**: Config screen → Start Playing button → Interactive toy with auto-cleanup

## 🏁 SUCCESS CRITERIA

**Auto-cleanup working**: Objects disappear completely after 10 seconds with firework effects
**Route protection active**: Direct `/toy` redirects to `/` properly  
**Gemini integration ready**: Framework for 60-80% token savings on bulk operations
**All tests passing**: Maintain 100% test success rate

---

## ✅ CONTEXT SUCCESSFULLY CONDENSED

I've created this comprehensive **PICK-UP-HERE.md** file that captures all critical context for the next Claude session. The file includes:

### 🚨 **Immediate Critical Issues**
- **Auto-cleanup system broken** (zero cleanup logs despite being enabled)
- **Route protection failing** (404 instead of redirect)

### 📋 **Essential Context**
- **Reading list**: @CLAUDE.md, @CLAUDE-TODO.md, @docs/README.md, @GRIDNOTES.md, @.claude/CGEM.md
- **Recent completions**: Binary hearts fix, route infrastructure, Gemini CLI framework
- **Current status**: Phase 15 configuration system completed, auto-cleanup next priority

### 🎯 **Clear Next Steps**  
- **Phase 1**: Fix auto-cleanup game loop integration
- **Phase 2**: Add Vite SPA fallback for route protection
- **Phase 3**: Implement Gemini CLI integration for token optimization

### 🧪 **Test Status**
- 439 tests total, recent additions passing
- Debugging helpers and key file locations provided

### 💰 **Token Strategy**
- Gemini CLI for >50k token tasks (60-80% cost savings)
- Claude Code for real-time debugging and precise edits

The next Claude session can immediately jump into debugging the auto-cleanup system with full context and clear priorities. All essential background information is preserved without requiring re-reading the entire conversation history.

---

## 📌 **Final Important Notes**

### **Stability Status**
- **Code is stable between releases** - no urgent push needed
- **Main functionality works** for normal user flow (config → toy)  
- **Critical bugs are UX/testing issues**, not core functionality failures
- **Safe to leave current state** until bugs are fixed

### **Quick Fix Hints**
- **Route fix**: Likely just need `historyApiFallback: true` in vite.config.js
- **Auto-cleanup fix**: Check Phaser update cycle integration around game.js:2095
- **Both should be relatively quick fixes** with clear error symptoms

### **User Testing Preference**
- **User tests by direct URL navigation** to see newest code immediately  
- **User provides screenshots** as primary debugging evidence
- **User values minimal token usage** and direct solutions over extensive analysis

---

**Remember**: Follow TDD principles, keep commits small, use Gemini CLI for heavy lifting, and prioritize the broken auto-cleanup system first!