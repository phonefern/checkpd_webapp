# Multi-Agent Workflow

This project uses a specialized three-agent system to coordinate planning, development, and design.

## Agent Roles

### 🔵 Claude Planner
**Specialization**: Planning, Architecture, Documentation

- Breaks down features into actionable tasks
- Designs system architecture and data flows
- Creates implementation roadmaps with dependencies
- Writes technical documentation and plan files
- **Invoke when**: Planning new features, designing systems, creating specs

**Tools**: read, search, web (no code execution)

---

### 🟠 Codex Developer
**Specialization**: Backend Development, Functions, Logic

- Implements backend functions and API endpoints
- Develops database operations and queries
- Fixes bugs and optimizes performance
- Writes and runs tests for validation
- **Invoke when**: Implementing features, fixing bugs, writing backend logic

**Tools**: read, edit, execute, search, todo

---

### 🟢 Gemini Designer
**Specialization**: UI/UX Design, Components, Styling

- Designs and implements UI components
- Creates consistent visual styling and theming
- Improves accessibility and user experience
- Implements animations and responsive design
- **Invoke when**: Building UI, improving design, styling components

**Tools**: read, edit, search, web

---

## Workflow

### 1. Planning Phase (Claude)
```
Feature Request
    ↓
Claude analyzes → creates plan.md
Breaks down into tasks → identifies dependencies
    ↓
Ready for implementation
```

### 2. Development Phase (Codex)
```
Claude's plan.md
    ↓
Codex implements backend logic
Writes functions, APIs, database operations
Runs tests and validates
    ↓
Features ready for UI implementation
```

### 3. Design Phase (Gemini)
```
Codex's implementation
    ↓
Gemini adds UI/UX polish
Creates components, styling, animations
Ensures responsive design and accessibility
    ↓
Feature complete
```

---

## Agent Selection Guide

| Task | Agent | Why |
|------|-------|-----|
| New feature planning | Claude | Specializes in roadmaps and architecture |
| Database schema design | Claude | Part of planning phase |
| API endpoint implementation | Codex | Backend function development |
| Bug fix in business logic | Codex | Requires code execution and testing |
| Component styling | Gemini | UI/UX specialization |
| Animation implementation | Gemini | Visual design and interaction |
| Documentation | Claude | Pairs with planning tasks |
| Performance optimization | Codex | Requires code analysis and testing |
| Accessibility improvement | Gemini | User experience concern |
| Integration testing | Codex | Requires execution of tests |

---

## Communication Between Agents

Agents communicate through:
- **plan.md**: Claude's specifications for Codex and Gemini
- **Code Changes**: Codex implements according to plan
- **Component Structure**: Gemini works with Codex's outputs
- **Shared Context**: All agents read existing codebase

---

## Tips for Effective Coordination

1. **Always Start with Claude**: Let Claude plan before building
2. **Follow Dependencies**: Respect task dependencies in the plan
3. **Document Changes**: Each agent should document their changes
4. **Iterate**: Feedback flows back to Claude for plan adjustments
5. **Use Task References**: Plan includes task IDs for tracking

---

## Example Workflow

```bash
# Step 1: Planning
# Request: "I want to add a new patient screening form"
# → Claude creates plan.md with breakdown

# Step 2: Development
# Request: "Implement the screening form backend"
# → Codex builds API, database operations

# Step 3: Design
# Request: "Build the UI for the screening form"
# → Gemini creates components, styling

# Full feature integrated!
```
