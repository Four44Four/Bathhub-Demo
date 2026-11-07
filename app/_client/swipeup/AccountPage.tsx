"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import { accountPageShowsChangeImageButton } from "../../_shared/accounts/ProfileImageUpload";
import { type PublicAccountProfile } from "../../_shared/accounts/PublicAccountProfile";
import { AccountPage as AccountPageConsts } from "../ComponentConstants";
import { useAccountSession } from "../accounts/AccountSessionContext";
import { currentAccountAccessToken } from "../accounts/accountAccessToken";
import { readPublicAccountProfile } from "../../_server/accounts/AccountAuth";
import {
  accountProfilePictureImage,
  bytesToBase64,
} from "../pure/accounts/AccountProfilePicture";
import { lerpHex } from "../pure/HexColor";
import { resolveImageMonoColor } from "../pure/Image";
import { useReportRateLimitViolation } from "../pure/rate-limit/useReportRateLimitViolation";
import { blackMonoIconCssFilter } from "../pure/svg/BlackMonoIconCssFilter";
import { createTextDescriptor } from "../pure/Text";
import { reputationBarBlendT } from "../../_shared/accounts/AccountReputation";
import { TextWeight } from "../Utils";
import { useAlertSystem } from "../viewport2d/AlertSystem";
import { Button } from "../viewport2d/Button";
import { useViewedAccount } from "./ViewedAccountContext";

