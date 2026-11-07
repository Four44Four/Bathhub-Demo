import {
  ACCOUNT_REQUIRED_ERROR,
  type AccountProfile,
} from "../../../_shared/accounts/AccountReputation";
import {
  normalizeImageMimeType,
  profileImageUploadRejection,
} from "../../../_shared/accounts/ProfileImageUpload";
import { type Errorable } from "../../../_shared/Utils";

export type ProfilePictureRateLimitResult =
  | { allowed: true }
  | { allowed: false; message: string };

export type UploadProfilePictureDependencies = {
  readLoggedInAccount: (accessToken: string) => Promise<AccountProfile | null>;
  enforceRateLimit: (
    accountId: string,
  ) => Promise<ProfilePictureRateLimitResult>;
  storeProfilePicture: (
    profile: AccountProfile,
    mimeType: string,
    imageBase64: string,
  ) => Promise<Errorable<AccountProfile>>;
};

function decodeBase64ImageBytes(value: string): Uint8Array | null {
  const compact = value.replace(/\s+/g, "");
  if (compact.length === 0 || compact.length % 4 === 1) {
    return null;
  }
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compact)) {
    return null;
  }
  const decoded = Buffer.from(compact, "base64");
  if (decoded.length === 0) {
    return null;
  }
  return new Uint8Array(decoded);
}

/**
 * Profile-picture upload.
 * A missing account is rejected before the image is inspected.
 * A signed-in account is then rate limited, and the image is accepted only
 * when its MIME type, dimensions, and file size pass, in that order.
 */
export async function uploadAccountProfilePicture(
  input: {
    accessToken: string | null;
    mimeType: string;
    imageBase64: string;
  },
  deps: UploadProfilePictureDependencies,
): Promise<Errorable<AccountProfile>> {
  const accessToken = input.accessToken?.trim() ?? "";
  if (accessToken.length === 0) {
    return { val: null, errorMsg: ACCOUNT_REQUIRED_ERROR };
  }
  const profile = await deps.readLoggedInAccount(accessToken);
  if (profile == null) {
    return { val: null, errorMsg: ACCOUNT_REQUIRED_ERROR };
  }

  const rateLimit = await deps.enforceRateLimit(profile.accountId);
  if (!rateLimit.allowed) {
    return { val: null, errorMsg: rateLimit.message };
  }

  const imageBytes = decodeBase64ImageBytes(input.imageBase64) ?? new Uint8Array();
  const rejection = profileImageUploadRejection({
    isLoggedIn: true,
    mimeType: input.mimeType,
    imageBytes,
  });
  if (rejection != null) {
    return { val: null, errorMsg: rejection };
  }

  return deps.storeProfilePicture(
    profile,
    normalizeImageMimeType(input.mimeType),
    Buffer.from(imageBytes).toString("base64"),
  );
}
