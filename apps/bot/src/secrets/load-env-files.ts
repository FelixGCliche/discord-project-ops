function stripQuotes(value: string): string {
  if (value.length >= 2) {
    const first = value[0]
    const last = value[value.length - 1]
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1)
    }
  }
  return value
}

export async function loadEnvFiles(paths: ReadonlyArray<string>): Promise<void> {
  for (const path of paths) {
    const file = Bun.file(path)
    if (!(await file.exists())) continue

    const content = await file.text()
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const value = stripQuotes(trimmed.slice(eqIdx + 1).trim())
      if (key) {
        process.env[key] ??= value
      }
    }
  }
}
