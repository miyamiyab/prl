import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { exportJWK, generateKeyPair, importJWK, type JWK, type KeyLike } from "jose";

export type IssuerRecord = {
  issuerId: string;
  did: string;
  address: string;
  // 公開鍵（検証用）: joseのJWK(JSON)形式
  publicJwk: JWK;
  // 秘密鍵（署名用）: managed issuerのみ保持
  privateJwk?: JWK;
  managed?: boolean;
  createdAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const ISSUERS_PATH = path.join(DATA_DIR, "issuers.json");

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

export async function listIssuers(): Promise<IssuerRecord[]> {
  return readJson<IssuerRecord[]>(ISSUERS_PATH, []);
}

export async function getIssuer(issuerId: string): Promise<IssuerRecord | null> {
  const issuers = await listIssuers();
  return issuers.find((x) => x.issuerId === issuerId) ?? null;
}

export async function upsertIssuer(rec: IssuerRecord): Promise<IssuerRecord> {
  const issuers = await listIssuers();
  const idx = issuers.findIndex((x) => x.issuerId === rec.issuerId);
  if (idx >= 0) issuers[idx] = rec;
  else issuers.push(rec);
  await writeJson(ISSUERS_PATH, issuers);
  return rec;
}

/**
 * 外部issuer登録（秘密鍵はサーバに渡さない / publicJwkだけ登録）
 */
export async function registerExternalIssuer(params: {
  issuerId: string;
  did: string;
  address: string;
  publicJwk: JWK;
}): Promise<IssuerRecord> {
  const now = new Date().toISOString();
  const rec: IssuerRecord = {
    issuerId: params.issuerId,
    did: params.did,
    address: params.address,
    publicJwk: params.publicJwk,
    managed: false,
    createdAt: now,
  };
  return upsertIssuer(rec);
}

/**
 * managed issuer作成（サーバが秘密鍵を持つ）
 * - alg: ES256K (secp256k1) を使用
 */
export async function createManagedIssuer(params: {
  issuerId: string;
  address: string;
  chainId?: number;
}): Promise<IssuerRecord> {
  const chainId = params.chainId ?? 31337;
  const now = new Date().toISOString();

  // ES256K: secp256k1
  const { publicKey, privateKey } = await generateKeyPair("ES256K");

  const publicJwk = await exportJWK(publicKey);
  const privateJwk = await exportJWK(privateKey);

  const did = `did:ethr:eip155:${chainId}:${params.address}`;

  const rec: IssuerRecord = {
    issuerId: params.issuerId,
    did,
    address: params.address,
    publicJwk,
    privateJwk,
    managed: true,
    createdAt: now,
  };
  return upsertIssuer(rec);
}

const privateKeyCache = new Map<string, KeyLike>();
const publicKeyCache = new Map<string, KeyLike>();

export async function getIssuerPrivateKey(issuerId: string): Promise<KeyLike> {
  if (privateKeyCache.has(issuerId)) return privateKeyCache.get(issuerId)!;

  const issuer = await getIssuer(issuerId);
  if (!issuer) throw new Error(`issuer not found: ${issuerId}`);
  if (!issuer.managed || !issuer.privateJwk) throw new Error(`issuer is not managed or missing private key: ${issuerId}`);

  const k = (await importJWK(issuer.privateJwk, "ES256K")) as KeyLike;
  privateKeyCache.set(issuerId, k);
  return k;
}

export async function getIssuerPublicKey(issuerId: string): Promise<KeyLike> {
  if (publicKeyCache.has(issuerId)) return publicKeyCache.get(issuerId)!;

  const issuer = await getIssuer(issuerId);
  if (!issuer) throw new Error(`issuer not found: ${issuerId}`);

  const k = (await importJWK(issuer.publicJwk, "ES256K")) as KeyLike;
  publicKeyCache.set(issuerId, k);
  return k;
}

// 便利関数：issuerの公開JWKを返す（Verifierでコピペ用途）
export async function getIssuerPublicJwk(issuerId: string): Promise<JWK> {
  const issuer = await getIssuer(issuerId);
  if (!issuer) throw new Error(`issuer not found: ${issuerId}`);
  return issuer.publicJwk;
}

// 便利：初期issuer(companyB)が無い場合だけ作る
export async function ensureDefaultIssuer(): Promise<void> {
  const exists = await getIssuer("companyB");
  if (exists) return;

  // NOTE: addressはあなたの環境に合わせて適当に入れてOK（did整合用）
  // 既にcompanyBを作っているならここは使われません。
  await createManagedIssuer({
    issuerId: "companyB",
    address: "0x2A36FA11ed761C6febe12f84cC35c5B0cf0A5131",
    chainId: 31337,
  });
}
