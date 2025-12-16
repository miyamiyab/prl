import React, { useEffect, useMemo, useState } from "react";

const API_BASE = "http://localhost:3000";

type PublishedVC = {
  id: string;
  issuedAt: string;
  issuerId: string;
  holderAddress: string;
  holderDid: string;
  vcJwt: string;
};

type IssuerPublic = {
  issuerId: string;
  did: string;
  address: string;
  publicJwk: any;
  managed: boolean;
  createdAt: string;
};

function shorten(v: string, len = 6) {
  return v.length > len * 2 ? `${v.slice(0, len)}...${v.slice(-len)}` : v;
}

function b64urlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function decodeJwt(jwt: string): {
  header: any;
  payload: any;
  signatureB64Url: string;
  signatureHex: string;
  signingInput: string;
} | null {
  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) return null;
    const [h, p, s] = parts;

    const decode = (b64url: string) => {
      const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
      const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
      const bin = atob(b64 + pad);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return typeof TextDecoder !== "undefined"
        ? new TextDecoder().decode(bytes)
        : decodeURIComponent(bytes.reduce((s, b) => s + "%" + ("00" + b.toString(16)).slice(-2), ""));
    };

    const headerJson = decode(h);
    const payloadJson = decode(p);

    const sigBytes = b64urlToBytes(s);
    const sigHex = "0x" + bytesToHex(sigBytes);

    return {
      header: JSON.parse(headerJson),
      payload: JSON.parse(payloadJson),
      signatureB64Url: s,
      signatureHex: sigHex,
      signingInput: `${h}.${p}`, // JWS signing input
    };
  } catch {
    return null;
  }
}

