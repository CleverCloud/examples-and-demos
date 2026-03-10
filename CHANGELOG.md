# Changelog

## 2026-03-10

### Added
- `vaadin-example` under Java runtime — total examples now 123
- `INSTRUCTIONS.md` explaining how to maintain the repo
- `repositories.yaml` as single source of truth for all examples
- `generate-readme.js` to auto-generate README from YAML (`npm run generate`)
- Self-Hosted Applications section (n8n, Strapi, WordPress, HiveMQ, Kestra, Outline, GlitchTip, etc.)
- Kubernetes and Add-ons sections
- Freshness indicators based on last commit date on default branch (not `pushedAt`)
- `CHANGELOG.md` to track changes
- `fixed` status (📌) for repositories pinned to specific versions
- `no_repo` status for planned examples with no repository yet
- `vaadin-example` under Java runtime — total examples now 123

### Changed
- 10 repositories marked as `fixed`: python-3-flask, python-3.9-django-daphne, python-3.10-django-gunicorn, python-3.11-django-uvicorn, python-3.12-django-uwsgi, python-3.13-django-uwsgi, node-14-meteor-2, node-20-meteor-3, haskell-scotty, rust-docker
- Fixed entries moved to the end of their respective categories in YAML and README
- README is now auto-generated from `repositories.yaml` — do not edit manually
- Freshness thresholds: Fresh < 1 year, Aging 1–3 years, Outdated > 3 years
- Update dates now use actual last commit on default branch instead of GitHub `pushedAt` field (which includes bot/CI activity)
- Examples reorganized: self-hosted apps moved out of runtime sections into dedicated section

### Fixed
- Incorrect update dates caused by using `pushedAt` instead of last commit date (e.g. `expressjs-mongodb-statsd-example` showed 2026-02 instead of actual 2021-12)

## 2026-03-09

### Added
- Initial README with all 122 example repositories from CleverCloud GitHub org
- Examples organized by language/framework with descriptions and links

## 2026-03-08

### Added
- Initial commit with project structure and logo
