import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { decodeJwt } from "jose";
import { z } from "zod";

import {
  clearAuthCookies,
  readRefreshToken,
  setAccessTokenCookie,
  setRefreshTokenCookie,
} from "../auth/cookies.js";
import { requireAuth } from "../auth/middleware.js";
import type { TokenVerifier } from "../auth/verifier.js";
import type { CognitoGateway } from "../cognito/gateway.js";
import { AuthError } from "../errors.js";
import type { UserRepository } from "../users/repository.js";

export type AuthRouteDeps = {
  cognito: CognitoGateway;
  verifier: TokenVerifier;
  users: UserRepository;
  cookieSecure: boolean;
};

const email = z.email();
const password = z.string().min(8).max(256);
const code = z.string().min(1).max(16);

const json = <T extends z.ZodType>(schema: T) =>
  zValidator("json", schema, (result) => {
    if (!result.success) {
      throw new AuthError(400, "VALIDATION_ERROR", "入力が正しくありません");
    }
  });

/**
 * ID トークンから、アプリのユーザー表に写す情報を取り出す。
 * トークンは Cognito から TLS 越しに受け取った直後のものなので、署名の検証はしない。
 */
function readIdentity(idToken: string): { cognitoSub: string; email: string } {
  const claims = decodeJwt(idToken);
  if (typeof claims.sub !== "string" || typeof claims.email !== "string") {
    throw new Error("ID token lacks sub or email");
  }
  return { cognitoSub: claims.sub, email: claims.email };
}

export function createAuthRoutes(deps: AuthRouteDeps) {
  const cookieOptions = { secure: deps.cookieSecure };

  return new Hono()
    .post("/signup", json(z.object({ email, password })), async (c) => {
      const body = c.req.valid("json");
      const result = await deps.cognito.signUp(body.email, body.password);
      return c.json({ confirmed: result.confirmed });
    })

    .post("/confirm", json(z.object({ email, code })), async (c) => {
      const body = c.req.valid("json");
      await deps.cognito.confirmSignUp(body.email, body.code);
      return c.body(null, 204);
    })

    .post("/resend-code", json(z.object({ email })), async (c) => {
      const body = c.req.valid("json");
      await deps.cognito.resendConfirmationCode(body.email);
      return c.body(null, 204);
    })

    .post("/login", json(z.object({ email, password })), async (c) => {
      const body = c.req.valid("json");
      const tokens = await deps.cognito
        .login(body.email, body.password)
        .catch((error: unknown) => {
          // ユーザーの有無とパスワードの誤りを区別して返さない。cognito-local は
          // パスワード誤りを InvalidPasswordException で返すので、それも同じ扱いにする。
          if (
            error instanceof AuthError &&
            [
              "USER_NOT_FOUND",
              "INVALID_PASSWORD",
              "INVALID_CREDENTIALS",
            ].includes(error.code)
          ) {
            throw new AuthError(
              401,
              "INVALID_CREDENTIALS",
              "メールアドレスかパスワードが違います",
            );
          }
          throw error;
        });
      const user = await deps.users.upsertOnLogin(readIdentity(tokens.idToken));
      setAccessTokenCookie(
        c,
        tokens.accessToken,
        tokens.expiresIn,
        cookieOptions,
      );
      setRefreshTokenCookie(c, tokens.refreshToken, cookieOptions);
      return c.json({ user });
    })

    .post("/refresh", async (c) => {
      const refreshToken = readRefreshToken(c);
      if (!refreshToken) {
        throw new AuthError(401, "UNAUTHENTICATED", "ログインが必要です");
      }
      const tokens = await deps.cognito
        .refresh(refreshToken)
        .catch((error: unknown) => {
          if (error instanceof AuthError) clearAuthCookies(c);
          throw error;
        });
      const user = await deps.users.upsertOnLogin(readIdentity(tokens.idToken));
      setAccessTokenCookie(
        c,
        tokens.accessToken,
        tokens.expiresIn,
        cookieOptions,
      );
      return c.json({ user });
    })

    .post("/logout", async (c) => {
      const refreshToken = readRefreshToken(c);
      if (refreshToken) {
        // 失効済み・不正なトークンで Cognito が断っても、Cookie を消せばログアウトの目的は
        // 果たせる。想定済みの失敗だけ無視し、それ以外（接続不能など）は上に投げる。
        await deps.cognito.revoke(refreshToken).catch((error: unknown) => {
          if (!(error instanceof AuthError)) throw error;
        });
      }
      clearAuthCookies(c);
      return c.body(null, 204);
    })

    .post("/forgot-password", json(z.object({ email })), async (c) => {
      const body = c.req.valid("json");
      await deps.cognito.forgotPassword(body.email);
      return c.body(null, 204);
    })

    .post(
      "/reset-password",
      json(z.object({ email, code, password })),
      async (c) => {
        const body = c.req.valid("json");
        await deps.cognito.confirmForgotPassword(
          body.email,
          body.code,
          body.password,
        );
        return c.body(null, 204);
      },
    )

    .get("/me", requireAuth(deps.verifier), async (c) => {
      const user = await deps.users.findByCognitoSub(c.var.auth.sub);
      if (!user) {
        // トークンは有効だがアプリ側に行が無い（DB を作り直した等）。
        // 再ログインかリフレッシュで upsert されるので、未認証として扱う。
        throw new AuthError(401, "UNAUTHENTICATED", "ログインが必要です");
      }
      return c.json({ user });
    });
}
