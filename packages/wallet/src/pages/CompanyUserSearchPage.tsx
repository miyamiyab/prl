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
    if (typeof TextDecoder !== "undefined") return new TextDecoder().decode(bytes);
    let s = "";
    bytes.forEach((b) => (s += String.fromCharCode(b)));
    return decodeURIComponent(escape(s));
  } catch {
    return null;
  }
}

function shorten(v: string, len = 6) {
  return v.length > len * 2 ? `${v.slice(0, len)}...${v.slice(-len)}` : v;
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
      name: subject.name,
      issuerId: vc.issuer ?? payload.iss,
      role: subject.proofContent ?? subject.role,
      period:
        subject.period ??
        (subject.periodAfter || subject.periodBefore ? `${subject.periodAfter ?? ""}〜${subject.periodBefore ?? ""}` : undefined),
    };
  } catch {
    return null;
  }
}

function VcCard({ vc }: { vc: PublishedVC }) {
  const summary = decodeSummary(vc.vcJwt);
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 12,
        border: "1px solid rgba(148,163,184,0.35)",
        background: "rgba(15,23,42,0.9)",
        display: "grid",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
        <span>Issuer: {summary?.issuerId ?? vc.issuerId}</span>
        <span>{new Date(vc.issuedAt).toLocaleDateString()}</span>
      </div>
      <div style={{ fontSize: 12, color: "#cbd5e1" }}>
        {summary?.role && <span>証明内容: {summary.role}</span>}
        {summary?.period && <span style={{ marginLeft: 6 }}>期間: {summary.period}</span>}
      </div>
      <div style={{ fontSize: 11, fontFamily: "monospace", wordBreak: "break-all" }}>{shorten(vc.vcJwt, 80)}</div>
    </div>
  );
}

export default function CompanyUserSearchPage() {
  const { holderAddress } = useParams();
  const nav = useNavigate();
  const [vcs, setVcs] = useState<PublishedVC[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [selectedHolder, setSelectedHolder] = useState<string | null>(holderAddress ?? null);
  const [holderNameMap, setHolderNameMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    setSelectedHolder(holderAddress ?? null);
    if (!holderAddress) setStatus(null);
  }, [holderAddress]);

  useEffect(() => {
    (async () => {
      try {
        setStatus("VC一覧を取得中…");
        const res = await fetch(`${API_BASE}/vcs`);
        const data = await res.json();
        setVcs(Array.isArray(data?.vcs) ? data.vcs : []);
        setStatus(null);
      } catch (e: any) {
        setStatus(e?.message ?? "VC取得に失敗しました");
      }
    })();
  }, []);

  const holders = useMemo(() => {
    const map = new Map<string, { address: string; count: number; lastIssuedAt: number; name?: string }>();
    const nameMap = new Map<string, string>();
    vcs.forEach((v) => {
      const addr = v.holderAddress.toLowerCase();
      const t = new Date(v.issuedAt).getTime();
      const summary = decodeSummary(v.vcJwt);
      if (!map.has(addr)) map.set(addr, { address: v.holderAddress, count: 0, lastIssuedAt: 0, name: summary?.name });
      const cur = map.get(addr)!;
      cur.count += 1;
      cur.lastIssuedAt = Math.max(cur.lastIssuedAt, t);
      if (summary?.name) {
        cur.name = summary.name;
        nameMap.set(addr, summary.name);
      }
    });
    setHolderNameMap(nameMap);
    return Array.from(map.values()).sort((a, b) => b.lastIssuedAt - a.lastIssuedAt);
  }, [vcs]);

  const holdersWithDisplay = useMemo(
    () =>
      holders.map((h, idx) => ({
        ...h,
        displayName: h.name ? h.name : `ユーザー${idx + 1}`,
      })),
    [holders]
  );

  const nameToAddress = useMemo(() => {
    const m = new Map<string, string>();
    holdersWithDisplay.forEach((h) => m.set(h.displayName, h.address));
    return m;
  }, [holdersWithDisplay]);

  const filteredHolders = holdersWithDisplay.filter((h) => {
    const kw = keyword.toLowerCase();
    return h.displayName.toLowerCase().includes(kw) || h.address.toLowerCase().includes(kw);
  });
  const selectedVcs = selectedHolder
    ? vcs
        .filter((v) => typeof v.holderAddress === "string" && v.holderAddress.toLowerCase() === selectedHolder.toLowerCase())
        .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
    : [];

  const { recent, past } = useMemo(() => {
    const now = Date.now();
    const oneMonth = 1000 * 60 * 60 * 24 * 30;
    const recentList = selectedVcs.filter((v) => now - new Date(v.issuedAt).getTime() <= oneMonth).slice(0, 3);
    const pastList = selectedVcs.filter((v) => now - new Date(v.issuedAt).getTime() > oneMonth);
    return { recent: recentList, past: pastList };
  }, [selectedVcs]);

  const selectedName = useMemo(() => {
    if (!selectedHolder) return "";
    const addr = selectedHolder.toLowerCase();
    const byName = holderNameMap.get(addr);
    if (byName) return byName;
    const byDisplay = holdersWithDisplay.find((h) => h.address.toLowerCase() === addr)?.displayName;
    return byDisplay ?? "";
  }, [holderNameMap, holdersWithDisplay, selectedHolder]);

  if (!selectedHolder) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ padding: 16, borderRadius: 16, border: "1px solid rgba(148,163,184,0.35)", background: "rgba(15,23,42,0.9)", display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 900 }}>ユーザー検索</div>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="ユーザー名で検索"
            style={{ padding: 10, borderRadius: 12, border: "1px solid #4b5563", background: "#020617", color: "#e5e7eb" }}
            list="holder-suggestions"
          />
          <datalist id="holder-suggestions">
            {filteredHolders.map((h) => (
              <option key={h.address} value={h.displayName} />
            ))}
          </datalist>
          <button
            onClick={() => {
              if (keyword) {
                const addr = nameToAddress.get(keyword) ?? filteredHolders.find((h) => h.displayName === keyword)?.address;
                if (addr) nav(`/company/user/search/${encodeURIComponent(addr)}`);
              }
            }}
            disabled={!keyword || (!nameToAddress.get(keyword) && filteredHolders.length === 0)}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(148,163,184,0.35)",
              background: keyword && (nameToAddress.get(keyword) || filteredHolders.length > 0) ? "rgba(37,99,235,0.35)" : "rgba(2,6,23,0.7)",
              color: "#e5e7eb",
              cursor: keyword && (nameToAddress.get(keyword) || filteredHolders.length > 0) ? "pointer" : "default",
              fontWeight: 700,
              width: "max-content",
            }}
          >
            選択したユーザーを表示
          </button>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>候補を入力するとリストから選べます（IDは表示しません）</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.4fr", gap: 16, alignItems: "start" }}>
      <div style={{ display: "grid", gap: 12 }}>
        <div
          style={{
            background: "#0b4f6c",
            color: "#e5e7eb",
            borderRadius: 8,
            minHeight: 120,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 14,
            padding: 12,
          }}
        >
          <div style={{ fontWeight: 800 }}>{selectedName || "名前未取得"}</div>
        </div>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>VC件数: {selectedVcs.length}</div>
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
          <div style={{ fontWeight: 900 }}>最近のVC獲得履歴</div>
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
                <VcCard vc={v} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 900 }}>過去のVC獲得履歴</div>
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
                {past.slice(0, 10).map((v) => (
                  <VcCard key={v.id} vc={v} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
