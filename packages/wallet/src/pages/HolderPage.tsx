import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../wallet";

const API_BASE = "http://localhost:3000";

type Profile = {
  name: string;
  englishName: string;
  age: number | string;
  title: string;
  company: string;
  visibility: string;
  skills: { label: string; tag: string }[];
  experiences: {
    org: string;
    periodAfter?: string;
    periodBefore?: string;
    achievements: { title: string; role: string; after?: string; before?: string }[];
  }[];
};

const defaultProfile: Profile = {
  name: "山田 太郎",
  englishName: "Taro Yamada",
  age: 36,
  title: "Web3開発者",
  company: "ブロックチェーン講座株式会社",
  visibility: "公開職歴冊",
  skills: [
    { label: "Solidity開発者", tag: "A社" },
    { label: "会計システム開発PM", tag: "B社" },
  ],
  experiences: [
    {
      org: "ブロックチェーン大学",
      periodAfter: "2010",
      periodBefore: "2014",
      achievements: [
        { after: "2012", before: "2013", title: "クリプトゼミ", role: "受講/研究" },
        { after: "2013", before: "2014", title: "NFTゼミ", role: "受講/研究" },
      ],
    },
    {
      org: "イーサリアム株式会社",
      periodAfter: "2014",
      periodBefore: "2019",
      achievements: [
        { after: "2014", before: "2017", title: "●●プロジェクト", role: "エンジニア" },
        { after: "2017", before: "2019", title: "経理部門", role: "PM" },
      ],
    },
    {
      org: "ブロックチェーン講座(株)",
      periodAfter: "2019",
      achievements: [
        { after: "2019", before: "2021", title: "●●プロジェクト", role: "講師/PM" },
        { after: "2021", before: "", title: "経理部門", role: "マネージャー" },
      ],
    },
  ],
};

const profilesByAddress: Record<string, Profile> = {
  "0x70997970c51812dc3a010c7d01b50e0d17dc79c8": defaultProfile,
  "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266": {
    ...defaultProfile,
    name: "佐藤 花子",
    englishName: "Hanako Sato",
    age: 34,
    title: "ブロックチェーンPM",
    skills: [
      { label: "プロジェクト管理", tag: "C社" },
      { label: "会計要件定義", tag: "D社" },
    ],
  },
};

function shorten(v: string, len = 6) {
  return v.length > len * 2 ? `${v.slice(0, len)}...${v.slice(-len)}` : v;
}

