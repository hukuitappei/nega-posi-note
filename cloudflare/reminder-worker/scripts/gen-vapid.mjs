import { generateKeyPairSync } from 'node:crypto';

function toBase64Url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

const { publicKey, privateKey } = generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
});

const pubJwk = publicKey.export({ format: 'jwk' });
const privJwk = privateKey.export({ format: 'jwk' });

// VAPID public key for PushManager.subscribe() (65-byte uncompressed EC point)
const uncompressed = Buffer.concat([
  Buffer.from([0x04]),
  Buffer.from(pubJwk.x, 'base64url'),
  Buffer.from(pubJwk.y, 'base64url'),
]);

const vapidPublicKey = toBase64Url(uncompressed);
const vapidPrivateJwk = JSON.stringify({
  kty: privJwk.kty,
  crv: privJwk.crv,
  x: privJwk.x,
  y: privJwk.y,
  d: privJwk.d,
});

console.log('VAPID_PUBLIC_KEY=' + vapidPublicKey);
console.log('VAPID_PRIVATE_JWK=' + vapidPrivateJwk);
