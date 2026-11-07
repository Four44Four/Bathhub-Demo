import {
  accountProfilePictureImage,
  bytesToBase64,
} from "../app/_client/pure/accounts/AccountProfilePicture";
import { createMonoColorImage } from "../app/_client/pure/Image";

describe("account profile picture display", () => {
  const defaultPicture = createMonoColorImage("/account_pfp.svg", "#B5B5C4");

  test("keeps the default icon until an uploaded picture exists", () => {
    expect(accountProfilePictureImage(null, defaultPicture)).toEqual(defaultPicture);
    expect(accountProfilePictureImage("", defaultPicture)).toEqual(defaultPicture);
    expect(
      accountProfilePictureImage("data:image/png;base64,YQ==", defaultPicture),
    ).toEqual({
      path: "data:image/png;base64,YQ==",
      type: "multi-color",
    });
  });

  test("bytesToBase64 matches standard base64", () => {
    expect(bytesToBase64(Uint8Array.from([104, 105]))).toBe("aGk=");
  });
});
