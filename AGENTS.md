# AGENTS.md

Instructions for any coding agent (Claude Code, OpenCode, or otherwise) working in this repo.

## What this repo is

A Discord-driven pipeline (summarize → plan → issue) with human-in-the-loop approval at
every write. See [README.md](README.md) for the full description and runtime diagram.

## Structure

Bun workspace monorepo: `apps/**` and `packages/**`. Before adding or moving code, read
[ARCHITECTURE.md](ARCHITECTURE.md) — it defines the feature-folder convention and the
package-decoupling rule that every package/app here must follow. Don't duplicate that
content here; it's the source of truth for structure.

## Tooling

- Install: `bun install`
- Typecheck (all packages/apps): `bun run check:type`
- Lint: `bun run check:lint` (fix with `bun run fix:lint`)
- Format check: `bun run check:format` (fix with `bun run fix:format`)
- Everything above at once: `bun run check`
- Tests: `bun test` (root) or `bun run test:all` (includes the opencode pipeline test)
- Scope a command to one package/app: `bun run --filter='<name>' <script>` or
  `bun -F <name> <script>` (package/app names come from their `package.json` `name` field)

## Working in this repo

- Runtime-specific code stays isolated to the package that owns that runtime (see the
  decoupling rule in ARCHITECTURE.md) — don't reach into `apps/bot` or
  `packages/cloudflare` from a runtime-agnostic package.
- Follow existing patterns in `packages/core/src/{decision,issue,plan}/` when adding a new
  feature folder to any package.
