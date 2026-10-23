import type { AppType, AuthErrorCode } from "@cognito-prac/api";
import { hc } from "hono/client";
import type { ClientResponse } from "hono/client";

export type ApiErrorCode = AuthErrorCode | "INTERNAL_ERROR" | "UNKNOWN";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** API の型をそのまま持つクライアント。`api.api.auth.login.$post(...)` の形で呼ぶ。 */
export const api = hc<AppType>("/", { init: { credentials: "same-origin" } });

export type User = {
  sub: string;
  email: string;
  lastLoginAt: string;
};

const isErrorBody = (
  body: unknown,
): body is { error: { code: ApiErrorCode; message: string } } =>
  typeof body === "object" &&
  body !== null &&
  "error" in body &&
  typeof body.error === "object" &&
  body.error !== null &&
  "code" in body.error &&
  "message" in body.error;

/**
 * レスポンスを成功の本文に解き、失敗は ApiError にして投げる。
 * 204 のときは本文が無いので undefined を返す。
 */
export async function unwrap<T>(
  response: ClientResponse<T>,
): Promise<T extends null ? undefined : T> {
  if (response.ok) {
    if (response.status === 204) {
      return undefined as T extends null ? undefined : T;
    }
    return (await response.json()) as T extends null ? undefined : T;
  }
  const body: unknown = await response.json().catch(() => null);
  if (isErrorBody(body)) {
    throw new ApiError(response.status, body.error.code, body.error.message);
  }
  throw new ApiError(response.status, "UNKNOWN", `HTTP ${response.status}`);
}

/** 画面に出す文言。API の message は利用者向けに書かれているのでそのまま使う。 */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "通信に失敗しました。時間をおいて再度お試しください";
}
