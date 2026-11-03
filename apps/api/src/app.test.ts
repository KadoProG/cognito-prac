import { describe, expect, it } from "vitest";

import { createApp } from "./app.js";
import type { TokenVerifier } from "./auth/verifier.js";
import type { CognitoGateway } from "./cognito/gateway.js";
import { AuthError } from "./errors.js";
import {
  defaultNameFromEmail,
  type User,
  type UserRepository,
} from "./users/repository.js";

const SUB = "11111111-1111-1111-1111-111111111111";
const EMAIL = "user@example.com";

/** 署名なしの JWT 風文字列。decodeJwt が payload を読めればよい。 */
const fakeJwt = (payload: Record<string, unknown>) =>
  [
    "e30",
    Buffer.from(JSON.stringify(payload)).toString("base64url"),
    "sig",
  ].join(".");

function fakeCognito(overrides: Partial<CognitoGateway> = {}): CognitoGateway {
  const tokens = {
    accessToken: "access",
    idToken: fakeJwt({ sub: SUB, email: EMAIL }),
    refreshToken: "refresh",
    expiresIn: 3600,
  };
  return {
    signUp: async () => ({ confirmed: false }),
    confirmSignUp: async () => {},
    resendConfirmationCode: async () => {},
    login: async () => tokens,
    refresh: async () => tokens,
    revoke: async () => {},
    forgotPassword: async () => {},
    confirmForgotPassword: async () => {},
    ...overrides,
  };
}

function fakeUsers(): UserRepository & { rows: Map<string, User> } {
  const rows = new Map<string, User>();
  return {
    rows,
    async upsertOnLogin(input) {
      const user = {
        sub: input.cognitoSub,
        email: input.email,
        name:
          rows.get(input.cognitoSub)?.name ?? defaultNameFromEmail(input.email),
        lastLoginAt: new Date(),
      };
      rows.set(input.cognitoSub, user);
      return user;
    },
    async findByCognitoSub(sub) {
      return rows.get(sub) ?? null;
    },
    async updateProfile(sub, input) {
      const user = rows.get(sub);
      if (!user) return null;
      const updated = { ...user, ...input };
      rows.set(sub, updated);
      return updated;
    },
  };
}

const verifier: TokenVerifier = {
  verifyAccessToken: async (token) =>
    token === "access" ? { sub: SUB } : null,
};

