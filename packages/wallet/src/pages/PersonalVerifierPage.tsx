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

export default function PersonalVerifierPage() {
  const [status, setStatus] = useState<string | null>(null);
  const { walletAddr, status: walletStatus } = useWallet();
  const [vcs, setVcs] = useState<PublishedVC[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch(`${API_BASE}/vcs`);
    const data = await res.json();
    setVcs(data.vcs ?? []);
  }

  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  const myVCs = useMemo(() => {
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

  return (
    <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: 16 }}>
      {(status || walletStatus) && (
        <div
          style={{
            gridColumn: "1 / -1",
            padding: 10,
            borderRadius: 14,
            border: "1px solid rgba(148,163,184,0.35)",
            background: "rgba(15,23,42,0.9)",
            fontSize: 13,
          }}
        >
          {status ?? walletStatus}
        </div>
      )}

      <div style={{ padding: 16, borderRadius: 16, border: "1px solid rgba(148,163,184,0.35)", background: "rgba(15,23,42,0.9)" }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>個人VC検証 — ウォレット</div>
        <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 10 }}>個人が受け取ったVCを自分で検証するページです。</div>

        <div style={{ fontFamily: "monospace", fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>
          {walletAddr ? `Connected: ${shorten(walletAddr, 6)}` : "ウォレット未接続（ヘッダから接続してください）"}
        </div>

        <button
          onClick={refresh}
          style={{ marginTop: 12, padding: "8px 12px", borderRadius: 999, border: "none", cursor: "pointer", background: "#64748b", color: "#0f172a", fontWeight: 900 }}
        >
          VC一覧を更新
        </button>
      </div>

      <div style={{ padding: 16, borderRadius: 16, border: "1px solid rgba(148,163,184,0.35)", background: "rgba(15,23,42,0.9)" }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>自分宛てのVC一覧</div>
        <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>Wallet接続後に、自分のアドレス宛てのVCだけを表示します。</div>

        {!walletAddr && <div style={{ fontSize: 13, color: "#9ca3af" }}>ウォレットを接続してください。</div>}
        {walletAddr && myVCs.length === 0 && <div style={{ fontSize: 13, color: "#9ca3af" }}>まだ自分宛てのVCがありません。</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {myVCs.map((v) => {
            const active = selected === v.id;
            return (
              <div
                key={v.id}
                style={{
                  borderRadius: 12,
                  border: active ? "1px solid rgba(96,165,250,0.9)" : "1px solid rgba(75,85,99,0.9)",
                  padding: 10,
                  background: active ? "rgba(30,64,175,0.25)" : "rgba(15,23,42,0.95)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 13, fontWeight: 900 }}>{v.issuerId}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "monospace" }}>{new Date(v.issuedAt).toLocaleString()}</div>
                </div>
                <div style={{ marginTop: 6, fontSize: 11, fontFamily: "monospace", wordBreak: "break-all" }}>{shorten(v.vcJwt, 80)}</div>

                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    onClick={() => setSelected(v.id)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 10,
                      border: "1px solid rgba(148,163,184,0.35)",
                      background: active ? "#60a5fa" : "rgba(2,6,23,0.7)",
                      color: active ? "#0f172a" : "#e5e7eb",
                      cursor: "pointer",
                    }}
                  >
                    選択
                  </button>
                  <button
                    onClick={() => verifyVc(v.vcJwt)}
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
          })}
        </div>

        {selected && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>選択中のVC JWT</div>
            <textarea
              value={myVCs.find((v) => v.id === selected)?.vcJwt ?? ""}
              readOnly
              style={{ width: "100%", minHeight: 120, padding: 10, borderRadius: 12, border: "1px solid #4b5563", background: "#0b1220", color: "#e5e7eb", fontFamily: "monospace" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
