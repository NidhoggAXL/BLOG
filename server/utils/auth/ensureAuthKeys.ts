import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { resolveAuthKeysRoot } from "./projectRoot";

export const KEY_FILES = {
  rsaPrivate: "rsa-private.pem",
  rsaPublic: "rsa-public.pem",
  jwtPrivate: "jwt-private.pem",
  jwtPublic: "jwt-public.pem",
} as const;

export function ensureAuthKeys(projectRoot = resolveAuthKeysRoot()) {
  const keysDir = path.join(projectRoot, ".keys");
  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { recursive: true });
  }

  const created: string[] = [];
  const skipped: string[] = [];

  const pairs = [
    {
      private: KEY_FILES.rsaPrivate,
      public: KEY_FILES.rsaPublic,
      label: "RSA 传输",
    },
    {
      private: KEY_FILES.jwtPrivate,
      public: KEY_FILES.jwtPublic,
      label: "JWT RS256",
    },
  ];

  for (const pair of pairs) {
    const privPath = path.join(keysDir, pair.private);
    const pubPath = path.join(keysDir, pair.public);
    if (fs.existsSync(privPath) && fs.existsSync(pubPath)) {
      skipped.push(pair.label);
      continue;
    }

    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    fs.writeFileSync(privPath, privateKey, { mode: 0o600 });
    fs.writeFileSync(pubPath, publicKey, { mode: 0o644 });
    created.push(pair.label);
  }

  return { created, skipped };
}
