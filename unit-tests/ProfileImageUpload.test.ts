import { readImageDimensions } from "../app/_shared/accounts/ImageDimensions";
import {
  bmpImageBytes,
  gifImageBytes,
  jpegImageBytes,
  pngImageBytes,
  pngImageBytesWithLength,
  svgImageBytes,
  webpVp8xImageBytes,
} from "../app/_shared/accounts/ProfileImageBytes";
import {
  ACCOUNT_REQUIRED_ERROR,
  type AccountProfile,
} from "../app/_shared/accounts/AccountReputation";
import {
  accountPageShowsChangeImageButton,
  accountProfileFromOwnAccountRow,
  PROFILE_IMAGE_DIMENSIONS_ERROR,
  PROFILE_IMAGE_FILE_SIZE_ERROR,
  PROFILE_IMAGE_MAX_FILE_BYTES,
  PROFILE_IMAGE_MIME_ERROR,
  profileImageUploadRejection,
  profilePictureDataUrl,
} from "../app/_shared/accounts/ProfileImageUpload";
import { uploadAccountProfilePicture } from "../app/_server/pure/accounts/UploadProfilePicture";

const ACCOUNT_ID = "11111111-1111-1111-1111-111111111111";

function profile(): AccountProfile {
  return {
    accountId: ACCOUNT_ID,
    username: "ada_user",
    reputationScore: 0,
    accessToken: "token",
    profilePictureDataUrl: null,
  };
}

describe("profile image upload checks", () => {
  test("reads edges for the supported image layouts", () => {
    expect(readImageDimensions("image/png", pngImageBytes(120, 80))).toEqual({
      width: 120,
      height: 80,
    });
    expect(readImageDimensions("image/jpeg", jpegImageBytes(64, 48))).toEqual({
      width: 64,
      height: 48,
    });
    expect(readImageDimensions("image/gif", gifImageBytes(15, 16))).toEqual({
      width: 15,
      height: 16,
    });
    expect(readImageDimensions("image/webp", webpVp8xImageBytes(32, 24))).toEqual({
      width: 32,
      height: 24,
    });
    expect(readImageDimensions("image/bmp", bmpImageBytes(9, 8))).toEqual({
      width: 9,
      height: 8,
    });
    expect(readImageDimensions("image/svg+xml", svgImageBytes(40, 30))).toEqual({
      width: 40,
      height: 30,
    });
  });

  test("rejects in login, mime, dimensions, then file-size order", () => {
    const wideAndLarge = pngImageBytesWithLength(512, 10, PROFILE_IMAGE_MAX_FILE_BYTES);
    expect(
      profileImageUploadRejection({
        isLoggedIn: false,
        mimeType: "text/plain",
        imageBytes: wideAndLarge,
      }),
    ).toBe(ACCOUNT_REQUIRED_ERROR);

    expect(
      profileImageUploadRejection({
        isLoggedIn: true,
        mimeType: "text/plain",
        imageBytes: pngImageBytes(10, 10),
      }),
    ).toBe(PROFILE_IMAGE_MIME_ERROR);
    expect(
      profileImageUploadRejection({
        isLoggedIn: true,
        mimeType: "image/tiff",
        imageBytes: pngImageBytes(10, 10),
      }),
    ).toBe(PROFILE_IMAGE_DIMENSIONS_ERROR);

    expect(
      profileImageUploadRejection({
        isLoggedIn: true,
        mimeType: "image/png",
        imageBytes: pngImageBytes(512, 10),
      }),
    ).toBe(PROFILE_IMAGE_DIMENSIONS_ERROR);
    expect(
      profileImageUploadRejection({
        isLoggedIn: true,
        mimeType: "image/png",
        imageBytes: pngImageBytes(10, 512),
      }),
    ).toBe(PROFILE_IMAGE_DIMENSIONS_ERROR);
    expect(
      profileImageUploadRejection({
        isLoggedIn: true,
        mimeType: "IMAGE/PNG; charset=binary",
        imageBytes: wideAndLarge,
      }),
    ).toBe(PROFILE_IMAGE_DIMENSIONS_ERROR);

    const tooLarge = pngImageBytesWithLength(511, 10, PROFILE_IMAGE_MAX_FILE_BYTES);
    expect(
      profileImageUploadRejection({
        isLoggedIn: true,
        mimeType: "image/png",
        imageBytes: tooLarge,
      }),
    ).toBe(PROFILE_IMAGE_FILE_SIZE_ERROR);
    expect(
      profileImageUploadRejection({
        isLoggedIn: true,
        mimeType: "image/jpg",
        imageBytes: jpegImageBytes(511, 511),
      }),
    ).toBeNull();
  });

  test("shows the change-image control only for the signed-in account", () => {
    expect(accountPageShowsChangeImageButton(ACCOUNT_ID, ACCOUNT_ID)).toBe(true);
    expect(accountPageShowsChangeImageButton(ACCOUNT_ID, "other")).toBe(false);
    expect(accountPageShowsChangeImageButton(null, ACCOUNT_ID)).toBe(false);
    expect(accountPageShowsChangeImageButton(ACCOUNT_ID, null)).toBe(false);
  });

  test("reads a stored picture into a profile data URL", () => {
    const parsed = accountProfileFromOwnAccountRow("token", {
      id: ACCOUNT_ID,
      username: "ada_user",
      reputation_score: 4,
      profile_picture_mime: "image/png",
      profile_picture_base64: "YQ==",
    });
    expect(parsed).toEqual({
      ...profile(),
      reputationScore: 4,
      profilePictureDataUrl: "data:image/png;base64,YQ==",
    });
    expect(profilePictureDataUrl("image/jpeg", "")).toBeNull();
    expect(
      accountProfileFromOwnAccountRow("token", {
        id: ACCOUNT_ID,
        username: "ada_user",
        reputation_score: 0,
        profile_picture_mime: null,
        profile_picture_base64: null,
      })?.profilePictureDataUrl,
    ).toBeNull();
  });
});

