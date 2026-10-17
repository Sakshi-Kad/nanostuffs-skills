---
name: cross-layer-impact-mapper
description: Analyses a feature request, bug fix, or code change and traces its impact across every affected layer — frontend, backend, API, database, permissions, integrations, and tests — using evidence from the repository. Returns a structured impact report with affected files, risk ratings, required changes, and a verification checklist. Use when asked to assess the impact of a change, trace dependencies, check for regressions, or produce a change-impact report before a PR or release.
allowed-tools: Read Grep Glob Bash(git diff *) Bash(git log *) Bash(git grep *)
---

# Cross-Layer Impact Mapper

Traces the full blast radius of a feature request, bug fix, or code change across the repository before any code is written or merged.

## Workflow

1. **Parse the input.** Identify the type of change (feature, bug fix, refactor, config change, dependency upgrade). Extract the core nouns: entities, fields, endpoints, screens, roles. If a git diff or list of changed files is provided, start from those; otherwise derive them from the description.

2. **Read the relevant source.** Use `Read`, `Grep`, and `Glob` to locate and read the files directly involved. For each changed or mentioned symbol (function, class, schema field, route, constant), search for every call-site and import:
   - Backend: routes, controllers, services, middlewares, models, validators, jobs, scripts
   - Frontend: components, hooks, context providers, API client calls, form schemas
   - Database: migration files, ORM models, seed files, raw SQL
   - Permissions: role guards, middleware, policy files, CASL/ACL config
   - Integrations: third-party API calls, webhook handlers, event publishers/consumers
   - Tests: unit tests, integration tests, E2E tests, fixtures, factories

3. **Map the dependency graph.** For each file found in step 2, check whether it is imported by others that are **not** in the primary change set. Flag those as indirect impacts.

4. **Check backwards compatibility.** For any changed API contract (request shape, response shape, event payload, database column), compare the new shape to every consumer. Flag breaking changes explicitly.

5. **Assess regression risk.** For every affected function or module, check whether tests exist and whether they cover the changed behaviour. A function that is well-tested but whose test does not exercise the changed path is still a risk — say so.

6. **Identify role-based differences.** If the codebase has roles or permissions, check whether the change behaves differently for different roles (e.g. admin sees a field that a rep does not).

7. **Fill `templates/impact-report-template.md`.** Produce the report as per the output format below. Save it to `impact-reports/<slug>.md` where `<slug>` is a kebab-case summary of the change.

## Output format

```
## Impact report — {Change title}

### 1. Change summary
{What changes and why — 3–5 lines.}

### 2. Layers affected
| Layer | Status | Notes |
|---|---|---|
| Frontend | ✅ Affected / ➖ Not affected | |
| Backend | | |
| API contract | | |
| Database | | |
| Permissions | | |
| Integrations | | |
| Tests | | |

### 3. Affected files
| File | Change type | Risk | Notes |
|---|---|---|---|
| path/to/file.ts | Modified | High | |

### 4. Indirect impacts
{Files not directly changed but consuming changed symbols — explain the chain.}

### 5. Breaking changes
{Any change to a public API shape, event payload, database column, or exported type that has external consumers. "None" if confirmed clean.}

### 6. Regression risks
| Area | Risk level | Reason | Test coverage |
|---|---|---|---|

### 7. Required changes
| # | File | What to change | Blocking? |
|---|---|---|---|

### 8. Verification checklist
- [ ] {Specific thing to verify in the UI or via a curl/postman request}
- [ ] {Specific migration or rollback step to test}
- [ ] {Test file to update or add}
- [ ] {Role to test separately if permissions differ}

### 9. Open items
{Anything that could not be verified from the repository — list what is missing and what information is needed.}
```

## Rules

- **Evidence over assumption.** Every entry in "Affected files" must come from a `Read`, `Grep`, or `Glob` result. Do not guess file paths.
- **Label confidence.** Mark each finding as `[Verified]`, `[Likely]`, or `[Unknown]`. Do not mix these without labelling.
- **Risk levels.** Use `High` (data loss, auth bypass, breaking API), `Medium` (degraded UX, partial breakage, no test coverage), or `Low` (cosmetic, well-tested path).
- **Read-only.** This skill only reads and analyses. It does not write, execute migrations, or modify code.
- **No invented paths.** If a file or symbol is mentioned by the user but not found by search, list it under Open items — do not fabricate a path.
- **Be specific.** "The service layer may be affected" is not useful. Name the file and the function.
