import express from "express";
import cors from "cors";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { JWK } from "jose";

import {
  ensureDefaultIssuer,
  listIssuers,
  getIssuer,
  getIssuerPrivateKey,
  getIssuerPublicKey,
  getIssuerPublicJwk,
  createManagedIssuer,
  registerExternalIssuer,
} from "./issuerStore.js";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

const DATA_DIR = path.join(process.cwd(), "data");
const REQUESTS_PATH = path.join(DATA_DIR, "requests.json");
const VCS_PATH = path.join(DATA_DIR, "vcs.json");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readJson<T>(p: string, fallback: T): Promise<T> {
  try {
    const s = await fs.readFile(p, "utf-8");
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(p: string, v: T): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(p, JSON.stringify(v, null, 2), "utf-8");
}

type IssueRequest = {
  id: string;
  createdAt: string;
  holderAddress: string;
  holderDid: string; // did:pkh想定
  issuerId: string;
  claims: Record<string, any>;
  status: "requested" | "issued" | "failed";
  resultVcJwt?: string;
  lastError?: string;
};

type PublishedVC = {
  id: string;
  issuedAt: string;
  issuerId: string;
  holderAddress: string;
  holderDid: string;
  vcJwt: string;
};

function isHexAddr(s: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(s);
}

function holderDidPkh(chainId: number, address: string) {
  return `did:pkh:eip155:${chainId}:${address}`;
}

/**
 * health
 */
app.get("/health", async (_req, res) => {
  res.json({ ok: true });
});

/**
 * issuer公開情報（←今回欲しい公開鍵出力）
 */
app.get("/issuer/:issuerId", async (req, res) => {
  try {
    const issuerId = req.params.issuerId;
    const issuer = await getIssuer(issuerId);
    if (!issuer) return res.status(404).json({ error: "issuer not found" });

    const publicJwk = await getIssuerPublicJwk(issuerId);

    return res.json({
      issuerId: issuer.issuerId,
      did: issuer.did,
      address: issuer.address,
      publicJwk,
      managed: !!issuer.managed,
      createdAt: issuer.createdAt,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? String(e) });
  }
});

/**
 * issuer登録（managed issuer作成）
 */
app.post("/register-issuer", async (req, res) => {
  try {
    const { issuerId, address, chainId } = req.body ?? {};
    if (!issuerId || typeof issuerId !== "string") return res.status(400).json({ error: "issuerId required" });
    if (!address || typeof address !== "string" || !isHexAddr(address)) return res.status(400).json({ error: "address must be 0x..." });

    const rec = await createManagedIssuer({
      issuerId,
      address,
      chainId: typeof chainId === "number" ? chainId : 31337,
    });

    return res.json({
      issuerId: rec.issuerId,
      did: rec.did,
      address: rec.address,
      publicJwk: rec.publicJwk,
      managed: rec.managed,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? String(e) });
  }
});

/**
 * issuer登録（external: publicJwkだけ登録）
 */
app.post("/register-external-issuer", async (req, res) => {
  try {
    const { issuerId, did, address, publicJwk } = req.body ?? {};
    if (!issuerId || typeof issuerId !== "string") return res.status(400).json({ error: "issuerId required" });
    if (!did || typeof did !== "string") return res.status(400).json({ error: "did required" });
    if (!address || typeof address !== "string" || !isHexAddr(address)) return res.status(400).json({ error: "address must be 0x..." });
    if (!publicJwk || typeof publicJwk !== "object") return res.status(400).json({ error: "publicJwk required" });

    const rec = await registerExternalIssuer({
      issuerId,
      did,
      address,
      publicJwk: publicJwk as JWK,
    });

    return res.json({
      ok: true,
      issuer: { issuerId: rec.issuerId, did: rec.did, address: rec.address, publicJwk: rec.publicJwk },
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? String(e) });
  }
});

/**
 * Holder -> 発行依頼
 */
app.post("/request-issue", async (req, res) => {
  try {
    const { holderAddress, issuerId, claims } = req.body ?? {};
    if (!holderAddress || typeof holderAddress !== "string" || !isHexAddr(holderAddress)) {
      return res.status(400).json({ error: "holderAddress must be 0x..." });
    }
    if (!issuerId || typeof issuerId !== "string") return res.status(400).json({ error: "issuerId required" });

    const issuer = await getIssuer(issuerId);
    if (!issuer) return res.status(404).json({ error: "issuer not found" });

    const chainId = 31337;
    const holderDid = holderDidPkh(chainId, holderAddress);

    const now = new Date().toISOString();
    const r: IssueRequest = {
      id: randomUUID(),
      createdAt: now,
      holderAddress,
      holderDid,
      issuerId,
      claims: typeof claims === "object" && claims ? claims : {},
      status: "requested",
    };

    const requests = await readJson<IssueRequest[]>(REQUESTS_PATH, []);
    requests.push(r);
    await writeJson(REQUESTS_PATH, requests);

    return res.json({ ok: true, request: r });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? String(e) });
  }
});

