import React, { useEffect, useMemo, useState } from "react";
import { useWallet } from "../wallet";

type ExperienceOrg = {
  org: string;
  periodAfter?: string;
  periodBefore?: string;
  achievements: {
    title: string;
    role: string;
    after?: string;
    before?: string;
  }[];
};

type Skill = {
  label: string;
  tag: string;
};

type Profile = {
  name: string;
  englishName: string;
  age: string;
  title: string;
  company: string;
  visibility: string;
  skills: Skill[];
  experiences: ExperienceOrg[];
};

const EMPTY_PROFILE: Profile = {
  name: "",
  englishName: "",
  age: "",
  title: "",
  company: "",
  visibility: "",
  skills: [],
  experiences: [],
};

const DEFAULT_PROFILE: Profile = {
  name: "山田 太郎",
  englishName: "Taro Yamada",
  age: "36",
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
        { title: "クリプトゼミ", role: "受講/研究", after: "2012", before: "2013" },
        { title: "NFTゼミ", role: "受講/研究", after: "2013", before: "2014" },
      ],
    },
    {
      org: "イーサリアム株式会社",
      periodAfter: "2014",
      periodBefore: "2019",
      achievements: [
        { title: "●●プロジェクト", role: "エンジニア", after: "2014", before: "2017" },
        { title: "経理部門", role: "PM", after: "2017", before: "2019" },
      ],
    },
  ],
};

