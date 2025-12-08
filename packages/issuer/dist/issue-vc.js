// src/issue-vc.ts
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { importJWK, SignJWT } from "jose";
async function main() {
    const issuerDid = "did:example:issuer";
    const subjectDid = "did:example:holder";
    // 1. 保存しておいた秘密鍵を読み込む
    const keyFileUrl = new URL("../keys/issuer-es256.json", import.meta.url);
    const keyJson = JSON.parse(await readFile(keyFileUrl, "utf8"));
    const privateJwk = keyJson.privateJwk;
    const privateKey = await importJWK(privateJwk, "ES256");
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
    // 4. 署名して VC(JWT) を発行
    const jwt = await new SignJWT(payload)
        .setProtectedHeader({ alg: "ES256", typ: "JWT", kid: privateJwk.kid })
        .sign(privateKey);
    console.log("=== Issued VC (JWT) ===");
    console.log(jwt);
    // 5. 検証用にファイルへも保存しておく
    const vcFileUrl = new URL("../data/latest-vc.jwt", import.meta.url);
    await mkdir(new URL("../data", import.meta.url), { recursive: true });
    await writeFile(vcFileUrl, jwt, "utf8");
    console.log("\n✅ Saved VC to data/latest-vc.jwt");
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
