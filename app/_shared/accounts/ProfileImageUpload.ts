import { ACCOUNT_REQUIRED_ERROR, type AccountProfile } from "./AccountReputation";
import { readImageDimensions } from "./ImageDimensions";

/** Width and height must each be strictly under this many pixels. */
export const PROFILE_IMAGE_MAX_EDGE_PX = 512;

/** File size must be strictly under 1 MB (1024 * 1024 bytes). */
export const PROFILE_IMAGE_MAX_FILE_BYTES = 1024 * 1024;

export const PROFILE_IMAGE_MIME_ERROR = "Uploaded file must be an image";
export const PROFILE_IMAGE_DIMENSIONS_ERROR =
  "Image dimensions must be under 512x512";
export const PROFILE_IMAGE_FILE_SIZE_ERROR =
  "Image file size must be under 1 MB";

const IMAGE_MIME_PATTERN = /^image\/[a-z0-9][a-z0-9.+-]*$/;

/** Strips parameters and canonicalizes aliases such as `image/jpg`. */
export function normalizeImageMimeType(mimeType: string): string {
  const base = mimeType.trim().toLowerCase().split(";", 1)[0]?.trim() ?? "";
  if (base === "image/jpg" || base === "image/pjpeg") {
    return "image/jpeg";
  }
  if (base === "image/x-ms-bmp") {
    return "image/bmp";
  }
  return base;
}

export function isImageMimeType(mimeType: string): boolean {
  return IMAGE_MIME_PATTERN.test(normalizeImageMimeType(mimeType));
}

/**
 * First failing profile-image check.
 * Order is login, MIME type, dimensions under 512x512, then file size under 1 MB.
 */
export function profileImageUploadRejection(input: {
  isLoggedIn: boolean;
  mimeType: string;
  imageBytes: Uint8Array;
}): string | null {
  if (!input.isLoggedIn) {
    return ACCOUNT_REQUIRED_ERROR;
  }
  const mimeType = normalizeImageMimeType(input.mimeType);
  if (!isImageMimeType(mimeType)) {
    return PROFILE_IMAGE_MIME_ERROR;
  }
  const dimensions = readImageDimensions(mimeType, input.imageBytes);
  if (
    dimensions == null ||
    dimensions.width >= PROFILE_IMAGE_MAX_EDGE_PX ||
    dimensions.height >= PROFILE_IMAGE_MAX_EDGE_PX
  ) {
    return PROFILE_IMAGE_DIMENSIONS_ERROR;
  }
  if (input.imageBytes.byteLength >= PROFILE_IMAGE_MAX_FILE_BYTES) {
    return PROFILE_IMAGE_FILE_SIZE_ERROR;
  }
  return null;
}

export function profilePictureDataUrl(
  mimeType: string,
  imageBase64: string,
): string | null {
  const mime = normalizeImageMimeType(mimeType);
  const compact = imageBase64.replace(/\s+/g, "");
  if (!isImageMimeType(mime) || compact.length === 0) {
    return null;
  }
  return `data:${mime};base64,${compact}`;
}

/** True when the account page is showing the signed-in user's own account. */
export function accountPageShowsChangeImageButton(
  viewedAccountId: string | null,
  viewerAccountId: string | null,
): boolean {
  return (
    viewedAccountId != null &&
    viewedAccountId.length > 0 &&
    viewedAccountId === viewerAccountId
  );
}

export function accountProfileFromOwnAccountRow(
  accessToken: string,
  row: unknown,
): AccountProfile | null {
  if (typeof row !== "object" || row === null) {
    return null;
  }
  const record = row as {
    id?: unknown;
    username?: unknown;
    reputation_score?: unknown;
    profile_picture_mime?: unknown;
    profile_picture_base64?: unknown;
  };
  if (
    typeof record.id !== "string" ||
    typeof record.username !== "string" ||
    typeof record.reputation_score !== "number"
  ) {
    return null;
  }
  const pictureDataUrl =
    typeof record.profile_picture_mime === "string" &&
    typeof record.profile_picture_base64 === "string"
      ? profilePictureDataUrl(
          record.profile_picture_mime,
          record.profile_picture_base64,
        )
      : null;
  return {
    accessToken,
    accountId: record.id,
    username: record.username,
    reputationScore: record.reputation_score,
    profilePictureDataUrl: pictureDataUrl,
  };
}
