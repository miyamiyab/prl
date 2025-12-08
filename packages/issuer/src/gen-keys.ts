// src/gen-keys.ts
import { mkdir, writeFile } from "node:fs/promises";
import { generateKeyPair, exportJWK } from "jose";

async function main() {
  const { publicKey, privateKey } = await generateKeyPair("ES256");

  const kid = "issuer-es256-key-1";

  const publicJwk = await exportJWK(publicKey);
  const privateJwk = await exportJWK(privateKey);

  // alg / use / kid を付与（後で importJWK する時に便利）
  Object.assign(publicJwk, { alg: "ES256", use: "sig", kid });
  Object.assign(privateJwk, { alg: "ES256", use: "sig", kid });

  const keyData = { publicJwk, privateJwk };

  // dist/gen-keys.js から見て ../keys/ に保存（= プロジェクト直下）
  const keyFileUrl = new URL("../keys/issuer-es256.json", import.meta.url);

  await mkdir(new URL("../keys", import.meta.url), { recursive: true });
  await writeFile(keyFileUrl, JSON.stringify(keyData, null, 2), "utf8");

  console.log("✅ Generated key pair and saved to keys/issuer-es256.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
