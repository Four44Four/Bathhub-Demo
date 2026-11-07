import { profilePictureDataUrl } from "./ProfileImageUpload";

/** Public account fields shown on the account page and comment avatars. */
export type PublicAccountProfile = {
  accountId: string;
  username: string;
  reputationScore: number;
  profilePictureDataUrl: string | null;
};

export function publicAccountProfileFromRow(
  row: unknown,
): PublicAccountProfile | null {
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
    accountId: record.id,
    username: record.username,
    reputationScore: record.reputation_score,
    profilePictureDataUrl: pictureDataUrl,
  };
}
