import { generateKeyPairSync } from "node:crypto";

function decodeBase64Url(value) {
  return Buffer.from(value, "base64url");
}

const { privateKey, publicKey } = generateKeyPairSync("ec", {
  namedCurve: "prime256v1",
});

const publicJwk = publicKey.export({ format: "jwk" });
const privateJwk = privateKey.export({ format: "jwk" });

if (!publicJwk.x || !publicJwk.y || !privateJwk.d) {
  throw new Error("Unable to generate the VAPID key pair.");
}

const applicationServerKey = Buffer.concat([
  Buffer.from([0x04]),
  decodeBase64Url(publicJwk.x),
  decodeBase64Url(publicJwk.y),
]).toString("base64url");

console.log(`WEB_PUSH_VAPID_PUBLIC_KEY=${applicationServerKey}`);
console.log(`WEB_PUSH_VAPID_PRIVATE_KEY=${privateJwk.d}`);
console.log("WEB_PUSH_VAPID_SUBJECT=https://mostra.space");
console.log();
console.log(
  "Keep WEB_PUSH_VAPID_PRIVATE_KEY server-side. Never expose it through NEXT_PUBLIC_* variables."
);
