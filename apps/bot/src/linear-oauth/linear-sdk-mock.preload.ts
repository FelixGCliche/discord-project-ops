import { mock } from 'bun:test'

// This mocks '@linear/sdk' (an external package) rather than the 'linear' workspace package.
// Overriding a named export via mock.module() mutates the underlying module's own export
// binding, which leaks into any other file that imports that same source directly — 'linear'
// re-exports exchangeCodeForToken from packages/linear/src/oauth, which that package's own
// test also imports directly, so mocking 'linear' here corrupted that unrelated test file.
// '@linear/sdk' has no other in-repo consumer, so mocking it here is safe. Runs as a
// bun test --preload script (see bunfig.toml) so the mock is registered before any test file,
// or the module under test, can import the real '@linear/sdk'.
export const linearSdkMock = {
  organization: { name: 'Acme Inc' },
}

class FakeLinearClient {
  constructor(public options: { accessToken: string }) {}
  get organization() {
    return Promise.resolve(linearSdkMock.organization)
  }
}

// Mirrors @linear/sdk's IssueRelationType string enum. Any other named export the codebase
// starts importing from '@linear/sdk' needs to be added here too, since this factory replaces
// the module's entire export surface for the whole test run.
const FakeIssueRelationType = {
  Blocks: 'blocks',
  Duplicate: 'duplicate',
  Related: 'related',
  Similar: 'similar',
} as const

mock.module('@linear/sdk', () => ({
  LinearClient: FakeLinearClient,
  IssueRelationType: FakeIssueRelationType,
}))
