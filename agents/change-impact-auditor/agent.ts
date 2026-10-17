// Change-impact auditor agent
// Accepts a feature request / bug description and an optional git diff,
// then applies the cross-layer-impact-mapper skill to produce a structured
// impact report saved to impact-reports/<slug>.md.
//
// Run:
//   npx tsx agents/change-impact-auditor/agent.ts "Add discount field to orders"
//   npx tsx agents/change-impact-auditor/agent.ts "Add discount field to orders" --diff "$(git diff main...HEAD)"
//
// Needs: ANTHROPIC_API_KEY in the environment.
// Restriction: read-only — the agent may NOT modify application code,
//              execute database mutations, or commit/push changes.

import { query } from "@anthropic-ai/claude-agent-sdk";

// ── Input validation ───────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
  console.error(
    [
      "",
      "Usage:",
      '  npx tsx agents/change-impact-auditor/agent.ts "Change description" [--diff "<git diff text>"]',
      "",
      "Examples:",
      '  npx tsx agents/change-impact-auditor/agent.ts "Add discount field to the orders table"',
      '  npx tsx agents/change-impact-auditor/agent.ts "Fix null crash in invoice service" --diff "$(git diff main...HEAD)"',
      "",
      "Environment:",
      "  ANTHROPIC_API_KEY   Required. Your Anthropic API key.",
      "",
    ].join("\n")
  );
  process.exit(args.length === 0 ? 1 : 0);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error(
    [
      "Error: ANTHROPIC_API_KEY is not set.",
      "",
      "Set it before running:",
      "  export ANTHROPIC_API_KEY=sk-ant-...",
      "  npx tsx agents/change-impact-auditor/agent.ts \"<description>\"",
    ].join("\n")
  );
  process.exit(1);
}

// Parse --diff flag
let diffIndex = args.indexOf("--diff");
let diffText: string | null = null;
let descriptionArgs: string[];

if (diffIndex !== -1) {
  diffText = args[diffIndex + 1] ?? null;
  if (!diffText) {
    console.error("Error: --diff requires a value.");
    process.exit(1);
  }
  descriptionArgs = args.filter((_, i) => i !== diffIndex && i !== diffIndex + 1);
} else {
  descriptionArgs = args;
}

const description = descriptionArgs.join(" ").trim();

if (!description) {
  console.error('Error: Change description is required. Example: "Add discount field to orders"');
  process.exit(1);
}

const slug = description
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "")
  .slice(0, 60);

const outputPath = `impact-reports/${slug}.md`;

// ── Prompt ─────────────────────────────────────────────────────────────────

const diffSection = diffText
  ? `\n\nA git diff is provided below. Use it as the primary starting point for locating affected files before doing any grep or glob searches.\n\n\`\`\`diff\n${diffText}\n\`\`\``
  : "\n\nNo git diff was provided. Derive the affected files from the description alone using grep and glob searches.";

const prompt = `
You are a senior engineer performing a pre-merge impact analysis.

Change description:
"""
${description}
"""
${diffSection}

Instructions:
1. Use the cross-layer-impact-mapper skill to analyse this change.
2. Trace the impact across all relevant layers: frontend, backend, API contracts,
   database schema, permissions/roles, third-party integrations, and tests.
3. Use only read-only tools (Read, Grep, Glob, git diff, git log, git grep).
   Do NOT modify any file, execute any database mutation, or commit/push anything.
4. Every affected file listed in the report must be verified by an actual Read,
   Grep, or Glob result — do not guess paths.
5. Save the completed impact report to ${outputPath}.
6. At the end, print a one-line summary: layers affected and top risk level.
`.trim();

// ── Run ────────────────────────────────────────────────────────────────────

console.log(`\nChange-impact auditor`);
console.log(`Change : ${description}`);
console.log(`Output : ${outputPath}`);
console.log(`Diff   : ${diffText ? "provided" : "none"}`);
console.log("");

try {
  for await (const message of query({
    prompt,
    options: {
      cwd: process.cwd(),              // repo root that holds .claude/skills/
      settingSources: ["project"],     // load skills from .claude/skills/
      skills: ["cross-layer-impact-mapper"],
      allowedTools: [
        "Read",
        "Grep",
        "Glob",
        "Bash(git diff *)",
        "Bash(git log *)",
        "Bash(git grep *)",
        "Write",                       // only used to save the report file
      ],
      maxTurns: 40,
    },
  })) {
    if (message.type === "assistant") {
      for (const block of message.message.content) {
        if (block.type === "tool_use") {
          console.log(`→ ${block.name}`);
        }
      }
    }

    if (message.type === "result") {
      if (message.subtype === "success") {
        console.log(`\nDone: ${outputPath}`);
        console.log(`Cost: $${message.total_cost_usd.toFixed(3)}`);
      } else {
        console.error(`\nAgent stopped: ${message.subtype}`);
        process.exit(1);
      }
    }
  }
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\nFatal error: ${message}`);
  process.exit(1);
}
