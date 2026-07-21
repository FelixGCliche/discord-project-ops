import { describe, expect, test } from 'bun:test'
import issuesValid from './fixtures/issues.valid.json'
import issuesInvalid from './fixtures/issues.invalid.json'
import { IssuesSchema } from './schema'
import { renderIssue, renderIssues } from './render'
import { assertParseSuccess } from '../test-utils'

describe('IssuesSchema', () => {
  test('accepts a well-formed issues list with valid depends_on references', () => {
    const result = IssuesSchema.safeParse(issuesValid)

    assertParseSuccess(result)
    expect(result.success).toBe(true)
  })

  test('rejects a title over 70 characters', () => {
    const result = IssuesSchema.safeParse(issuesInvalid.titleTooLong)
    expect(result.success).toBe(false)
  })

  test('rejects depends_on referencing a title not present in the list', () => {
    const result = IssuesSchema.safeParse(issuesInvalid.unknownDependsOn)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((i: { message: string | string[] }) => i.message.includes('unknown issue title'))
      ).toBe(true)
    }
  })

  test('rejects two issues sharing the same title', () => {
    const result = IssuesSchema.safeParse(issuesInvalid.duplicateTitle)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((i: { message: string | string[] }) => i.message.includes('duplicate issue title'))
      ).toBe(true)
    }
  })

  test('rejects an issue that depends on itself', () => {
    const result = IssuesSchema.safeParse(issuesInvalid.selfDependency)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((i: { message: string | string[] }) => i.message.includes('depend on itself'))
      ).toBe(true)
    }
  })

  test('rejects an empty issues array', () => {
    const result = IssuesSchema.safeParse(issuesInvalid.emptyIssuesArray)
    expect(result.success).toBe(false)
  })
})

describe('renderIssue() / renderIssues()', () => {
  test('renderIssue matches snapshot for a single issue', () => {
    const doc = IssuesSchema.parse(issuesValid)
    expect(renderIssue(doc.issues[0]!)).toMatchSnapshot()
  })

  test('renderIssues matches snapshot for the full proposed list', () => {
    const doc = IssuesSchema.parse(issuesValid)
    expect(renderIssues(doc)).toMatchSnapshot()
  })
})
