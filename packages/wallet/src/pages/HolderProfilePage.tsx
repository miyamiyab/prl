import React, { useEffect, useMemo, useState } from "react";
import { useWallet } from "../wallet";

type Profile = {
  name: string;
  age: string;
  title: string;
  company: string;
  visibility: string;
  skills: string;
  experiences: string;
};

const EMPTY_PROFILE: Profile = {
  name: "",
  age: "",
  title: "",
  company: "",
  visibility: "",
  skills: "",
  experiences: "",
};

const DEFAULT_PROFILE: Profile = {
  name: "山田 太郎",
  age: "36",
  title: "Web3開発者",
  company: "ブロックチェーン講座株式会社",
  visibility: "公開職歴冊",
  skills: "Solidity開発者 @A社\n会計システム開発PM @B社",
  experiences: [
    "2010〜2014 ブロックチェーン大学（BC大）",
    "  - 2012〜2013 クリプトゼミ（BC大）",
    "  - 2013〜2014 NFTゼミ（BC大）",
    "2014〜2019 イーサリアム株式会社（ETH社）",
    "  - 2014〜2017 ●●プロジェクト（ETH社）",
    "  - 2017〜2019 経理部門（ETH社）",
    "2019〜 ブロックチェーン講座(株)（ETH社）",
    "  - 2014〜2017 ●●プロジェクト（ETH社）",
    "  - 2017〜2019 経理部門（ETH社）",
  ].join("\n"),
};

const ADDRESS_PRESETS: Record<string, Profile> = {
  "0x70997970c51812dc3a010c7d01b50e0d17dc79c8": DEFAULT_PROFILE,
  "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266": {
    ...DEFAULT_PROFILE,
    name: "佐藤 花子",
    age: "34",
    title: "ブロックチェーンPM",
    skills: "プロジェクト管理 @C社\n会計要件定義 @D社",
  },
};

function shorten(v: string, len = 6) {
  return v.length > len * 2 ? `${v.slice(0, len)}...${v.slice(-len)}` : v;
}

export default function HolderProfilePage() {
  const { walletAddr } = useWallet();
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [status, setStatus] = useState<string | null>(null);

  const storageKey = useMemo(() => (walletAddr ? `profile:${walletAddr.toLowerCase()}` : null), [walletAddr]);

  useEffect(() => {
    if (!storageKey) {
      setProfile(EMPTY_PROFILE);
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        setProfile({ ...EMPTY_PROFILE, ...JSON.parse(raw) });
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

  function save() {
    if (!storageKey) {
      setStatus("ウォレット未接続です（ヘッダから接続してください）");
      return;
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(profile));
      setStatus("プロフィールを保存しました（ブラウザローカル保存）");
    } catch (e: any) {
      setStatus(`保存に失敗しました: ${e?.message ?? e}`);
    }
  }

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
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

          <label style={{ display: "grid", gap: 6, fontSize: 12 }}>
            Skills（例: Solidity開発者@A社, 会計PM@B社）
            <textarea
              value={profile.skills}
              onChange={(e) => onChange("skills", e.target.value)}
              style={{ padding: 8, borderRadius: 12, border: "1px solid #4b5563", background: "#020617", color: "#e5e7eb", minHeight: 70 }}
              disabled={!walletAddr}
            />
          </label>

          <label style={{ display: "grid", gap: 6, fontSize: 12 }}>
            Experiences（自由記述）
            <textarea
              value={profile.experiences}
              onChange={(e) => onChange("experiences", e.target.value)}
              style={{ padding: 8, borderRadius: 12, border: "1px solid #4b5563", background: "#020617", color: "#e5e7eb", minHeight: 100 }}
              disabled={!walletAddr}
            />
          </label>

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
