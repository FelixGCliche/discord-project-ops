import { describe, expect, test } from 'bun:test'
import { escapeHtmlAttribute, renderAutoSubmitFormPage, renderHtmlPage } from './index'

describe('escapeHtmlAttribute', () => {
  test('escapes &', () => {
    expect(escapeHtmlAttribute('a&b')).toBe('a&amp;b')
  })

  test("escapes '", () => {
    expect(escapeHtmlAttribute("a'b")).toBe('a&#39;b')
  })

  test('escapes <', () => {
    expect(escapeHtmlAttribute('a<b')).toBe('a&lt;b')
  })

  test('escapes >', () => {
    expect(escapeHtmlAttribute('a>b')).toBe('a&gt;b')
  })

  test('escapes a combined string with several special characters at once', () => {
    expect(escapeHtmlAttribute(`<a href='b'>c & d</a>`)).toBe('&lt;a href=&#39;b&#39;&gt;c &amp; d&lt;/a&gt;')
  })
})

describe('renderHtmlPage', () => {
  test('includes the title inside <title>, the bodyHtml inside <body>, and starts with <!doctype html>', () => {
    const result = renderHtmlPage({ title: 'My Title', bodyHtml: '<p>Hello</p>' })

    expect(result.startsWith('<!doctype html>')).toBe(true)
    expect(result).toContain('<title>My Title</title>')
    expect(result).toContain('<body><p>Hello</p></body>')
  })
})

describe('renderAutoSubmitFormPage', () => {
  test('includes the actionUrl in the form action attribute', () => {
    const result = renderAutoSubmitFormPage({
      title: 'Title',
      message: 'Message',
      actionUrl: 'https://example.com/submit',
      fields: {},
    })

    expect(result).toContain('<form action="https://example.com/submit" method="post">')
  })

  test('includes a hidden input for each field with the value HTML-attribute-escaped', () => {
    const result = renderAutoSubmitFormPage({
      title: 'Title',
      message: 'Message',
      actionUrl: 'https://example.com/submit',
      fields: { manifest: '{"a":"b&c"}', other: "it's" },
    })

    expect(result).toContain(`<input type="hidden" name="manifest" value='{"a":"b&amp;c"}' />`)
    expect(result).toContain(`<input type="hidden" name="other" value='it&#39;s' />`)
  })

  test('defaults method to post when not given', () => {
    const result = renderAutoSubmitFormPage({
      title: 'Title',
      message: 'Message',
      actionUrl: 'https://example.com/submit',
      fields: {},
    })

    expect(result).toContain('method="post"')
  })

  test('honors an explicit method override', () => {
    const result = renderAutoSubmitFormPage({
      title: 'Title',
      message: 'Message',
      actionUrl: 'https://example.com/submit',
      method: 'get',
      fields: {},
    })

    expect(result).toContain('method="get"')
  })

  test('includes the message text', () => {
    const result = renderAutoSubmitFormPage({
      title: 'Title',
      message: 'Redirecting to GitHub...',
      actionUrl: 'https://example.com/submit',
      fields: {},
    })

    expect(result).toContain('<p>Redirecting to GitHub...</p>')
  })

  test('includes the auto-submit script', () => {
    const result = renderAutoSubmitFormPage({
      title: 'Title',
      message: 'Message',
      actionUrl: 'https://example.com/submit',
      fields: {},
    })

    expect(result).toContain('document.forms[0].submit()')
  })
})
