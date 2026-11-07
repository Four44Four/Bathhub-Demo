import {
  ACCOUNT_REQUIRED_ERROR,
  accountEmailFromUsername,
  accountPasswordValidationError,
  accountUsernameValidationError,
  normalizeAccountUsername,
  type AccountProfile,
} from "../../../_shared/accounts/AccountReputation";
import { type Errorable } from "../../../_shared/Utils";

export type AccountAuthAttempt = {
  accessToken: string | null;
  refreshToken: string | null;
  errorMessage: string | null;
};

export type AccountAuthClient = {
  signUp: (input: {
    email: string;
    password: string;
    username: string;
  }) => Promise<AccountAuthAttempt>;
  signIn: (input: {
    email: string;
    password: string;
  }) => Promise<AccountAuthAttempt>;
};

/**
 * Public sign-up path used by {@link registerAccount}.
 * Validates the username and password, creates the auth user with username
 * metadata, and reads the account profile. Rate limits stay with the caller.
 */
export async function registerAccountWithAuthClient(
  username: string,
  password: string,
  authClient: AccountAuthClient,
  readProfile: (
    accessToken: string,
    refreshToken: string | null,
  ) => Promise<Errorable<AccountProfile>>,
): Promise<Errorable<AccountProfile>> {
  const usernameError = accountUsernameValidationError(username);
  if (usernameError !== null) {
    return { val: null, errorMsg: usernameError };
  }
  const passwordError = accountPasswordValidationError(password);
  if (passwordError !== null) {
    return { val: null, errorMsg: passwordError };
  }

  const normalizedUsername = normalizeAccountUsername(username);
  const email = accountEmailFromUsername(normalizedUsername);
  const signedUp = await authClient.signUp({
    email,
    password,
    username: normalizedUsername,
  });
  if (signedUp.errorMessage !== null && signedUp.accessToken === null) {
    return { val: null, errorMsg: signedUp.errorMessage };
  }

  let accessToken = signedUp.accessToken;
  let refreshToken = signedUp.refreshToken;
  if (accessToken == null) {
    const signedIn = await authClient.signIn({ email, password });
    if (signedIn.errorMessage !== null || signedIn.accessToken == null) {
      return {
        val: null,
        errorMsg: signedIn.errorMessage ?? ACCOUNT_REQUIRED_ERROR,
      };
    }
    accessToken = signedIn.accessToken;
    refreshToken = signedIn.refreshToken;
  }

  return readProfile(accessToken, refreshToken);
}
