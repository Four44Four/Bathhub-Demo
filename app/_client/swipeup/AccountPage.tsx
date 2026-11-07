"use client";

import { useEffect, type CSSProperties } from "react";

import { AccountPage as AccountPageConsts } from "../ComponentConstants";
import { lerpHex } from "../pure/HexColor";
import { reputationBarBlendT } from "../../_shared/accounts/AccountReputation";
import { blackMonoIconCssFilter } from "../pure/svg/BlackMonoIconCssFilter";
import { TextWeight } from "../Utils";
import { useAccountSession } from "../accounts/AccountSessionContext";

/** Account data page (see specifications/swipe_up_menu/account_page.md). */
export function AccountPage() {
  const { profile, refreshProfile } = useAccountSession();

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const reputationScore = profile?.reputationScore ?? 0;
  const barColor = lerpHex(
    AccountPageConsts.LOWEST_REPUTATION_COLOR,
    AccountPageConsts.HIGHEST_REPUTATION_COLOR,
    reputationBarBlendT(
      reputationScore,
      AccountPageConsts.REPUTATION_BAR_MIN,
      AccountPageConsts.REPUTATION_BAR_MAX,
    ),
  );

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
      <div style={{ ...columnStyle, alignItems: "center" }}>
        <img
          src={AccountPageConsts.PROFILE_PICTURE_PATH}
          alt=""
          width={AccountPageConsts.PROFILE_PICTURE_SIZE_PX}
          height={AccountPageConsts.PROFILE_PICTURE_SIZE_PX}
          style={{
            width: AccountPageConsts.PROFILE_PICTURE_SIZE_PX,
            height: AccountPageConsts.PROFILE_PICTURE_SIZE_PX,
            objectFit: "contain",
            filter: blackMonoIconCssFilter(AccountPageConsts.TEXT_COLOR),
          }}
        />
        <div className={TextWeight.BOLD}>{profile?.username ?? ""}</div>
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
