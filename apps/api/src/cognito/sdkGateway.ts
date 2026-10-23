import {
  CognitoIdentityProviderClient,
  ConfirmForgotPasswordCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
  RevokeTokenCommand,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";

import { toAuthError } from "./errors.js";
import type { AuthTokens, CognitoGateway, RefreshedTokens } from "./gateway.js";

export type SdkGatewayOptions = {
  region: string;
  clientId: string;
  /** cognito-local を指すときだけ。本物の Cognito では未指定にする */
  endpoint?: string | undefined;
};

export function createSdkCognitoGateway(
  options: SdkGatewayOptions,
): CognitoGateway {
  const client = new CognitoIdentityProviderClient({
    region: options.region,
    endpoint: options.endpoint,
    // 使う API はすべて未署名で呼べる（クライアント ID だけで足りる）。
    // 資格情報を持たせないことで、SDK が環境から AWS の鍵を探しに行かなくなる。
    credentials: { accessKeyId: "unused", secretAccessKey: "unused" },
  });
  const clientId = options.clientId;

  const call = async <T>(run: () => Promise<T>): Promise<T> => {
    try {
      return await run();
    } catch (error) {
      throw toAuthError(error);
    }
  };

  return {
    async signUp(email, password) {
      const result = await call(() =>
        client.send(
          new SignUpCommand({
            ClientId: clientId,
            Username: email,
            Password: password,
            UserAttributes: [{ Name: "email", Value: email }],
          }),
        ),
      );
      return { confirmed: result.UserConfirmed ?? false };
    },

    async confirmSignUp(email, code) {
      await call(() =>
        client.send(
          new ConfirmSignUpCommand({
            ClientId: clientId,
            Username: email,
            ConfirmationCode: code,
          }),
        ),
      );
    },

    async resendConfirmationCode(email) {
      await call(() =>
        client.send(
          new ResendConfirmationCodeCommand({
            ClientId: clientId,
            Username: email,
          }),
        ),
      );
    },

    async login(email, password): Promise<AuthTokens> {
      const result = await call(() =>
        client.send(
          new InitiateAuthCommand({
            ClientId: clientId,
            AuthFlow: "USER_PASSWORD_AUTH",
            AuthParameters: { USERNAME: email, PASSWORD: password },
          }),
        ),
      );
      const tokens = result.AuthenticationResult;
      if (!tokens?.AccessToken || !tokens.IdToken || !tokens.RefreshToken) {
        // MFA などのチャレンジが返った場合。この最小構成では扱わない。
        throw new Error(
          `Unexpected auth challenge: ${result.ChallengeName ?? "unknown"}`,
        );
      }
      return {
        accessToken: tokens.AccessToken,
        idToken: tokens.IdToken,
        refreshToken: tokens.RefreshToken,
        expiresIn: tokens.ExpiresIn ?? 3600,
      };
    },

    async refresh(refreshToken): Promise<RefreshedTokens> {
      const result = await call(() =>
        client.send(
          new InitiateAuthCommand({
            ClientId: clientId,
            AuthFlow: "REFRESH_TOKEN_AUTH",
            AuthParameters: { REFRESH_TOKEN: refreshToken },
          }),
        ),
      );
      const tokens = result.AuthenticationResult;
      if (!tokens?.AccessToken || !tokens.IdToken) {
        throw new Error("Refresh returned no tokens");
      }
      return {
        accessToken: tokens.AccessToken,
        idToken: tokens.IdToken,
        expiresIn: tokens.ExpiresIn ?? 3600,
      };
    },

    async revoke(refreshToken) {
      await call(() =>
        client.send(
          new RevokeTokenCommand({ ClientId: clientId, Token: refreshToken }),
        ),
      );
    },

    async forgotPassword(email) {
      await call(() =>
        client.send(
          new ForgotPasswordCommand({ ClientId: clientId, Username: email }),
        ),
      );
    },

    async confirmForgotPassword(email, code, newPassword) {
      await call(() =>
        client.send(
          new ConfirmForgotPasswordCommand({
            ClientId: clientId,
            Username: email,
            ConfirmationCode: code,
            Password: newPassword,
          }),
        ),
      );
    },
  };
}