export default function VerifierPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [vcs, setVcs] = useState<PublishedVC[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedVcId, setSelectedVcId] = useState<string | null>(null);

  const [issuerInfo, setIssuerInfo] = useState<IssuerPublic | null>(null);
  const [issuerFetchError, setIssuerFetchError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch(`${API_BASE}/vcs`);
    const data = await res.json();
    setVcs(data.vcs ?? []);
  }

  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  const users = useMemo(() => {
    const map = new Map<string, { address: string; did: string; count: number }>();
    for (const v of vcs) {
      const key = v.holderAddress.toLowerCase();
      const cur = map.get(key);
      if (cur) cur.count += 1;
      else map.set(key, { address: v.holderAddress, did: v.holderDid, count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [vcs]);

  const selectedUserVCs = useMemo(() => {
    if (!selectedUser) return [];
    const a = selectedUser.toLowerCase();
    return vcs.filter((v) => v.holderAddress.toLowerCase() === a);
  }, [vcs, selectedUser]);

  const selectedVc = useMemo(() => vcs.find((v) => v.id === selectedVcId) ?? null, [vcs, selectedVcId]);
  const decoded = useMemo(() => (selectedVc ? decodeJwt(selectedVc.vcJwt) : null), [selectedVc]);

  // VCをViewしたらissuer公開鍵も取る
  useEffect(() => {
    (async () => {
      if (!selectedVc) {
        setIssuerInfo(null);
        setIssuerFetchError(null);
        return;
      }
      try {
        setIssuerFetchError(null);
        const res = await fetch(`${API_BASE}/issuer/${encodeURIComponent(selectedVc.issuerId)}`);
        const data = await res.json();
        if (!res.ok) {
          setIssuerInfo(null);
          setIssuerFetchError(data?.error ?? "failed to fetch issuer");
          return;
        }
        setIssuerInfo(data as IssuerPublic);
      } catch (e: any) {
        setIssuerInfo(null);
        setIssuerFetchError(e?.message ?? String(e));
      }
    })();
  }, [selectedVc?.issuerId]); // issuerIdが変わったら更新

  async function verifyVc(vcJwt: string) {
    try {
      setStatus("検証中…");
      const res = await fetch(`${API_BASE}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vcJwt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(`検証NG: ${data?.reason ?? data?.error ?? "unknown"}`);
        return;
      }
      setStatus(`検証OK: issuer=${shorten(data.issuerDid ?? "", 12)} / onchainIssuer=${shorten(data.onchainIssuer ?? "", 12)}`);
    } catch (e: any) {
      setStatus(`検証失敗: ${e?.message ?? e}`);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1.2fr", gap: 16 }}>
      <div style={{ padding: 16, borderRadius: 16, border: "1px solid rgba(148,163,184,0.35)", background: "rgba(15,23,42,0.9)" }}>
        <div style={{ fontWeight: 900 }}>Verifier — ユーザー一覧</div>
        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>この画面ではウォレット接続しません</div>

        <button
          onClick={refresh}
          style={{
            marginTop: 10,
            padding: "8px 12px",
            borderRadius: 999,
            border: "none",
            cursor: "pointer",
            background: "#64748b",
            color: "#0f172a",
            fontWeight: 900,
          }}
        >
          Refresh
        </button>

        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {users.length === 0 && <div style={{ fontSize: 13, color: "#9ca3af" }}>まだVCがありません</div>}
          {users.map((u) => {
            const selected = selectedUser?.toLowerCase() === u.address.toLowerCase();
            return (
              <button
                key={u.address}
                onClick={() => {
                  setSelectedUser(u.address);
                  setSelectedVcId(null);
                }}
                style={{
                  textAlign: "left",
                  borderRadius: 12,
                  border: selected ? "2px solid rgba(59,130,246,0.9)" : "1px solid rgba(75,85,99,0.9)",
                  padding: 10,
                  background: "rgba(15,23,42,0.95)",
                  cursor: "pointer",
                  color: "#e5e7eb",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 900 }}>{shorten(u.address, 6)} ({u.count})</div>
                <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "monospace", marginTop: 4 }}>{shorten(u.did, 14)}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          padding: 16,
          borderRadius: 16,
          border: "1px solid rgba(148,163,184,0.35)",
          background: "rgba(15,23,42,0.9)",
          display: "grid",
          gap: 12,
          alignContent: "start",
        }}
      >
        <div style={{ overflow: "auto" }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>選択ユーザーの VC</div>
          {!selectedUser && <div style={{ fontSize: 13, color: "#9ca3af" }}>左のユーザーを選択してください</div>}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {selectedUserVCs.map((v) => {
              const sel = selectedVcId === v.id;
              return (
                <div key={v.id} style={{ borderRadius: 12, border: sel ? "2px solid rgba(59,130,246,0.9)" : "1px solid rgba(75,85,99,0.9)", padding: 10, background: "rgba(15,23,42,0.95)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 13, fontWeight: 900 }}>{v.issuerId} → {shorten(v.holderAddress, 6)}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "monospace" }}>{new Date(v.issuedAt).toLocaleString()}</div>
                  </div>

                  <div style={{ marginTop: 6, fontSize: 11, fontFamily: "monospace", wordBreak: "break-all" }}>{shorten(v.vcJwt, 70)}</div>

                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button
                      onClick={() => setSelectedVcId(v.id)}
                      style={{ padding: "8px 12px", borderRadius: 999, border: "none", cursor: "pointer", background: "#64748b", color: "#0f172a", fontWeight: 900 }}
                    >
                      詳細
                    </button>
                    <button
                      onClick={() => verifyVc(v.vcJwt)}
                      style={{ padding: "8px 12px", borderRadius: 999, border: "none", cursor: "pointer", background: "#22c55e", color: "#0f172a", fontWeight: 900 }}
                    >
                      検証
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ borderRadius: 12, border: "1px solid rgba(75,85,99,0.9)", padding: 10, background: "rgba(15,23,42,0.95)", overflow: "auto" }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>VC details (JWT decode + signature + issuer public key)</div>
          {status && (
            <div
              style={{
                padding: 8,
                borderRadius: 10,
                border: "1px solid rgba(148,163,184,0.35)",
                background: "rgba(15,23,42,0.9)",
                fontSize: 12,
                marginBottom: 8,
              }}
            >
              {status}
            </div>
          )}
          {!selectedVc && <div style={{ fontSize: 13, color: "#9ca3af" }}>詳細 を押すと header/payload/署名/公開鍵 を表示します</div>}
          {selectedVc && !decoded && <div style={{ fontSize: 13, color: "#f97316" }}>デコード失敗</div>}

          {selectedVc && decoded && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 4 }}>header</div>
                <pre style={{ margin: 0, padding: 8, borderRadius: 10, background: "#020617", border: "1px solid #4b5563", whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 11 }}>
                  {JSON.stringify(decoded.header, null, 2)}
                </pre>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 4 }}>payload</div>
                <pre style={{ margin: 0, padding: 8, borderRadius: 10, background: "#020617", border: "1px solid #4b5563", whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 11 }}>
                  {JSON.stringify(decoded.payload, null, 2)}
                </pre>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 4 }}>signature (issuer JWS)</div>

                <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>base64url</div>
                <pre style={{ margin: 0, padding: 8, borderRadius: 10, background: "#020617", border: "1px solid #4b5563", whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 11 }}>
                  {decoded.signatureB64Url}
                </pre>

                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 10, marginBottom: 6 }}>hex</div>
                <pre style={{ margin: 0, padding: 8, borderRadius: 10, background: "#020617", border: "1px solid #4b5563", whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 11 }}>
                  {decoded.signatureHex}
                </pre>

                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 10, marginBottom: 6 }}>signing input (header.payload)</div>
                <pre style={{ margin: 0, padding: 8, borderRadius: 10, background: "#020617", border: "1px solid #4b5563", whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 11 }}>
                  {decoded.signingInput}
                </pre>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 4 }}>issuer public key (JWK) — copy & verify</div>

                {issuerFetchError && (
                  <div style={{ fontSize: 12, color: "#f97316", marginBottom: 8 }}>
                    issuer fetch error: {issuerFetchError}
                  </div>
                )}

                {!issuerInfo && !issuerFetchError && (
                  <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>
                    loading issuer info…
                  </div>
                )}

                {issuerInfo && (
                  <>
                    <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>
                      issuerId={issuerInfo.issuerId} / did={shorten(issuerInfo.did, 16)} / address={shorten(issuerInfo.address, 10)}
                    </div>
                    <pre style={{ margin: 0, padding: 8, borderRadius: 10, background: "#020617", border: "1px solid #4b5563", whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 11 }}>
                      {JSON.stringify(issuerInfo.publicJwk, null, 2)}
                    </pre>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
