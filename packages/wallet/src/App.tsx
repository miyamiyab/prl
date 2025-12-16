import React, { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes, Link, useLocation, useNavigate } from "react-router-dom";
import HolderPage from "./pages/HolderPage";
import HolderRequestPage from "./pages/HolderRequestPage";
import HolderVcListPage from "./pages/HolderVcListPage";
import HolderProfilePage from "./pages/HolderProfilePage";
import HolderPendingPage from "./pages/HolderPendingPage";
import CompanySearchPage from "./pages/CompanySearchPage";
import CompanyUserSearchPage from "./pages/CompanyUserSearchPage";
import IssuerPage from "./pages/IssuerPage";
import VerifierPage from "./pages/VerifierPage";
import { WalletProvider, useWallet } from "./wallet";

function useTitle(pathname: string) {
  if (pathname === "/") return "Top";
  if (pathname.startsWith("/holder/company/search")) return "企業検索";
  if (pathname.startsWith("/company")) return "Company";
  if (pathname.startsWith("/holder/verifier")) return "VC検証";
  if (pathname.startsWith("/holder/request")) return "VC発行依頼";
  if (pathname.startsWith("/holder/vcs")) return "VC一覧";
  if (pathname.startsWith("/holder/pending")) return "発行待ち一覧";
  if (pathname.startsWith("/holder/profile")) return "プロフィール編集";
  if (pathname.startsWith("/holder")) return "ホーム";
  if (pathname.startsWith("/issuer")) return "VC発行";
  if (pathname.startsWith("/verifier")) return "VC検証";
  return "VC Role Demo";
}

function Hamburger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Open menu"
      style={{
        width: 40,
        height: 34,
        borderRadius: 10,
        border: "1px solid rgba(148,163,184,0.35)",
        background: "rgba(2,6,23,0.6)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ width: 18, height: 2, background: "#e5e7eb", borderRadius: 99 }} />
        <div style={{ width: 18, height: 2, background: "#e5e7eb", borderRadius: 99 }} />
        <div style={{ width: 18, height: 2, background: "#e5e7eb", borderRadius: 99 }} />
      </div>
    </button>
  );
}

function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate();
  const loc = useLocation();
  const { walletAddr, connectWallet } = useWallet();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function Item({ label, to }: { label: string; to: string }) {
    const active = loc.pathname === to || loc.pathname.startsWith(`${to}/`);
    return (
      <button
        onClick={() => {
          nav(to);
          onClose();
        }}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "8px 12px",
          fontSize: 13,
          lineHeight: "18px",
          border: "none",
          background: active ? "rgba(59,130,246,0.15)" : "transparent",
          color: active ? "#93c5fd" : "#e5e7eb",
          fontWeight: 700,
          cursor: "pointer",
          borderRadius: 8,
        }}
        onMouseEnter={(e) => {
          if (!active) e.currentTarget.style.background = "rgba(148,163,184,0.12)";
        }}
        onMouseLeave={(e) => {
          if (!active) e.currentTarget.style.background = "transparent";
        }}
      >
        {label}
      </button>
    );
  }

  function shorten(v: string, len = 6) {
    return v.length > len * 2 ? `${v.slice(0, len)}...${v.slice(-len)}` : v;
  }

  const mode = loc.pathname.startsWith("/holder") ? "personal" : "company";

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 120ms",
          zIndex: 40,
        }}
      />

      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 260,
          height: "100vh",
          background: "#020617",
          borderRight: "1px solid #334155",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 160ms",
          zIndex: 50,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 4 }}>{mode === "personal" ? "ホルダーメニュー" : "組織メニュー"}</div>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>Esc で閉じる</div>

        {mode === "personal" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid rgba(148,163,184,0.35)",
              background: "rgba(2,6,23,0.7)",
            }}
          >
            <div style={{ fontSize: 12, color: "#cbd5e1" }}>{walletAddr ? shorten(walletAddr) : "Not connected"}</div>
            <button
              onClick={connectWallet}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "none",
                background: "#22c55e",
                color: "#0f172a",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {walletAddr ? "ウォレットと再接続" : "ウォレットと接続"}
            </button>
          </div>
        )}

        {mode === "company" ? (
          <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Item label="ホーム" to="/company" />
            <Item label="VC検証" to="/verifier" />
            <Item label="VC発行" to="/issuer" />
            <Item label="ユーザー検索" to="/company/user/search" />
          </nav>
        ) : (
          <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Item label="ホーム" to="/holder" />
            <Item label="プロフィール編集" to="/holder/profile" />
            <Item label="VC一覧" to="/holder/vcs" />
            <Item label="VC発行依頼" to="/holder/request" />
            <Item label="発行待ち一覧" to="/holder/pending" />
            <Item label="企業検索" to="/holder/company/search" />
          </nav>
        )}
      </div>
    </>
  );
}

