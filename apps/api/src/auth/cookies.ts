import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

// Cognito のリフレッシュトークンの既定の有効期間（30 日）に合わせる。
const REFRESH_TOKEN_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export type CookieOptions = { secure: boolean };

const base = (secure: boolean) => ({
  httpOnly: true,
  secure,
  sameSite: "Lax" as const,
  path: "/",
});

export function setAccessTokenCookie(
  c: Context,
  token: string,
  expiresInSeconds: number,
  options: CookieOptions,
) {
  setCookie(c, ACCESS_TOKEN_COOKIE, token, {
    ...base(options.secure),
    maxAge: expiresInSeconds,
  });
}

export function setRefreshTokenCookie(
  c: Context,
  token: string,
  options: CookieOptions,
) {
  setCookie(c, REFRESH_TOKEN_COOKIE, token, {
    ...base(options.secure),
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
  });
}

export function clearAuthCookies(c: Context) {
  deleteCookie(c, ACCESS_TOKEN_COOKIE, { path: "/" });
  deleteCookie(c, REFRESH_TOKEN_COOKIE, { path: "/" });
}

export function readAccessToken(c: Context): string | undefined {
  return getCookie(c, ACCESS_TOKEN_COOKIE);
}

export function readRefreshToken(c: Context): string | undefined {
  return getCookie(c, REFRESH_TOKEN_COOKIE);
}
