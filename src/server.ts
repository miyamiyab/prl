// src/server.ts
import express from "express";
import { readFile } from "node:fs/promises";
import { importJWK, SignJWT } from "jose";

const issuerDid = "did:example:issuer";

// 鍵ファイルを読み込んで秘密鍵を復元
async function loadPrivateKey() {
  const keyFileUrl = new URL("../keys/issuer-es256.json", import.meta.url);
  const keyJson = JSON.parse(await readFile(keyFileUrl, "utf8"));
  const privateJwk = keyJson.privateJwk;
  const privateKey = await importJWK(privateJwk, "ES256");
  return { privateKey, privateJwk };
}

const app = express();
app.use(express.json());

// POST /issue で VC を発行して返す
app.post("/issue", async (req, res) => {
  try {
    const { subjectId, claims } = req.body || {};

    const subjectDid: string = subjectId || "did:example:holder";

    const { privateKey, privateJwk } = await loadPrivateKey();

    // VC本体
    const vcClaim = {
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      type: ["VerifiableCredential", "ExampleCredential"],
      issuer: issuerDid,
      credentialSubject: {
        id: subjectDid,
        ...(claims || {}) // 任意のクレームを追加したい場合
      }
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: issuerDid,
      sub: subjectDid,
      nbf: now,
      exp: now + 60 * 60 * 24,
      jti: "urn:uuid:example-vc-" + now,
      vc: vcClaim
    };

    const jwt = await new SignJWT(payload)
      .setProtectedHeader({
        alg: "ES256",
        typ: "JWT",
        kid: privateJwk.kid
      })
      .sign(privateKey);

    res.json({
      vcJwt: jwt,
      payload
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "failed to issue vc" });
  }
});

const port = 3000;
app.listen(port, () => {
  console.log(`✅ VC issuer API running on http://localhost:${port}`);
  console.log("POST /issue で VC(JWT) を発行します");
});
