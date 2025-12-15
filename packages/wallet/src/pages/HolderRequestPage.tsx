import React, { useState } from "react";
import { useWallet } from "../wallet";

const API_BASE = "http://localhost:3000";

function shorten(v: string, len = 6) {
  return v.length > len * 2 ? `${v.slice(0, len)}...${v.slice(-len)}` : v;
}

export default function HolderRequestPage() {
  const [status, setStatus] = useState<string | null>(null);
  const { walletAddr, status: walletStatus } = useWallet();

  const [issuerId, setIssuerId] = useState("companyB");
  const [holderName, setHolderName] = useState("Taro MetaMask");
  const [holderRole, setHolderRole] = useState("Web3 Engineer");

  async function requestIssue() {
    if (!walletAddr) {
      alert("ウォレット接続が必要です。");
      return;
    }
    try {
      setStatus("発行依頼を送信中…");
      const res = await fetch(`${API_BASE}/request-issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holderAddress: walletAddr,
          issuerId,
          claims: { name: holderName, role: holderRole },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(`依頼失敗: ${data?.error ?? "unknown"}`);
        return;
      }
      setStatus("依頼を作成しました（Issuer 画面で発行してください）");
    } catch (e: any) {
      setStatus(`依頼失敗: ${e?.message ?? e}`);
    }
  }

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, width: "min(720px, 100%)" }}>
        {status && (
          <div style={{ gridColumn: "1 / -1", padding: 10, borderRadius: 14, border: "1px solid rgba(148,163,184,0.35)", background: "rgba(15,23,42,0.9)", fontSize: 13 }}>
            {status}
          </div>
        )}
        {walletStatus && (
          <div style={{ gridColumn: "1 / -1", padding: 10, borderRadius: 14, border: "1px solid rgba(148,163,184,0.35)", background: "rgba(15,23,42,0.9)", fontSize: 12 }}>
            {walletStatus}
          </div>
        )}

        <div style={{ padding: 16, borderRadius: 16, border: "1px solid rgba(148,163,184,0.35)", background: "rgba(15,23,42,0.9)" }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>VC発行依頼</div>

          <div style={{ fontFamily: "monospace", fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>
            {walletAddr ? `Connected: ${shorten(walletAddr, 6)}` : "ウォレット未接続（ヘッダから接続してください）"}
          </div>

          <div style={{ marginTop: 14, fontSize: 12, marginBottom: 6 }}>Issuer ID</div>
          <input value={issuerId} onChange={(e) => setIssuerId(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 12, border: "1px solid #4b5563", background: "#020617", color: "#e5e7eb", marginBottom: 10 }} />

          <div style={{ fontSize: 12, marginBottom: 6 }}>name</div>
          <input value={holderName} onChange={(e) => setHolderName(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 12, border: "1px solid #4b5563", background: "#020617", color: "#e5e7eb", marginBottom: 10 }} />

          <div style={{ fontSize: 12, marginBottom: 6 }}>role</div>
          <input value={holderRole} onChange={(e) => setHolderRole(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 12, border: "1px solid #4b5563", background: "#020617", color: "#e5e7eb", marginBottom: 12 }} />

          <button
            onClick={requestIssue}
            disabled={!walletAddr}
            style={{
              padding: "10px 14px",
              borderRadius: 999,
              border: "none",
              cursor: walletAddr ? "pointer" : "default",
              background: walletAddr ? "#3b82f6" : "#4b5563",
              color: "#e5e7eb",
              fontWeight: 900,
            }}
          >
            Request VC issuance
          </button>

          {!walletAddr && <div style={{ marginTop: 8, fontSize: 12, color: "#f97316" }}>ウォレット接続が必要です</div>}
        </div>
      </div>
    </div>
  );
}
