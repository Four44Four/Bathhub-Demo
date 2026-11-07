import { registerAccountWithAuthClient } from "../app/_server/pure/accounts/RegisterAccount";
import type { AccountProfile } from "../app/_shared/accounts/AccountReputation";
import type { Errorable } from "../app/_shared/Utils";

describe("registerAccountWithAuthClient", () => {
  const profile: AccountProfile = {
    accountId: "account-1",
    username: "ada_user",
    reputationScore: 0,
    accessToken: "token",
    refreshToken: "refresh",
    profilePictureDataUrl: null,
  };

  test("signs up through the public client and reads the new profile", async () => {
    const signUp = jest.fn(async () => ({
      accessToken: "token",
      refreshToken: "refresh",
      errorMessage: null,
    }));
    const signIn = jest.fn(async () => ({
      accessToken: null,
      refreshToken: null,
      errorMessage: "not called",
    }));
    const readProfile = jest.fn(
      async (): Promise<Errorable<AccountProfile>> => ({ val: profile }),
    );

    const result = await registerAccountWithAuthClient(
      "  Ada_User ",
      "passw0rd",
      { signUp, signIn },
      readProfile,
    );

    expect(result.val).toEqual(profile);
    expect(signUp).toHaveBeenCalledWith({
      email: "ada_user@accounts.bathhub.local",
      password: "passw0rd",
      username: "ada_user",
    });
    expect(signIn).not.toHaveBeenCalled();
    expect(readProfile).toHaveBeenCalledWith("token", "refresh");
  });

  test("signs in when sign-up does not return a session", async () => {
    const result = await registerAccountWithAuthClient(
      "ada_user",
      "passw0rd",
      {
        signUp: async () => ({
          accessToken: null,
          refreshToken: null,
          errorMessage: null,
        }),
        signIn: async () => ({
          accessToken: "signed-in",
          refreshToken: "refresh-in",
          errorMessage: null,
        }),
      },
      async () => ({
        val: { ...profile, accessToken: "signed-in", refreshToken: "refresh-in" },
      }),
    );

    expect(result.val?.accessToken).toBe("signed-in");
  });

  test("rejects a username the account rules do not allow", async () => {
    const signUp = jest.fn();
    const result = await registerAccountWithAuthClient(
      "no",
      "passw0rd",
      {
        signUp,
        signIn: async () => ({
          accessToken: null,
          refreshToken: null,
          errorMessage: null,
        }),
      },
      async () => ({ val: profile }),
    );

    expect(result.val).toBeNull();
    expect(result.errorMsg).toMatch(/Username/);
    expect(signUp).not.toHaveBeenCalled();
  });
});
