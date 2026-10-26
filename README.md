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

- Node.js 24（`.node-version`）
- pnpm 10（`corepack enable` で `package.json` の `packageManager` の版が使われる）
- Docker（PostgreSQL と cognito-local を動かす）

## 開発

```sh
pnpm install                                   # 依存の取得。git hooks（lefthook）もここで入る
pnpm db:up                                     # PostgreSQL と cognito-local を起動
pnpm --filter @cognito-prac/api cognito:setup  # cognito-local にプールとクライアントを作り apps/api/.env に書く
pnpm --filter @cognito-prac/api db:migrate     # DB のマイグレーション
pnpm dev                                       # api と web を同時に起動
```

API は `http://localhost:3000`、画面は `http://localhost:5173` で待ち受けます。

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

## API（`apps/api`）

Hono のサーバーです。画面は Cognito を直接呼ばず、すべてこの API を経由します。
Cognito の呼び出し（`src/cognito/`）、トークンの検証（`src/auth/`）、DB（`src/db/`）を
それぞれ interface の裏に置き、ルート（`src/routes/`）はそれらを組み合わせるだけにしています。

### 認証の流れ

- ログインすると API が Cognito の `USER_PASSWORD_AUTH` でトークンを取り、
  アクセストークンとリフレッシュトークンを **HttpOnly Cookie** に入れて返します。
  画面はトークンを扱いません
- 認証が要るエンドポイントは、Cookie のアクセストークンを Cognito の JWKS で検証します
  （`iss` と `client_id`、`token_use=access`）
- アクセストークンが切れたら、画面が `POST /api/auth/refresh` を呼んで Cookie を更新します
- ログインとリフレッシュのたびに、ID トークンの `sub` と `email` を `users` 表に upsert します。
  アプリが持つユーザー情報はこの表だけで、パスワードは Cognito にしかありません

### エンドポイント

すべて `/api/auth` の下。本文は JSON。失敗は `{ "error": { "code", "message" } }` の形で返します。

| メソッドとパス          | 内容                                                          |
| ----------------------- | ------------------------------------------------------------- |
| `POST /signup`          | サインアップ（`email`, `password`）。確認コードが送られる     |
| `POST /confirm`         | 確認コードでサインアップを確定（`email`, `code`）             |
| `POST /resend-code`     | 確認コードの再送（`email`）。cognito-local は未対応           |
| `POST /login`           | ログイン。Cookie を発行し `{ user }` を返す                   |
| `POST /refresh`         | リフレッシュトークンでアクセストークンを更新                  |
| `POST /logout`          | リフレッシュトークンを失効させ、Cookie を消す                 |
| `POST /forgot-password` | パスワード再設定のコードを送る（`email`）                     |
| `POST /reset-password`  | コードで新しいパスワードを設定（`email`, `code`, `password`） |
| `GET /me`               | ログイン中のユーザー。未認証は 401 `UNAUTHENTICATED`          |

エラーコードは `src/errors.ts` の `AuthErrorCode` にまとめています。
Cognito の例外との対応は `src/cognito/errors.ts` です。

### 環境変数

`apps/api/.env.example` を `apps/api/.env` にコピーして使います（`cognito:setup` が無ければ作ります）。

| 変数                   | 内容                                                           |
| ---------------------- | -------------------------------------------------------------- |
| `PORT`                 | 待ち受けポート（既定 3000）                                    |
| `DATABASE_URL`         | PostgreSQL の接続文字列                                        |
| `COGNITO_REGION`       | リージョン                                                     |
| `COGNITO_USER_POOL_ID` | ユーザープール ID                                              |
| `COGNITO_CLIENT_ID`    | アプリクライアント ID（**シークレットなし**で作る）            |
| `COGNITO_ENDPOINT`     | cognito-local の URL。本物の Cognito では空にする              |
| `COOKIE_SECURE`        | Cookie に `Secure` を付けるか。HTTPS で配信する環境では `true` |

### DB

PostgreSQL に [Drizzle ORM](https://orm.drizzle.team/) で接続します。スキーマは `src/db/schema.ts`、
マイグレーションは `apps/api/drizzle/` に SQL として置きます。

```sh
pnpm --filter @cognito-prac/api db:generate   # schema.ts の変更から SQL を生成
pnpm --filter @cognito-prac/api db:migrate    # 未適用の SQL を DATABASE_URL に適用
```

## 画面（`apps/web`）

Vite + React（react-router、Tailwind CSS）の SPA です。開発サーバーは `/api` を API（port 3000）へ
プロキシするので、画面と API は同一オリジンとして動きます。

### 画面と流れ

| パス               | 内容                                                                |
| ------------------ | ------------------------------------------------------------------- |
| `/`                | ログイン済みの人だけ。メールアドレス・sub・最終ログインとログアウト |
| `/login`           | ログイン。未確認のアカウントなら `/confirm` へ送る                  |
| `/signup`          | サインアップ。成功したら `/confirm` へ                              |
| `/confirm`         | 確認コードの入力（再送あり）。成功したら `/login` へ                |
| `/forgot-password` | 確認コードを送る。成功したら `/reset-password` へ                   |
| `/reset-password`  | コードと新しいパスワードを入力。成功したら `/login` へ              |

- 未ログインで `/` を開くと `/login` に飛び、ログイン後に元の画面へ戻ります（`RequireAuth`）
- ログイン済みで `/login` などを開くと `/` に飛びます（`GuestOnly`）
- 起動時は `GET /api/auth/me` でセッションを復元し、401 なら一度だけ `POST /api/auth/refresh` を
  試します（`AuthProvider`）。トークンは Cookie にあるので、画面のコードはトークンを持ちません
- API の呼び出しは `hono/client` の `hc` で、API 側の型（`@cognito-prac/api` の `AppType`）を
  そのまま使います。リクエストの形とレスポンスの型がずれるとビルドで落ちます

### テスト

`apps/web/src/App.test.tsx` が、`fetch` を差し替えてルーティングと認証の流れ（未ログインの
リダイレクト、セッション復元、ログイン成功・失敗、未確認アカウント、ログアウト）を確かめます。

## 本番に向けて（Terraform を足すとき）

アプリは環境変数しか見ないので、Terraform で次を用意し、その値を環境変数に渡せば動きます。

- **Cognito ユーザープール**: ユーザー名はメールアドレス（`username_attributes = ["email"]`）、
  `auto_verified_attributes = ["email"]`
- **アプリクライアント**: シークレットなし、`explicit_auth_flows` に
  `ALLOW_USER_PASSWORD_AUTH` と `ALLOW_REFRESH_TOKEN_AUTH`
- **PostgreSQL**（RDS など）: 接続文字列を `DATABASE_URL` に
- API には `COGNITO_ENDPOINT` を渡さない（空にする）。`COOKIE_SECURE=true` にする
- 画面と API は同一オリジンで配信する前提です（Cookie の `SameSite=Lax` で動く範囲）。
  別オリジンにする場合は CORS と Cookie の属性の見直しが要ります