/**
 * Issuer -> 依頼一覧
 */
app.get("/requests", async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const issuerId = req.query.issuerId as string | undefined;

    let requests = await readJson<IssueRequest[]>(REQUESTS_PATH, []);
    if (status) requests = requests.filter((r) => r.status === status);
    if (issuerId) requests = requests.filter((r) => r.issuerId === issuerId);

    return res.json({ requests });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? String(e) });
  }
});

/**
 * Issuer -> 依頼からVC発行
 */
app.post("/requests/:id/issue", async (req, res) => {
  const id = req.params.id;
  try {
    const requests = await readJson<IssueRequest[]>(REQUESTS_PATH, []);
    const idx = requests.findIndex((r) => r.id === id);
    if (idx < 0) return res.status(404).json({ error: "request not found" });

    const r = requests[idx];
    if (r.status !== "requested") return res.status(400).json({ error: "request is not in requested status" });

    const issuer = await getIssuer(r.issuerId);
    if (!issuer) return res.status(404).json({ error: "issuer not found" });

    const privateKey = await getIssuerPrivateKey(r.issuerId);

    const issuedAt = Math.floor(Date.now() / 1000);
    const exp = issuedAt + 60 * 60 * 24 * 365;

    const vcPayload = {
      vc: {
        type: ["VerifiableCredential"],
        credentialSubject: {
          id: r.holderDid,
          address: r.holderAddress,
          ...r.claims,
        },
        issuer: issuer.did,
      },
      iss: issuer.did,
      sub: r.holderDid,
      iat: issuedAt,
      exp,
      jti: randomUUID(),
    };

    const vcJwt = await new SignJWT(vcPayload)
      .setProtectedHeader({ alg: "ES256K", typ: "JWT" })
      .sign(privateKey);

    requests[idx] = { ...r, status: "issued", resultVcJwt: vcJwt };
    await writeJson(REQUESTS_PATH, requests);

    const vcs = await readJson<PublishedVC[]>(VCS_PATH, []);
    const published: PublishedVC = {
      id: randomUUID(),
      issuedAt: new Date().toISOString(),
      issuerId: r.issuerId,
      holderAddress: r.holderAddress,
      holderDid: r.holderDid,
      vcJwt,
    };
    vcs.push(published);
    await writeJson(VCS_PATH, vcs);

    return res.json({ ok: true, vcJwt, published });
  } catch (e: any) {
    try {
      const requests = await readJson<IssueRequest[]>(REQUESTS_PATH, []);
      const idx = requests.findIndex((r) => r.id === id);
      if (idx >= 0) {
        requests[idx] = { ...requests[idx], status: "failed", lastError: e?.message ?? String(e) };
        await writeJson(REQUESTS_PATH, requests);
      }
    } catch {}
    return res.status(500).json({ error: e?.message ?? String(e) });
  }
});

/**
 * 公開VC一覧
 */
app.get("/vcs", async (_req, res) => {
  try {
    const vcs = await readJson<PublishedVC[]>(VCS_PATH, []);
    return res.json({ vcs });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? String(e) });
  }
});

/**
 * Verifier -> VC検証（署名検証）
 */
app.post("/verify", async (req, res) => {
  try {
    const { vcJwt } = req.body ?? {};
    if (!vcJwt || typeof vcJwt !== "string") return res.status(400).json({ error: "vcJwt required" });

    const parts = vcJwt.split(".");
    if (parts.length !== 3) return res.status(400).json({ error: "invalid jwt format" });

    const payloadJson = Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
    const payload = JSON.parse(payloadJson);

    const issuerDid: string | undefined = payload?.iss ?? payload?.vc?.issuer;
    if (!issuerDid || typeof issuerDid !== "string") return res.status(400).json({ error: "issuer DID not found in token" });

    const issuers = await listIssuers();
    const issuer = issuers.find((x) => x.did === issuerDid);
    if (!issuer) return res.status(404).json({ error: "issuer not registered on platform" });

    const pubKey = await getIssuerPublicKey(issuer.issuerId);
    const verified = await jwtVerify(vcJwt, pubKey, { algorithms: ["ES256K"] });

    return res.json({
      ok: true,
      issuerId: issuer.issuerId,
      issuerDid,
      onchainIssuer: issuer.address,
      payload: verified.payload,
      protectedHeader: verified.protectedHeader,
    });
  } catch (e: any) {
    return res.status(400).json({ ok: false, reason: e?.message ?? String(e) });
  }
});

const PORT = Number(process.env.PORT ?? 3000);

async function main() {
  await ensureDataDir();
  await ensureDefaultIssuer();
  app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
