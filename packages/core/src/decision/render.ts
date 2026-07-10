import type { Decision } from './schema'

const listOrNone = (items: string[]) => (items.length === 0 ? '_none_' : items.map((i) => `- ${i}`).join('\n'))

/**
 * Deterministic JSON -> markdown for decisions/<post>.md.
 * No LLM involved: same input always produces the same bytes, which is
 * what makes this safe to snapshot-test and diff in git.
 */
export function renderDecision(decision: Decision): string {
  const options =
    decision.options_considered.length === 0
      ? '_none recorded_'
      : decision.options_considered
          .map((option) => `### ${option.option}\n- **Pros:** ${option.pros}\n- **Cons:** ${option.cons}`)
          .join('\n\n')

  return `# ${decision.title}
**Post:** ${decision.post_id}
**Participants:** ${decision.participants.length ? decision.participants.join(', ') : '_none recorded_'}

## Decision
${decision.decision}

## Context
${decision.context}

## Options Considered
${options}

## Rationale
${decision.rationale}

## Non-Goals
${listOrNone(decision.non_goals)}

## Open Questions
${listOrNone(decision.open_questions)}
`
}
