import { createMiddleware } from "hono/factory";

import { AuthError } from "../errors.js";
import { readAccessToken } from "./cookies.js";
import type { AccessTokenClaims, TokenVerifier } from "./verifier.js";

export type AuthVariables = { auth: AccessTokenClaims };

/** アクセストークンの Cookie を検証し、主体を c.var.auth に置く。無ければ 401。 */
export function requireAuth(verifier: TokenVerifier) {
  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const token = readAccessToken(c);
    const claims = token ? await verifier.verifyAccessToken(token) : null;
    if (!claims) {
      throw new AuthError(401, "UNAUTHENTICATED", "ログインが必要です");
    }
    c.set("auth", claims);
    await next();
  });
}
