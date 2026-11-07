const mockTryEnforceActorRateLimit = jest.fn();

jest.mock("../app/_server/rate-limit/enforceRateLimit", () => ({
  tryEnforceActorRateLimit: (...args: unknown[]) =>
    mockTryEnforceActorRateLimit(...args),
}));

import {
  loginAccount,
  readAccountProfile,
  registerAccount,
} from "../app/_server/accounts/AccountAuth";

describe("account auth rate limit scopes", () => {
  beforeEach(() => {
    mockTryEnforceActorRateLimit.mockReset();
  });

  test("registerAccount enforces account creation after local validation", async () => {
    const message =
      "Rate limit exceeded: account creation is limited to 1 request per 12 hours.";
    mockTryEnforceActorRateLimit.mockResolvedValue({
      allowed: false,
      message,
    });

    await expect(registerAccount("no", "passw0rd")).resolves.toEqual({
      val: null,
      errorMsg:
        "Username must be 3-32 characters of letters, numbers, or underscores",
    });
    expect(mockTryEnforceActorRateLimit).not.toHaveBeenCalled();

    await expect(registerAccount("ada_user", "passw0rd")).resolves.toEqual({
      val: null,
      errorMsg: message,
    });
    expect(mockTryEnforceActorRateLimit).toHaveBeenCalledTimes(1);
    expect(mockTryEnforceActorRateLimit).toHaveBeenCalledWith("account-create");
  });

  test("loginAccount enforces account login after local validation", async () => {
    const message =
      "Rate limit exceeded: account login is limited to 10 requests per 5 minutes.";
    mockTryEnforceActorRateLimit.mockResolvedValue({
      allowed: false,
      message,
    });

    await expect(loginAccount("ada_user", "short")).resolves.toEqual({
      val: null,
      errorMsg: "Password must be at least 6 characters",
    });
    expect(mockTryEnforceActorRateLimit).not.toHaveBeenCalled();

    await expect(loginAccount("ada_user", "passw0rd")).resolves.toEqual({
      val: null,
      errorMsg: message,
    });
    expect(mockTryEnforceActorRateLimit).toHaveBeenCalledWith("account-login");
  });

  test("readAccountProfile enforces account profile reads for the signed-in token", async () => {
    const message =
      "Rate limit exceeded: account reading is limited to 30 requests per minute.";
    mockTryEnforceActorRateLimit.mockResolvedValue({
      allowed: false,
      message,
    });

    await expect(readAccountProfile("token")).resolves.toEqual({
      val: null,
      errorMsg: message,
    });
    expect(mockTryEnforceActorRateLimit).toHaveBeenCalledWith(
      "account-profile",
      "token",
    );
  });
});
