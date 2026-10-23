import { CognitoIdentityProviderServiceException } from "@aws-sdk/client-cognito-identity-provider";

import { AuthError } from "../errors.js";

const KNOWN: Record<string, () => AuthError> = {
  UsernameExistsException: () =>
    new AuthError(
      409,
      "EMAIL_ALREADY_EXISTS",
      "このメールアドレスは登録済みです",
    ),
  UserNotConfirmedException: () =>
    new AuthError(
      403,
      "USER_NOT_CONFIRMED",
      "メールアドレスの確認が済んでいません",
    ),
  PasswordResetRequiredException: () =>
    new AuthError(
      403,
      "PASSWORD_RESET_REQUIRED",
      "パスワードの再設定が必要です",
    ),
  UserNotFoundException: () =>
    new AuthError(404, "USER_NOT_FOUND", "ユーザーが見つかりません"),
  NotAuthorizedException: () =>
    new AuthError(401, "INVALID_CREDENTIALS", "認証に失敗しました"),
  InvalidPasswordException: () =>
    new AuthError(
      400,
      "INVALID_PASSWORD",
      "パスワードがポリシーを満たしていません",
    ),
  InvalidParameterException: () =>
    new AuthError(400, "INVALID_PARAMETER", "入力が正しくありません"),
  CodeMismatchException: () =>
    new AuthError(400, "CODE_MISMATCH", "確認コードが一致しません"),
  ExpiredCodeException: () =>
    new AuthError(400, "CODE_EXPIRED", "確認コードの有効期限が切れています"),
  LimitExceededException: () =>
    new AuthError(429, "TOO_MANY_REQUESTS", "試行回数が上限に達しました"),
  TooManyRequestsException: () =>
    new AuthError(429, "TOO_MANY_REQUESTS", "試行回数が上限に達しました"),
};

export function isCognitoError(
  error: unknown,
  names?: readonly string[],
): error is CognitoIdentityProviderServiceException {
  return (
    error instanceof CognitoIdentityProviderServiceException &&
    (names === undefined || names.includes(error.name))
  );
}

/**
 * SDK の例外を AuthError に写す。名前が分からない Cognito の例外は、相手側の
 * 不調か未対応の操作なので 502 にして名前を残す。Cognito 以外の例外はそのまま返す。
 */
export function toAuthError(error: unknown): unknown {
  if (!isCognitoError(error)) return error;
  const known = KNOWN[error.name];
  if (known) return known();
  return new AuthError(502, "COGNITO_ERROR", `Cognito error: ${error.name}`);
}
