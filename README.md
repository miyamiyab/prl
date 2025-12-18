# VC Issuer / Wallet Sample

JWT ベースの Verifiable Credential を発行・検証するデモです。  
`packages/issuer` に API サーバー、`packages/wallet` に Holder / Issuer / Verifier それぞれの画面を持つ React フロントエンドがあります。

- 署名アルゴリズム: ES256K（secp256k1）を使用。Issuer の秘密鍵はサーバー側で管理。
- DID フォーマット: `did:ethr:eip155:{chainId}:{address}`。初期データでは chainId=31337 を使用。
- データ永続化: `packages/issuer/data` 配下に JSON で保存（`issuers.json`, `requests.json`, `vcs.json`）。

## 必要環境

- Node.js 20 以降（npm 10 推奨）
- npm でワークスペースが扱えること
- メタマスク等の Ethereum ウォレット（フロント側でアドレス取得のみ使用。ネットワーク指定はありません）

## セットアップ

```bash
# ルートで依存関係をインストール
npm install

# Issuer サーバーをビルド
npm run build -w vc-issuer-sample
```

## 起動方法

1. **Issuer API を起動（ポート 3000）**
   ```bash
   npm run api -w vc-issuer-sample
   ```
   - 初回起動時に `data/issuers.json` が作成され、以下の managed issuer がシードされます  
     - `B社` → `did:ethr:eip155:31337:0x2A36...5131`  
     - `ブロックチェーン大学` → `did:ethr:eip155:31337:0xe0B3...149B`
2. **フロントエンドを起動（デフォルト http://localhost:5173）**
   ```bash
   npm run dev -w vc-wallet-frontend
   ```
   - メタマスクで任意のアカウントを接続して利用します（チェーンは不問）。  
   - API とは `http://localhost:3000` で通信します。必要に応じて `API_BASE` 定数を変更してください。

## 主要な使い方（UI フロー）

1. **Holder**
   - `/holder/profile` でプロフィールを編集（ローカルストレージに保存）。Skills / Experiences が VC 発行依頼の候補になります。
   - `/holder/request` で発行依頼を送信。Issuer ごとに「スキル」「在籍証明」「実績証明」をリクエストできます。
   - `/holder/vcs` で自分宛てに発行された VC 一覧を確認し、`/verify` API を通じて検証も可能。
2. **Issuer**
   - `/company` で組織（issuerId）を選択。
   - `/issuer` で未処理の依頼一覧を確認し、「Issue VC」を押すとサーバー管理の秘密鍵で署名した VC(JWT) を発行。`data/vcs.json` にも公開ログを追加。
3. **Verifier**
   - `/verifier` でユーザーごとの発行済み VC を一覧表示。個別 VC の JWT をデコード、署名（base64url/hex）表示、Issuer の公開 JWK を API から取得し `POST /verify` で検証できます。

## REST API メモ（`packages/issuer/src/server.ts`）

- `GET /health` - ヘルスチェック
- `GET /issuers` - issuer 一覧
- `GET /issuer/:issuerId` - 指定 issuer の DID / 公開 JWK を取得
- `POST /register-issuer` - managed issuer を新規作成（秘密鍵はサーバー管理）
- `POST /register-external-issuer` - 外部 issuer を登録（公開鍵のみ保存）
- `POST /request-issue` - Holder から VC 発行依頼を登録
- `GET /requests` - 発行依頼一覧（`status` / `issuerId` でフィルタ）
- `POST /requests/:id/issue` - 依頼に対して VC を発行
- `GET /vcs` - 公開 VC 一覧
- `POST /verify` - VC(JWT) の署名検証（issuer の公開鍵をサーバー登録済み前提）

## CLI サンプル（任意）

`packages/issuer/src/*.ts` には jose を使った最小サンプルもあります。

```bash
# 鍵ペア生成（keys/issuer-es256.json に保存）
npm run gen-keys -w vc-issuer-sample

# 例: VC を発行して data/latest-vc.jwt に保存
npm run issue -w vc-issuer-sample

# 発行済み JWT を検証
npm run verify -w vc-issuer-sample

# 発行 → その場で検証まで行うデモ
npm run demo -w vc-issuer-sample
```

## データをリセットしたい場合

サーバーを停止し、`packages/issuer/data` 以下の JSON を削除してください。再起動時にシード issuer が再生成されます。
