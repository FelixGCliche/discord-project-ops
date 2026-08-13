import nacl from 'tweetnacl'

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

export function verifyKey(publicKeyHex: string, signatureHex: string, timestamp: string, rawBody: string): boolean {
  return nacl.sign.detached.verify(
    new TextEncoder().encode(timestamp + rawBody),
    hexToUint8Array(signatureHex),
    hexToUint8Array(publicKeyHex)
  )
}
