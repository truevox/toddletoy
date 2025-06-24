# CLAUDE.md

## Preamble
My name is Marvin Bentley II.

## 🎯 Purpose
This file configures Claude Code to follow a structured, TDD-first workflow tailored for the toddler-toy PWA. It ensures Claude works as a disciplined partner: reading docs, planning, writing failing tests first, implementing to pass, and committing in small, verifiable steps.

---

## ⚙️ Workflow & Best Practices

### 1. Planning Phase
- **Prompt Claude to “think hard”** and generate an implementation plan before writing code :contentReference[oaicite:6]{index=6}.
- Ask Claude to list testable increments (e.g., "spawn object at touch point", "speech Synthesis label output").
- Use @CLAUDE-TODO.md as your personal todo list. It must be kept up to date.
- Populate and update /CLAUDE-TODO.md with a structured plan to implement this project, and refer to it reguarlly. Update it indicating what parts are complete as you complete them.

### 2. TDD Cycle
Repeat for each feature:
  1. **"Write a failing test"**: Known input → expected behavior.
  2. **Run tests**: Confirm failure.
  3. **Commit tests**.
  4. **Implement code**: Only what’s needed to pass tests.
  5. Run tests to confirm **green**.
  6. **Commit implementation**.
  7. **Refactor** as needed; repeat cycle :contentReference[oaicite:7]{index=7}.

### 3. Visual/UI Iteration
- After basic behavior works, ask Claude to provide screenshots or visual mockups.
- Iterate UI elements (animations, layout) until polished :contentReference[oaicite:8]{index=8}.

### 4. Commit & GitHub Integration
- Use `gh` CLI to create branches, commits, and PRs.
- Keep commits small and focused.
- Vite is our bundler - use it.

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

Let's build out this project step-by-step.