# X to Teams

毎週月曜・木曜の朝9時（JST）に、指定したXアカウントの注目投稿をMicrosoft Teamsに自動通知するツールです。

## 機能

- 指定した16アカウントからURL付き投稿を自動収集
- リプライとリツイートを除外
- いいね数が多い順に最大5件を通知
- 重複投稿防止機能（7日間の投稿履歴を保持）
- 毎週月曜・木曜の朝9時（JST）にMicrosoft Teamsへ自動通知
- Cloudflare Workers上で動作

## 対象アカウント

指定アカウントから投稿を収集（`src/twitter.ts`で設定）：

## 必要なもの

### 1. X (Twitter) API アクセス

X APIのBearer Tokenが必要です。

#### 取得手順:

1. X Developer Portalにアクセス
2. Projectを作成
3. Project内にAppを作成
4. AppのKeys and tokensからBearer Tokenを取得
5. 重要: AppがProjectに紐づいていることを確認

### 2. Microsoft Teams Power Automate Workflow

Teamsに通知を送るためのWorkflow URLが必要です。

#### 取得手順:

1. Microsoft Teamsで通知を送りたいチャンネルを開く
2. チャンネル名の右の「...」をクリック → 「ワークフロー」を選択
3. 「新しいワークフロー」をクリック
4. 「webhook 要求を受信したときにチャネルに投稿」を選択
5. ワークフロー名を入力（例: IT News Bot）
6. チーム・チャンネルを選択
7. 作成されたWebhook URLをコピー

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

開発環境用に `.dev.vars` ファイルを作成:

```bash
cp .dev.vars.example .dev.vars
```

`.dev.vars` ファイルを編集して、実際の値を設定:

```
TWITTER_BEARER_TOKEN=your_actual_bearer_token
TEAMS_WEBHOOK_URL=https://default[...].powerplatform.com/[...]
```

### 3. KV Namespace の作成

投稿済みツイートIDを保存するため、Cloudflare KV Namespaceを作成します。

```bash
wrangler kv namespace create POSTED_TWEETS
```

出力されたIDを`wrangler.toml`の`kv_namespaces`セクションの`id`に設定してください。

### 4. ローカルでテスト

```bash
npm run dev
```

### 5. 本番環境へのデプロイ

#### 環境変数の設定（本番）

```bash
# X API Bearer Token
wrangler secret put TWITTER_BEARER_TOKEN

# Teams Workflow URL
wrangler secret put TEAMS_WEBHOOK_URL
```

#### デプロイ

```bash
npm run deploy
```

## 使い方

### 自動実行

デプロイ後、毎週月曜・木曜の朝9時（JST）に自動的に実行されます。

### ログの確認

リアルタイムログを監視:

```bash
wrangler tail teams-news
```

### Cron設定の確認

Cloudflare Dashboardの「Triggers」タブで次回実行予定を確認できます。

## カスタマイズ

### 対象アカウントの変更

`src/twitter.ts` の `TARGET_ACCOUNTS` を編集:

```typescript
const TARGET_ACCOUNTS = [
  'account1',
  'account2',
  // ...
];
```

### 実行時刻・曜日の変更

`wrangler.toml` の `crons` を編集:

```toml
# 現在の設定: 月曜・木曜の朝9時（JST） = UTC 0:00
crons = ["0 0 * * 2,5"]

# Cloudflareの曜日: 1=日曜, 2=月曜, 3=火曜, 4=水曜, 5=木曜, 6=金曜, 7=土曜

# 例: 毎日朝9時
crons = ["0 0 * * *"]

# 例: 月・水・金の朝10時（JST） = UTC 1:00
crons = ["0 1 * * 2,4,6"]
```

### 取得件数の変更

`src/twitter.ts` の `searchPopularTweets` 関数:

```typescript
// 現在: 10件取得
url.searchParams.append('max_results', '10');
```

### 通知件数の変更

`src/twitter.ts` の `filterAndTransformTweets` 関数の最後:

```typescript
// 現在: 上位5件
return articles.slice(0, 5);
```

### 重複投稿履歴のリセット

```bash
# リモートKVの投稿履歴をクリア
wrangler kv key delete posted_tweet_ids --namespace-id=YOUR_KV_ID --remote
```

## API使用量の目安

- 週2回実行（月・木）
- 1回あたり10ツイート取得

## プロジェクト構成

```
teams-news/
├── src/
│   ├── index.ts          # メインWorkerコード
│   ├── twitter.ts        # X API連携ロジック
│   ├── teams.ts          # Teams通知ロジック
│   ├── storage.ts        # KV投稿履歴管理ロジック
│   └── types.ts          # TypeScript型定義
├── wrangler.toml         # Cloudflare Workers設定
├── package.json
├── tsconfig.json
└── README.md
```

## 技術スタック

- **Runtime**: Cloudflare Workers
- **Language**: TypeScript
- **APIs**: X API v2, Microsoft Teams Power Automate Workflow
- **Storage**: Cloudflare KV
- **Deployment**: Wrangler CLI
