import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { requireAuth } from "../auth/middleware.js";
import type { TokenVerifier } from "../auth/verifier.js";
import { AuthError } from "../errors.js";
import type { UserRepository } from "../users/repository.js";

export type MeRouteDeps = {
  verifier: TokenVerifier;
  users: UserRepository;
};

const name = z.string().trim().min(1).max(50);

/** ログイン中の本人のプロフィール。対象は常にアクセストークンの sub で、ID は受け取らない。 */
export function createMeRoutes(deps: MeRouteDeps) {
  return new Hono().patch(
    "/",
    requireAuth(deps.verifier),
    zValidator("json", z.object({ name }), (result) => {
      if (!result.success) {
        throw new AuthError(400, "VALIDATION_ERROR", "入力が正しくありません");
      }
    }),
    async (c) => {
      const body = c.req.valid("json");
      const user = await deps.users.updateProfile(c.var.auth.sub, {
        name: body.name,
      });
      if (!user) {
        throw new AuthError(401, "UNAUTHENTICATED", "ログインが必要です");
      }
      return c.json({ user });
    },
  );
}
