# Gemini CLI Integration Guide for Claude Code

## Purpose
This document provides comprehensive guidelines for leveraging Google Gemini CLI as a sub-agent to handle large-scale analysis and processing tasks that exceed Claude Code's token capacity, while maintaining efficient token usage and cost management.

---

## Core Architecture

| Actor           | Role                                            | Typical Token Load |
| --------------- | ----------------------------------------------- | ------------------ |
| **Claude Code** | Orchestrator, light reasoning, prompt crafter   | 0 – 20k / job      |
| **Gemini CLI**  | Bulk processing, ≥1M‑token context, multimodal | 50k – 1M / job     |

---

## Token Economy & Cost Management

| Model                    | Input $/M tok | Output $/M tok | Free Tier              |
| ------------------------ | ------------- | -------------- | ---------------------- |
| **Gemini CLI (Pro 2.5)** | $0 – 2.50    | $0 – 10        | 60 req/min · 1,000/day |
| **Claude Sonnet 4**      | $3           | $15            | –                      |

**Rule of Thumb**: Exhaust Gemini's free/cheap tokens first; keep Claude's totals modest.

---

## File Inclusion Syntax

### Direct File References
Use `@filename` to include single files in your Gemini prompts:

```bash
gemini -p "ANALYZE: Review @src/game.js for modular refactoring opportunities"
```

### Directory Analysis
Use `@directory/` to include entire directories:

```bash
gemini -p "ANALYZE: Examine @src/config/ for architecture improvements"
```

### Multiple File Inclusion
Include multiple files or directories by listing them:

```bash
gemini -p "ANALYZE: Compare @src/game.js @src/config/ConfigManager.js for coupling issues"
```

---

## Task Categories & Examples

### ANALYZE Tasks
For architectural review, code quality assessment, and refactoring recommendations:

```bash
# Single large file analysis
gemini -p "ANALYZE: Review @src/game.js (2,640 lines) for modular refactoring opportunities"

# Directory structure analysis  
gemini -p "ANALYZE: Examine @src/config/ directory structure for maintainability improvements"

# Cross-file dependency analysis
gemini -p "ANALYZE: @src/game.js @src/config/ConfigManager.js - identify tight coupling and suggest decoupling strategies"
```

### RESEARCH Tasks
For educational theory, best practices, and domain knowledge:

```bash
# Educational research
gemini -p "RESEARCH: Educational game design principles for toddlers aged 2-4"

# Technical best practices
gemini -p "RESEARCH: Modern JavaScript module architecture patterns for game engines"

# Performance optimization
gemini -p "RESEARCH: Browser performance optimization techniques for interactive web applications"
```

### CULTURAL Tasks
For internationalization, localization, and cultural considerations:

```bash
# Translation verification
gemini -p "CULTURAL: Verify @public/things.json translations are culturally appropriate for toddlers across all 11 languages"

# Cultural sensitivity review
gemini -p "CULTURAL: Review @public/emojis.json for cultural appropriateness in educational content"
```

### TRANSLATE Tasks
For translation accuracy and linguistic validation:

```bash
# Translation accuracy verification
gemini -p "TRANSLATE: Verify translation accuracy in @public/things.json for all 11 languages"

# Consistency checking
gemini -p "TRANSLATE: Check translation consistency between @public/things.json and @public/emojis.json"
```

### PERFORMANCE Tasks
For optimization analysis and performance improvements:

```bash
# Performance bottleneck analysis
gemini -p "PERFORMANCE: Analyze @src/game.js for performance bottlenecks and optimization opportunities"

# Bundle size analysis
gemini -p "PERFORMANCE: Review @src/ directory for bundle size optimization opportunities"
```

---

## Implementation Verification Examples

### Code Refactoring Verification
After implementing Gemini's refactoring suggestions:

```bash
# Verify refactoring preserved functionality
gemini -p "VERIFY: Compare @src/game.js with previous version to ensure refactoring preserved all functionality"

# Check for new issues introduced
gemini -p "ANALYZE: Review refactored @src/game/ modules for potential issues or missing functionality"
```

### Configuration System Verification
After implementing configuration changes:

```bash
# Verify configuration completeness
gemini -p "VERIFY: @src/config/ConfigManager.js contains all required configuration options from @CLAUDE-TODO.md"

# Check configuration validation
gemini -p "ANALYZE: @src/config/ConfigManager.js validation logic for completeness and edge cases"
```

### Multi-Language System Verification
After adding new languages or translation features:

```bash
# Verify language support completeness
gemini -p "VERIFY: @public/things.json @public/emojis.json contain complete translations for all enabled languages"

# Check language switching functionality
gemini -p "ANALYZE: @src/config/ language switching implementation for robustness and error handling"
```

---

## When to Use Gemini CLI

### High-Priority Use Cases
- **Large file analysis**: Files >1000 lines require comprehensive review
- **Directory-wide analysis**: Architecture reviews spanning multiple files
- **Educational research**: Theory and best practices for toddler learning
- **Translation verification**: Accuracy across multiple languages
- **Performance analysis**: Optimization opportunities in large codebases

### Token-Saving Scenarios
- **Repetitive analysis**: Bulk processing of similar files
- **Context-heavy tasks**: Tasks requiring >200k tokens of context
- **Research-intensive work**: Educational theory, cultural considerations
- **Documentation review**: Large documentation sets

### Do NOT Use For
- **Single small file edits**: Files <300 lines that Claude can handle directly
- **Simple bug fixes**: Straightforward issues within Claude's capability
- **Interactive debugging**: Real-time problem solving requiring quick iteration

---

## Standard Workflow

1. **Identify Need**: Determine if task exceeds Claude's optimal token usage
2. **Prepare Context**: Gather relevant files and directories using @ syntax
3. **Execute Analysis**: Run Gemini with structured prompt and task type
4. **Review Results**: Claude analyzes Gemini's findings and recommendations
5. **Implement Changes**: Claude implements specific recommendations
6. **Verify Implementation**: Use Gemini again to verify changes if needed

---

## Best Practices

### Prompt Structure
Always use clear task types and specific file references:

```bash
gemini -p "TASK_TYPE: [specific context] [clear objective]"
```

### File Management
- Use absolute paths when possible
- Reference specific files and directories with @ syntax
- Include relevant configuration and documentation files

### Output Management
- Request structured output (JSON, markdown) when appropriate
- Ask for specific recommendations rather than general observations
- Include line numbers and specific code references in requests

### Collaboration Efficiency
- Batch related analysis tasks together
- Use Gemini for research, Claude for implementation
- Verify complex changes with follow-up Gemini analysis

---

## Error Handling

### Rate Limiting
- Respect 60 requests/minute limit on free tier
- Implement exponential backoff for 429/503 errors
- Monitor daily quota (1,000 requests/day free tier)

### Context Limits
- Break large directories into smaller chunks if needed
- Prioritize most critical files for analysis
- Use summary requests for very large contexts

### Quality Assurance
- Always review Gemini's recommendations before implementation
- Verify file references and paths are correct
- Cross-check analysis results with actual code

---

**Integration Complete**: This guide enables efficient collaboration between Claude Code and Gemini CLI for comprehensive codebase analysis and educational content development.