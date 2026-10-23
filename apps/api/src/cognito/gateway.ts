export type AuthTokens = {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  /** アクセストークンの有効期間（秒） */
  expiresIn: number;
};

export type RefreshedTokens = Omit<AuthTokens, "refreshToken">;

/**
 * Cognito の呼び出し口。アプリが使う操作だけを持ち、SDK の型を外に出さない。
 * 失敗は AuthError（想定済み）か、そのままの例外（想定外）で伝える。
 */
export interface CognitoGateway {
  signUp(email: string, password: string): Promise<{ confirmed: boolean }>;
  confirmSignUp(email: string, code: string): Promise<void>;
  resendConfirmationCode(email: string): Promise<void>;
  login(email: string, password: string): Promise<AuthTokens>;
  refresh(refreshToken: string): Promise<RefreshedTokens>;
  revoke(refreshToken: string): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  confirmForgotPassword(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<void>;
}