function setup(overrides: Partial<CognitoGateway> = {}) {
  const users = fakeUsers();
  const app = createApp({
    cognito: fakeCognito(overrides),
    verifier,
    users,
    cookieSecure: false,
  });
  const post = (
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ) =>
    app.request(`/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  return { app, users, post };
}

describe("POST /api/auth/login", () => {
  it("sets auth cookies and registers the user", async () => {
    const { users, post } = setup();

    const res = await post("/login", {
      email: EMAIL,
      password: "Password123!",
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      user: { sub: SUB, email: EMAIL },
    });
    const cookies = res.headers.getSetCookie();
    expect(
      cookies.some(
        (c) => c.startsWith("access_token=access;") && c.includes("HttpOnly"),
      ),
    ).toBe(true);
    expect(cookies.some((c) => c.startsWith("refresh_token=refresh;"))).toBe(
      true,
    );
    expect(users.rows.get(SUB)?.email).toBe(EMAIL);
  });

  it("starts the name from the part of the email before the @", async () => {
    const { post } = setup();

    const res = await post("/login", {
      email: EMAIL,
      password: "Password123!",
    });

    expect(await res.json()).toMatchObject({ user: { name: "user" } });
  });

  it("returns 401 INVALID_CREDENTIALS without revealing whether the user exists", async () => {
    const { post } = setup({
      login: async () => {
        throw new AuthError(404, "USER_NOT_FOUND", "not found");
      },
    });

    const res = await post("/login", {
      email: EMAIL,
      password: "Password123!",
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: { code: "INVALID_CREDENTIALS", message: expect.any(String) },
    });
  });

  it("returns 403 USER_NOT_CONFIRMED when the account is unconfirmed", async () => {
    const { post } = setup({
      login: async () => {
        throw new AuthError(403, "USER_NOT_CONFIRMED", "unconfirmed");
      },
    });

    const res = await post("/login", {
      email: EMAIL,
      password: "Password123!",
    });

    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("USER_NOT_CONFIRMED");
  });

  it("rejects malformed input with 400 VALIDATION_ERROR", async () => {
    const { post } = setup();

    const res = await post("/login", {
      email: "not-an-email",
      password: "short",
    });

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /api/auth/me", () => {
  it("returns 401 without a valid access token", async () => {
    const { app } = setup();

    const res = await app.request("/api/auth/me", {
      headers: { cookie: "access_token=bogus" },
    });

    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHENTICATED");
  });

  it("returns the user when the access token is valid", async () => {
    const { app, users } = setup();
    await users.upsertOnLogin({ cognitoSub: SUB, email: EMAIL });

    const res = await app.request("/api/auth/me", {
      headers: { cookie: "access_token=access" },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      user: { sub: SUB, email: EMAIL },
    });
  });
});

describe("defaultNameFromEmail", () => {
  it("takes the part before the @", () => {
    expect(defaultNameFromEmail("taro@example.co.jp")).toBe("taro");
  });

  it("falls back to the whole address when nothing precedes the @", () => {
    expect(defaultNameFromEmail("@example.com")).toBe("@example.com");
    expect(defaultNameFromEmail("taro")).toBe("taro");
  });
});

describe("PATCH /api/me", () => {
  const patch = (
    app: ReturnType<typeof setup>["app"],
    body: unknown,
    cookie = "access_token=access",
  ) =>
    app.request("/api/me", {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify(body),
    });

  it("returns 401 without a valid access token", async () => {
    const { app } = setup();

    const res = await patch(app, { name: "Taro" }, "access_token=bogus");

    expect(res.status).toBe(401);
  });

  it("updates the name of the logged-in user", async () => {
    const { app, users } = setup();
    await users.upsertOnLogin({ cognitoSub: SUB, email: EMAIL });

    const res = await patch(app, { name: "  Taro  " });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      user: { sub: SUB, name: "Taro" },
    });
    expect(users.rows.get(SUB)?.name).toBe("Taro");
  });

  it("keeps the name when the user logs in again", async () => {
    const { app, users, post } = setup();
    await users.upsertOnLogin({ cognitoSub: SUB, email: EMAIL });
    await patch(app, { name: "Taro" });

    const res = await post("/login", {
      email: EMAIL,
      password: "Password123!",
    });

    expect(await res.json()).toMatchObject({ user: { name: "Taro" } });
  });

  it.each([{ name: "" }, { name: "   " }, { name: "a".repeat(51) }, {}])(
    "rejects invalid input %j with 400 VALIDATION_ERROR",
    async (body) => {
      const { app, users } = setup();
      await users.upsertOnLogin({ cognitoSub: SUB, email: EMAIL });

      const res = await patch(app, body);

      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
    },
  );
});

describe("POST /api/auth/refresh", () => {
  it("returns 401 without a refresh token", async () => {
    const { post } = setup();

    const res = await post("/refresh");

    expect(res.status).toBe(401);
  });

  it("issues a new access token cookie", async () => {
    const { post } = setup();

    const res = await post("/refresh", undefined, {
      cookie: "refresh_token=refresh",
    });

    expect(res.status).toBe(200);
    expect(
      res.headers
        .getSetCookie()
        .some((c) => c.startsWith("access_token=access;")),
    ).toBe(true);
  });

  it("clears cookies when Cognito rejects the refresh token", async () => {
    const { post } = setup({
      refresh: async () => {
        throw new AuthError(401, "INVALID_CREDENTIALS", "revoked");
      },
    });

    const res = await post("/refresh", undefined, {
      cookie: "refresh_token=refresh",
    });

    expect(res.status).toBe(401);
    expect(
      res.headers.getSetCookie().some((c) => c.startsWith("refresh_token=;")),
    ).toBe(true);
  });
});

describe("POST /api/auth/logout", () => {
  it("revokes the refresh token and clears cookies", async () => {
    let revoked: string | undefined;
    const { post } = setup({
      revoke: async (token) => {
        revoked = token;
      },
    });

    const res = await post("/logout", undefined, {
      cookie: "refresh_token=refresh",
    });

    expect(res.status).toBe(204);
    expect(revoked).toBe("refresh");
    const cookies = res.headers.getSetCookie();
    expect(cookies.some((c) => c.startsWith("access_token=;"))).toBe(true);
    expect(cookies.some((c) => c.startsWith("refresh_token=;"))).toBe(true);
  });
});

describe("POST /api/auth/signup", () => {
  it("maps duplicate emails to 409 EMAIL_ALREADY_EXISTS", async () => {
    const { post } = setup({
      signUp: async () => {
        throw new AuthError(409, "EMAIL_ALREADY_EXISTS", "exists");
      },
    });

    const res = await post("/signup", {
      email: EMAIL,
      password: "Password123!",
    });

    expect(res.status).toBe(409);
  });
});
