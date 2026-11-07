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
import { accessTokenIsExpired } from "../../_shared/accounts/AccessTokenExpiry";
import {
  loginAccount,
  readAccountProfile,
  refreshAccountSession,
  registerAccount,
  setAccountProfilePicture,
} from "../../_server/accounts/AccountAuth";
import {
  registerAccountAccessTokenReader,
  registerAccountAccessTokenRefresher,
} from "./accountAccessToken";

const ACCOUNT_SESSION_STORAGE_KEY = "bathhub-account-session";

export type AccountSessionApi = {
  profile: AccountProfile | null;
  login: (username: string, password: string) => Promise<string | null>;
  register: (username: string, password: string) => Promise<string | null>;
  refreshProfile: () => Promise<void>;
  ensureFreshAccessToken: () => Promise<string | null>;
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
      refreshToken:
        typeof parsed.refreshToken === "string" ? parsed.refreshToken : null,
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

  const applyProfile = useCallback((next: AccountProfile | null) => {
    setProfile(next);
    storeProfile(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = readStoredProfile();
      if (stored == null) {
        return;
      }
      if (!accessTokenIsExpired(stored.accessToken)) {
        if (!cancelled) {
          applyProfile(stored);
        }
        return;
      }
      if (stored.refreshToken == null || stored.refreshToken.length === 0) {
        storeProfile(null);
        return;
      }
      const refreshed = await refreshAccountSession(stored.refreshToken);
      if (cancelled) {
        return;
      }
      if (refreshed.val == null) {
        storeProfile(null);
        return;
      }
      applyProfile(refreshed.val);
    })();
    return () => {
      cancelled = true;
    };
  }, [applyProfile]);

  const ensureFreshAccessToken = useCallback(async (): Promise<string | null> => {
    const current = profile;
    if (current == null) {
      return null;
    }
    if (!accessTokenIsExpired(current.accessToken)) {
      return current.accessToken;
    }
    if (current.refreshToken == null || current.refreshToken.length === 0) {
      applyProfile(null);
      return null;
    }
    const refreshed = await refreshAccountSession(current.refreshToken);
    if (refreshed.val == null) {
      applyProfile(null);
      return null;
    }
    applyProfile(refreshed.val);
    return refreshed.val.accessToken;
  }, [applyProfile, profile]);

  useEffect(() => {
    return registerAccountAccessTokenReader(() => profile?.accessToken ?? null);
  }, [profile]);

  useEffect(() => {
    return registerAccountAccessTokenRefresher(ensureFreshAccessToken);
  }, [ensureFreshAccessToken]);

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
    const accessToken = await ensureFreshAccessToken();
    if (accessToken == null) {
      return;
    }
    const result = await readAccountProfile(
      accessToken,
      profile?.refreshToken ?? null,
    );
    if (result.val != null) {
      applyProfile({
        ...result.val,
        refreshToken: result.val.refreshToken ?? profile?.refreshToken ?? null,
      });
    }
  }, [applyProfile, ensureFreshAccessToken, profile?.refreshToken]);

  const setProfilePicture = useCallback(
    async (mimeType: string, imageBase64: string) => {
      const accessToken = await ensureFreshAccessToken();
      if (accessToken == null) {
        return ACCOUNT_REQUIRED_ERROR;
      }
      const result = await setAccountProfilePicture(
        accessToken,
        mimeType,
        imageBase64,
        profile?.refreshToken ?? null,
      );
      if (result.val == null) {
        return result.errorMsg ?? "Image upload failed";
      }
      applyProfile({
        ...result.val,
        refreshToken: result.val.refreshToken ?? profile?.refreshToken ?? null,
      });
      return null;
    },
    [applyProfile, ensureFreshAccessToken, profile?.refreshToken],
  );

  const value = useMemo(
    () => ({
      profile,
      login,
      register,
      refreshProfile,
      ensureFreshAccessToken,
      setProfilePicture,
    }),
    [
      ensureFreshAccessToken,
      login,
      profile,
      refreshProfile,
      register,
      setProfilePicture,
    ],
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
