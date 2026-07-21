import { z } from 'zod'

export const IssueSchema = z.object({
  title: z.string().min(1).max(70),
  description: z.string().min(1),
  labels: z.array(z.string()).default([]),
  depends_on: z.array(z.string()).default([]),
  team: z.string().optional(),
})

export const IssuesSchema = z
  .object({
    post_id: z.string().min(1),
    plan_ref: z.string().min(1),
    issues: z.array(IssueSchema).min(1),
  })
  .superRefine((doc, ctx) => {
    const titles = new Set(doc.issues.map((i) => i.title))
    const seenTitles = new Map<string, number>()
    doc.issues.forEach((issue, issueIndex) => {
      if (seenTitles.has(issue.title)) {
        ctx.addIssue({
          code: 'custom',
          message: `duplicate issue title: "${issue.title}"`,
          path: ['issues', issueIndex, 'title'],
        })
      } else {
        seenTitles.set(issue.title, issueIndex)
      }
      issue.depends_on.forEach((dep, depIndex) => {
        if (!titles.has(dep)) {
          ctx.addIssue({
            code: 'custom',
            message: `depends_on references unknown issue title: "${dep}"`,
            path: ['issues', issueIndex, 'depends_on', depIndex],
          })
        }
        if (dep === issue.title) {
          ctx.addIssue({
            code: 'custom',
            message: `issue "${issue.title}" cannot depend on itself`,
            path: ['issues', issueIndex, 'depends_on', depIndex],
          })
        }
      })
    })
  })
export type Issue = z.infer<typeof IssueSchema>
export type Issues = z.infer<typeof IssuesSchema>
