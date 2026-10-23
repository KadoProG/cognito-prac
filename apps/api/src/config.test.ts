import { describe, expect, it } from "vitest";

import { loadConfig } from "./config.js";

const base = {
  DATABASE_URL: "postgres://postgres:postgres@localhost:5432/app",
  COGNITO_REGION: "ap-northeast-1",
  COGNITO_USER_POOL_ID: "ap-northeast-1_abc123",
  COGNITO_CLIENT_ID: "client",
};

describe("loadConfig", () => {
  it("derives the Cognito issuer from the region when no endpoint is set", () => {
    const config = loadConfig({ ...base, COGNITO_ENDPOINT: "" });

    expect(config.cognito.endpoint).toBeUndefined();
    expect(config.cognito.issuer).toBe(
      "https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_abc123",
    );
  });

  it("derives the issuer from the local endpoint when one is set", () => {
    const config = loadConfig({
      ...base,
      COGNITO_ENDPOINT: "http://localhost:9229/",
    });

    expect(config.cognito.issuer).toBe(
      "http://localhost:9229/ap-northeast-1_abc123",
    );
  });

  it("treats an empty COOKIE_SECURE as false", () => {
    const config = loadConfig({ ...base, COOKIE_SECURE: "" });

    expect(config.cookieSecure).toBe(false);
  });

  it("rejects missing required variables", () => {
    expect(() => loadConfig({ ...base, COGNITO_CLIENT_ID: "" })).toThrow(
      /COGNITO_CLIENT_ID/,
    );
  });
});
