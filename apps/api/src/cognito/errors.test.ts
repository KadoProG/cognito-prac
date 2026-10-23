import { CognitoIdentityProviderServiceException } from "@aws-sdk/client-cognito-identity-provider";
import { describe, expect, it } from "vitest";

import { AuthError } from "../errors.js";
import { toAuthError } from "./errors.js";

const cognitoError = (name: string) =>
  new CognitoIdentityProviderServiceException({
    name,
    $fault: "client",
    $metadata: {},
  });

describe("toAuthError", () => {
  it("maps known Cognito exceptions to client errors", () => {
    const error = toAuthError(cognitoError("UsernameExistsException"));

    expect(error).toBeInstanceOf(AuthError);
    expect(error).toMatchObject({ status: 409, code: "EMAIL_ALREADY_EXISTS" });
  });

  it("maps unknown Cognito exceptions to 502 and keeps the name", () => {
    const error = toAuthError(cognitoError("SomethingNewException"));

    expect(error).toMatchObject({ status: 502, code: "COGNITO_ERROR" });
    expect((error as AuthError).message).toContain("SomethingNewException");
  });

  it("passes non-Cognito errors through untouched", () => {
    const original = new TypeError("fetch failed");

    expect(toAuthError(original)).toBe(original);
  });
});
