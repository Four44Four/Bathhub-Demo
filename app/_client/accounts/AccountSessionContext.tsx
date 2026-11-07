"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  ACCOUNT_REQUIRED_ERROR,
  type AccountProfile,
} from "../../_shared/accounts/AccountReputation";
import {
  loginAccount,
  readAccountProfile,
  registerAccount,
  setAccountProfilePicture,
} from "../../_server/accounts/AccountAuth";
import { registerAccountAccessTokenReader } from "./accountAccessToken";

const ACCOUNT_SESSION_STORAGE_KEY = "bathhub-account-session";

export type AccountSessionApi = {
  profile: AccountProfile | null;
  login: (username: string, password: string) => Promise<string | null>;
  register: (username: string, password: string) => Promise<string | null>;
  refreshProfile: () => Promise<void>;
  setProfilePicture: (mimeType: string, imageBase64: string) => Promise<string | null>;
};

const AccountSessionContext = createContext<AccountSessionApi | null>(null);

function readStoredProfile(): AccountProfile | null {
  if (typeof sessionStorage === "undefined") {
    return null;
  }
  const raw = sessionStorage.getItem(ACCOUNT_SESSION_STORAGE_KEY);
  if (raw == null) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<AccountProfile>;
    if (
      typeof parsed.accessToken !== "string" ||
      typeof parsed.accountId !== "string" ||
      typeof parsed.username !== "string" ||
      typeof parsed.reputationScore !== "number"
    ) {
      return null;
    }
    return {
      accessToken: parsed.accessToken,
      accountId: parsed.accountId,
      username: parsed.username,
      reputationScore: parsed.reputationScore,
      profilePictureDataUrl:
        typeof parsed.profilePictureDataUrl === "string"
          ? parsed.profilePictureDataUrl
          : null,
    };
  } catch {
    return null;
  }
}

function storeProfile(profile: AccountProfile | null): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  if (profile == null) {
    sessionStorage.removeItem(ACCOUNT_SESSION_STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(ACCOUNT_SESSION_STORAGE_KEY, JSON.stringify(profile));
}

export function AccountSessionProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<AccountProfile | null>(null);

  useEffect(() => {
    setProfile(readStoredProfile());
  }, []);

  useEffect(() => {
    return registerAccountAccessTokenReader(() => profile?.accessToken ?? null);
  }, [profile]);

  const applyProfile = useCallback((next: AccountProfile | null) => {
    setProfile(next);
    storeProfile(next);
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const result = await loginAccount(username, password);
      if (result.val == null) {
        return result.errorMsg ?? "Login failed";
      }
      applyProfile(result.val);
      return null;
    },
    [applyProfile],
  );

  const register = useCallback(
    async (username: string, password: string) => {
      const result = await registerAccount(username, password);
      if (result.val == null) {
        return result.errorMsg ?? "Registration failed";
      }
      applyProfile(result.val);
      return null;
    },
    [applyProfile],
  );

  const refreshProfile = useCallback(async () => {
    const accessToken = profile?.accessToken;
    if (accessToken == null) {
      return;
    }
    const result = await readAccountProfile(accessToken);
    if (result.val != null) {
      applyProfile(result.val);
    }
  }, [applyProfile, profile?.accessToken]);

  const setProfilePicture = useCallback(
    async (mimeType: string, imageBase64: string) => {
      const accessToken = profile?.accessToken;
      if (accessToken == null) {
        return ACCOUNT_REQUIRED_ERROR;
      }
      const result = await setAccountProfilePicture(
        accessToken,
        mimeType,
        imageBase64,
      );
      if (result.val == null) {
        return result.errorMsg ?? "Image upload failed";
      }
      applyProfile(result.val);
      return null;
    },
    [applyProfile, profile?.accessToken],
  );

  const value = useMemo(
    () => ({
      profile,
      login,
      register,
      refreshProfile,
      setProfilePicture,
    }),
    [login, profile, refreshProfile, register, setProfilePicture],
  );

  return (
    <AccountSessionContext.Provider value={value}>
      {children}
    </AccountSessionContext.Provider>
  );
}

export function useAccountSession(): AccountSessionApi {
  const value = useContext(AccountSessionContext);
  if (value === null) {
    throw new Error("useAccountSession must be used within AccountSessionProvider");
  }
  return value;
}
