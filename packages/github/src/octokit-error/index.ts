export function getOctokitErrorStatus(cause: unknown): number | undefined {
  if (typeof cause === 'object' && cause !== null && 'status' in cause && typeof cause.status === 'number') {
    return cause.status
  }
  return undefined
}
