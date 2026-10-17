# Nanostuffs Skills

Claude Skills and agents built from our delivery and pre-sales work.

## Skills (`.claude/skills/`)

| Skill | Use it for |
|---|---|
| `nanostuffs-proposal` | Proposal / SOW / estimate from discovery notes or an RFP |
| `ai-opportunity-assessment` | Scored AI use cases and roadmap for a prospect |
| `incident-rca` | Root cause analysis for a production incident |
| `project-handover-brief` | HANDOVER.md + CLAUDE.md for a project or POC |
| `nanostuffs-code-review` | Code review against our React / React Native / Node.js standards |
| `cross-layer-impact-mapper` | Impact report tracing a change across frontend, backend, API, DB, permissions, integrations, and tests |

## Use the skills

**Claude Code (this repo):** open Claude Code in this folder. Skills load automatically; ask normally ("write an RCA for …") or call one directly with `/incident-rca`.

**Claude Code (all projects):** copy a skill folder to `~/.claude/skills/`.

**claude.ai:** zip one skill folder (e.g. `incident-rca/`) and upload it in Settings → Features. Each person uploads it for themselves.

## Run the pre-sales research agent

```bash
npm install
export ANTHROPIC_API_KEY=sk-ant-...
npm run research -- "Company Name"
```

The brief is written to `briefs/<company>.md`.

## Run the change-impact-auditor agent

```bash
npm install
export ANTHROPIC_API_KEY=sk-ant-...
npm run audit -- "Add discount field to the orders table"

# With a git diff
npm run audit -- "Fix null crash in invoice service" --diff "$(git diff main...HEAD)"
```

The impact report is written to `impact-reports/<slug>.md`.

## Add a skill

1. Create `.claude/skills/<skill-name>/SKILL.md` with `name` and `description` frontmatter.
2. The `description` must say what it does **and when to use it** — that is what triggers it.
3. Test it in Claude Code with a real task, then open a PR.
