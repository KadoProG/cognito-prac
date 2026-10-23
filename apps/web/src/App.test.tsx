import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App.tsx";

type Handler = (request: Request) => Response | Promise<Response>;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const unauthenticated = () =>
  json(401, {
    error: { code: "UNAUTHENTICATED", message: "ログインが必要です" },
  });

const user = {
  sub: "sub-1",
  email: "user@example.com",
  lastLoginAt: "2026-10-23T00:00:00Z",
};

/** パスごとの応答を決める fetch を差し込む。決めていないパスは失敗にして気づけるようにする。 */
function mockApi(handlers: Record<string, Handler>) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      const key = `${request.method} ${new URL(request.url).pathname}`;
      calls.push(key);
      const handler = handlers[key];
      if (!handler) throw new Error(`Unexpected request: ${key}`);
      return handler(request);
    }),
  );
  return calls;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("redirects an unauthenticated visitor from / to the login page", async () => {
    mockApi({
      "GET /api/auth/me": unauthenticated,
      "POST /api/auth/refresh": unauthenticated,
    });

    renderAt("/");

    expect(
      await screen.findByRole("heading", { name: "ログイン" }),
    ).toBeInTheDocument();
  });

  it("shows the home page when the session cookie is still valid", async () => {
    mockApi({ "GET /api/auth/me": () => json(200, { user }) });

    renderAt("/");

    expect(await screen.findByText("user@example.com")).toBeInTheDocument();
  });

  it("recovers the session through refresh when the access token has expired", async () => {
    const calls = mockApi({
      "GET /api/auth/me": unauthenticated,
      "POST /api/auth/refresh": () => json(200, { user }),
    });

    renderAt("/");

    expect(await screen.findByText("user@example.com")).toBeInTheDocument();
    expect(calls).toEqual(["GET /api/auth/me", "POST /api/auth/refresh"]);
  });

  it("logs in and lands on the home page", async () => {
    mockApi({
      "GET /api/auth/me": unauthenticated,
      "POST /api/auth/refresh": unauthenticated,
      "POST /api/auth/login": async (request) => {
        expect(await request.json()).toEqual({
          email: "user@example.com",
          password: "Password123!",
        });
        return json(200, { user });
      },
    });
    renderAt("/login");

    await userEvent.type(
      await screen.findByLabelText("メールアドレス"),
      "user@example.com",
    );
    await userEvent.type(screen.getByLabelText("パスワード"), "Password123!");
    await userEvent.click(screen.getByRole("button", { name: "ログイン" }));

    expect(
      await screen.findByRole("heading", { name: "ようこそ" }),
    ).toBeInTheDocument();
  });

  it("shows the API error message when login fails", async () => {
    mockApi({
      "GET /api/auth/me": unauthenticated,
      "POST /api/auth/refresh": unauthenticated,
      "POST /api/auth/login": () =>
        json(401, {
          error: {
            code: "INVALID_CREDENTIALS",
            message: "メールアドレスかパスワードが違います",
          },
        }),
    });
    renderAt("/login");

    await userEvent.type(
      await screen.findByLabelText("メールアドレス"),
      "user@example.com",
    );
    await userEvent.type(screen.getByLabelText("パスワード"), "wrong-password");
    await userEvent.click(screen.getByRole("button", { name: "ログイン" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "メールアドレスかパスワードが違います",
    );
  });

  it("sends an unconfirmed user to the confirmation page", async () => {
    mockApi({
      "GET /api/auth/me": unauthenticated,
      "POST /api/auth/refresh": unauthenticated,
      "POST /api/auth/login": () =>
        json(403, { error: { code: "USER_NOT_CONFIRMED", message: "未確認" } }),
    });
    renderAt("/login");

    await userEvent.type(
      await screen.findByLabelText("メールアドレス"),
      "user@example.com",
    );
    await userEvent.type(screen.getByLabelText("パスワード"), "Password123!");
    await userEvent.click(screen.getByRole("button", { name: "ログイン" }));

    expect(
      await screen.findByRole("heading", { name: "メールアドレスの確認" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toHaveValue(
      "user@example.com",
    );
  });

  it("logs out and returns to the login page", async () => {
    mockApi({
      "GET /api/auth/me": () => json(200, { user }),
      "POST /api/auth/logout": () => new Response(null, { status: 204 }),
    });
    renderAt("/");

    await userEvent.click(
      await screen.findByRole("button", { name: "ログアウト" }),
    );

    expect(
      await screen.findByRole("heading", { name: "ログイン" }),
    ).toBeInTheDocument();
  });
});
