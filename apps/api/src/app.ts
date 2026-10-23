import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";

import { AuthError } from "./errors.js";
import { createAuthRoutes, type AuthRouteDeps } from "./routes/auth.js";

export type AppDeps = AuthRouteDeps;

export function createApp(deps: AppDeps) {
  const app = new Hono();

  app.use(logger());

  app.onError((error, c) => {
    if (error instanceof AuthError) {
      return c.json(
        { error: { code: error.code, message: error.message } },
        error.status,
      );
    }
    if (error instanceof HTTPException) {
      return error.getResponse();
    }
    console.error(error);
    return c.json(
      { error: { code: "INTERNAL_ERROR", message: "Internal Server Error" } },
      500,
    );
  });

  return app
    .basePath("/api")
    .get("/health", (c) => c.json({ ok: true }))
    .route("/auth", createAuthRoutes(deps));
}

export type AppType = ReturnType<typeof createApp>;