/**
 * ヘッダはフル幅（端から端）
 * 本文は中央カラム（max 1100）
 */
function Shell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const title = useTitle(loc.pathname);
  const [open, setOpen] = useState(false);
  const { walletAddr, status, connectWallet } = useWallet();
  const isPersonal = loc.pathname.startsWith("/holder");

  function shorten(v: string, len = 6) {
    return v.length > len * 2 ? `${v.slice(0, len)}...${v.slice(-len)}` : v;
  }

  return (
    <div
      style={{
        width: "100vw",
        minHeight: "100vh",
        background: "#0f172a",
        color: "#e5e7eb",
      }}
    >
      <Drawer open={open} onClose={() => setOpen(false)} />

      {/* ===== フル幅ヘッダ（角ばらせる） ===== */}
      <header
        style={{
          width: "100%",
          height: 52,
          padding: "8px 12px",
          position: "sticky",
          top: 0,
          zIndex: 30,
          borderRadius: 0, // ★ 角を角ばらせる
          borderBottom: "1px solid #334155",
          background: "#020617",
          display: "flex",
          alignItems: "center",
          justifyContent: "center", // 中のコンテンツを中央へ
          boxSizing: "border-box",
        }}
      >
        {/* ヘッダ内の中身だけ中央幅に制限 */}
        <div
          style={{
            width: "min(1100px, calc(100vw - 48px))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Hamburger onClick={() => setOpen(true)} />
            <div style={{ display: "grid", gap: 2 }}>
              <div style={{ fontWeight: 900, lineHeight: "18px" }}>PRL</div>
              <div style={{ fontSize: 12, color: "#9ca3af", lineHeight: "16px" }}>{title}</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isPersonal && (
              <>
                <div style={{ fontFamily: "monospace", fontSize: 12, color: "#cbd5e1" }}>
                  {walletAddr ? shorten(walletAddr) : "未接続"}
                </div>
                <button
                  onClick={connectWallet}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 10,
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "#22c55e",
                    color: "#0f172a",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {walletAddr ? "ウォレットと再接続" : "ウォレットと接続"}
                </button>
              </>
            )}
            <Link
              to="/"
              style={{
                padding: "6px 10px",
                borderRadius: 0, // ★ 角ばらせる
                background: "#64748b",
                color: "#020617",
                fontWeight: 900,
                textDecoration: "none",
                fontSize: 13,
                lineHeight: "18px",
              }}
            >
              Top
            </Link>
          </div>
        </div>
      </header>

      {/* ===== 本文（中央カラム） ===== */}
      <main
        style={{
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "min(1100px, calc(100vw - 48px))",
            paddingTop: 12,
            paddingBottom: 24,
            display: "grid",
            gap: 12,
          }}
        >
          {isPersonal && status && (
            <div
              style={{
                padding: 10,
                borderRadius: 12,
                border: "1px solid rgba(148,163,184,0.35)",
                background: "rgba(15,23,42,0.9)",
                fontSize: 12,
              }}
            >
              {status}
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}

/* pages */
function TopPage() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ padding: 16, borderRadius: 16, border: "1px solid rgba(148,163,184,0.35)", background: "rgba(15,23,42,0.9)" }}>
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 8 }}>どちらで利用しますか？</div>
        <div style={{ fontSize: 13, color: "#cbd5e1", marginBottom: 12 }}>個人と企業の入口を選んでください。</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Link
            to="/holder"
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(96,165,250,0.6)",
              background: "rgba(37,99,235,0.12)",
              color: "#e5e7eb",
              textDecoration: "none",
              display: "grid",
              gap: 6,
            }}
          >
            <div style={{ fontWeight: 800 }}>個人で利用</div>
            <div style={{ fontSize: 12, color: "#cbd5e1" }}>プロフィール確認・VC検証へ</div>
          </Link>
          <Link
            to="/company"
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(52,211,153,0.6)",
              background: "rgba(16,185,129,0.12)",
              color: "#e5e7eb",
              textDecoration: "none",
              display: "grid",
              gap: 6,
            }}
          >
            <div style={{ fontWeight: 800 }}>企業で利用</div>
            <div style={{ fontSize: 12, color: "#cbd5e1" }}>発行・検証の管理画面へ</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