/** Account data page (see specifications/swipe_up_menu/account_page.md). */
export function AccountPage() {
  const { profile, refreshProfile, setProfilePicture } = useAccountSession();
  const { viewedAccountId } = useViewedAccount();
  const reportRateLimitViolation = useReportRateLimitViolation();
  const { showImportantAlert } = useAlertSystem();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [viewedProfile, setViewedProfile] = useState<PublicAccountProfile | null>(
    null,
  );

  const resolvedAccountId = viewedAccountId ?? profile?.accountId ?? null;
  const viewingOwnAccount = accountPageShowsChangeImageButton(
    resolvedAccountId,
    profile?.accountId ?? null,
  );

  useEffect(() => {
    if (viewingOwnAccount) {
      void refreshProfile();
      setViewedProfile(null);
      return;
    }
    if (resolvedAccountId == null) {
      setViewedProfile(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      const result = await readPublicAccountProfile(
        resolvedAccountId,
        currentAccountAccessToken(),
      );
      if (cancelled) {
        return;
      }
      if (reportRateLimitViolation(result.errorMsg)) {
        return;
      }
      if (result.val == null) {
        showImportantAlert({
          message: "Error occurred while looking up account",
          okLabel: "Ok",
          positive: false,
        });
        setViewedProfile(null);
        return;
      }
      setViewedProfile(result.val);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    refreshProfile,
    reportRateLimitViolation,
    resolvedAccountId,
    showImportantAlert,
    viewingOwnAccount,
  ]);

  const displayProfile: PublicAccountProfile | null = viewingOwnAccount
    ? profile == null
      ? null
      : {
          accountId: profile.accountId,
          username: profile.username,
          reputationScore: profile.reputationScore,
          profilePictureDataUrl: profile.profilePictureDataUrl,
        }
    : viewedProfile;

  const reputationScore = displayProfile?.reputationScore ?? 0;
  const barColor = lerpHex(
    AccountPageConsts.LOWEST_REPUTATION_COLOR,
    AccountPageConsts.HIGHEST_REPUTATION_COLOR,
    reputationBarBlendT(
      reputationScore,
      AccountPageConsts.REPUTATION_BAR_MIN,
      AccountPageConsts.REPUTATION_BAR_MAX,
    ),
  );
  const picture = accountProfilePictureImage(
    displayProfile?.profilePictureDataUrl ?? null,
    AccountPageConsts.PROFILE_PICTURE,
  );
  const pictureMonoColor = resolveImageMonoColor(picture);
  const showChangeImage = viewingOwnAccount;

  async function uploadSelectedFile(file: File) {
    setIsUploading(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const error = await setProfilePicture(file.type, bytesToBase64(bytes));
      if (error == null) {
        return;
      }
      if (reportRateLimitViolation(error)) {
        return;
      }
      showImportantAlert({
        message: error,
        okLabel: "Ok",
        positive: false,
      });
    } finally {
      setIsUploading(false);
    }
  }

  const columnStyle: CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 12,
    minWidth: 0,
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: AccountPageConsts.COLUMN_GAP_PX,
        padding: AccountPageConsts.PADDING_PX,
        boxSizing: "border-box",
        width: "100%",
        color: AccountPageConsts.TEXT_COLOR,
      }}
    >
      <div style={columnStyle}>
        <img
          src={picture.path}
          alt="Profile picture"
          width={AccountPageConsts.PROFILE_PICTURE_SIZE_PX}
          height={AccountPageConsts.PROFILE_PICTURE_SIZE_PX}
          style={{
            alignSelf: "center",
            width: AccountPageConsts.PROFILE_PICTURE_SIZE_PX,
            height: AccountPageConsts.PROFILE_PICTURE_SIZE_PX,
            objectFit: pictureMonoColor == null ? "cover" : "contain",
            filter:
              pictureMonoColor == null
                ? undefined
                : blackMonoIconCssFilter(pictureMonoColor),
          }}
        />
        <div className={TextWeight.BOLD}>{displayProfile?.username ?? ""}</div>
        {showChangeImage ? (
          <div
            style={{
              position: "relative",
              alignSelf: "stretch",
              height: AccountPageConsts.CHANGE_IMAGE_BUTTON_SLOT_HEIGHT_PX,
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={AccountPageConsts.CHANGE_IMAGE_FILE_ACCEPT}
              aria-label="Profile image file"
              style={{ display: "none" }}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file == null) {
                  return;
                }
                void uploadSelectedFile(file);
              }}
            />
            <Button
              x={0}
              y={0}
              circular={AccountPageConsts.CHANGE_IMAGE_BUTTON_CIRCULAR}
              hoverInteractBehavior={
                AccountPageConsts.CHANGE_IMAGE_BUTTON_HOVER_INTERACT_BEHAVIOR
              }
              fillColor={AccountPageConsts.TEXT_COLOR}
              outlineThickness={
                AccountPageConsts.CHANGE_IMAGE_BUTTON_OUTLINE_THICKNESS_PX
              }
              padding={AccountPageConsts.CHANGE_IMAGE_BUTTON_PADDING_PX}
              centerHorizontally
              text={createTextDescriptor(
                AccountPageConsts.CHANGE_IMAGE_LABEL,
                AccountPageConsts.SECONDARY_COLOR,
                { weight: TextWeight.BOLD },
              )}
              dropShadow={AccountPageConsts.CHANGE_IMAGE_BUTTON_DROP_SHADOW}
              ignoreViewportInteractionGuards
              busy={isUploading}
              ariaLabel={AccountPageConsts.CHANGE_IMAGE_LABEL}
              onClick={() => {
                fileInputRef.current?.click();
              }}
            />
          </div>
        ) : null}
      </div>
      <div
        aria-hidden
        style={{
          width: AccountPageConsts.COLUMN_SEPARATOR_LINE_WIDTH_PX,
          backgroundColor: AccountPageConsts.TEXT_COLOR,
          flexShrink: 0,
        }}
      />
      <div style={columnStyle}>
        <div>{AccountPageConsts.REPUTATION_LABEL}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
          <div
            aria-hidden
            style={{
              flex: 1,
              height: AccountPageConsts.REPUTATION_BAR_HEIGHT_PX,
              borderRadius: AccountPageConsts.REPUTATION_BAR_HEIGHT_PX / 2,
              backgroundColor: barColor,
            }}
          />
          <span className={TextWeight.BOLD}>{reputationScore}</span>
        </div>
      </div>
    </div>
  );
}
