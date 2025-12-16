import React, { useEffect, useState } from "react";

const API_BASE = "http://localhost:3000";

type IssueRequest = {
  id: string;
  createdAt: string;
  holderAddress: string;
  holderDid: string;
  issuerId: string;
  claims: Record<string, any>;
  status: "requested" | "issued" | "failed";
  resultVcJwt?: string;
  lastError?: string;
};

function shorten(v: string, len = 6) {
  return v.length > len * 2 ? `${v.slice(0, len)}...${v.slice(-len)}` : v;
}

export default function IssuerPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [requests, setRequests] = useState<IssueRequest[]>([]);
  const [issuerOptions, setIssuerOptions] = useState<string[]>([]);
  const [selectedIssuer, setSelectedIssuer] = useState<string | null>(null);

  async function refresh(sel: string | null = selectedIssuer) {
    if (!sel) {
      setRequests([]);
      return;
    }
    const res = await fetch(`${API_BASE}/requests?status=requested&issuerId=${encodeURIComponent(sel)}`);
    const data = await res.json();
    setRequests(data.requests ?? []);
  }

  useEffect(() => {
    (async () => {
      try {
        const saved = localStorage.getItem("company:selectedIssuer");
        const res = await fetch(`${API_BASE}/issuers`);
        const data = await res.json();
        const ids = Array.isArray(data?.issuers)
          ? data.issuers.map((i: any) => i.issuerId).filter((v: string) => typeof v === "string")
          : [];
        setIssuerOptions(ids);

        let next = saved && ids.includes(saved) ? saved : null;
        if (!next && ids.length > 0) next = ids[0];

        if (next) {
          setSelectedIssuer(next);
          localStorage.setItem("company:selectedIssuer", next);
          await refresh(next);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedIssuer) refresh(selectedIssuer).catch(() => {});
  }, [selectedIssuer]);

  async function issueFromRequest(id: string) {
    try {
      setStatus("発行中…");
      const res = await fetch(`${API_BASE}/requests/${encodeURIComponent(id)}/issue`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setStatus(`発行失敗: ${data?.error ?? "unknown"}`);
        await refresh();
        return;
      }
      setStatus("発行完了（Verifier 画面で検証できます）");
      await refresh();
    } catch (e: any) {
      setStatus(`発行失敗: ${e?.message ?? e}`);
    }
  }

  return (
    <div style={{ padding: 16, borderRadius: 16, border: "1px solid rgba(148,163,184,0.35)", background: "rgba(15,23,42,0.9)" }}>
      {status && (
        <div style={{ padding: 10, borderRadius: 14, border: "1px solid rgba(148,163,184,0.35)", background: "rgba(15,23,42,0.95)", fontSize: 13, marginBottom: 12 }}>
          {status}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div>
          <div style={{ fontWeight: 900 }}>Issuer — 未処理依頼</div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            この画面ではウォレット接続しません（Issuerはサーバ側の鍵で発行） / 選択中: {selectedIssuer ?? "未選択"}
          </div>
        </div>

        <button onClick={refresh} style={{ padding: "8px 12px", borderRadius: 999, border: "none", cursor: "pointer", background: "#64748b", color: "#0f172a", fontWeight: 900 }}>
          Refresh
        </button>
      </div>

      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        {!selectedIssuer && <div style={{ fontSize: 13, color: "#f97316" }}>組織を選択してください（/company でも変更できます）</div>}
        {selectedIssuer && requests.length === 0 && <div style={{ fontSize: 13, color: "#9ca3af" }}>未処理の依頼はありません</div>}

        {requests.map((r) => (
          <div key={r.id} style={{ borderRadius: 12, border: "1px solid rgba(75,85,99,0.9)", padding: 10, background: "rgba(15,23,42,0.95)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, fontWeight: 900 }}>
                {r.issuerId} ← {shorten(r.holderAddress, 6)}
              </div>
              <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "monospace" }}>
                {new Date(r.createdAt).toLocaleString()}
              </div>
            </div>

            <div style={{ marginTop: 6, fontSize: 12, color: "#9ca3af" }}>
              claims: <span style={{ fontFamily: "monospace" }}>{JSON.stringify(r.claims)}</span>
            </div>

            <button onClick={() => issueFromRequest(r.id)} style={{ marginTop: 10, padding: "8px 12px", borderRadius: 999, border: "none", cursor: "pointer", background: "#3b82f6", color: "#e5e7eb", fontWeight: 900 }}>
              Issue VC
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
