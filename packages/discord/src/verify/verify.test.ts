import { describe, expect, test } from 'bun:test'
import nacl from 'tweetnacl'
import { verifyKey } from './index'

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

describe('verifyKey', () => {
  const keyPair = nacl.sign.keyPair()
  const publicKeyHex = toHex(keyPair.publicKey)
  const timestamp = '1626100000'
  const rawBody = '{"type":1}'

  test('returns true for a valid signature', () => {
    const message = new TextEncoder().encode(timestamp + rawBody)
    const signature = nacl.sign.detached(message, keyPair.secretKey)
    const signatureHex = toHex(signature)

    expect(verifyKey(publicKeyHex, signatureHex, timestamp, rawBody)).toBe(true)
  })

  test('returns false for a tampered body', () => {
    const signature = nacl.sign.detached(new TextEncoder().encode(timestamp + rawBody), keyPair.secretKey)
    const signatureHex = toHex(signature)

    expect(verifyKey(publicKeyHex, signatureHex, timestamp, '{"type":2}')).toBe(false)
  })

  test('returns false for the wrong public key', () => {
    const wrongKeyPair = nacl.sign.keyPair()
    const wrongPublicKeyHex = toHex(wrongKeyPair.publicKey)
    const signature = nacl.sign.detached(new TextEncoder().encode(timestamp + rawBody), keyPair.secretKey)
    const signatureHex = toHex(signature)

    expect(verifyKey(wrongPublicKeyHex, signatureHex, timestamp, rawBody)).toBe(false)
  })
})
