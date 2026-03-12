---
name: change-report
description: Generate a change report for repositories.yaml over a date range. Accepts flexible date arguments like "today", "this week", "march 2026", "since 6 February 2025", "from 2025-01-01 to 2025-03-31".
argument-hint: "[date range, e.g. today, this week, march 2026, since 2025-02-06]"
disable-model-invocation: true
allowed-tools: Bash(node *), Bash(git *), Bash(date *)
---

Generate a change report for `repositories.yaml` over a date range.

## Supporting scripts

- [scripts/freshness-stats.js](scripts/freshness-stats.js) — Computes freshness category counts from `repositories.yaml`. Outputs JSON. Accepts `--commit <sha>` to read the file at a specific commit, and `--date YYYY-MM-DD` to evaluate freshness relative to a given date.
- [scripts/freshness-diff.js](scripts/freshness-diff.js) — Compares two snapshots and lists every repo whose freshness category changed. Used in Step 5 to verify the report is complete.

## Step 1: Parse the date range from $ARGUMENTS

Interpret the arguments naturally into `--since` and `--until` flags for `git log`. Examples:

| Input | --since | --until |
|---|---|---|
| (empty or "today") | today 00:00 | (omit) |
| "yesterday" | yesterday 00:00 | today 00:00 |
| "this week" | last Monday 00:00 | (omit) |
| "last week" | Monday of last week 00:00 | Monday of this week 00:00 |
| "march 2026" | 2026-03-01 | 2026-04-01 |
| "since 6 February 2025" | 2025-02-06 | (omit) |
| "from 2025-01-01 to 2025-03-31" | 2025-01-01 | 2025-03-31 |
| "2025-02-06" | 2025-02-06 | 2025-02-07 |

Use `date` command to resolve relative dates to absolute values for the git commands.

## Step 2: Get changes

Run this with the resolved `--since` (and `--until` if applicable):

```bash
git log --all --since="SINCE" [--until="UNTIL"] --format="%H" -- repositories.yaml | while read commit; do echo "=== $commit ==="; git diff "$commit^..$commit" -- repositories.yaml | grep -E '^[\+\-].*(name:|status:|last_update:)' | grep -v '^---\|^+++'; echo; done
```

If the range includes today, also check for uncommitted changes with `git diff -- repositories.yaml`.

## Step 3: Analyze and categorize

Analyze the diffs and categorize into the sections below. Skip simple reorderings (same data moved within the file without field changes).

## Step 4: Status evolution stats

Compare the freshness distribution at the **start** and **end** of the period using the bundled script.

1. Find the last commit **before** the period:
   ```bash
   git log --until="SINCE" -1 --format="%H" -- repositories.yaml
   ```

2. Compute **start** stats (use the commit before the period and evaluate at the start date):
   ```bash
   node ${CLAUDE_SKILL_DIR}/scripts/freshness-stats.js --commit <before-commit> --date SINCE
   ```
   If no commit exists before the period, the start state is 0.

3. Compute **end** stats (use current file or the last commit in period, evaluate at end date):
   ```bash
   node ${CLAUDE_SKILL_DIR}/scripts/freshness-stats.js --date END_DATE
   ```
   If `--until` is set, use `--commit <last-commit-in-period>` instead of current file.

4. Build the evolution table from both JSON outputs.

## Output format

Start with a header showing the date range, e.g. "## Changes from 2026-03-01 to 2026-03-11" or "## Changes today (2026-03-11)".

Then use these sections (omit empty ones). **Each repository must appear only once**, in the most significant section. Priority order: Status changes > Added > Updated. For example, if a repo was both updated and deprecated, list it only under "Status changed to deprecated" with a note like "active → deprecated, updated".

**Added:**
- New repositories (additions with no corresponding removal)

**Updated:**
- Repositories whose `last_update` date changed within the period (and had no other changes above)

**Status changed to fixed:**
- Repositories whose `status` changed to `fixed`

**Status changed to deprecated:**
- Repositories whose `status` changed to `deprecated`

**Other status changes:**
- Any other `status` field changes (e.g. active → archived)

Format as a numbered list under each heading (numbering continues across sections). Include the repository name and a short note (e.g. "updated", "active → deprecated, updated"). End with a total count of unique repositories changed.

Then show the **Status evolution** table with columns: Status | Start | End | Diff. Show the diff as `+N`, `-N`, or `=` if unchanged.

Example:

```
| Status | Start | End | Diff |
|--------|-------|-----|------|
| 🟢 Fresh | 15 | 18 | +3 |
| 🟡 Aging | 40 | 38 | -2 |
| 🔴 Outdated | 30 | 28 | -2 |
| 📌 Fixed | 5 | 16 | +11 |
| 🪦 Deprecated | 1 | 4 | +3 |
| 📦 Archived | 1 | 1 | = |
| **Total** | **92** | **105** | **+13** |
```

If there are no changes in the period, say so.

## Step 5: Verify consistency

After drafting the report, cross-check the change list against the evolution table:

1. Run the diff script to list every repo that changed freshness category between start and end:
   ```bash
   node ${CLAUDE_SKILL_DIR}/scripts/freshness-diff.js --commit-start <before-commit> --date-start SINCE --date-end END_DATE [--commit-end <end-commit>]
   ```
   This outputs every repo whose category changed (e.g. `Spring MySQL Example: 🟡 → 🟢`).

2. Every repo in that diff output must appear in the change list. If any are missing, you missed a commit — go back and find it.

3. Verify no repo appears in more than one section (deduplication).

4. Verify the total unique repo count matches.