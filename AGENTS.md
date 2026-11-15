# AGENTS.md

## Preface
My name is Marvin Bentley II.

## Preamble
Welcome, fellow AI collaborators! This guide provides shared expectations and best practices for any AI agent working in the ToddleToy repository. Follow it to keep work predictable, reviewable, and easy to integrate.
- ALWAYS BUMP THE VERSION NUMBER BEFORE YOU TELL ME SOMETHING IS FIXED OR IMPLEMENTED OR NEEDS TESTING!

## 🎯 Purpose
Keep every agent aligned on process, communication, and quality while collaborating on this toddler-focused PWA. Follow these practices to ensure consistency with Marvin Bentley II’s workflow expectations.

## 📂 Orientation
- Start with `PICK-UP-HERE.md` for high-level project context and current status.
- Review `CLAUDE.md` for the canonical, detailed workflow patterns.
- Check `CLAUDE-TODO.md` for task tracking; update it when completing work or creating follow-ups.
- Skim the repository root for additional context files (e.g., `GRIDNOTES.md`, `CONTRIBUTING.md`).
- Use the `docs/` directory for product context and UX references.
- Maintain scratch notes in `notes/agents/your-name.md` instead of sprinkling TODOs into code.

## ⚙️ Core Workflow

### 1. Think Before Coding
- Read the task description, relevant docs, and code carefully.
- Draft a lightweight plan with incremental, testable goals.
- Prefer explicit TODO items to “mental notes.”
- Outline your approach and share it (commit message, TODO, or PR summary) before diving in.

### 2. TDD-Friendly Loop
Repeat until the feature is complete:
1. **Identify** the next behavior to deliver and write a failing test (unit, integration, or end-to-end).
2. **Run** the test suite (or targeted file) to confirm the failure.
3. **Implement** just enough code to make the test pass.
4. **Re-run** tests to verify they’re green.
5. **Refactor** for clarity while keeping tests green.
6. **Commit** once covered and verified.

### 3. Code Quality Standards
- Keep modules small and focused; consider splitting files >300 lines.
- Favor descriptive, readable names over clever ones.
- Follow existing patterns for state, styling, and components.
- Leave comments/docstrings for non-obvious logic.
- Update `.gitignore` when tooling adds new noise.

### 4. Collaboration Habits
- Cross-check shared resources (translations, audio, accessibility copy) before modifying.
- When unsure about UX or copy, consult design docs or leave TODOs.
- Preserve knowledge during refactors; reorganize without deleting substance.

## 🤖 Working With Sub-Agents
- Spawn sub-agents (e.g., Gemini CLI) for wide analysis, translation sweeps, or research-heavy tasks.
- Provide scoped context with `@path` inclusions and precise prompts.
- Summarize findings before acting.
- Always review sub-agent output critically before merging.

## 📦 Versioning & Releases
- Bump the project version whenever shipped behavior or assets change.
- `package.json` is the single source of the version: the service worker cache name and the startup log are built from it at build time. The web manifest has no version field.
- Versions are `x.y.z`: **x** for major changes or overhauls, **y** for new features, **z** for fixes and chores. Pick the smallest part that honestly describes the commit.

## 🧪 Testing & Quality Gates
- Use existing npm scripts: `npm test`, `npm run lint`, `npm run test:e2e:ci` (desktop + mobile Chromium; `npm run test:e2e` for all five browser projects), etc. See `CONTRIBUTING.md` for the full list.
- Run relevant tests before committing; record commands and outcomes in PRs.
- Treat Jest/Playwright snapshots as code—review diffs before accepting.
- Keep CI workflows current when adding new tooling.

## 🖥️ UI & Experience
- After functionality is green, manually inspect or capture screenshots of UI changes.
- Provide clips/screenshots for meaningful diffs.
- Accessibility essentials:
  - Color contrast
  - Focus states and keyboard navigation
  - Alt text for images/icons
  - Toddler- and caregiver-friendly language
  - Touch target sizing and spacing

## 🧰 Tools & Utilities
- Prefer Vite commands for local dev and builds.
- Use `clear-cache.html` or `clearToddleToyCache()` when debugging stale service worker assets.
- Use browser DevTools and Lighthouse for performance and accessibility audits.

## 🔄 Commit, PRs, and Handoffs
- Small, focused commits with descriptive messages. Conventional Commit style is encouraged.
- Double-check ignored files—no build output or temp junk.
- PRs should summarize scope, tests, manual QA, screenshots, and risks.
- If you cannot finish, leave clear notes in `PICK-UP-HERE.md` or `CLAUDE-TODO.md`.

## 🔒 Security, Privacy, and Data Hygiene
- Never commit secrets or production data. There is no `.env.example`; `.env.local` and `.env.*.local` files are git-ignored, so keep any local secrets in those.
- Redact any PII in logs, tests, or screenshots.
- Call out security/auth/storage changes explicitly in PRs and add targeted tests.

## ✅ Pre-Commit Checklist
Before finishing a session:
- [ ] Plan documented (TODO or commit message)
- [ ] Failing test added (if feasible)
- [ ] Tests run and passing
- [ ] UI inspected (if applicable)
- [ ] Docs/TODOs updated
- [ ] Version bumped (if behavior changed)
- [ ] Commit message clear and descriptive
- [ ] PR message summarizes scope, testing, and visual changes

## 🎓 Quick Reference Flow
1. Read task + context docs  
2. Plan incremental tests/checkpoints  
3. Red → Green → Refactor  
4. Keep files modular and caches tame  
5. Document results in commits/PRs  
6. Inspect UI and accessibility  
7. Check the Pre-Commit list  

Thanks for helping build ToddleToy responsibly—and keeping it delightful and maintainable!
