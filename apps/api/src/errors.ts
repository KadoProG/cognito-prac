import type { ContentfulStatusCode } from "hono/utils/http-status";

export type AuthErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_CREDENTIALS"
  | "UNAUTHENTICATED"
  | "USER_NOT_CONFIRMED"
  | "PASSWORD_RESET_REQUIRED"
  | "EMAIL_ALREADY_EXISTS"
  | "USER_NOT_FOUND"
  | "INVALID_PASSWORD"
  | "INVALID_PARAMETER"
  | "CODE_MISMATCH"
  | "CODE_EXPIRED"
  | "TOO_MANY_REQUESTS"
  | "COGNITO_ERROR";

/** クライアントに返す想定済みの失敗。ルートの外（onError）で 1 箇所だけ JSON に写す。 */
export class AuthError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: AuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}
