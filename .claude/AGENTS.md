# AGENTS.md - Agent Collaboration Guidelines for ToddleToy

## 📋 Purpose

This document provides comprehensive guidelines for using Claude Code's Task tool to delegate complex, multi-step tasks to specialized agents during ToddleToy development.

---

## 🤖 Available Agent Types

Claude Code provides access to several specialized agents:

### 1. general-purpose
**Access to**: All tools
**Best for**:
- Researching complex questions across multiple files
- Searching for code patterns when you're not confident about file locations
- Multi-step implementation tasks requiring research + coding
- Tasks that would require multiple iterations of glob/grep

### 2. statusline-setup
**Access to**: Read, Edit
**Best for**:
- Configuring Claude Code status line settings
- Status line customization tasks

### 3. output-style-setup
**Access to**: Read, Write, Edit, Glob, Grep
**Best for**:
- Creating Claude Code output styles
- Output format customization tasks

---

## 📊 When to Use Agents vs Direct Tool Calls

### ✅ Use Agents For:
- **Open-ended searches**: "Find all files related to audio management"
- **Uncertain locations**: "Where is speech synthesis implemented?"
- **Multi-step research**: "Investigate how config is saved and loaded"
- **Large-scale refactoring research**: "Analyze game.js for potential modularization"
- **Complex architectural questions**: "How does the component layout system work?"

### ❌ Don't Use Agents For:
- **Known specific file paths**: Use Read tool directly
- **Simple grep patterns**: Use Grep tool directly for quick searches
- **Single class/function searches**: Use Glob with specific patterns
- **Tasks within 2-3 specific files**: Use Read tool on those files

---

## 🎯 Integration with TDD Workflow

Agents fit naturally into our TDD workflow:

### Planning Phase (Before Writing Tests)
Use agents to:
- Research existing implementations to understand patterns
- Find similar features to use as reference
- Identify dependencies and integration points

**Example:**
```
"Use general-purpose agent to research how other config properties are
implemented in ConfigManager.js and ConfigScreen.js, focusing on validation
and UI integration patterns."
```

### Implementation Phase (During Code Writing)
Use agents to:
- Verify implementation approaches
- Find edge cases in existing code
- Locate utility functions or helpers

**Example:**
```
"Use general-purpose agent to find all places where speech synthesis is
configured, and report how volume/rate are currently handled."
```

### Refactoring Phase (After Tests Pass)
Use agents to:
- Identify refactoring opportunities
- Find code duplication
- Suggest architectural improvements

**Example:**
```
"Use general-purpose agent to analyze src/game.js and suggest how to extract
the audio/speech systems into separate managers following the existing
manager pattern."
```

---

## ⚡ Parallel Agent Execution

When multiple independent research tasks are needed, run agents in parallel for maximum efficiency:

### Single Message with Multiple Task Calls
```
[Task 1]: "Search for all audio-related configuration in ConfigManager"
[Task 2]: "Find all places where speech synthesis is initialized"
[Task 3]: "Locate tests that verify volume control behavior"
```

### Sequential vs Parallel Decision Matrix
- **Parallel**: Tasks are independent and don't depend on each other's results
- **Sequential**: Task B needs results from Task A to inform its search

---

## 📚 Practical Examples from ToddleToy

### Example 1: Audio Configuration Research
**Scenario**: Need to add audio volume controls
**Agent Task**:
```
"Research existing ConfigManager patterns: Find how other config properties
like autoCleanup and numberModes are defined in getDefaults(), validated in
validateConfig(), and integrated into ConfigScreen UI. Report the pattern so
I can apply it to audio config."
```

### Example 2: Feature Implementation Verification
**Scenario**: Check if a feature is already implemented
**Agent Task**:
```
"Search the entire codebase for any existing volume control or mute
functionality. Check AudioManager, SpeechManager, and configuration files.
Report whether this feature exists and where it's implemented."
```

