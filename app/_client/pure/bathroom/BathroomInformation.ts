import type { VerifyStatus } from "../../../_shared/BathroomDataPrimary";

/** Label for the bathroom information row (see bathroom_page.md). */
export function bathroomInformationLabel(
  bathroomId: number,
  verifyStatus: VerifyStatus,
): string {
  const statusLabel =
    verifyStatus === "verified" ? "verified" : "pending-verify";
  return `${bathroomId} ${statusLabel}`;
}