const ADDRESS_PRESETS: Record<string, Profile> = {
  "0x70997970c51812dc3a010c7d01b50e0d17dc79c8": DEFAULT_PROFILE,
  "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266": {
    ...DEFAULT_PROFILE,
    name: "佐藤 花子",
    englishName: "Hanako Sato",
    age: "34",
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

export default function HolderProfilePage() {
  const { walletAddr } = useWallet();
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [status, setStatus] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastFadeOut, setToastFadeOut] = useState(false);

  const storageKey = useMemo(() => (walletAddr ? `profile:${walletAddr.toLowerCase()}` : null), [walletAddr]);

  function normalizeExperiences(raw: any): ExperienceOrg[] {
    if (Array.isArray(raw)) {
      return raw
        .map((e) => ({
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
        .filter((e) => e.org || e.periodAfter || e.periodBefore || e.achievements.length > 0);
    }
    if (typeof raw === "string") {
      const lines = raw
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      if (lines.length === 0) return [];
      return [
        {
          org: "",
          periodAfter: "",
          periodBefore: "",
          achievements: lines.map((line) => ({ title: line, role: "", after: "", before: "" })),
        },
      ];
    }
    return [];
  }

  function normalizeSkills(raw: any): Skill[] {
    if (Array.isArray(raw)) {
      return raw
        .map((s) => ({
          label: typeof s?.label === "string" ? s.label : "",
          tag: typeof s?.tag === "string" ? s.tag : "",
        }))
        .filter((s) => s.label || s.tag);
    }
    if (typeof raw === "string") {
      return raw
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
          const [label, tag] = line.split("@");
          return { label: label.trim(), tag: tag ? tag.trim() : "" };
        });
    }
    return [];
  }

  useEffect(() => {
    if (!storageKey) {
      setProfile(EMPTY_PROFILE);
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const preset = walletAddr ? ADDRESS_PRESETS[walletAddr.toLowerCase()] ?? DEFAULT_PROFILE : DEFAULT_PROFILE;
        const exps = normalizeExperiences(parsed?.experiences);
        const skills = normalizeSkills(parsed?.skills);
        const useDefaultExperiences =
          parsed?.experiences === undefined && exps.length === 0; // 未保存ならプリセット/デフォルトを採用
        const useDefaultSkills = parsed?.skills === undefined && skills.length === 0;
        setProfile({
          ...EMPTY_PROFILE,
          ...preset,
          ...parsed,
          experiences: useDefaultExperiences ? preset.experiences : exps,
          skills: useDefaultSkills ? preset.skills : skills,
        });
      } else {
        const preset = ADDRESS_PRESETS[walletAddr!.toLowerCase()];
        setProfile(preset ?? DEFAULT_PROFILE);
      }
    } catch {
      const preset = walletAddr ? ADDRESS_PRESETS[walletAddr.toLowerCase()] : null;
      setProfile(preset ?? DEFAULT_PROFILE);
    }
  }, [storageKey, walletAddr]);

  function onChange<K extends keyof Profile>(k: K, v: Profile[K]) {
    setProfile((p) => ({ ...p, [k]: v }));
  }

  function addSkill() {
    setProfile((p) => ({ ...p, skills: [...p.skills, { label: "", tag: "" }] }));
  }

  function removeSkill(idx: number) {
    setProfile((p) => ({ ...p, skills: p.skills.filter((_, i) => i !== idx) }));
  }

  function updateSkill(idx: number, key: keyof Skill, value: string) {
    setProfile((p) => ({
      ...p,
      skills: p.skills.map((s, i) => (i === idx ? { ...s, [key]: value } : s)),
    }));
  }

  function addOrg() {
    setProfile((p) => ({
      ...p,
      experiences: [
        ...p.experiences,
        {
          org: "",
          periodAfter: "",
          periodBefore: "",
          achievements: [
            {
              title: "",
              role: "",
              after: "",
              before: "",
            },
          ],
        },
      ],
    }));
  }

  function removeOrg(idx: number) {
    setProfile((p) => ({
      ...p,
      experiences: p.experiences.filter((_, i) => i !== idx),
    }));
  }

  function updateOrgField(idx: number, key: keyof ExperienceOrg, value: string) {
    setProfile((p) => ({
      ...p,
      experiences: p.experiences.map((exp, i) => (i === idx ? { ...exp, [key]: value } : exp)),
    }));
  }

  function addAchievement(orgIdx: number) {
    setProfile((p) => ({
      ...p,
      experiences: p.experiences.map((exp, i) =>
        i === orgIdx
          ? {
              ...exp,
              achievements: [
                ...exp.achievements,
                {
                  title: "",
                  role: "",
                  after: "",
                  before: "",
                },
              ],
            }
          : exp
      ),
    }));
  }

  function removeAchievement(orgIdx: number, achIdx: number) {
    setProfile((p) => ({
      ...p,
      experiences: p.experiences.map((exp, i) =>
        i === orgIdx
          ? {
              ...exp,
              achievements:
                exp.achievements.length <= 1
                  ? [{ title: "", role: "", after: "", before: "" }]
                  : exp.achievements.filter((_, j) => j !== achIdx),
            }
          : exp
      ),
    }));
  }

  function updateAchievementField(orgIdx: number, achIdx: number, key: "title" | "role" | "after" | "before", value: string) {
    setProfile((p) => ({
      ...p,
      experiences: p.experiences.map((exp, i) =>
        i === orgIdx
          ? {
              ...exp,
              achievements: exp.achievements.map((a, j) => (j === achIdx ? { ...a, [key]: value } : a)),
            }
          : exp
      ),
    }));
  }

  function save() {
    if (!storageKey) {
      setStatus("ウォレット未接続です（ヘッダから接続してください）");
      return;
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(profile));
      setStatus("プロフィールを保存しました（ブラウザローカル保存）");
      setToastVisible(true);
      setToastFadeOut(false);
      // 3秒表示した後、1秒かけてフェードアウト
      setTimeout(() => setToastFadeOut(true), 3000);
      setTimeout(() => {
        setToastVisible(false);
        setToastFadeOut(false);
      }, 4000);
    } catch (e: any) {
      setStatus(`保存に失敗しました: ${e?.message ?? e}`);
    }
  }

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      {toastVisible && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            padding: "12px 18px",
            borderRadius: 12,
            background: "rgba(15,23,42,0.95)",
            border: "1px solid rgba(148,163,184,0.35)",
            color: "#e5e7eb",
            fontWeight: 700,
            zIndex: 1000,
            boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
            opacity: toastFadeOut ? 0 : 1,
            transition: "opacity 1s ease",
          }}
        >
          保存されました
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, width: "min(760px, 100%)" }}>
        {(status || !walletAddr) && (
          <div
            style={{
              padding: 10,
              borderRadius: 12,
              border: "1px solid rgba(148,163,184,0.35)",
              background: "rgba(15,23,42,0.9)",
              fontSize: 12,
            }}
          >
            {status ?? "ウォレットを接続するとプロフィールを編集できます（ヘッダの Connect から接続）"}
          </div>
        )}

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
          <div style={{ fontWeight: 900, fontSize: 16 }}>プロフィール編集</div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            ウォレットごとにブラウザローカルへ保存されます。現在: {walletAddr ? shorten(walletAddr) : "未接続"}
          </div>

          <label style={{ display: "grid", gap: 6, fontSize: 12 }}>
            名前
            <input
              value={profile.name}
              onChange={(e) => onChange("name", e.target.value)}
              style={{ padding: 8, borderRadius: 12, border: "1px solid #4b5563", background: "#020617", color: "#e5e7eb" }}
              disabled={!walletAddr}
            />
          </label>

          <label style={{ display: "grid", gap: 6, fontSize: 12 }}>
            名前（英字表記）
            <input
              value={profile.englishName}
              onChange={(e) => onChange("englishName", e.target.value)}
              style={{ padding: 8, borderRadius: 12, border: "1px solid #4b5563", background: "#020617", color: "#e5e7eb" }}
              disabled={!walletAddr}
            />
          </label>

          <label style={{ display: "grid", gap: 6, fontSize: 12 }}>
            年齢
            <input
              value={profile.age}
              onChange={(e) => onChange("age", e.target.value)}
              style={{ padding: 8, borderRadius: 12, border: "1px solid #4b5563", background: "#020617", color: "#e5e7eb" }}
              disabled={!walletAddr}
            />
          </label>

          <label style={{ display: "grid", gap: 6, fontSize: 12 }}>
            タイトル
            <input
              value={profile.title}
              onChange={(e) => onChange("title", e.target.value)}
              style={{ padding: 8, borderRadius: 12, border: "1px solid #4b5563", background: "#020617", color: "#e5e7eb" }}
              disabled={!walletAddr}
            />
          </label>

          <label style={{ display: "grid", gap: 6, fontSize: 12 }}>
            会社
            <input
              value={profile.company}
              onChange={(e) => onChange("company", e.target.value)}
              style={{ padding: 8, borderRadius: 12, border: "1px solid #4b5563", background: "#020617", color: "#e5e7eb" }}
              disabled={!walletAddr}
            />
          </label>

          <label style={{ display: "grid", gap: 6, fontSize: 12 }}>
            公開範囲/備考
            <input
              value={profile.visibility}
              onChange={(e) => onChange("visibility", e.target.value)}
              style={{ padding: 8, borderRadius: 12, border: "1px solid #4b5563", background: "#020617", color: "#e5e7eb" }}
              disabled={!walletAddr}
            />
          </label>

          <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
            <div>Skills（ラベルとタグを入力）</div>
            <div style={{ display: "grid", gap: 8 }}>
              {profile.skills.map((s, idx) => (
                <div key={idx} style={{ display: "grid", gap: 6, border: "1px solid rgba(148,163,184,0.35)", borderRadius: 12, padding: 10 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={s.label}
                      onChange={(e) => updateSkill(idx, "label", e.target.value)}
                      placeholder="スキル名（例: Solidity開発者）"
                      style={{ flex: 2, padding: 8, borderRadius: 10, border: "1px solid #4b5563", background: "#020617", color: "#e5e7eb" }}
                      disabled={!walletAddr}
                    />
                    <input
                      value={s.tag}
                      onChange={(e) => updateSkill(idx, "tag", e.target.value)}
                      placeholder="タグ（例: A社）"
                      style={{ flex: 1, padding: 8, borderRadius: 10, border: "1px solid #4b5563", background: "#020617", color: "#e5e7eb" }}
                      disabled={!walletAddr}
                    />
                    <button
                      onClick={() => removeSkill(idx)}
                      disabled={!walletAddr}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 10,
                        border: "1px solid rgba(148,163,184,0.35)",
                        background: "rgba(2,6,23,0.7)",
                        color: "#e5e7eb",
                        cursor: walletAddr ? "pointer" : "default",
                        fontSize: 12,
                      }}
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={addSkill}
                disabled={!walletAddr}
                style={{
                  padding: "8px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(148,163,184,0.35)",
                  background: "rgba(2,6,23,0.7)",
                  color: "#e5e7eb",
                  cursor: walletAddr ? "pointer" : "default",
                  fontWeight: 700,
                  width: "max-content",
                }}
              >
                スキルを追加
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Experiences（組織ごとに期間・実績を入力）</div>
            <div style={{ display: "grid", gap: 12 }}>
              {profile.experiences.map((exp, idx) => (
                <div key={idx} style={{ border: "1px solid rgba(148,163,184,0.35)", borderRadius: 12, padding: 12, display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      value={exp.org}
                      onChange={(e) => updateOrgField(idx, "org", e.target.value)}
                      placeholder="組織名"
                      style={{ flex: 1, padding: 8, borderRadius: 10, border: "1px solid #4b5563", background: "#020617", color: "#e5e7eb" }}
                      disabled={!walletAddr}
                    />
                    <button
                      onClick={() => removeOrg(idx)}
                      disabled={!walletAddr}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 10,
                        border: "1px solid rgba(148,163,184,0.35)",
                        background: "rgba(2,6,23,0.7)",
                        color: "#e5e7eb",
                        cursor: walletAddr ? "pointer" : "default",
                        fontSize: 12,
                      }}
                    >
                      削除
                    </button>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={exp.periodAfter ?? ""}
                      onChange={(e) => updateOrgField(idx, "periodAfter", e.target.value)}
                      placeholder="開始 (after)"
                      style={{ flex: 1, padding: 8, borderRadius: 10, border: "1px solid #4b5563", background: "#020617", color: "#e5e7eb" }}
                      disabled={!walletAddr}
                    />
                    <input
                      value={exp.periodBefore ?? ""}
                      onChange={(e) => updateOrgField(idx, "periodBefore", e.target.value)}
                      placeholder="終了 (before)"
                      style={{ flex: 1, padding: 8, borderRadius: 10, border: "1px solid #4b5563", background: "#020617", color: "#e5e7eb" }}
                      disabled={!walletAddr}
                    />
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ fontSize: 12, color: "#cbd5e1" }}>実績</div>
                    {exp.achievements.map((a, j) => (
                      <div key={j} style={{ display: "grid", gap: 6, border: "1px dashed rgba(148,163,184,0.35)", borderRadius: 10, padding: 10 }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input
                            value={a.after ?? ""}
                            onChange={(e) => updateAchievementField(idx, j, "after", e.target.value)}
                            placeholder="開始 (after)"
                            style={{ flex: 1, padding: 8, borderRadius: 10, border: "1px solid #4b5563", background: "#020617", color: "#e5e7eb" }}
                            disabled={!walletAddr}
                          />
                          <input
                            value={a.before ?? ""}
                            onChange={(e) => updateAchievementField(idx, j, "before", e.target.value)}
                            placeholder="終了 (before)"
                            style={{ flex: 1, padding: 8, borderRadius: 10, border: "1px solid #4b5563", background: "#020617", color: "#e5e7eb" }}
                            disabled={!walletAddr}
                          />
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input
                            value={a.title}
                            onChange={(e) => updateAchievementField(idx, j, "title", e.target.value)}
                            placeholder="取り組み（プロジェクト/ゼミ等）"
                            style={{ flex: 2, padding: 8, borderRadius: 10, border: "1px solid #4b5563", background: "#020617", color: "#e5e7eb" }}
                            disabled={!walletAddr}
                          />
                          <input
                            value={a.role}
                            onChange={(e) => updateAchievementField(idx, j, "role", e.target.value)}
                            placeholder="立場"
                            style={{ flex: 1, padding: 8, borderRadius: 10, border: "1px solid #4b5563", background: "#020617", color: "#e5e7eb" }}
                            disabled={!walletAddr}
                          />
                          <button
                            onClick={() => removeAchievement(idx, j)}
                            disabled={!walletAddr}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 10,
                              border: "1px solid rgba(148,163,184,0.35)",
                              background: "rgba(2,6,23,0.7)",
                              color: "#e5e7eb",
                              cursor: walletAddr ? "pointer" : "default",
                              fontSize: 12,
                            }}
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => addAchievement(idx)}
                      disabled={!walletAddr}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: "1px solid rgba(148,163,184,0.35)",
                        background: "rgba(2,6,23,0.7)",
                        color: "#e5e7eb",
                        cursor: walletAddr ? "pointer" : "default",
                        fontSize: 12,
                        width: "max-content",
                      }}
                    >
                      実績を追加
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={addOrg}
              disabled={!walletAddr}
              style={{
                padding: "8px 12px",
                borderRadius: 12,
                border: "1px solid rgba(148,163,184,0.35)",
                background: "rgba(2,6,23,0.7)",
                color: "#e5e7eb",
                cursor: walletAddr ? "pointer" : "default",
                fontWeight: 700,
                width: "max-content",
              }}
            >
              組織を追加
            </button>
          </div>

          <button
            onClick={save}
            disabled={!walletAddr}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "none",
              background: walletAddr ? "#3b82f6" : "#4b5563",
              color: "#e5e7eb",
              fontWeight: 800,
              cursor: walletAddr ? "pointer" : "default",
            }}
          >
            保存する
          </button>
        </div>
      </div>
    </div>
  );
}
