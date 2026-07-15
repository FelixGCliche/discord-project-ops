# Architecture conventions

This file documents two rules that apply to every package under `packages/` and every app
under `apps/`. See the root [README.md](README.md) for what the system does and how the
runtimes fit together; this file is about how code inside each package/app is organized.

## 1. Feature-based organization

Every distinct feature or domain lives in its own subfolder under `src/` — never as a file
sitting flat alongside unrelated files. Adding a feature to a package should always mean
"add a folder," never "add a file to a pile of unrelated files."

The reference example is `packages/core/src/`:

```text
packages/core/src/
  decision/   schema.ts, render.ts, decision.test.ts, fixtures/, __snapshots__/
  issue/      schema.ts, render.ts, issue.test.ts, fixtures/, __snapshots__/
  plan/       schema.ts, render.ts, plan.test.ts, fixtures/, __snapshots__/
```

Each folder bundles everything about that one feature — schema, rendering logic, tests,
fixtures, snapshots. There is no global `schemas/`, `renderers/`, or `models/` folder
spanning multiple unrelated features.

**Folder names describe the feature, not a technical layer.** `objects/` or `handler/`
describe _what kind of thing_ a file is, not _what it does_ — avoid them. Name the folder
after the feature it holds (e.g. `linear-token-store/`, not `objects/`).

**Exception — plumbing stays at `src/` root.** A package's entrypoint/wiring files aren't a
feature on their own and may stay directly under `src/`:

- `index.ts` — the package's public exports
- `env.ts` — env var parsing/validation
- runtime entry files, e.g. `worker.ts`, `entrypoint.ts`

Everything else — actual feature/domain logic — goes in a feature folder, regardless of how
small the package currently is.

**A single-file feature's implementation file is named `index.ts`, not repeated as
`<folder>/<folder>.ts`.** E.g. `oauth/index.ts`, not `oauth/oauth.ts`. This is not just
style: naming the file the same as its folder has caused real bugs with Bun's module
resolution when combined with this repo's `"./*": "./src/*"` package export maps — a file
named `index.ts` sidesteps it. (The `index.ts` _exempted at the package root_ above is a
different file — a package's own public-exports barrel — from a feature folder's own
`index.ts`, which is that feature's main implementation.)

## 2. Package decoupling

Each package/app should be as independently deletable and replaceable as possible. A change
to one concern should touch as few other packages as possible. Concretely:

- Swapping the discussion platform (e.g. Discord → Slack) should only require changing the
  package(s) tied to that platform, not `packages/core` or the pipeline logic that drives it.
- Swapping the deployment runtime (e.g. Cloudflare Workers → an AWS stack) should only
  require changing the runtime-specific package (e.g. `packages/cloudflare`) and the thin
  wiring in `apps/bot`, not the runtime-agnostic packages.
- **`apps/bot` is the one accepted exception.** Its entire job is wiring the other packages
  together into a running app, so it is inherently coupled to all of them. Every other
  package should be usable, testable, and understandable without importing from `apps/bot`.
- **`packages/core` holds shared/reusable logic** (schemas, prompts, signed-state helpers)
  designed to be pluggable into any current or future package/app without modification. It
  has zero runtime-specific imports.