function CompanyTopPage() {
  const [issuerOptions, setIssuerOptions] = React.useState<string[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const nav = useNavigate();

  React.useEffect(() => {
    const saved = localStorage.getItem("company:selectedIssuer");
    if (saved) setSelected(saved);
    (async () => {
      try {
        const res = await fetch("http://localhost:3000/issuers");
        const data = await res.json();
        if (Array.isArray(data?.issuers)) {
          const ids = data.issuers.map((i: any) => i.issuerId).filter((v: string) => typeof v === "string");
          setIssuerOptions(ids);
          if (!saved && ids.length > 0) {
            setSelected(ids[0]);
            localStorage.setItem("company:selectedIssuer", ids[0]);
          }
        }
      } catch (e: any) {
        setStatus(`issuer取得に失敗しました: ${e?.message ?? e}`);
      }
    })();
  }, []);

  function onSelect(id: string) {
    setSelected(id);
    localStorage.setItem("company:selectedIssuer", id);
    setStatus("組織を選択しました");
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {status && (
        <div style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(148,163,184,0.35)", background: "rgba(15,23,42,0.9)", fontSize: 12 }}>{status}</div>
      )}
      <div style={{ padding: 16, borderRadius: 16, border: "1px solid rgba(148,163,184,0.35)", background: "rgba(15,23,42,0.9)", display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>企業ログイン（組織選択）</div>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>自分の組織を選択すると、その組織の発行依頼・VC検証だけに絞られます。</div>
        <select
          value={selected ?? ""}
          onChange={(e) => onSelect(e.target.value)}
          style={{ padding: 10, borderRadius: 12, border: "1px solid #4b5563", background: "#020617", color: "#e5e7eb" }}
        >
          <option value="" disabled>
            組織を選択
          </option>
          {issuerOptions.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => nav("/issuer")}
            disabled={!selected}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "none",
              background: selected ? "#3b82f6" : "#4b5563",
              color: "#e5e7eb",
              fontWeight: 800,
              cursor: selected ? "pointer" : "default",
            }}
          >
            VC発行画面へ
          </button>
          <button
            onClick={() => nav("/verifier")}
            disabled={!selected}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "none",
              background: selected ? "#10b981" : "#4b5563",
              color: "#0b1220",
              fontWeight: 800,
              cursor: selected ? "pointer" : "default",
            }}
          >
            VC検証画面へ
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <Shell>
          <Routes>
            <Route path="/" element={<TopPage />} />
            <Route path="/company" element={<CompanyTopPage />} />
            <Route path="/holder/company/search" element={<CompanySearchPage />} />
            <Route path="/holder/company/search/:issuerId" element={<CompanySearchPage />} />
            <Route path="/company/user/search" element={<CompanyUserSearchPage />} />
            <Route path="/company/user/search/:holderAddress" element={<CompanyUserSearchPage />} />
            <Route path="/holder" element={<HolderPage />} />
            <Route path="/holder/request" element={<HolderRequestPage />} />
            <Route path="/holder/vcs" element={<HolderVcListPage />} />
            <Route path="/holder/profile" element={<HolderProfilePage />} />
            <Route path="/holder/pending" element={<HolderPendingPage />} />
            <Route path="/issuer" element={<IssuerPage />} />
            <Route path="/verifier" element={<VerifierPage />} />
            <Route path="*" element={<TopPage />} />
          </Routes>
        </Shell>
      </BrowserRouter>
    </WalletProvider>
  );
}
