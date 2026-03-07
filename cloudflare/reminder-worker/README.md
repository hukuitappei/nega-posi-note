# Daily Log Reminder Worker

Cloudflare Workers + Cron + Web Push で、`nega-posi-note` に毎日 `21:00 JST` の通知を送るためのWorkerです。
サーバ側データは保持期間を設け、**3か月（約92日）超は自動削除**します。

## 1. 事前準備

1. CloudflareでKVを作成（例: `daily-log-subscriptions`）
2. `wrangler.toml` の `kv_namespaces.id` / `preview_id` を置換
3. VAPID鍵を作成（公開鍵/秘密鍵）
4. 秘密鍵はJWK形式で Secret に設定

### KV作成コマンド

```bash
npx wrangler kv namespace create SUBSCRIPTIONS
npx wrangler kv namespace create SUBSCRIPTIONS --preview
```

出力されたIDを `wrangler.toml` に設定します。

### VAPID鍵作成コマンド

```bash
npm run vapid:gen
```

出力された `VAPID_PUBLIC_KEY` と `VAPID_PRIVATE_JWK` を控えてください（Gitにコミットしない）。

## 2. Secret設定

```bash
cd cloudflare/reminder-worker
npx wrangler secret put VAPID_PUBLIC_KEY
npx wrangler secret put VAPID_PRIVATE_JWK
```

`VAPID_PRIVATE_JWK` は次の形のJSON文字列:

```json
{"kty":"EC","crv":"P-256","x":"...","y":"...","d":"..."}
```

## 3. デプロイ

```bash
npm install
npx wrangler deploy
```

## 4. フロント設定

`nega-posi-note` の設定画面で以下を入力:

- Worker URL: `https://<your-worker>.workers.dev`

通知有効化ボタンを押すと、`/vapid-public-key` 取得 -> Push購読 -> `/subscribe` 登録が実行されます。

## データ保持ポリシー

- サーバ保持データは3か月（約92日）を超えた時点でCron実行時に削除
- markdownなどの外部保存物は対象外（サーバ側のみ削除）
