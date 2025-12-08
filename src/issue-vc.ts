// src/issue-vc.ts
import { generateKeyPair, SignJWT } from "jose";

async function main() {
  // 1. 発行者・被発行者（DIDのつもり）
  const issuerDid = "did:example:issuer";
  const subjectDid = "did:example:holder";

  // 2. 署名用の鍵ペアを生成（ES256 = P-256 検証鍵）
  //    実運用ではここで生成した秘密鍵をどこかに保存して再利用する。
  const { publicKey, privateKey } = await generateKeyPair("ES256");

  // 3. 発行するVCの中身（JWTの vc クレーム部）
  const vcClaim = {
    "@context": [
      "https://www.w3.org/ns/credentials/v2"
    ],
    type: ["VerifiableCredential", "ExampleCredential"],
    issuer: issuerDid,
    credentialSubject: {
      id: subjectDid,
      // ここに「証明したい内容」を書く
      name: "Taro Example",
      skill: "AWS Infrastructure Engineer",
      experienceYears: 10
    }
  };

  // 4. JWT全体のペイロード
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: issuerDid,           // 発行者
    sub: subjectDid,          // 対象者
    nbf: now,                 // この時刻以降有効
    exp: now + 60 * 60 * 24,  // 24時間有効
    jti: "urn:uuid:example-vc-1", // VC自体のID
    vc: vcClaim               // Verifiable Credential 本体
  };

  // 5. JWTに署名（JWS）
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: "ES256", typ: "JWT" })
    .sign(privateKey);

  console.log("=== Issued VC (JWT) ===");
  console.log(jwt);

  // おまけ：デバッグ用に base64 をデコードして中身を確認したい場合
  const [headerB64, payloadB64] = jwt.split(".");
  const header = JSON.parse(Buffer.from(headerB64, "base64url").toString("utf8"));
  const decodedPayload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));

  console.log("\n=== Header ===");
  console.log(header);
  console.log("\n=== Payload ===");
  console.log(decodedPayload);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
