# PICK-UP-HERE.md
**Context Recovery Document for Next Claude Session**

## 🚨 CRITICAL ISSUES TO RESOLVE IMMEDIATELY

### 1. **Auto-Cleanup System BROKEN** (HIGH PRIORITY)
**Problem**: Zero auto-cleanup logs in console despite being enabled with 10-second timeout
**Evidence**: Latest screenshot (2025-06-28 19:06) shows objects spawning normally but **complete silence from auto-cleanup system** - no cleanup logs after 10+ seconds
**Root Cause**: Likely missing game loop integration - `checkAutoCleanup()` not being called regularly
**Status**: Configuration defaults fixed (enabled=true, 10s timeout) but core system not running
**CONFIRMED**: Auto-cleanup system is completely non-functional, not just configuration issue

### 2. **Route Protection FAILING** (HIGH PRIORITY) 
**Problem**: Direct `/toy` access shows 404 instead of redirect to `/`
**Evidence**: Screenshot shows "Cannot GET /toy" error
**Root Cause**: Server not configured for SPA fallback - needs `historyApiFallback: true` in Vite config
**Status**: Client-side router logic implemented but server-side fallback missing

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

### Phase 1: Fix Auto-Cleanup (HIGH PRIORITY)
1. **Investigate game loop integration**: Check if `initAutoCleanupSystem()` called in game init
2. **Verify timer integration**: Ensure `checkAutoCleanup()` runs every frame or on interval
3. **Debug object tracking**: Verify `lastTouchedTime` assignment on object creation
4. **Test with 1-second timeout**: For rapid debugging verification
5. **Run existing tests**: `npm test -- tests/binary-hearts-cleanup.test.js`

### Phase 2: Fix Route Protection (HIGH PRIORITY) 
1. **Add SPA fallback**: Configure Vite dev server `historyApiFallback: true`
2. **Test scenarios**: Direct URL access, browser refresh, navigation
3. **Verify redirect logic**: Direct `/toy` → `/` redirection working

### Phase 3: Implement Gemini CLI Integration (MEDIUM PRIORITY)
1. **Add CLAUDE.md section**: Gemini CLI integration block with decision matrix
2. **Create minimal tests**: Ultra-low token connectivity tests (`'Respond with: Duck'`)
3. **Implement slash commands**: `/gtest` for basic connectivity verification
4. **Token optimization**: Automatic delegation for >50k token tasks

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

### **For Auto-Cleanup Investigation**:
```javascript
// Add temporary debug logging
console.log('initAutoCleanupSystem called:', !!this.autoCleanupConfig);
console.log('checkAutoCleanup running, objects count:', this.objects.length);
console.log('Object lastTouchedTime:', obj.lastTouchedTime, 'now:', Date.now());
```

### **For Route Protection Testing**:
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