"use server";

import { createClient } from "@supabase/supabase-js";

import {
  ACCOUNT_REQUIRED_ERROR,
  accountEmailFromUsername,
  accountPasswordValidationError,
  accountUsernameValidationError,
  type AccountProfile,
} from "../../_shared/accounts/AccountReputation";
import { accountProfileFromOwnAccountRow } from "../../_shared/accounts/ProfileImageUpload";
import { type PublicAccountProfile } from "../../_shared/accounts/PublicAccountProfile";
import { type Errorable } from "../../_shared/Utils";
import { registerAccountWithAuthClient } from "../pure/accounts/RegisterAccount";
import {
  GET_ACCOUNT_PROFILE_RPC_NAME,
  readPublicAccountProfile as readPublicAccountProfileCore,
  type GetAccountProfileRpc,
} from "../pure/accounts/ReadPublicAccountProfile";
import { uploadAccountProfilePicture } from "../pure/accounts/UploadProfilePicture";
import { getSupabaseKey, getSupabaseUrl } from "../EnvironmentVariables";
import { tryEnforceActorRateLimit } from "../rate-limit/enforceRateLimit";
import { parsePostgrestRpcErrorMessage } from "../pure/postgrest/PostgrestRpc";

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

function rpcErrorMessage(body: unknown, fallback: string): string {
  if (typeof body === "object" && body !== null && "message" in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  return fallback;
}

function profileFromRpcBody(
  accessToken: string,
  body: unknown,
  refreshToken: string | null = null,
): AccountProfile | null {
  return accountProfileFromOwnAccountRow(
    accessToken,
    Array.isArray(body) ? body[0] : body,
    refreshToken,
  );
}

async function postAccountRpc(
  accessToken: string,
  functionName: string,
  params: Record<string, unknown>,
): Promise<{ ok: boolean; body: unknown }> {
  const response = await fetch(
    `${getSupabaseUrl()}/rest/v1/rpc/${functionName}`,
    {
      method: "POST",
      headers: {
        apikey: getSupabaseKey(),
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(params),
    },
  );
  const body: unknown = await response.json().catch(() => null);
  return { ok: response.ok, body };
}

async function readOwnAccount(
  accessToken: string,
  refreshToken: string | null = null,
): Promise<Errorable<AccountProfile>> {
  const response = await postAccountRpc(accessToken, "get_own_account", {});
  if (!response.ok) {
    return { val: null, errorMsg: ACCOUNT_REQUIRED_ERROR };
  }
  const profile = profileFromRpcBody(accessToken, response.body, refreshToken);
  if (profile == null) {
    return { val: null, errorMsg: ACCOUNT_REQUIRED_ERROR };
  }
  return { val: profile };
}

async function writeOwnProfilePicture(
  accessToken: string,
  mimeType: string,
  imageBase64: string,
  refreshToken: string | null = null,
): Promise<Errorable<AccountProfile>> {
  const response = await postAccountRpc(accessToken, "set_own_profile_picture", {
    p_mime: mimeType,
    p_image_base64: imageBase64,
  });
  if (!response.ok) {
    return {
      val: null,
      errorMsg: rpcErrorMessage(response.body, "Image upload failed"),
    };
  }
  const profile = profileFromRpcBody(accessToken, response.body, refreshToken);
  if (profile == null) {
    return { val: null, errorMsg: ACCOUNT_REQUIRED_ERROR };
  }
  return { val: profile };
}

async function sessionProfile(
  accessToken: string | undefined,
  refreshToken: string | null = null,
): Promise<Errorable<AccountProfile>> {
  if (accessToken == null || accessToken.length === 0) {
    return { val: null, errorMsg: ACCOUNT_REQUIRED_ERROR };
  }
  return readOwnAccount(accessToken, refreshToken);
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
          refreshToken: signedUp.data.session?.refresh_token ?? null,
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
          refreshToken: signedIn.data.session?.refresh_token ?? null,
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

  return sessionProfile(
    signedIn.data.session.access_token,
    signedIn.data.session.refresh_token ?? null,
  );
}

export async function refreshAccountSession(
  refreshToken: string,
): Promise<Errorable<AccountProfile>> {
  if (refreshToken.trim().length === 0) {
    return { val: null, errorMsg: ACCOUNT_REQUIRED_ERROR };
  }

  const rateLimit = await tryEnforceActorRateLimit("account-login");
  if (!rateLimit.allowed) {
    return { val: null, errorMsg: rateLimit.message };
  }

  const supabase = authClient();
  const refreshed = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });
  if (refreshed.error !== null || refreshed.data.session == null) {
    return {
      val: null,
      errorMsg: refreshed.error?.message ?? ACCOUNT_REQUIRED_ERROR,
    };
  }

  return sessionProfile(
    refreshed.data.session.access_token,
    refreshed.data.session.refresh_token ?? refreshToken,
  );
}

export async function readAccountProfile(
  accessToken: string,
  refreshToken: string | null = null,
): Promise<Errorable<AccountProfile>> {
  const rateLimit = await tryEnforceActorRateLimit("account-profile", accessToken);
  if (!rateLimit.allowed) {
    return { val: null, errorMsg: rateLimit.message };
  }
  return sessionProfile(accessToken, refreshToken);
}

export async function readPublicAccountProfile(
  accountId: string,
  accessToken?: string | null,
): Promise<Errorable<PublicAccountProfile>> {
  const rateLimit = await tryEnforceActorRateLimit(
    "account-profile",
    accessToken,
  );
  if (!rateLimit.allowed) {
    return { val: null, errorMsg: rateLimit.message };
  }

  try {
    const rpc: GetAccountProfileRpc = async (params) => {
      const response = await fetch(
        `${getSupabaseUrl()}/rest/v1/rpc/${GET_ACCOUNT_PROFILE_RPC_NAME}`,
        {
          method: "POST",
          headers: {
            apikey: getSupabaseKey(),
            Authorization: `Bearer ${
              accessToken != null && accessToken.length > 0
                ? accessToken
                : getSupabaseKey()
            }`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(params),
        },
      );
      const rawBody: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        return {
          data: null,
          error: {
            message: parsePostgrestRpcErrorMessage(
              rawBody,
              response.statusText,
            ),
          },
        };
      }
      return { data: rawBody, error: null };
    };
    return { val: await readPublicAccountProfileCore(accountId, rpc) };
  } catch (error: unknown) {
    return {
      val: null,
      errorMsg: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function setAccountProfilePicture(
  accessToken: string,
  mimeType: string,
  imageBase64: string,
  refreshToken: string | null = null,
): Promise<Errorable<AccountProfile>> {
  return uploadAccountProfilePicture(
    { accessToken, mimeType, imageBase64 },
    {
      readLoggedInAccount: async (token) => {
        const profile = await sessionProfile(token, refreshToken);
        return profile.val;
      },
      enforceRateLimit: async () =>
        tryEnforceActorRateLimit("account-image-upload", accessToken),
      storeProfilePicture: (_profile, mime, encoded) =>
        writeOwnProfilePicture(accessToken, mime, encoded, refreshToken),
    },
  );
}
