import type { Plan } from '../schemas/plan.js'

const listOrNone = (items: string[]) => (items.length === 0 ? '_none_' : items.map((i) => `- ${i}`).join('\n'))

export function renderPlan(plan: Plan): string {
  const workstreams = plan.workstreams
    .map(
      (w) => `### ${w.name}
**Goal:** ${w.goal}

**Steps:**
${w.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

**Risks:**
${listOrNone(w.risks)}`
    )
    .join('\n\n')

  return `# Plan: ${plan.post_id}

**Decision ref:** ${plan.decision_ref}

## Summary
${plan.summary}

## Approach
${plan.approach}

## Affected Areas
${listOrNone(plan.affected_areas)}

## Workstreams
${workstreams}

## Cross-Workstream Dependencies
${listOrNone(plan.dependencies)}

## Open Questions
${listOrNone(plan.open_questions)}
`
}
