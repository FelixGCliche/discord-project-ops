import { z } from 'zod'

export const parseEnv = <T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  source: Record<string, string | undefined>
) => {
  const result = schema.safeParse(source)
  if (result.success) return result.data

  throw new Error(z.prettifyError(result.error))
}
