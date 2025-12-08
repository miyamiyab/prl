import React, { useMemo, useState, useEffect } from "react";

declare global {
  interface Window {
    ethereum?: any;
  }
}

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

export default function HolderPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [walletAddr, setWalletAddr] = useState<string | null>(null);

  // Holder form
  const [issuerId, setIssuerId] = useState("companyB");
  const [holderName, setHolderName] = useState("Taro MetaMask");
  const [holderRole, setHolderRole] = useState("Web3 Engineer");

  // VC list
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

  async function connectWallet() {
    if (!window.ethereum) {
      alert("MetaMask が見つかりません。");
      return;
    }
    try {
      setStatus("ウォレット接続中…");
      const accounts: string[] = await window.ethereum.request({ method: "eth_requestAccounts" });
      const addr = accounts?.[0];
      if (!addr) {
        setStatus("アカウント取得に失敗しました。");
        return;
      }
      setWalletAddr(addr);
      setStatus(null);
    } catch (e: any) {
      setStatus(`ウォレット接続失敗: ${e?.message ?? e}`);
    }
  }

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
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 16 }}>
      {status && (
        <div style={{ gridColumn: "1 / -1", padding: 10, borderRadius: 14, border: "1px solid rgba(148,163,184,0.35)", background: "rgba(15,23,42,0.9)", fontSize: 13 }}>
          {status}
        </div>
      )}

      {/* Left: Request */}
      <div style={{ padding: 16, borderRadius: 16, border: "1px solid rgba(148,163,184,0.35)", background: "rgba(15,23,42,0.9)" }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Holder — 発行依頼</div>

        <button
          onClick={connectWallet}
          style={{ padding: "8px 12px", borderRadius: 999, border: "none", cursor: "pointer", background: "#22c55e", color: "#0f172a", fontWeight: 900 }}
        >
          Connect Wallet
        </button>
        <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 12, color: "#9ca3af" }}>
          {walletAddr ? shorten(walletAddr, 6) : "not connected"}
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

        {!walletAddr && <div style={{ marginTop: 8, fontSize: 12, color: "#f97316" }}>Holder 画面だけがウォレット接続します</div>}
      </div>

      {/* Right: My Credentials (holder-only label) */}
      <div style={{ padding: 16, borderRadius: 16, border: "1px solid rgba(148,163,184,0.35)", background: "rgba(15,23,42,0.9)" }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>My Credentials</div>
        <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 10 }}>
          /vcs の公開一覧から「自分のアドレス分だけ」抽出して表示
        </div>

        <button
          onClick={() => refreshVCs()}
          style={{ padding: "8px 12px", borderRadius: 999, border: "none", cursor: "pointer", background: "#64748b", color: "#0f172a", fontWeight: 900 }}
        >
          Refresh
        </button>

        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {!walletAddr && <div style={{ fontSize: 13, color: "#9ca3af" }}>ウォレット接続すると表示されます</div>}
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
