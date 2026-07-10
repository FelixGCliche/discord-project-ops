import type { Issue, Issues } from './schema'

export function renderIssue(issue: Issue): string {
  return `### ${issue.title}
**Labels:** ${issue.labels.length ? issue.labels.join(', ') : '_none_'}
**Team:** ${issue.team ?? '_unset_'}
**Depends on:** ${issue.depends_on.length ? issue.depends_on.join(', ') : '_none_'}

${issue.description}`
}

export function renderIssues(doc: Issues): string {
  return `# Proposed Issues: ${doc.post_id}

**Plan ref:** ${doc.plan_ref}
**Count:** ${doc.issues.length}

${doc.issues.map(renderIssue).join('\n\n')}
`
}
