// src/issue-and-verify-vc.ts
import { generateKeyPair, SignJWT, jwtVerify } from "jose";

async function main() {
  const issuerDid = "did:example:issuer";
  const subjectDid = "did:example:holder";

  // 1. 鍵ペア生成（今回はデモなので毎回生成）
  const { publicKey, privateKey } = await generateKeyPair("ES256");

  // 2. VC本体
  const vcClaim = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential", "ExampleCredential"],
    issuer: issuerDid,
    credentialSubject: {
      id: subjectDid,
      name: "Taro Example",
      skill: "AWS Infrastructure Engineer",
      experienceYears: 10
    }
  };

  // 3. JWTペイロード
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: issuerDid,
    sub: subjectDid,
    nbf: now,
    exp: now + 60 * 60 * 24,
    jti: "urn:uuid:example-vc-1",
    vc: vcClaim
  };

  // 4. 署名してVC(JWT)を発行
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: "ES256", typ: "JWT" })
    .sign(privateKey);

  console.log("=== Issued VC (JWT) ===");
  console.log(jwt);

  // 5. ここから検証フェーズ（Verifier側の処理イメージ）

  // 5-1. 署名検証＋iss/sub のチェック
  const { payload: verifiedPayload } = await jwtVerify(jwt, publicKey, {
    issuer: issuerDid,
    subject: subjectDid
  });

  console.log("\n=== Verified payload ===");
  console.log(verifiedPayload);

  // 5-2. VCとして最低限チェックしたいことの例
  if (!("vc" in verifiedPayload)) {
    throw new Error("VC claim is missing");
  }

  const vc = (verifiedPayload as any).vc;

  if (vc.issuer !== issuerDid) {
    throw new Error("Unexpected VC issuer");
  }

  if (!vc.credentialSubject || vc.credentialSubject.id !== subjectDid) {
    throw new Error("Unexpected VC subject");
  }

  console.log("\n✅ VC verification OK");
}

main().catch((e) => {
  console.error("❌ Verification failed");
  console.error(e);
  process.exit(1);
});