### Example 3: Test Pattern Discovery
**Scenario**: Need to write tests for new feature
**Agent Task**:
```
"Find existing test files that verify config properties work correctly.
Show me 2-3 examples of how ConfigManager validation is tested, so I can
follow the same pattern for audio config tests."
```

### Example 4: Refactoring Analysis
**Scenario**: game.js is 2640 lines and needs refactoring
**Agent Task** (use Gemini via CGEM.md for this):
```bash
gemini -p "ANALYZE: Review @src/game.js for modular refactoring
opportunities. Identify cohesive subsystems that could be extracted into
separate manager classes following the existing AudioManager and
SpeechManager patterns."
```

---

## 🔄 Agent + Gemini Collaboration Pattern

For very large files or complex analysis, use both:

1. **Claude Code Agent**: Quick searches and file location identification
2. **Gemini CLI**: Deep analysis of large files (>1000 lines)

**Example Workflow**:
```
# Step 1: Use agent to find relevant files
Claude Agent: "Find all files related to particle effects"

# Step 2: Use Gemini for deep analysis
gemini -p "@src/game/systems/ParticleManager.js ANALYZE: Review for
performance optimization opportunities"

# Step 3: Implement based on both findings
Claude: Implements optimizations using TDD
```

---

## 🎓 Best Practices

### 1. Clear Task Description
❌ Bad: "Find audio stuff"
✅ Good: "Search for all files that handle audio tones or speech synthesis, including configuration, initialization, and playback logic"

### 2. Specify Expected Output
❌ Bad: "Research config patterns"
✅ Good: "Research how config properties are defined in getDefaults(), validated in validateConfig(), and loaded in loadCurrentConfig(). Provide a summary of the pattern with 2-3 code examples."

### 3. Limit Scope When Possible
❌ Bad: "Analyze the entire codebase"
✅ Good: "Analyze only src/config/ and src/game/systems/ for audio-related functionality"

### 4. Use Agents for Research, Not Implementation
- Agents should gather information and report findings
- You (Claude Code) should implement based on agent reports
- Agents can suggest approaches but shouldn't write production code

### 5. Verify Agent Findings
- Always review agent reports critically
- Cross-check important findings with direct file reads
- Use agent reports as starting points, not final answers

---

## 📝 Agent Task Template

When invoking an agent, structure your prompt:

```
[TASK TYPE]: [Clear objective]

Files to examine: [Specific paths or patterns]

Expected output:
1. [First deliverable]
2. [Second deliverable]
3. [Third deliverable]

Return format: [Bullet points / Code examples / File list]
```

**Example:**
```
RESEARCH: How are UI event listeners configured in ConfigScreen

Files to examine: src/config/ConfigScreen.js

Expected output:
1. List of methods that add event listeners
2. Pattern used for volume slider value updates
3. Example of checkbox change handler implementation

Return format: Bullet points with code snippets
```

---

## 🚀 Integration with Existing Workflow

### With CLAUDE.md
- Agents are an extension of the "Think-Plan-Code-Commit" model
- Use agents during the "Think" and "Plan" phases
- Implement findings during the "Code" phase

### With CGEM.md
- Use Claude Code agents for quick searches (<50k tokens)
- Delegate to Gemini CLI for large-scale analysis (>200k tokens)
- Gemini is better for very large files or comprehensive codebase reviews

### With TDD Process
1. **Plan**: Use agent to research patterns
2. **Test**: Write failing tests based on findings
3. **Implement**: Code to pass tests
4. **Refactor**: Use agent to suggest improvements
5. **Commit**: Commit working code

---

## ✅ Usage Summary

- **Quick file search?** → Direct Glob/Grep
- **Known file path?** → Direct Read
- **Uncertain location?** → general-purpose agent
- **Multi-file research?** → general-purpose agent (parallel if independent)
- **Large file analysis (>1000 lines)?** → Gemini CLI via CGEM.md
- **Config customization?** → statusline-setup or output-style-setup agents

---

**Remember**: Agents are powerful assistants for research and planning. Use them to save time on exploratory work, but always verify findings and implement code yourself following TDD principles.
