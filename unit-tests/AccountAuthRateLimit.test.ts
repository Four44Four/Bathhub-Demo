const mockTryEnforceActorRateLimit = jest.fn();

jest.mock("../app/_server/rate-limit/enforceRateLimit", () => ({
  tryEnforceActorRateLimit: (...args: unknown[]) =>
    mockTryEnforceActorRateLimit(...args),
}));

import {
  loginAccount,
  readAccountProfile,
  registerAccount,
  setAccountProfilePicture,
} from "../app/_server/accounts/AccountAuth";
import { ACCOUNT_REQUIRED_ERROR } from "../app/_shared/accounts/AccountReputation";

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

  test("setAccountProfilePicture checks the account before the image upload limit", async () => {
    const previousUrl = process.env.SUPABASE_URL;
    const previousKey = process.env.SUPABASE_KEY;
    const previousFetch = global.fetch;
    process.env.SUPABASE_URL = "http://127.0.0.1:54323";
    process.env.SUPABASE_KEY = "anon-key";
    const fetchMock = jest.fn();
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ message: "JWT expired" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      await expect(
        setAccountProfilePicture("token", "text/plain", "YQ=="),
      ).resolves.toEqual({ val: null, errorMsg: ACCOUNT_REQUIRED_ERROR });
      expect(mockTryEnforceActorRateLimit).not.toHaveBeenCalled();

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "11111111-1111-1111-1111-111111111111",
          username: "ada_user",
          reputation_score: 0,
          profile_picture_mime: null,
          profile_picture_base64: null,
        }),
      });
      const message =
        "Rate limit exceeded: image uploading is limited to 10 requests per 10 minutes.";
      mockTryEnforceActorRateLimit.mockResolvedValue({
        allowed: false,
        message,
      });

      await expect(
        setAccountProfilePicture("token", "image/png", "YQ=="),
      ).resolves.toEqual({ val: null, errorMsg: message });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(mockTryEnforceActorRateLimit).toHaveBeenCalledWith(
        "account-image-upload",
        "token",
      );
    } finally {
      if (previousUrl === undefined) {
        delete process.env.SUPABASE_URL;
      } else {
        process.env.SUPABASE_URL = previousUrl;
      }
      if (previousKey === undefined) {
        delete process.env.SUPABASE_KEY;
      } else {
        process.env.SUPABASE_KEY = previousKey;
      }
      global.fetch = previousFetch;
    }
  });
});
