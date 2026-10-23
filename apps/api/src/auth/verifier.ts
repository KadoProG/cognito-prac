import { createRemoteJWKSet, errors as joseErrors, jwtVerify } from "jose";

export type AccessTokenClaims = {
  sub: string;
};

/** アクセストークンを検証して主体を返す。無効なら null。 */
export interface TokenVerifier {
  verifyAccessToken(token: string): Promise<AccessTokenClaims | null>;
}

export type JwksVerifierOptions = {
  /** `https://cognito-idp.<region>.amazonaws.com/<poolId>` か cognito-local の同じ形 */
  issuer: string;
  clientId: string;
};

export function createJwksTokenVerifier(
  options: JwksVerifierOptions,
): TokenVerifier {
  const jwks = createRemoteJWKSet(
    new URL(`${options.issuer}/.well-known/jwks.json`),
  );

  return {
    async verifyAccessToken(token) {
      try {
        const { payload } = await jwtVerify(token, jwks, {
          issuer: options.issuer,
        });
        // Cognito のアクセストークンは aud ではなく client_id を持つ。
        if (
          payload.token_use !== "access" ||
          payload.client_id !== options.clientId
        ) {
          return null;
        }
        if (typeof payload.sub !== "string") return null;
        return { sub: payload.sub };
      } catch (error) {
        if (error instanceof joseErrors.JOSEError) return null;
        throw error;
      }
    },
  };
}