function ProfileCard({
  profile,
  walletAddr,
  found,
  onEdit,
  issuedProofs,
}: {
  profile: Profile;
  walletAddr: string | null;
  found: boolean;
  onEdit?: () => void;
  issuedProofs: Set<string>;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 14,
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(148,163,184,0.35)",
        background: "#0b1220",
        position: "relative",
      }}
    >
      {onEdit && (
        <button
          onClick={onEdit}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            padding: "6px 12px",
            borderRadius: 10,
            border: "1px solid rgba(148,163,184,0.35)",
            background: "rgba(2,6,23,0.7)",
            color: "#e5e7eb",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          編集する
        </button>
      )}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div
          style={{
            width: 68,
            height: 68,
            borderRadius: "50%",
            border: "1px solid rgba(148,163,184,0.5)",
            background: "linear-gradient(145deg, #1f2937, #111827)",
            flexShrink: 0,
          }}
        />
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>
            {profile.name}（{profile.age}歳）
          </div>
          <div style={{ fontSize: 12, color: "#cbd5e1" }}>{profile.englishName}</div>
          <div style={{ fontSize: 13, color: "#cbd5e1" }}>{profile.title}</div>
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: "18px" }}>
            {profile.company}
            <br />
            {profile.visibility}
          </div>
          {walletAddr && (
            <div style={{ fontSize: 11, color: found ? "#34d399" : "#f97316", marginTop: 4 }}>
              {found ? "プロフィールを読み込みました" : "プロフィール未登録のためデフォルトを表示中"}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>Skills</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {profile.skills.map((s) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
              <span style={{ fontSize: 16 }}>⭐</span>
              <span>{s.label}</span>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                {issuedProofs.has(s.label) && (
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: "rgba(16,185,129,0.2)",
                      color: "#34d399",
                      fontSize: 11,
                      border: "1px solid rgba(16,185,129,0.4)",
                    }}
                  >
                    VC発行済み
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ gridColumn: "1 / -1", display: "grid", gap: 8 }}>
        <div style={{ fontWeight: 900 }}>Experiences</div>
        <div style={{ display: "grid", gap: 12 }}>
          {profile.experiences.map((exp) => (
            <div key={exp.org} style={{ display: "grid", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                <span style={{ color: "#cbd5e1", width: 120 }}>
                  {exp.periodAfter ?? ""}〜{exp.periodBefore ?? ""}
                </span>
                <span style={{ fontWeight: 700 }}>{exp.org}</span>
                {issuedProofs.has(exp.org) && (
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: "rgba(16,185,129,0.2)",
                      color: "#34d399",
                      fontSize: 11,
                      border: "1px solid rgba(16,185,129,0.4)",
                      marginLeft: 6,
                    }}
                  >
                    VC発行済み
                  </span>
                )}
              </div>
              <div style={{ display: "grid", gap: 4, paddingLeft: 18 }}>
                {exp.achievements.map((ach) => (
                  <div key={ach.title + ach.role} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#cbd5e1" }}>
                    <span style={{ width: 120 }}>
                      {ach.after ?? ""}〜{ach.before ?? ""}
                    </span>
                    <span>{ach.title}</span>
                    {ach.role && (
                      <span
                        style={{
                          marginLeft: "auto",
                          padding: "2px 8px",
                          borderRadius: 999,
                          border: "1px solid rgba(148,163,184,0.6)",
                          color: "#e2e8f0",
                          fontSize: 11,
                        }}
                      >
                        {ach.role}
                      </span>
                    )}
                    {issuedProofs.has(ach.title) && (
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: "rgba(16,185,129,0.2)",
                          color: "#34d399",
                          fontSize: 11,
                          border: "1px solid rgba(16,185,129,0.4)",
                          marginLeft: 6,
                        }}
                      >
                        VC発行済み
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function normalizeProfile(raw: any): Profile | null {
  try {
    if (!raw || typeof raw !== "object") return null;
    // skills: allow array or newline-separated string ("label @tag")
    let skills: { label: string; tag: string }[] = [];
    let hadSkills = false;
    if (Array.isArray(raw.skills)) {
      hadSkills = true;
      skills = raw.skills.map((s: any) => ({
        label: typeof s?.label === "string" ? s.label : String(s ?? ""),
        tag: typeof s?.tag === "string" ? s.tag : "",
      }));
    } else if (typeof raw.skills === "string") {
      hadSkills = true;
      skills = raw.skills
        .split("\n")
        .map((line: string) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
          const [label, tag] = line.split("@");
          return { label: label.trim(), tag: tag ? tag.trim() : "" };
        });
    }

    // experiences: structured org/achievements blocks
    let experiences: Profile["experiences"] = [];
    let hadExperiences = false;
    if (Array.isArray(raw.experiences)) {
      hadExperiences = true;
      experiences = raw.experiences
        .map((e: any) => ({
          org: typeof e?.org === "string" ? e.org : "",
          periodAfter: typeof e?.periodAfter === "string" ? e.periodAfter : "",
          periodBefore: typeof e?.periodBefore === "string" ? e.periodBefore : "",
          achievements: Array.isArray(e?.achievements)
            ? e.achievements
                .map((a: any) => ({
                  after: typeof a?.after === "string" ? a.after : "",
                  before: typeof a?.before === "string" ? a.before : "",
                  title: typeof a?.title === "string" ? a.title : "",
                  role: typeof a?.role === "string" ? a.role : "",
                }))
                .filter((a: any) => a.after || a.before || a.title || a.role)
            : [],
        }))
        .filter((e) => e.org || e.periodAfter || e.periodBefore || e.achievements.length > 0);
    } else if (typeof raw.experiences === "string") {
      hadExperiences = true;
      const lines = raw.experiences
        .split("\n")
        .map((line: string) => line.trim())
        .filter((line) => line.length > 0);
      if (lines.length > 0) {
        experiences = [
          {
            org: "",
            achievements: lines.map((line) => ({ title: line, role: "" })),
          },
        ];
      }
    }

    return {
      name: typeof raw.name === "string" ? raw.name : defaultProfile.name,
      englishName: typeof raw.englishName === "string" ? raw.englishName : defaultProfile.englishName,
      age: typeof raw.age === "number" || typeof raw.age === "string" ? raw.age : defaultProfile.age,
      title: typeof raw.title === "string" ? raw.title : defaultProfile.title,
      company: typeof raw.company === "string" ? raw.company : defaultProfile.company,
      visibility: typeof raw.visibility === "string" ? raw.visibility : defaultProfile.visibility,
      skills: hadSkills ? skills : defaultProfile.skills,
      experiences: hadExperiences ? experiences : defaultProfile.experiences,
    };
  } catch {
    return null;
  }
}

export default function HolderPage() {
  const { walletAddr } = useWallet();
  const nav = useNavigate();
  const [storedProfile, setStoredProfile] = React.useState<Profile | null>(null);
  const [vcs, setVcs] = useState<
    { id: string; issuedAt: string; issuerId: string; holderAddress: string; vcJwt: string }[]
  >([]);
  const [recentMsg, setRecentMsg] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [editingTags, setEditingTags] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [savedTags, setSavedTags] = useState<string[]>([]);
  const [editSnapshot, setEditSnapshot] = useState<string[]>([]);

  useEffect(() => {
    if (!walletAddr) {
      setVcs([]);
      setRecentMsg(null);
      setTags([]);
      setSavedTags([]);
      setEditingTags(false);
      setEditSnapshot([]);
      return;
    }
    (async () => {
      try {
        setRecentMsg(null);
        const res = await fetch(`${API_BASE}/vcs`);
        const data = await res.json();
        const list = Array.isArray(data?.vcs) ? data.vcs : [];
        setVcs(list);
      } catch (e: any) {
        setRecentMsg(e?.message ?? "VC取得に失敗しました");
      }
    })();

    try {
      const raw = localStorage.getItem(`holder-tags:${walletAddr.toLowerCase()}`);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          const parsed = arr.map((x) => String(x));
          setTags(parsed);
          setSavedTags(parsed);
          setEditSnapshot(parsed);
        } else {
          setTags([]);
          setSavedTags([]);
          setEditSnapshot([]);
        }
      } else {
        setTags([]);
        setSavedTags([]);
        setEditSnapshot([]);
      }
      setEditingTags(false);
      setTagInput("");
    } catch {
      setTags([]);
      setSavedTags([]);
      setEditSnapshot([]);
      setEditingTags(false);
      setTagInput("");
    }
  }, [walletAddr]);

  React.useEffect(() => {
    if (!walletAddr) {
      setStoredProfile(null);
      return;
    }
    try {
      const raw = localStorage.getItem(`profile:${walletAddr.toLowerCase()}`);
      if (raw) {
        const parsed = normalizeProfile(JSON.parse(raw));
        setStoredProfile(parsed);
      } else {
        setStoredProfile(null);
      }
    } catch {
      setStoredProfile(null);
    }
  }, [walletAddr]);

  const { profile, found } = useMemo(() => {
    if (!walletAddr) return { profile: defaultProfile, found: false };
    if (storedProfile) return { profile: storedProfile, found: true };
    const p = profilesByAddress[walletAddr.toLowerCase()];
    return { profile: p ?? defaultProfile, found: !!p };
  }, [walletAddr, storedProfile]);

  const recent = useMemo(() => {
    if (!walletAddr) return [];
    const a = walletAddr.toLowerCase();
    return vcs
      .filter((v) => typeof v.holderAddress === "string" && v.holderAddress.toLowerCase() === a)
      .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
      .slice(0, 3);
  }, [vcs, walletAddr]);

function decodeClaims(jwt: string) {
  try {
    const [, payloadB64] = jwt.split(".");
    if (!payloadB64) return null;
    const b64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    const bin = typeof atob === "function" ? atob(b64 + pad) : null;
    if (!bin) return null;
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const json =
      typeof TextDecoder !== "undefined"
        ? new TextDecoder().decode(bytes)
        : decodeURIComponent(
            bytes.reduce((s, b) => s + "%" + ("00" + b.toString(16)).slice(-2), "")
          );
    const payload = JSON.parse(json);
    const vc = payload?.vc ?? {};
    const subject = vc?.credentialSubject ?? {};
    return {
      period: subject.period,
      periodAfter: subject.periodAfter,
      periodBefore: subject.periodBefore,
      proofContent: subject.proofContent ?? subject.role,
      issuer: vc.issuer ?? payload.iss ?? "",
    };
  } catch {
    return null;
  }
}

  const vcExperiences = useMemo(() => {
    if (!walletAddr) return [];
    const a = walletAddr.toLowerCase();
    return vcs
      .filter((v) => typeof v.holderAddress === "string" && v.holderAddress.toLowerCase() === a)
      .map((v) => {
        const dec = decodeClaims(v.vcJwt);
        const period =
          dec?.period ??
          (dec?.periodAfter || dec?.periodBefore ? `${dec?.periodAfter ?? ""}〜${dec?.periodBefore ?? ""}` : "");
        return {
          id: v.id,
          issuedAt: v.issuedAt,
          issuerId: dec?.issuer ?? v.issuerId,
          period,
          proofContent: dec?.proofContent ?? "",
          vcJwt: v.vcJwt,
        };
      })
      .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
  }, [vcs, walletAddr]);

  const issuedProofs = useMemo(() => {
    const set = new Set<string>();
    vcExperiences.forEach((e) => {
      if (e.proofContent) set.add(e.proofContent);
    });
    return set;
  }, [vcExperiences]);

  function addTagFromInput() {
    const t = tagInput.trim();
    if (!t) return;
    if (tags.includes(t)) {
      setTagInput("");
      return;
    }
    setTags((prev) => [...prev, t]);
    setTagInput("");
  }

  function saveTags() {
    if (!walletAddr) return;
    localStorage.setItem(`holder-tags:${walletAddr.toLowerCase()}`, JSON.stringify(tags));
    setSavedTags(tags);
    setEditSnapshot(tags);
    setEditingTags(false);
  }

  function cancelTags() {
    setTags(editSnapshot);
    setTagInput("");
    setEditingTags(false);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
      {!walletAddr && (
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            border: "1px solid rgba(148,163,184,0.35)",
            background: "rgba(15,23,42,0.9)",
            fontSize: 13,
            color: "#cbd5e1",
          }}
        >
          ウォレットを接続するとプロフィールが表示されます（ヘッダの Connect から接続してください）。
        </div>
      )}

      {walletAddr && (
        <>
          <ProfileCard profile={profile} walletAddr={walletAddr} found={found} onEdit={() => nav("/holder/profile")} issuedProofs={issuedProofs} />

          <div
            style={{
              padding: 16,
              borderRadius: 16,
              border: "1px solid rgba(148,163,184,0.35)",
              background: "rgba(15,23,42,0.9)",
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
              <div style={{ fontWeight: 900 }}>タグ</div>
              {!editingTags && (
                <button
                  onClick={() => {
                    setEditSnapshot(tags);
                    setEditingTags(true);
                  }}
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
                  編集
                </button>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {tags.length === 0 && <div style={{ fontSize: 12, color: "#9ca3af" }}>タグがありません</div>}
              {tags.map((t) => (
                <div
                  key={t}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(96,165,250,0.6)",
                    background: "rgba(37,99,235,0.1)",
                    color: "#bfdbfe",
                    fontSize: 12,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    position: "relative",
                  }}
                >
                  <span>{t}</span>
                  {editingTags && (
                    <button
                      onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                      aria-label="delete tag"
                      style={{
                        padding: "0 6px",
                        borderRadius: 8,
                        border: "none",
                        background: "rgba(148,163,184,0.25)",
                        color: "#e5e7eb",
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            {editingTags && (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontSize: 12, color: "#9ca3af" }}>Enter でタグ追加。保存で確定、キャンセルで元に戻ります。</div>
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTagFromInput();
                    }
                  }}
                  style={{ padding: 8, borderRadius: 10, border: "1px solid #4b5563", background: "#020617", color: "#e5e7eb" }}
                  placeholder="例: Solidity, PM, Accounting"
                />
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => {
                      addTagFromInput();
                      saveTags();
                    }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "none",
                      background: "#3b82f6",
                      color: "#e5e7eb",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    保存
                  </button>
                  <button
                    onClick={cancelTags}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid rgba(148,163,184,0.35)",
                      background: "rgba(2,6,23,0.7)",
                      color: "#e5e7eb",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 16,
              border: "1px solid rgba(148,163,184,0.35)",
              background: "rgba(15,23,42,0.9)",
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 900 }}>最近のVC獲得履歴</div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>自分宛てに発行されたVCを新しい順に3件まで表示します。</div>
            {recentMsg && <div style={{ fontSize: 12, color: "#f97316" }}>{recentMsg}</div>}
            {recent.length === 0 && !recentMsg && (
              <div style={{ fontSize: 13, color: "#9ca3af" }}>まだ履歴がありません。</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recent.map((v) => (
                <div
                  key={v.id}
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(75,85,99,0.9)",
                    padding: 10,
                    background: "rgba(15,23,42,0.95)",
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 900 }}>{v.issuerId}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "monospace" }}>
                      {new Date(v.issuedAt).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "#cbd5e1", fontFamily: "monospace", wordBreak: "break-all" }}>
                    {shorten(v.vcJwt, 80)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 16,
              border: "1px solid rgba(148,163,184,0.35)",
              background: "rgba(15,23,42,0.9)",
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 900 }}>VC証明による経歴</div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>発行組織・期間・証明内容をVCから抽出して表示します。</div>
            {vcExperiences.length === 0 && <div style={{ fontSize: 13, color: "#9ca3af" }}>VCベースの経歴がありません。</div>}
            <div style={{ display: "grid", gap: 10 }}>
              {vcExperiences.slice(0, 5).map((e) => (
                <div
                  key={e.id}
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(75,85,99,0.9)",
                    padding: 10,
                    background: "rgba(15,23,42,0.95)",
                    display: "grid",
                    gap: 4,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 13, fontWeight: 900 }}>{e.issuerId}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>{new Date(e.issuedAt).toLocaleDateString()}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "#cbd5e1" }}>
                    {e.period && <span>期間: {e.period}</span>}
                    {e.proofContent && <span style={{ marginLeft: 6 }}>証明内容: {e.proofContent}</span>}
                  </div>
                  <div style={{ fontSize: 11, fontFamily: "monospace", wordBreak: "break-all" }}>{shorten(e.vcJwt, 80)}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
