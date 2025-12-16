import React, { useEffect, useMemo, useState } from "react";
import { useWallet } from "../wallet";

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

export default function HolderPendingPage() {
  const { walletAddr, status: walletStatus } = useWallet();
  const [status, setStatus] = useState<string | null>(null);
  const [requests, setRequests] = useState<IssueRequest[]>([]);

  async function load() {
    try {
      setStatus(null);
      const res = await fetch(`${API_BASE}/requests`);
      const data = await res.json();
      setRequests(Array.isArray(data?.requests) ? data.requests : []);
    } catch (e: any) {
      setStatus(e?.message ?? "発行依頼の取得に失敗しました");
    }
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const mine = useMemo(() => {
    if (!walletAddr) return [];
    const a = walletAddr.toLowerCase();
    return requests.filter((r) => r.status === "requested" && r.holderAddress.toLowerCase() === a);
  }, [requests, walletAddr]);

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 900, margin: "0 auto" }}>
      {(status || walletStatus) && (
        <div
          style={{
            padding: 10,
            borderRadius: 12,
            border: "1px solid rgba(148,163,184,0.35)",
            background: "rgba(15,23,42,0.9)",
            fontSize: 12,
          }}
        >
          {status ?? walletStatus}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>発行待ち一覧</div>
        <button
          onClick={load}
          style={{
            padding: "6px 10px",
            borderRadius: 10,
            border: "1px solid rgba(148,163,184,0.35)",
            background: "rgba(2,6,23,0.7)",
            color: "#e5e7eb",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          Refresh
        </button>
      </div>
      <div style={{ fontSize: 12, color: "#9ca3af" }}>
        自分宛ての発行依頼をステータス別に表示します。
      </div>

      {!walletAddr && <div style={{ fontSize: 13, color: "#9ca3af" }}>ウォレット未接続です（ヘッダから接続してください）。</div>}

      {walletAddr && (
        <>
          <Section title="Pending (requested)" items={mine} emptyMessage="発行待ちの依頼はありません" />
        </>
      )}
    </div>
  );
}

function Section({ title, items, emptyMessage }: { title: string; items: IssueRequest[]; emptyMessage: string }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ fontWeight: 800, fontSize: 13 }}>{title}</div>
      {items.length === 0 && <div style={{ fontSize: 12, color: "#9ca3af" }}>{emptyMessage}</div>}
      <div style={{ display: "grid", gap: 8 }}>
        {items.map((r) => (
          <div
            key={r.id}
            style={{
              borderRadius: 12,
              border: "1px solid rgba(75,85,99,0.9)",
              padding: 10,
              background: "rgba(15,23,42,0.95)",
              display: "grid",
              gap: 6,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, fontWeight: 900 }}>{r.issuerId}</div>
              <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "monospace" }}>
                {new Date(r.createdAt).toLocaleString()}
              </div>
            </div>
            <div style={{ fontSize: 12, color: "#cbd5e1" }}>
              holder: {shorten(r.holderAddress, 6)} / did: {shorten(r.holderDid, 12)}
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>claims: {JSON.stringify(r.claims)}</div>
            {r.status === "failed" && r.lastError && (
              <div style={{ fontSize: 12, color: "#f97316" }}>error: {r.lastError}</div>
            )}
            {r.resultVcJwt && (
              <div style={{ fontSize: 11, color: "#cbd5e1", fontFamily: "monospace", wordBreak: "break-all" }}>
                {shorten(r.resultVcJwt, 80)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
