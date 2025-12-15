import React, { useMemo } from "react";
import { useWallet } from "../wallet";

type Profile = {
  name: string;
  age: number | string;
  title: string;
  company: string;
  visibility: string;
  skills: { label: string; tag: string }[];
  experiences: {
    period: string;
    org: string;
    tag: string;
    roles: { period: string; title: string; tag: string }[];
  }[];
};

const defaultProfile: Profile = {
  name: "山田 太郎",
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
      period: "2010〜2014",
      org: "ブロックチェーン大学",
      tag: "BC大",
      roles: [
        { period: "2012〜2013", title: "クリプトゼミ", tag: "BC大" },
        { period: "2013〜2014", title: "NFTゼミ", tag: "BC大" },
      ],
    },
    {
      period: "2014〜2019",
      org: "イーサリアム株式会社",
      tag: "ETH社",
      roles: [
        { period: "2014〜2017", title: "●●プロジェクト", tag: "ETH社" },
        { period: "2017〜2019", title: "経理部門", tag: "ETH社" },
      ],
    },
    {
      period: "2019〜",
      org: "ブロックチェーン講座(株)",
      tag: "ETH社",
      roles: [
        { period: "2014〜2017", title: "●●プロジェクト", tag: "ETH社" },
        { period: "2017〜2019", title: "経理部門", tag: "ETH社" },
      ],
    },
  ],
};

const profilesByAddress: Record<string, Profile> = {
  "0x70997970c51812dc3a010c7d01b50e0d17dc79c8": defaultProfile,
  "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266": {
    ...defaultProfile,
    name: "佐藤 花子",
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

function ProfileCard({ profile, walletAddr, found }: { profile: Profile; walletAddr: string | null; found: boolean }) {
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
      }}
    >
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
              <span
                style={{
                  marginLeft: "auto",
                  padding: "2px 8px",
                  borderRadius: 999,
                  border: "1px solid rgba(96,165,250,0.6)",
                  color: "#bfdbfe",
                  fontSize: 11,
                }}
              >
                {s.tag}
              </span>
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
                <span style={{ color: "#cbd5e1", width: 90 }}>{exp.period}</span>
                <span style={{ fontWeight: 700 }}>{exp.org}</span>
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
                  {exp.tag}
                </span>
              </div>
              <div style={{ display: "grid", gap: 4, paddingLeft: 18 }}>
                {exp.roles.map((role) => (
                  <div key={role.title} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#cbd5e1" }}>
                    <span style={{ width: 90 }}>{role.period}</span>
                    <span>{role.title}</span>
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
                      {role.tag}
                    </span>
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
    if (Array.isArray(raw.skills)) {
      skills = raw.skills.map((s: any) => ({
        label: typeof s?.label === "string" ? s.label : String(s ?? ""),
        tag: typeof s?.tag === "string" ? s.tag : "",
      }));
    } else if (typeof raw.skills === "string") {
      skills = raw.skills
        .split("\n")
        .map((line: string) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
          const [label, tag] = line.split("@");
          return { label: label.trim(), tag: tag ? tag.trim() : "" };
        });
    }

    // experiences: allow array of full objects or newline-separated string
    let experiences: Profile["experiences"] = [];
  if (Array.isArray(raw.experiences)) {
    experiences = raw.experiences
      .map((e: any) => ({
        period: typeof e?.period === "string" ? e.period : "",
        org: typeof e?.org === "string" ? e.org : typeof e?.title === "string" ? e.title : "",
          tag: typeof e?.tag === "string" ? e.tag : "",
          roles: Array.isArray(e?.roles)
            ? e.roles
                .map((r: any) => ({
                  period: typeof r?.period === "string" ? r.period : "",
                  title: typeof r?.title === "string" ? r.title : "",
                  tag: typeof r?.tag === "string" ? r.tag : "",
                }))
                .filter((r: any) => r.period || r.title)
            : [],
        }))
        .filter((e) => e.period || e.org || e.roles.length > 0);
  } else if (typeof raw.experiences === "string") {
    const lines = raw.experiences
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line) => line.length > 0);

    let current: Profile["experiences"][number] | null = null;
    const parsed: Profile["experiences"] = [];

    for (const line of lines) {
      const isRole = line.startsWith("-") || line.startsWith("・") || line.startsWith("●");
      const cleaned = line.replace(/^[-・●]\s*/, "");

      // period 抽出: 先頭に年や期間があれば period とみなす
      let period = "";
      let rest = cleaned;
      const m = cleaned.match(/^([0-9]{2,4}[^ ]*)\s+(.*)$/);
      if (m) {
        period = m[1].trim();
        rest = m[2].trim();
      }

      // タグ抽出: 全角/半角カッコの末尾部分をタグとみなす
      let orgOrTitle = rest;
      let tag = "";
      const tagMatch = rest.match(/^(.*?)[（(]([^（）()]*)[）)]\s*$/);
      if (tagMatch) {
        orgOrTitle = tagMatch[1].trim();
        tag = tagMatch[2].trim();
      }

      if (isRole) {
        if (!current) {
          current = { period: "", org: "Other", tag: "", roles: [] };
          parsed.push(current);
        }
        current.roles.push({ period, title: orgOrTitle, tag });
      } else {
        current = { period, org: orgOrTitle, tag, roles: [] };
        parsed.push(current);
      }
    }

    experiences = parsed;
  }

    return {
      name: typeof raw.name === "string" ? raw.name : defaultProfile.name,
      age: typeof raw.age === "number" || typeof raw.age === "string" ? raw.age : defaultProfile.age,
      title: typeof raw.title === "string" ? raw.title : defaultProfile.title,
      company: typeof raw.company === "string" ? raw.company : defaultProfile.company,
      visibility: typeof raw.visibility === "string" ? raw.visibility : defaultProfile.visibility,
      skills: skills.length > 0 ? skills : defaultProfile.skills,
      experiences: experiences.length > 0 ? experiences : defaultProfile.experiences,
    };
  } catch {
    return null;
  }
}

export default function HolderPage() {
  const { walletAddr } = useWallet();
  const [storedProfile, setStoredProfile] = React.useState<Profile | null>(null);

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
      <ProfileCard profile={profile} walletAddr={walletAddr} found={found} />
      )}
    </div>
  );
}
