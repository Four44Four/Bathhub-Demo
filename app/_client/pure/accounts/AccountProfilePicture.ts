import {
  createMultiColorImage,
  type ImageDescriptor,
} from "../Image";

/** Encodes image bytes for the profile-picture upload request. */
export function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, Math.min(index + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/**
 * Uploaded pictures are multi-color. Accounts without one keep the default icon.
 */
export function accountProfilePictureImage(
  profilePictureDataUrl: string | null,
  defaultPicture: ImageDescriptor,
): ImageDescriptor {
  if (profilePictureDataUrl == null || profilePictureDataUrl.length === 0) {
    return defaultPicture;
  }
  return createMultiColorImage(profilePictureDataUrl);
}
