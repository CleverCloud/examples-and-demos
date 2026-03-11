# How to maintain this repository

## Files

- **`repositories.yaml`** — Single source of truth for all examples. Edit this file to add, remove, or update entries.
- **`generate-readme.js`** — Script that reads `repositories.yaml` and generates `README.md`.
- **`README.md`** — Auto-generated. Do not edit manually.

## Regenerate the README

```bash
npm install   # first time only
npm run generate
```

## Add a new example

1. Add an entry in `repositories.yaml` under the appropriate section and category
2. Run `npm run generate`

Example entry:

```yaml
- name: My New Example
  url: https://github.com/CleverCloud/my-new-example
  description: Short description of the example
  status: active
  last_update: 2026-03
```

### Finding the last commit date

Use the GitHub API to get the actual last commit date (not `pushedAt`, which includes bot activity):

```bash
gh api 'repos/CleverCloud/<repo-name>/commits?per_page=1' --jq '.[0].commit.committer.date'
```

## Add a new section or category

The YAML structure drives the README layout. Each top-level key becomes an `## H2` section, each sub-key becomes an `### H3` category.

Use `title` for display names and `examples` for the list of repos:

```yaml
my_new_section:
  title: My New Section

  my_category:
    title: My Category
    examples:
      - name: Example Name
        url: https://github.com/CleverCloud/example-name
        description: What this example does
        status: active
        last_update: 2026-03
```

No changes to `generate-readme.js` are needed — it reads titles and structure from the YAML.

## Status values

| Status | Meaning | Emoji |
|--------|---------|-------|
| `active` | Repository is maintained and available | 🟢 🟡 🔴 (based on age) |
| `fixed` | Pinned to specific versions, still useful for reference | 📌 |
| `deprecated` | Upstream project is discontinued or no longer maintained | 🪦 |
| `archived` | Repository is archived on GitHub | 📦 |
| `no_repo` | Placeholder for planned examples with no repository yet | — |

## Freshness indicators

Freshness is computed automatically from `last_update`:

- 🟢 **Fresh** — Within the last year
- 🟡 **Aging** — Between 1 and 3 years
- 🔴 **Outdated** — More than 3 years
