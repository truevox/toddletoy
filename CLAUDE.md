# CLAUDE.md

## Preamble
My name is Marvin Bentley II.

## 🎯 Purpose
This file configures Claude Code to follow a structured, TDD-first workflow tailored for the toddler-toy PWA. It ensures Claude works as a disciplined partner: reading docs, planning, writing failing tests first, implementing to pass, and committing in small, verifiable steps.

## FYI
- FYI, use CLAUDE-TODO.md as your personal todo file.
- Use @.claude/CGEM.md to implement a sub-agent named Gemini.
- ALWAYS BUMP THE VERSION NUMBER BEFORE YOU TELL ME SOMETHING IS FIXED OR IMPLEMENTED OR NEEDS TESTING!

## ⚙️ Workflow & Best Practices

### 1. Planning Phase
- **Prompt Claude to “think hard”** and generate an implementation plan before writing code :contentReference[oaicite:6]{index=6}.
- Ask Claude to list testable increments (e.g., "spawn object at touch point", "speech Synthesis label output").
- Use @CLAUDE-TODO.md as your personal todo list. It must be kept up to date.
- Populate and update /CLAUDE-TODO.md with a structured plan to implement this project, and refer to it reguarlly. Update it indicating what parts are complete as you complete them.
- Create or update .gitignore as approprate to avoid uploading secrets, test results, dist, libraries/frameworks, etc.
- Do **not** make a commit without doublechecking to see if anything that should be in .gitignore is not.

### 2. TDD Cycle
Repeat for each feature:
  1. **"Write a failing test"**: Known input → expected behavior.
  2. **Run tests**: Confirm failure.
  3. **Commit tests**.
  4. **Implement code**: Only what’s needed to pass tests. Do not cheat and edit the tests to make them pass. The only reason to change a test is if it's effectively not testing the right thing (and, for the record, a broken test is absolutely an example of a test not testing the right thing (as it's effectively testing nothing!)).
  5. **Wide and shallow** - Code files roughly kept under 300 lines, refactor when they grow too large - seperateion of concerns, nice and modular and modern.
  6. Run tests to confirm **green**.
  7. **Commit implementation**.
  8. **Refactor** as needed; repeat cycle :contentReference[oaicite:7]{index=7}.

### 📋 File Refactoring Guidelines
- **Refactoring Definition**: Restructuring existing code/content without changing its external behavior or losing information
- **Zero-Loss Principle**: When refactoring files (especially documentation), NO content should be lost - only reorganized
- **Documentation Refactoring**: Moving content between files (e.g., completed tasks from TODO to TODONE) must preserve ALL information
- **Verification Required**: Always verify line counts and content completeness before/after refactoring
- **Rollback Plan**: Be prepared to restore from git if refactoring accidentally removes content

### 🤖 Gemini CLI Sub-Agent Usage Guidelines

#### When to Use Gemini CLI
- **Large-scale analysis**: Files >1000 lines, complex architectural reviews
- **Extensive data tasks**: Translation verification, bulk data processing
- **Research-heavy tasks**: Educational theory, cultural considerations, best practices
- **Context-heavy analysis**: Tasks requiring >200k tokens of context
- **Boring but extensive jobs**: Repetitive data transformation, comprehensive documentation
- **Anytime you can save tokens**: Basically, use Gemini for anything that let's you offload a bunch of tokens, saving yourself from having to process them. If invoking Gemini, giving it context, and recieving it's results would use more tokens that just doing it yourself, don't use Gemini. But if it WOULD save you a reasonable amount of tokens, DO use Gemini!
- **Remeber, within it's limits, Gemini is almost free** But only almost - it still costs you what ever tokens you used to control it and recieve it's output. Use it to save tokens.

#### File and Directory Inclusion Syntax

Use the `@` syntax to include files and directories in your Gemini prompts. Paths are relative to where you run the gemini command:

**Single file analysis:**
```bash
gemini -p "@src/main.py Explain this file's purpose and structure"
```

**Multiple files:**
```bash
gemini -p "@package.json @src/index.js Analyze the dependencies used in the code"
```

**Entire directory:**
```bash
gemini -p "@src/ Summarize the architecture of this codebase"
```

**Multiple directories:**
```bash
gemini -p "@src/ @tests/ Analyze test coverage for the source code"
```

**Current directory and subdirectories:**
```bash
gemini -p "@./ Give me an overview of this entire project"
# Or use --all_files flag:
gemini --all_files -p "Analyze the project structure and dependencies"
```

#### Implementation Verification Examples

**Check if a feature is implemented:**
```bash
gemini -p "@src/ @lib/ Has dark mode been implemented in this codebase? Show me the relevant files and functions"
```

**Verify authentication implementation:**
```bash
gemini -p "@src/ @middleware/ Is JWT authentication implemented? List all auth-related endpoints and middleware"
```

**Check for specific patterns:**
```bash
gemini -p "@src/ Are there any React hooks that handle WebSocket connections? List them with file paths"
```

