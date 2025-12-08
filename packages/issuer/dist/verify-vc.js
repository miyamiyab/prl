// src/verify-vc.ts
import { readFile } from "node:fs/promises";
import { importJWK, jwtVerify } from "jose";
async function main() {
    const issuerDid = "did:example:issuer";
    const subjectDid = "did:example:holder";
    // 1. 公開鍵を読み込み
    const keyFileUrl = new URL("../keys/issuer-es256.json", import.meta.url);
    const keyJson = JSON.parse(await readFile(keyFileUrl, "utf8"));
    const publicJwk = keyJson.publicJwk;
    const publicKey = await importJWK(publicJwk, "ES256");
    // 2. 発行済みVC(JWT) を読み込み
    const vcFileUrl = new URL("../data/latest-vc.jwt", import.meta.url);
    const jwt = (await readFile(vcFileUrl, "utf8")).trim();
    console.log("=== Loaded VC (JWT) ===");
    console.log(jwt);
    // 3. 署名検証＋iss/sub チェック
    const { payload } = await jwtVerify(jwt, publicKey, {
        issuer: issuerDid,
        subject: subjectDid
    });
    console.log("\n=== Verified payload ===");
    console.log(payload);
    // 4. VCクレームの最低限チェック
    if (!("vc" in payload)) {
        throw new Error("VC claim is missing");
    }
    const vc = payload.vc;
    if (vc.issuer !== issuerDid) {
        throw new Error("Unexpected VC issuer");
    }
    if (!vc.credentialSubject || vc.credentialSubject.id !== subjectDid) {
        throw new Error("Unexpected VC subject");
    }
    console.log("\n✅ VC verification OK (signature + basic claims)");
}
main().catch((e) => {
    console.error("❌ Verification failed");
    console.error(e);
    process.exit(1);
});
