export function escapeHtmlAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export type HtmlPageOptions = { title: string; bodyHtml: string }

export function renderHtmlPage({ title, bodyHtml }: HtmlPageOptions): string {
  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>${title}</title></head>
  <body>${bodyHtml}</body>
</html>`
}

export type AutoSubmitFormPageOptions = {
  title: string
  message: string
  actionUrl: string
  method?: string
  fields: Record<string, string>
}

export function renderAutoSubmitFormPage({
  title,
  message,
  actionUrl,
  method = 'post',
  fields,
}: AutoSubmitFormPageOptions): string {
  const fieldsHtml = Object.entries(fields)
    .map(([name, value]) => `<input type="hidden" name="${name}" value='${escapeHtmlAttribute(value)}' />`)
    .join('\n      ')
  const bodyHtml = `<p>${message}</p>
    <form action="${actionUrl}" method="${method}">
      ${fieldsHtml}
    </form>
    <script>document.forms[0].submit()</script>`
  return renderHtmlPage({ title, bodyHtml })
}