**Verify error handling:**
```bash
gemini -p "@src/ @api/ Is proper error handling implemented for all API endpoints? Show examples of try-catch blocks"
```

**Check for rate limiting:**
```bash
gemini -p "@backend/ @middleware/ Is rate limiting implemented for the API? Show the implementation details"
```

**Verify caching strategy:**
```bash
gemini -p "@src/ @lib/ @services/ Is Redis caching implemented? List all cache-related functions and their usage"
```

**Check for specific security measures:**
```bash
gemini -p "@src/ @api/ Are SQL injection protections implemented? Show how user inputs are sanitized"
```

**Verify test coverage for features:**
```bash
gemini -p "@src/payment/ @tests/ Is the payment processing module fully tested? List all test cases"
```

#### Task Types & Examples
- **ANALYZE**: `gemini -p "ANALYZE: Review src/game.js (2,640 lines) for modular refactoring opportunities"`
- **RESEARCH**: `gemini -p "RESEARCH: Educational game design principles for toddlers aged 2-4"`
- **CULTURAL**: `gemini -p "CULTURAL: Verify Mandarin Chinese translations are culturally appropriate for toddlers"`
- **TRANSLATE**: `gemini -p "TRANSLATE: Verify translation accuracy in public/things.json for all 11 languages"`
- **PERFORMANCE**: `gemini -p "PERFORMANCE: Analyze browser test failures and suggest optimization strategies"`

#### Collaboration Workflow
1. **Claude**: Identifies need for large-scale analysis or research
2. **Gemini**: Conducts analysis using 1M token context window
3. **Claude**: Reviews Gemini's findings and implements recommendations
4. **Documentation**: Record decisions and insights in relevant files

#### Best Practices
- Use Gemini for tasks that would exceed Claude's context limits
- Delegate boring but extensive data processing tasks
- Leverage Gemini's web search capabilities for current best practices
- Always review and validate Gemini's suggestions before implementation
- Use structured prompts with clear task types for consistent results

#### Development Cache Management
- **Cache Issues**: Service Workers and localStorage can serve stale data during development
- **Quick Cache Clear**: Use `clearToddleToyCache()` in browser console (development mode only)
- **Force Refresh**: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac) clears localStorage automatically
- **Manual Cache Busting**: Add `?fresh` or `?nocache` to URL for guaranteed fresh data
- **Service Worker**: Automatically bypasses cache for localhost and JSON files with version parameters
- **localStorage Detection**: Auto-clears on force refresh in development mode (ports 4000/4001)

### 3. Visual/UI Iteration
- After basic behavior works, ask Claude to provide screenshots or visual mockups.
- Iterate UI elements (animations, layout) until polished :contentReference[oaicite:8]{index=8}.

### 4. Commit & GitHub Integration
- Use `gh` CLI to create branches, commits, and PRs.
- Keep commits small and focused.
- Vite is our bundler - use it.

### 📦 Version Management
- **MANDATORY**: Bump version numbers with EVERY commit
- Update version in relevant files (main.js, game.js, package.json, etc.)
- Ensure version is announced in console logs for debugging
- **Pre-1.0 Development**: Use 0.x.x versioning (e.g., 0.2.13 → 0.2.14)
- Stay below 1.0.0 until explicit launch approval from Marvin
- **Post-1.0 Launch**: Switch to semantic versioning (MAJOR.MINOR.PATCH)
- This ensures all team members know exactly which code version is running

---

## 🧪 Testing & CI
- Include unit, integration, and end-to-end tests.
- Use pre-commit hooks to run linter, formatter, and tests locally :contentReference[oaicite:9]{index=9}.
- Provide a GitHub Actions config (e.g., on `main` or `dev` branches).

---

## ⚡ Slash Commands (`.claude/commands/`)
Examples:

- **/test:spawn-object**  
  Run tests for spawning at touch/click.

- **/ui:render-object**  
  Show screenshot and check proper rendering.

- **/ci:run-all**  
  Run full test + lint suite + build.

- **/wakeup**
  Refamiliarize yourself with this document (@CLAUDE.md) and your todo document, CLAUDE-TODO.md.

Each command uses `$ARGUMENTS` for flexibility :contentReference[oaicite:10]{index=10}.

---

## 🤖 Agent Behavior Notes
- Follow **Think‑Plan‑Code‑Commit** model :contentReference[oaicite:11]{index=11}.
- Use **subagents** if feature scope is large (split into smaller tasks) :contentReference[oaicite:12]{index=12}.
- Always write a failing test before implementation.
- Ask for a review or second agent to “verify no over‑fitting” :contentReference[oaicite:13]{index=13}.

---

## ✅ Usage Summary
1. `claude` (launch session)  
2. Try slash commands or ask planning questions  
3. TDD loop: tests → code → commit  
4. Use visual iteration for UI polish  
5. Create PR with small, verified changes  

Let's build out this project step-by-step. When you're done reading this, please reference CLAUDE-TODO.md.