import React, { createContext, useCallback, useContext, useState } from "react";

declare global {
  interface Window {
    ethereum?: any;
  }
}

type WalletContextValue = {
  walletAddr: string | null;
  status: string | null;
  connectWallet: () => Promise<void>;
};

const WalletContext = createContext<WalletContextValue>({
  walletAddr: null,
  status: null,
  connectWallet: async () => {},
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [walletAddr, setWalletAddr] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      alert("MetaMask が見つかりません。");
      return;
    }
    try {
      setStatus("ウォレット接続中…");
      const accounts: string[] = await window.ethereum.request({ method: "eth_requestAccounts" });
      const addr = accounts?.[0];
      if (!addr) throw new Error("アカウント取得に失敗しました");
      setWalletAddr(addr);
      setStatus(null);
    } catch (e: any) {
      setStatus(`ウォレット接続失敗: ${e?.message ?? e}`);
    }
  }, []);

  return <WalletContext.Provider value={{ walletAddr, status, connectWallet }}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  return useContext(WalletContext);
}
