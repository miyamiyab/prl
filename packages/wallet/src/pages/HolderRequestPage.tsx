import React, { useEffect, useState } from "react";
import { useWallet } from "../wallet";

const API_BASE = "http://localhost:3000";

function shorten(v: string, len = 6) {
  return v.length > len * 2 ? `${v.slice(0, len)}...${v.slice(-len)}` : v;
}

type Skill = { label: string; tag: string };
type ExperienceOrg = {
  org: string;
  periodAfter?: string;
  periodBefore?: string;
  achievements: { title: string; role: string; after?: string; before?: string }[];
};

export default function HolderRequestPage() {
  const [status, setStatus] = useState<string | null>(null);
  const { walletAddr, status: walletStatus } = useWallet();

  const [issuerOptions, setIssuerOptions] = useState<string[]>([]);
  const [holderName, setHolderName] = useState("Taro MetaMask");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [experiences, setExperiences] = useState<ExperienceOrg[]>([]);
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());
  const [issuedKeys, setIssuedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`http://localhost:3000/issuers`);
        const data = await res.json();
        if (Array.isArray(data?.issuers)) {
          setIssuerOptions(data.issuers.map((i: any) => i.issuerId).filter((v: string) => typeof v === "string"));
        }
      } catch {
        /* ignore */
      }
    })();

    if (!walletAddr) {
      setHolderName("Taro MetaMask");
      setSkills([]);
      setExperiences([]);
      setPendingKeys(new Set());
      setIssuedKeys(new Set());
      return;
    }
    try {
      const raw = localStorage.getItem(`profile:${walletAddr.toLowerCase()}`);
      if (raw) {
        const profile = JSON.parse(raw);
        if (profile?.englishName && typeof profile.englishName === "string" && profile.englishName.trim()) {
          setHolderName(profile.englishName.trim());
        }
        if (Array.isArray(profile?.skills)) {
          setSkills(
            profile.skills
              .map((s: any) => ({
                label: typeof s?.label === "string" ? s.label : "",
                tag: typeof s?.tag === "string" ? s.tag : "",
              }))
              .filter((s: Skill) => s.label || s.tag)
          );
        }
        if (Array.isArray(profile?.experiences)) {
          setExperiences(
            profile.experiences
              .map((e: any) => ({
                org: typeof e?.org === "string" ? e.org : "",
                periodAfter: typeof e?.periodAfter === "string" ? e.periodAfter : "",
                periodBefore: typeof e?.periodBefore === "string" ? e.periodBefore : "",
                achievements: Array.isArray(e?.achievements)
                  ? e.achievements
                      .map((a: any) => ({
                        title: typeof a?.title === "string" ? a.title : "",
                        role: typeof a?.role === "string" ? a.role : "",
                        after: typeof a?.after === "string" ? a.after : "",
                        before: typeof a?.before === "string" ? a.before : "",
                      }))
                      .filter((a: any) => a.title || a.role || a.after || a.before)
                  : [],
              }))
              .filter((e: ExperienceOrg) => e.org || e.periodAfter || e.periodBefore || e.achievements.length > 0)
          );
        }
      }
    } catch {
      // ignore
    }

    // 依頼・発行済みを取得
    (async () => {
      try {
        const resReq = await fetch(`${API_BASE}/requests?status=requested`);
        const dataReq = await resReq.json();
        const reqs: any[] = Array.isArray(dataReq?.requests) ? dataReq.requests : [];
        const pending = reqs.filter((r) => typeof r?.holderAddress === "string" && r.holderAddress.toLowerCase() === walletAddr.toLowerCase());

        const resVcs = await fetch(`${API_BASE}/vcs`);
        const dataVcs = await resVcs.json();
        const vcs: any[] = Array.isArray(dataVcs?.vcs) ? dataVcs.vcs : [];
        const issued = vcs.filter((v) => typeof v?.holderAddress === "string" && v.holderAddress.toLowerCase() === walletAddr.toLowerCase());

        const keyOf = (issuerId: string, proofContent: string, periodAfter?: string, periodBefore?: string, role?: string | null) =>
          [issuerId || "", proofContent || "", periodAfter || "", periodBefore || "", role || ""].join("|");

        setPendingKeys(new Set(pending.map((r) => keyOf(r.issuerId, r.claims?.proofContent, r.claims?.periodAfter, r.claims?.periodBefore, r.claims?.role))));
        setIssuedKeys(new Set(issued.map((v) => {
          try {
            const [, payloadB64] = String(v.vcJwt ?? "").split(".");
            if (!payloadB64) return keyOf(v.issuerId, "", "", "", "");
            const json = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
            const payload = JSON.parse(json);
            const vc = payload?.vc ?? {};
            const subject = vc?.credentialSubject ?? {};
            return keyOf(v.issuerId, subject.proofContent ?? subject.role ?? "", subject.periodAfter, subject.periodBefore, subject.role ?? "");
          } catch {
            return keyOf(v.issuerId, "", "", "", "");
          }
        })));
      } catch {
        // ignore
      }
    })();
  }, [walletAddr]);

  async function requestIssue(payload: {
    issuerId: string;
    proofContent: string;
    periodAfter?: string;
    periodBefore?: string;
    role?: string | null;
  }) {
    if (!walletAddr) {
      alert("ウォレット接続が必要です。");
      return;
    }
    if (!payload.issuerId) {
      setStatus("組織が指定されていません");
      return;
    }
    try {
      setStatus(`発行依頼を送信中… (${payload.issuerId})`);
      const res = await fetch(`${API_BASE}/request-issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holderAddress: walletAddr,
          issuerId: payload.issuerId,
          claims: {
            name: holderName,
            proofContent: payload.proofContent,
            role: payload.role ?? undefined,
            periodAfter: payload.periodAfter ?? "",
            periodBefore: payload.periodBefore ?? "",
            period:
              payload.periodAfter || payload.periodBefore
                ? `${payload.periodAfter ?? ""}〜${payload.periodBefore ?? ""}`
                : "",
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(`依頼失敗: ${data?.error ?? "unknown"}`);
        return;
      }
      setStatus("依頼を作成しました（Issuer 画面で発行してください）");
      // pending に追加
      const key = [payload.issuerId || "", payload.proofContent || "", payload.periodAfter || "", payload.periodBefore || "", payload.role || ""].join("|");
      setPendingKeys((prev) => new Set([...Array.from(prev), key]));
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

          <div style={{ fontSize: 12, marginBottom: 6 }}>name（英字表記を使用）</div>
          <input value={holderName} readOnly style={{ width: "100%", padding: 8, borderRadius: 12, border: "1px solid #4b5563", background: "#020617", color: "#e5e7eb", marginBottom: 10 }} />

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 900 }}>Skills から発行依頼</div>
            {skills.length === 0 && <div style={{ fontSize: 12, color: "#9ca3af" }}>プロフィールにスキルがありません</div>}
            {skills.map((s) => (
              <div
                key={`${s.label}-${s.tag}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(148,163,184,0.35)",
                  background: "rgba(2,6,23,0.6)",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700 }}>{s.label}</div>
                <div style={{ marginLeft: "auto" }} />
                <button
                  onClick={() =>
                    requestIssue({
                      issuerId: s.tag,
                      proofContent: s.label,
                      periodAfter: "",
                      periodBefore: "",
                      role: null,
                    })
                  }
                  disabled={
                    !walletAddr ||
                    !s.tag ||
                    !issuerOptions.includes(s.tag) ||
                    pendingKeys.has([s.tag || "", s.label || "", "", "", ""].join("|")) ||
                    issuedKeys.has([s.tag || "", s.label || "", "", "", ""].join("|"))
                  }
                  style={{
                    padding: "6px 10px",
                    borderRadius: 10,
                    border: "none",
                    background: issuedKeys.has([s.tag || "", s.label || "", "", "", ""].join("|"))
                      ? "#0ea5e9"
                      : pendingKeys.has([s.tag || "", s.label || "", "", "", ""].join("|"))
                      ? "#f59e0b"
                      : walletAddr && s.tag && issuerOptions.includes(s.tag)
                      ? "#3b82f6"
                      : "#4b5563",
                    color: "#e5e7eb",
                    fontWeight: 800,
                    cursor:
                      walletAddr && s.tag && issuerOptions.includes(s.tag) && !pendingKeys.has([s.tag || "", s.label || "", "", "", ""].join("|")) && !issuedKeys.has([s.tag || "", s.label || "", "", "", ""].join("|"))
                        ? "pointer"
                        : "default",
                    fontSize: 12,
                  }}
                >
                  {issuedKeys.has([s.tag || "", s.label || "", "", "", ""].join("|"))
                    ? "発行済み"
                    : pendingKeys.has([s.tag || "", s.label || "", "", "", ""].join("|"))
                    ? "依頼済み"
                    : "発行依頼"}
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <div style={{ fontWeight: 900 }}>Experiences から発行依頼</div>
            {experiences.length === 0 && <div style={{ fontSize: 12, color: "#9ca3af" }}>プロフィールに経歴がありません</div>}
            {experiences.map((exp) => {
              const issuerId = exp.org;
              const orgEnabled = walletAddr && issuerId && issuerOptions.includes(issuerId);
              const orgKey = [issuerId || "", exp.org || "", exp.periodAfter || "", exp.periodBefore || "", ""].join("|");
              return (
                <div
                  key={exp.org + exp.periodAfter + exp.periodBefore}
                  style={{
                    border: "1px solid rgba(148,163,184,0.35)",
                    borderRadius: 12,
                    padding: 12,
                    display: "grid",
                    gap: 8,
                    background: "rgba(2,6,23,0.6)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontWeight: 800 }}>{exp.org || "組織未設定"}</div>
                    <div style={{ fontSize: 12, color: "#cbd5e1" }}>
                      {(exp.periodAfter ?? "") || (exp.periodBefore ?? "")
                        ? `${exp.periodAfter ?? ""}〜${exp.periodBefore ?? ""}`
                        : ""}
                    </div>
                    <button
                      onClick={() =>
                        requestIssue({
                          issuerId,
                          proofContent: `${exp.org || "在籍"}`,
                          periodAfter: exp.periodAfter,
                          periodBefore: exp.periodBefore,
                          role: null,
                        })
                      }
                      disabled={!orgEnabled || pendingKeys.has(orgKey) || issuedKeys.has(orgKey)}
                      style={{
                        marginLeft: "auto",
                        padding: "6px 10px",
                        borderRadius: 10,
                        border: "none",
                        background: issuedKeys.has(orgKey)
                          ? "#0ea5e9"
                          : pendingKeys.has(orgKey)
                          ? "#f59e0b"
                          : orgEnabled
                          ? "#10b981"
                          : "#4b5563",
                        color: orgEnabled ? "#0b1220" : "#e5e7eb",
                        fontWeight: 800,
                        cursor: orgEnabled && !pendingKeys.has(orgKey) && !issuedKeys.has(orgKey) ? "pointer" : "default",
                        fontSize: 12,
                      }}
                    >
                      {issuedKeys.has(orgKey) ? "発行済み" : pendingKeys.has(orgKey) ? "依頼済み" : "在籍証明発行"}
                    </button>
                  </div>

                  <div style={{ display: "grid", gap: 8, paddingLeft: 8 }}>
                    {exp.achievements.map((a, idx) => {
                      const achKey = [issuerId || "", a.title || "", a.after || "", a.before || "", a.role || ""].join("|");
                      const achEnabled = orgEnabled;
                      return (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            border: "1px dashed rgba(148,163,184,0.35)",
                            borderRadius: 10,
                            padding: 10,
                            background: "rgba(15,23,42,0.7)",
                          }}
                        >
                          <div style={{ fontSize: 12, color: "#cbd5e1", width: 140 }}>
                            {(a.after ?? "") || (a.before ?? "") ? `${a.after ?? ""}〜${a.before ?? ""}` : ""}
                          </div>
                          <div style={{ fontWeight: 700, flex: 1 }}>{a.title || "実績未入力"}</div>
                          {a.role && (
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: 999,
                                border: "1px solid rgba(148,163,184,0.6)",
                                color: "#e2e8f0",
                                fontSize: 11,
                              }}
                            >
                              {a.role}
                            </span>
                          )}
                          <button
                            onClick={() =>
                              requestIssue({
                                issuerId,
                                proofContent: a.title || "実績",
                                periodAfter: a.after,
                                periodBefore: a.before,
                                role: a.role ?? null,
                              })
                            }
                            disabled={!achEnabled || pendingKeys.has(achKey) || issuedKeys.has(achKey)}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 10,
                              border: "none",
                              background: issuedKeys.has(achKey)
                                ? "#0ea5e9"
                                : pendingKeys.has(achKey)
                                ? "#f59e0b"
                                : achEnabled
                                ? "#3b82f6"
                                : "#4b5563",
                              color: "#e5e7eb",
                              fontWeight: 800,
                              cursor: achEnabled && !pendingKeys.has(achKey) && !issuedKeys.has(achKey) ? "pointer" : "default",
                              fontSize: 12,
                            }}
                          >
                            {issuedKeys.has(achKey) ? "発行済み" : pendingKeys.has(achKey) ? "依頼済み" : "実績証明発行"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {!walletAddr && <div style={{ marginTop: 8, fontSize: 12, color: "#f97316" }}>ウォレット接続が必要です</div>}
        </div>
      </div>
    </div>
  );
}
