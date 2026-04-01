---
name: create-skill
description: "Create a reusable workspace skill from a multi-step agent interaction, with explicit scope, decision points, and quality checks."
---

# Skill: create-skill

## Use when
- You need a repeatable procedure to turn a conversation or issue into a VS Code Copilot Skill.
- You want workspace-scoped guidance for writing `SKILL.md` files in `.agents/skills` or `.github/skills`.
- You need a quick way to enforce agent-customization best practices (frontmatter, applyTo scope, activation keywords).

## Objective
Generate a `SKILL.md` that encapsulates a workflow from this conversation so the agent can rerun it automatically.

## Workflow steps
1. Review the current conversation and identify the commanded workflow:
   - user asked: `create a SKILL.md` from a prompt pattern
   - this is a multi-step operation: extract step-by-step, implement, and validate
2. Confirm applicable skill template from `agent-customization/SKILL.md`.
3. Determine placement:
   - workspace-scope (team) → `.agents/skills/<name>/` or `.github/skills/<name>/`
   - user-scope (local) → `{{VSCODE_USER_PROMPTS_FOLDER}}/<name>.skill.md` (or similar user path)
4. Draft frontmatter and body:
   - include description, inputs, outputs
   - include decision branches and edge cases
   - include quick triggers and example phrases
5. Save file by writing to disk.
6. Validate:
   - file exists at expected path
   - YAML frontmatter is parseable
   - `description` contains command keywords (e.g. `create skill`, `agent customization`)

## Decision points
- If uncertainty remains about expected outputs, ask for clarification:
  - "Should this skill produce a checklist, a full tutorial, or direct code edits?"
  - "Workspace or user scope?"
- If user instruction is too vague, fall back to minimal working behavior:
  - create a guided checklist skill

## Completion criteria
- [x] `SKILL.md` exists in `.agents/skills/create-skill/`
- [x] contains `name`, `description`, and a clear “Use when” section
- [x] provides step-by-step workflow documented
- [x] includes guidance for next actions and follow-ups

## Example prompts
- `Create a SKILL.md for packaging this bugfix workflow.`
- `Draft a skill for converting adhoc instructions into reusable templates.`
- `Implement workspace skill that writes code style policy files.`

## Next enhancements
- Add support for `applyTo` metadata in workspace instructions
- Include automated lint step with `eslint --fix` hook recommended
- Add real command parameterization (`%SCOPE%`, `%FILENAME%`) for generated skill variants
