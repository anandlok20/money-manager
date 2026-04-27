---
name: update-context
description: Automatically update all .claude context files after completing any code changes. ALWAYS invoke this skill at the end of every coding session, after every feature, bugfix, or refactor — without being asked. Updates changes.md, test-results.md, review.md, and plan.md based on what was done.
---

After completing any code changes, **always** update the `.claude/context/` files below. Do this proactively — do not wait for the user to ask.

---

## 1. `.claude/context/changes.md`

**Always prepend a new dated entry** at the top (after the `# Recent Changes Log` heading). Never overwrite existing entries — only prepend.

Entry format:
```markdown
## YYYY-MM-DD — <Short Title of What Changed>

### Bug Fixes  (omit section if none)
- `path/to/file.ts` — what was broken and how it was fixed

### New Features  (omit section if none)
- **Feature name**: what it does and which files were added/changed

### Files Modified
- `path/to/file.ts` — what changed and why

### tsc: ✅ clean  (or ❌ errors if tsc was not run / failed)

---
```

Rules:
- Use today's date from context (`currentDate`)
- Be specific — file paths + what changed, not vague summaries
- List every modified file, even minor ones
- If tsc was run and passed: `### tsc: ✅ clean`. If not run yet: omit the line.

---

## 2. `.claude/context/test-results.md`

**Prepend a new entry** whenever `npx tsc --noEmit` or `npm run build` was run.

Entry format:
```markdown
## YYYY-MM-DD — <Feature/Fix Name>

| Check | Status | Notes |
|-------|--------|-------|
| `npx tsc --noEmit` | ✅ clean | 0 errors after <what was fixed> |
| `npm run build`    | ✅       | (only if build was run)        |

---
```

If there were errors before fixing them, note what the errors were and what fixed them.

---

## 3. `.claude/context/review.md`

Update this file when:
- A **new bug or issue** was discovered during work → add to the appropriate priority section
- An **existing issue was fixed** → move it to `### ✅ Recently Fixed` with date
- A **known limitation or tech debt** was identified → add under `### 🟡 Medium Issues`

Do **not** rewrite the whole file — only add/move the relevant entries.

---

## 4. `.claude/context/plan.md`

Update this file when:
- A **backlog item was completed** → check it off `[x]` and move to Completed section
- A **new task or follow-up** was identified during the work → add it to the appropriate priority section
- A **feature was fully delivered** → add a `## ✅ Completed — <Feature> (date)` section

Do **not** rewrite the whole file — only update the relevant items.

---

## What NOT to do
- Do not update context files mid-task — only after the work is complete and tsc has been run
- Do not duplicate entries that already exist
- Do not summarise vaguely — always include file paths and specific descriptions
- Do not update `plan.md` for things that were never in the backlog (no need to retroactively add + complete an item)

---

## Checklist (run through this after every coding session)

- [ ] `changes.md` — new entry prepended with today's date, all modified files listed
- [ ] `test-results.md` — tsc/build result recorded (if run)
- [ ] `review.md` — new issues added OR fixed issues moved to Recently Fixed
- [ ] `plan.md` — completed backlog items checked off, new follow-ups added
