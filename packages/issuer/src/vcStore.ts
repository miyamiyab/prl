import fs from "node:fs";
import path from "node:path";

export type PublishedVC = {
  id: string;           // request id
  issuedAt: string;     // ISO
  issuerId: string;
  holderAddress: string;
  holderDid: string;
  vcJwt: string;
};

const DATA_DIR = path.resolve(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "vcs.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readAll(): PublishedVC[] {
  ensureDir();
  if (!fs.existsSync(FILE)) return [];
  const raw = fs.readFileSync(FILE, "utf8");
  try {
    return JSON.parse(raw) as PublishedVC[];
  } catch {
    return [];
  }
}

function writeAll(vcs: PublishedVC[]) {
  ensureDir();
  fs.writeFileSync(FILE, JSON.stringify(vcs, null, 2), "utf8");
}

export function listVCs(holderAddress?: string): PublishedVC[] {
  const all = readAll();
  if (!holderAddress) return all;
  const a = holderAddress.toLowerCase();
  return all.filter((v) => v.holderAddress.toLowerCase() === a);
}

export function addVC(vc: PublishedVC): PublishedVC {
  const all = readAll();
  all.unshift(vc);
  writeAll(all);
  return vc;
}

export function getVC(id: string): PublishedVC | undefined {
  return readAll().find((v) => v.id === id);
}
