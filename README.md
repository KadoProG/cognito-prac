# cognito-prac

Amazon Cognito によるユーザー認証を、最小構成で試すリポジトリです。

- BE: TypeScript + [Hono](https://hono.dev/)（Node.js）
- FE: TypeScript + Vite + React
- DB: PostgreSQL（ローカルは docker compose）
- 認証: Amazon Cognito（ローカルは [cognito-local](https://github.com/jagregory/cognito-local) で代替）

pnpm のモノレポで、`apps/` の下にアプリを置きます。

## 構成

```
apps/
  api/   Hono の API サーバー（Cognito の呼び出し、トークン検証、DB）
  web/   Vite + React の画面（ログイン・サインアップ・パスワード再設定）
.cognito/
  config.json   cognito-local の設定（db/ はコンテナが書くので追跡しない）
docker-compose.yml   PostgreSQL と cognito-local
```

## 前提

- Node.js 22（`.node-version`）
- pnpm 10（`corepack enable` で `package.json` の `packageManager` の版が使われる）
- Docker（PostgreSQL と cognito-local を動かす）

## 開発

```sh
pnpm install          # 依存の取得。git hooks（lefthook）もここで入る
pnpm db:up            # PostgreSQL と cognito-local を起動
pnpm dev              # api と web を同時に起動
```

### コードのきれいさを保つ

| コマンド         | 内容                                |
| ---------------- | ----------------------------------- |
| `pnpm lint`      | ESLint と Prettier の検査           |
| `pnpm lint:fix`  | ESLint の自動修正と Prettier の適用 |
| `pnpm typecheck` | 各アプリの型検査                    |
| `pnpm test`      | 各アプリのテスト                    |
| `pnpm build`     | 各アプリのビルド                    |

コミット前に lefthook が `typecheck` と `lint` を、push 前に `test` を走らせます。
CI（`.github/workflows/ci.yml`）は PR と `main` への push で同じものを実行します。

### ローカルの Cognito（cognito-local）

本物の Cognito の代わりに、`docker compose` の `cognito-local` を使います。

- エンドポイントは `http://localhost:9229`
- 確認コード（サインアップの確認・パスワード再設定）はメールではなく、コンテナのログに出ます。
  `docker-compose.yml` で `CODE=123456` に固定しているので、ログを見なくても `123456` で通ります
- ユーザープールとクライアントのデータは `.cognito/db/` に保存されます（git では追跡しない）
