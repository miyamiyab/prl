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

export default function HolderVcListPage() {
  const [status, setStatus] = useState<string | null>(null);
  const { walletAddr, status: walletStatus } = useWallet();
  const [vcs, setVcs] = useState<PublishedVC[]>([]);

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

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 16 }}>
      {(status || walletStatus) && (
        <div style={{ gridColumn: "1 / -1", padding: 10, borderRadius: 14, border: "1px solid rgba(148,163,184,0.35)", background: "rgba(15,23,42,0.9)", fontSize: 13 }}>
          {status ?? walletStatus}
        </div>
      )}

      <div style={{ padding: 16, borderRadius: 16, border: "1px solid rgba(148,163,184,0.35)", background: "rgba(15,23,42,0.9)" }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>My Credentials</div>
        <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 10 }}>
          /vcs の公開一覧から「自分のアドレス分だけ」抽出して表示
        </div>

        <div style={{ marginTop: 4, fontFamily: "monospace", fontSize: 12, color: "#9ca3af" }}>
          {walletAddr ? `Connected: ${shorten(walletAddr, 6)}` : "ウォレット未接続（ヘッダから接続してください）"}
        </div>

        <button
          onClick={() => refreshVCs()}
          style={{ marginTop: 10, padding: "8px 12px", borderRadius: 999, border: "none", cursor: "pointer", background: "#64748b", color: "#0f172a", fontWeight: 900 }}
        >
          Refresh
        </button>

        {!walletAddr && <div style={{ marginTop: 10, fontSize: 12, color: "#f97316" }}>ウォレット接続すると自分のVCが表示されます</div>}
      </div>

      <div style={{ padding: 16, borderRadius: 16, border: "1px solid rgba(148,163,184,0.35)", background: "rgba(15,23,42,0.9)" }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>自分のVC一覧</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {!walletAddr && <div style={{ fontSize: 13, color: "#9ca3af" }}>ウォレット未接続です</div>}
          {walletAddr && myCredentials.length === 0 && <div style={{ fontSize: 13, color: "#9ca3af" }}>まだVCがありません（Issuerが発行後に表示されます）</div>}

          {myCredentials.map((v) => (
            <div key={v.id} style={{ borderRadius: 12, border: "1px solid rgba(75,85,99,0.9)", padding: 10, background: "rgba(15,23,42,0.95)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontSize: 13, fontWeight: 900 }}>
                  {v.issuerId} → {shorten(v.holderAddress, 6)}
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "monospace" }}>
                  {new Date(v.issuedAt).toLocaleString()}
                </div>
              </div>
              <div style={{ marginTop: 6, fontSize: 11, fontFamily: "monospace", wordBreak: "break-all" }}>
                {shorten(v.vcJwt, 70)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
