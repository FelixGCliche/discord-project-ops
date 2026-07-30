import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from 'node:crypto'
import { describe, expect, test } from 'bun:test'
import { convertPkcs1PemToPkcs8Base64 } from './index'

function generateTestKeypair() {
  return generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  })
}

describe('convertPkcs1PemToPkcs8Base64', () => {
  test('converts a PKCS#1 PEM to a base64-encoded PKCS#8 PEM', () => {
    const { privateKey } = generateTestKeypair()

    const base64 = convertPkcs1PemToPkcs8Base64(privateKey)
    const decoded = Buffer.from(base64, 'base64').toString('utf8')

    expect(decoded.startsWith('-----BEGIN PRIVATE KEY-----')).toBe(true)
    expect(decoded.startsWith('-----BEGIN RSA PRIVATE KEY-----')).toBe(false)
  })

  test('round-trips the key material: a signature made with the converted key verifies against the original public key', () => {
    const { privateKey, publicKey } = generateTestKeypair()

    const base64 = convertPkcs1PemToPkcs8Base64(privateKey)
    const convertedPkcs8Pem = Buffer.from(base64, 'base64').toString('utf8')
    const convertedPrivateKey = createPrivateKey(convertedPkcs8Pem)

    const data = Buffer.from('test-data')
    const signature = sign('sha256', data, convertedPrivateKey)

    const originalPublicKey = createPublicKey(publicKey)
    const isValid = verify('sha256', data, originalPublicKey, signature)

    expect(isValid).toBe(true)
  })
})
