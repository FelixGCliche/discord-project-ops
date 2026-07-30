import { createPrivateKey } from 'node:crypto'

// Some providers (e.g. GitHub Apps) hand back RSA private keys as PKCS#1
// (`-----BEGIN RSA PRIVATE KEY-----`). node:crypto auto-detects the PEM format on
// import, so we just re-export as PKCS#8, e.g. for `jose`'s `importPKCS8`.
export function convertPkcs1PemToPkcs8Base64(pkcs1Pem: string): string {
  const pkcs8Pem = createPrivateKey(pkcs1Pem).export({ type: 'pkcs8', format: 'pem' })
  return Buffer.from(pkcs8Pem.toString()).toString('base64')
}
