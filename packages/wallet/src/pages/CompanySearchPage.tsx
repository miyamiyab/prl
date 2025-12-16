import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

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

function b64UrlToBytes(b64url: string): Uint8Array | null {
  try {
    const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    const bin = typeof atob === "function" ? atob(b64 + pad) : null;
    if (!bin) return null;
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {}
  return null;
}

function bytesToUtf8(bytes: Uint8Array): string | null {
  try {
    if (typeof TextDecoder !== "undefined") {
      return new TextDecoder().decode(bytes);
    }
    let s = "";
    bytes.forEach((b) => (s += String.fromCharCode(b)));
    return decodeURIComponent(escape(s));
  } catch {
    return null;
  }
}

export default function CompanySearchPage() {
  const { issuerId } = useParams();
  const nav = useNavigate();

  const [vcs, setVcs] = useState<PublishedVC[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [issuerOptions, setIssuerOptions] = useState<string[]>([]);
  const [selectedIssuer, setSelectedIssuer] = useState<string | null>(issuerId ?? null);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    // パスが変わったら選択状態と履歴をクリアして検索に戻る
    setSelectedIssuer(issuerId ?? null);
    if (!issuerId) {
      setVcs([]);
      setStatus(null);
    }
  }, [issuerId]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/issuers`);
        const data = await res.json();
        if (Array.isArray(data?.issuers)) {
          const ids = data.issuers.map((i: any) => i.issuerId).filter((v: string) => typeof v === "string");
          setIssuerOptions(ids);
          if (!selectedIssuer && issuerId && ids.includes(issuerId)) {
            setSelectedIssuer(issuerId);
          }
        }
      } catch (e: any) {
        setStatus(e?.message ?? "Issuer一覧取得に失敗しました");
      }
    })();
  }, [issuerId, selectedIssuer]);

  useEffect(() => {
    (async () => {
      if (!selectedIssuer) {
        setVcs([]);
        return;
      }
      try {
        setStatus("VC発行履歴を取得中…");
        const res = await fetch(`${API_BASE}/vcs?issuerId=${encodeURIComponent(selectedIssuer)}`);
        const data = await res.json();
        setVcs(Array.isArray(data?.vcs) ? data.vcs : []);
        setStatus(null);
      } catch (e: any) {
        setStatus(e?.message ?? "VC発行履歴の取得に失敗しました");
      }
    })();
  }, [selectedIssuer]);

  const { recent, past } = useMemo(() => {
    if (!selectedIssuer) return { recent: [], past: [] };
    const list = vcs
      .filter((v) => v.issuerId === selectedIssuer)
      .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());

    const now = Date.now();
    const oneMonth = 1000 * 60 * 60 * 24 * 30;
    const recentList = list.filter((v) => now - new Date(v.issuedAt).getTime() <= oneMonth).slice(0, 3);
    const pastList = list.filter((v) => now - new Date(v.issuedAt).getTime() > oneMonth);

    return { recent: recentList, past: pastList };
  }, [vcs]);

  if (!selectedIssuer) {
    const filtered = issuerOptions.filter((id) => id.toLowerCase().includes(keyword.toLowerCase()));
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ padding: 16, borderRadius: 16, border: "1px solid rgba(148,163,184,0.35)", background: "rgba(15,23,42,0.9)", display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 900 }}>企業検索</div>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="企業名で検索"
            style={{ padding: 10, borderRadius: 12, border: "1px solid #4b5563", background: "#020617", color: "#e5e7eb" }}
            list="issuer-search-suggestions"
          />
          <datalist id="issuer-search-suggestions">
            {filtered.map((id) => (
              <option key={id} value={id} />
            ))}
          </datalist>
          <button
            onClick={() => {
              if (keyword && filtered.includes(keyword)) {
                nav(`/holder/company/search/${encodeURIComponent(keyword)}`);
              }
            }}
            disabled={!keyword || !filtered.includes(keyword)}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(148,163,184,0.35)",
              background: keyword && filtered.includes(keyword) ? "rgba(37,99,235,0.35)" : "rgba(2,6,23,0.7)",
              color: "#e5e7eb",
              cursor: keyword && filtered.includes(keyword) ? "pointer" : "default",
              fontWeight: 700,
              width: "max-content",
            }}
          >
            選択した企業を表示
          </button>
          {filtered.length === 0 && <div style={{ fontSize: 12, color: "#9ca3af" }}>該当する企業がありません</div>}
        </div>
      </div>
    );
  }

  const company = {
    name: selectedIssuer,
    logoText: `${selectedIssuer} ロゴ`,
    tags: ["ブロックチェーン", "スキルタグ"],
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.4fr", gap: 16, alignItems: "start" }}>
      <div style={{ display: "grid", gap: 12 }}>
        <div
          style={{
            background: "#0b4f6c",
            color: "#e5e7eb",
            borderRadius: 8,
            minHeight: 180,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          {company.logoText}
        </div>
        <div style={{ fontSize: 18, fontWeight: 900 }}>{company.name}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {company.tags.map((t) => (
            <span
              key={t}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                background: "#0b4f6c",
                color: "#e5e7eb",
                fontSize: 12,
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        {status && (
          <div
            style={{
              padding: 10,
              borderRadius: 10,
              border: "1px solid rgba(148,163,184,0.35)",
              background: "rgba(15,23,42,0.9)",
              fontSize: 12,
            }}
          >
            {status}
          </div>
        )}

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 900 }}>最近のVC発行履歴</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {recent.length === 0 && <div style={{ fontSize: 12, color: "#9ca3af" }}>直近1ヶ月の発行はありません</div>}
          {recent.map((v) => (
            <div
              key={v.id}
              style={{
                background: "rgba(15,23,42,0.9)",
                color: "#e5e7eb",
                borderRadius: 16,
                padding: "16px 20px",
                minWidth: 260,
                minHeight: 60,
                display: "grid",
                gap: 6,
                alignItems: "center",
              }}
            >
              <VcSummaryCard vc={v} />
            </div>
          ))}
        </div>
      </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 900 }}>過去のVC発行履歴</div>
          <div
            style={{
              background: "rgba(15,23,42,0.9)",
              color: "#e5e7eb",
              borderRadius: 8,
              padding: "18px 20px",
              minHeight: 140,
              display: "flex",
              alignItems: "center",
            }}
          >
            {past.length === 0 ? (
              <div style={{ fontSize: 12, color: "#cbd5e1" }}>1ヶ月以上前の履歴はありません</div>
            ) : (
              <div style={{ display: "grid", gap: 8, width: "100%" }}>
                {past.slice(0, 5).map((v) => (
                  <VcSummaryCard key={v.id} vc={v} compact />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function decodeSummary(jwt: string) {
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
    return {
      issuerDid: payload.iss ?? vc.issuer,
      types,
      role: subject.proofContent ?? subject.role,
      period:
        subject.period ??
        (subject.periodAfter || subject.periodBefore ? `${subject.periodAfter ?? ""}〜${subject.periodBefore ?? ""}` : undefined),
    };
  } catch {
    return null;
  }
}

function VcSummaryCard({ vc, compact }: { vc: PublishedVC; compact?: boolean }) {
  const summary = decodeSummary(vc.vcJwt);
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", fontSize: 12 }}>
        <span>{new Date(vc.issuedAt).toLocaleDateString()}</span>
      </div>
      <div style={{ fontSize: 12, color: "#cbd5e1" }}>
        {summary?.role && <span>証明内容: {summary.role}</span>}
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
      <div style={{ fontSize: 11, fontFamily: "monospace", wordBreak: "break-all" }}>{shorten(vc.vcJwt, compact ? 60 : 90)}</div>
    </div>
  );
}