describe("uploadAccountProfilePicture", () => {
  test("stops logged-out callers before rate limiting or storing", async () => {
    const enforceRateLimit = jest.fn();
    const storeProfilePicture = jest.fn();
    const result = await uploadAccountProfilePicture(
      {
        accessToken: "token",
        mimeType: "text/plain",
        imageBase64: Buffer.from(pngImageBytes(10, 10)).toString("base64"),
      },
      {
        readLoggedInAccount: async () => null,
        enforceRateLimit,
        storeProfilePicture,
      },
    );
    expect(result).toEqual({ val: null, errorMsg: ACCOUNT_REQUIRED_ERROR });
    expect(enforceRateLimit).not.toHaveBeenCalled();
    expect(storeProfilePicture).not.toHaveBeenCalled();
  });

  test("rate limits a signed-in account before accepting the image", async () => {
    const storeProfilePicture = jest.fn();
    const result = await uploadAccountProfilePicture(
      {
        accessToken: "token",
        mimeType: "image/png",
        imageBase64: Buffer.from(pngImageBytes(10, 10)).toString("base64"),
      },
      {
        readLoggedInAccount: async () => profile(),
        enforceRateLimit: async () => ({
          allowed: false,
          message:
            "Rate limit exceeded: image uploading is limited to 10 requests per 10 minutes.",
        }),
        storeProfilePicture,
      },
    );
    expect(result.errorMsg).toBe(
      "Rate limit exceeded: image uploading is limited to 10 requests per 10 minutes.",
    );
    expect(storeProfilePicture).not.toHaveBeenCalled();
  });

  test("stores an accepted image and keeps earlier rejections from being stored", async () => {
    const stored = {
      ...profile(),
      profilePictureDataUrl: "data:image/png;base64,stored",
    };
    const storeProfilePicture = jest.fn(async () => ({ val: stored }));
    const deps = {
      readLoggedInAccount: async () => profile(),
      enforceRateLimit: async () => ({ allowed: true as const }),
      storeProfilePicture,
    };
    const png = pngImageBytes(20, 30);

    await expect(
      uploadAccountProfilePicture(
        {
          accessToken: "token",
          mimeType: "text/plain",
          imageBase64: Buffer.from(png).toString("base64"),
        },
        deps,
      ),
    ).resolves.toEqual({ val: null, errorMsg: PROFILE_IMAGE_MIME_ERROR });

    await expect(
      uploadAccountProfilePicture(
        {
          accessToken: "token",
          mimeType: "image/png",
          imageBase64: Buffer.from(pngImageBytes(600, 10)).toString("base64"),
        },
        deps,
      ),
    ).resolves.toEqual({
      val: null,
      errorMsg: PROFILE_IMAGE_DIMENSIONS_ERROR,
    });

    const accepted = await uploadAccountProfilePicture(
      {
        accessToken: "token",
        mimeType: "image/png",
        imageBase64: Buffer.from(png).toString("base64"),
      },
      deps,
    );
    expect(accepted.val).toEqual(stored);
    expect(storeProfilePicture).toHaveBeenCalledTimes(1);
    expect(storeProfilePicture).toHaveBeenCalledWith(
      profile(),
      "image/png",
      Buffer.from(png).toString("base64"),
    );
  });
});
