import React, { useEffect, useMemo, useState } from "react";
import { useWallet } from "../wallet";

const API_BASE = "http://localhost:3000";

type PublishedVC = {
  id: string;
  issuedAt: string;
  issuerId: string;
  holderAddress: string;
  holderDid: string;
  vcJwt: string;
};

function shorten(v: string, len = 6) {
  return v.length > len * 2 ? `${v.slice(0, len)}...${v.slice(-len)}` : v;
}

type DecodedSummary = {
  issuerDid?: string;
  types?: string[];
  proofContent?: string;
  period?: string;
};

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

    const sigBytes = b64UrlToBytes(s);
    const sigHex = sigBytes
      ? "0x" +
        Array.from(sigBytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
      : "";

    return {
      header: JSON.parse(headerJson),
      payload: JSON.parse(payloadJson),
      signatureB64Url: s,
      signatureHex: sigHex,
      signingInput: `${h}.${p}`,
    };
  } catch {
    return null;
  }
}

function b64UrlToBytes(b64url: string): Uint8Array | null {
  try {
    const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    const bin = typeof atob === "function" ? atob(b64 + pad) : null;
    if (!bin) return null;
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function bytesToUtf8(bytes: Uint8Array): string | null {
  try {
    if (typeof TextDecoder !== "undefined") {
      return new TextDecoder().decode(bytes);
    }
    // Fallback for environments without TextDecoder
    let s = "";
    bytes.forEach((b) => (s += String.fromCharCode(b)));
    return decodeURIComponent(escape(s));
  } catch {
    return null;
  }
}

function decodeSummary(jwt: string): DecodedSummary | null {
  try {
    const [, payloadB64] = jwt.split(".");
    if (!payloadB64) return null;
    const bytes = b64UrlToBytes(payloadB64);
    if (!bytes) return null;
    const json = bytesToUtf8(bytes);
    if (!json) return null;
    const payload = JSON.parse(json);
    const vc = payload?.vc ?? {};
    const subject = vc?.credentialSubject ?? {};
    const types = Array.isArray(vc?.type) ? vc.type : [];
    const period = subject.period ?? (subject.periodAfter || subject.periodBefore ? `${subject.periodAfter ?? ""}〜${subject.periodBefore ?? ""}` : undefined);
    return {
      issuerDid: payload.iss ?? vc.issuer,
      types,
      proofContent: subject.proofContent ?? subject.role,
      period,
    };
  } catch {
    return null;
  }
}

export default function HolderVcListPage() {
  const [status, setStatus] = useState<string | null>(null);
  const { walletAddr, status: walletStatus } = useWallet();
  const [vcs, setVcs] = useState<PublishedVC[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  async function refreshVCs() {
    const res = await fetch(`${API_BASE}/vcs`);
    const data = await res.json();
    setVcs(data.vcs ?? []);
  }

  useEffect(() => {
    refreshVCs().catch(() => {});
  }, []);

  const myCredentials = useMemo(() => {
    if (!walletAddr) return [];
    const a = walletAddr.toLowerCase();
    return vcs.filter((v) => v.holderAddress.toLowerCase() === a);
  }, [vcs, walletAddr]);

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

  const selectedVc = useMemo(() => myCredentials.find((v) => v.id === selected) ?? null, [selected, myCredentials]);
  const decodedSelected = useMemo(() => (selectedVc ? decodeJwt(selectedVc.vcJwt) : null), [selectedVc]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 16, alignItems: "start" }}>
      {(status || walletStatus) && (
        <div style={{ gridColumn: "1 / -1", padding: 10, borderRadius: 14, border: "1px solid rgba(148,163,184,0.35)", background: "rgba(15,23,42,0.9)", fontSize: 13 }}>
          {status ?? walletStatus}
        </div>
      )}

      <div style={{ padding: 16, borderRadius: 16, border: "1px solid rgba(148,163,184,0.35)", background: "rgba(15,23,42,0.9)", display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>自分のVC一覧</div>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>/vcs から自分のアドレス分だけ抽出して表示します</div>

        <div style={{ fontFamily: "monospace", fontSize: 12, color: "#9ca3af" }}>
          {walletAddr ? `Connected: ${shorten(walletAddr, 6)}` : "ウォレット未接続（ヘッダから接続してください）"}
        </div>

        <button
          onClick={() => refreshVCs()}
          style={{ padding: "8px 12px", borderRadius: 999, border: "none", cursor: "pointer", background: "#64748b", color: "#0f172a", fontWeight: 900, width: "max-content" }}
        >
          Refresh
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {!walletAddr && <div style={{ fontSize: 13, color: "#9ca3af" }}>ウォレット未接続です</div>}
          {walletAddr && myCredentials.length === 0 && <div style={{ fontSize: 13, color: "#9ca3af" }}>まだVCがありません（Issuerが発行後に表示されます）</div>}

          {myCredentials.map((v) => (
            <VcCard
              key={v.id}
              vc={v}
              selected={selected === v.id}
              onSelect={() => setSelected(v.id)}
              onVerify={() => verifyVc(v.vcJwt)}
            />
          ))}
        </div>
      </div>

      <div style={{ padding: 16, borderRadius: 16, border: "1px solid rgba(148,163,184,0.35)", background: "rgba(15,23,42,0.9)", display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>VC詳細</div>
        {!selectedVc && <div style={{ fontSize: 12, color: "#9ca3af" }}>左の一覧からVCを選択すると詳細を表示します。</div>}

        {selectedVc && (
          <>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>選択中のVC JWT</div>
            <textarea
              value={selectedVc.vcJwt}
              readOnly
              style={{ width: "100%", minHeight: 120, padding: 10, borderRadius: 12, border: "1px solid #4b5563", background: "#0b1220", color: "#e5e7eb", fontFamily: "monospace" }}
            />

            {decodedSelected && (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>Header</div>
                  <pre
                    style={{
                      margin: 0,
                      padding: 10,
                      borderRadius: 10,
                      border: "1px solid rgba(148,163,184,0.35)",
                      background: "rgba(2,6,23,0.7)",
                      fontSize: 12,
                      color: "#e5e7eb",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {JSON.stringify(decodedSelected.header, null, 2)}
                  </pre>
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>Payload</div>
                  <pre
                    style={{
                      margin: 0,
                      padding: 10,
                      borderRadius: 10,
                      border: "1px solid rgba(148,163,184,0.35)",
                      background: "rgba(2,6,23,0.7)",
                      fontSize: 12,
                      color: "#e5e7eb",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {JSON.stringify(decodedSelected.payload, null, 2)}
                  </pre>
                </div>

                <div style={{ display: "grid", gap: 4 }}>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>Signature (hex)</div>
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 10,
                      border: "1px solid rgba(148,163,184,0.35)",
                      background: "rgba(2,6,23,0.7)",
                      fontFamily: "monospace",
                      wordBreak: "break-all",
                      color: "#e5e7eb",
                      fontSize: 12,
                    }}
                  >
                    {decodedSelected.signatureHex}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function VcCard({
  vc,
  selected,
  onSelect,
  onVerify,
}: {
  vc: PublishedVC;
  selected: boolean;
  onSelect: () => void;
  onVerify: () => void;
}) {
  const summary = decodeSummary(vc.vcJwt);
  return (
    <div
      style={{
        borderRadius: 12,
        border: selected ? "1px solid rgba(96,165,250,0.9)" : "1px solid rgba(75,85,99,0.9)",
        padding: 10,
        background: selected ? "rgba(30,64,175,0.25)" : "rgba(15,23,42,0.95)",
        display: "grid",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ fontSize: 13, fontWeight: 900 }}>{vc.issuerId}</div>
        <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "monospace" }}>
          {new Date(vc.issuedAt).toLocaleString()}
        </div>
      </div>

      <div style={{ fontSize: 12, color: "#cbd5e1" }}>
        {summary?.issuerDid && <span>issuer: {shorten(summary.issuerDid, 10)}</span>}
      </div>

      <div style={{ fontSize: 12, color: "#cbd5e1" }}>
        {summary?.proofContent && <span>証明内容: {summary.proofContent}</span>}
        {summary?.period && <span style={{ marginLeft: 6 }}>期間: {summary.period}</span>}
      </div>

      {summary?.types && summary.types.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {summary.types.slice(0, 3).map((t) => (
            <span
              key={t}
              style={{
                padding: "2px 8px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.6)",
                color: "#e2e8f0",
                fontSize: 11,
              }}
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, fontFamily: "monospace", wordBreak: "break-all" }}>{shorten(vc.vcJwt, 70)}</div>

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button
          onClick={onSelect}
          style={{
            padding: "6px 10px",
            borderRadius: 10,
            border: "1px solid rgba(148,163,184,0.35)",
            background: selected ? "#60a5fa" : "rgba(2,6,23,0.7)",
            color: selected ? "#0f172a" : "#e5e7eb",
            cursor: "pointer",
          }}
        >
          詳細
        </button>
        <button
          onClick={onVerify}
          style={{
            padding: "6px 10px",
            borderRadius: 10,
            border: "none",
            background: "#3b82f6",
            color: "#e5e7eb",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          このVCを検証
        </button>
      </div>
    </div>
  );
}
