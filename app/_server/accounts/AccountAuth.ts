"use server";

import { createClient } from "@supabase/supabase-js";

import {
  ACCOUNT_REQUIRED_ERROR,
  accountEmailFromUsername,
  accountPasswordValidationError,
  accountUsernameValidationError,
  type AccountProfile,
} from "../../_shared/accounts/AccountReputation";
import { type Errorable } from "../../_shared/Utils";
import { registerAccountWithAuthClient } from "../pure/accounts/RegisterAccount";
import { getSupabaseKey, getSupabaseUrl } from "../EnvironmentVariables";
import { tryEnforceActorRateLimit } from "../rate-limit/enforceRateLimit";

const AUTH_OPTIONS = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
} as const;

function authClient() {
  return createClient(getSupabaseUrl(), getSupabaseKey(), {
    auth: AUTH_OPTIONS,
  });
}

function profileFromSession(
  accessToken: string,
  accountId: string,
  username: string,
  reputationScore: number,
): AccountProfile {
  return { accessToken, accountId, username, reputationScore };
}

async function readOwnAccount(
  accessToken: string,
): Promise<Errorable<AccountProfile>> {
  const response = await fetch(`${getSupabaseUrl()}/rest/v1/rpc/get_own_account`, {
    method: "POST",
    headers: {
      apikey: getSupabaseKey(),
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: "{}",
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    return { val: null, errorMsg: ACCOUNT_REQUIRED_ERROR };
  }
  const row = Array.isArray(body) ? body[0] : body;
  if (
    typeof row !== "object" ||
    row === null ||
    typeof (row as { id?: unknown }).id !== "string" ||
    typeof (row as { username?: unknown }).username !== "string" ||
    typeof (row as { reputation_score?: unknown }).reputation_score !== "number"
  ) {
    return { val: null, errorMsg: ACCOUNT_REQUIRED_ERROR };
  }
  const record = row as {
    id: string;
    username: string;
    reputation_score: number;
  };
  return {
    val: profileFromSession(
      accessToken,
      record.id,
      record.username,
      record.reputation_score,
    ),
  };
}

async function sessionProfile(
  accessToken: string | undefined,
): Promise<Errorable<AccountProfile>> {
  if (accessToken == null || accessToken.length === 0) {
    return { val: null, errorMsg: ACCOUNT_REQUIRED_ERROR };
  }
  return readOwnAccount(accessToken);
}

export async function registerAccount(
  username: string,
  password: string,
): Promise<Errorable<AccountProfile>> {
  const usernameError = accountUsernameValidationError(username);
  if (usernameError !== null) {
    return { val: null, errorMsg: usernameError };
  }
  const passwordError = accountPasswordValidationError(password);
  if (passwordError !== null) {
    return { val: null, errorMsg: passwordError };
  }

  const rateLimit = await tryEnforceActorRateLimit("account-create");
  if (!rateLimit.allowed) {
    return { val: null, errorMsg: rateLimit.message };
  }

  const supabase = authClient();
  return registerAccountWithAuthClient(
    username,
    password,
    {
      signUp: async (input) => {
        const signedUp = await supabase.auth.signUp({
          email: input.email,
          password: input.password,
          options: { data: { username: input.username } },
        });
        return {
          accessToken: signedUp.data.session?.access_token ?? null,
          errorMessage: signedUp.error?.message ?? null,
        };
      },
      signIn: async (input) => {
        const signedIn = await supabase.auth.signInWithPassword({
          email: input.email,
          password: input.password,
        });
        return {
          accessToken: signedIn.data.session?.access_token ?? null,
          errorMessage: signedIn.error?.message ?? null,
        };
      },
    },
    sessionProfile,
  );
}

export async function loginAccount(
  username: string,
  password: string,
): Promise<Errorable<AccountProfile>> {
  const usernameError = accountUsernameValidationError(username);
  if (usernameError !== null) {
    return { val: null, errorMsg: usernameError };
  }
  const passwordError = accountPasswordValidationError(password);
  if (passwordError !== null) {
    return { val: null, errorMsg: passwordError };
  }

  const rateLimit = await tryEnforceActorRateLimit("account-login");
  if (!rateLimit.allowed) {
    return { val: null, errorMsg: rateLimit.message };
  }

  const supabase = authClient();
  const signedIn = await supabase.auth.signInWithPassword({
    email: accountEmailFromUsername(username),
    password,
  });
  if (signedIn.error !== null || signedIn.data.session == null) {
    return {
      val: null,
      errorMsg: signedIn.error?.message ?? ACCOUNT_REQUIRED_ERROR,
    };
  }

  return sessionProfile(signedIn.data.session.access_token);
}

export async function readAccountProfile(
  accessToken: string,
): Promise<Errorable<AccountProfile>> {
  const rateLimit = await tryEnforceActorRateLimit("account-profile", accessToken);
  if (!rateLimit.allowed) {
    return { val: null, errorMsg: rateLimit.message };
  }
  return sessionProfile(accessToken);
}
