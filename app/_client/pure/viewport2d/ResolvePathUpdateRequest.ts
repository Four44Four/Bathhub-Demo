import type { LatLong } from "@/app/_shared/BathroomDataPrimary";
import { isUsablePathPoints } from "@/app/_shared/find-nearest-bathroom/PathUpdatePolicy";

export type PathUpdateServerResult =
  | { val: { points: readonly LatLong[] } | null; errorMsg?: string }
  | "timeout"
  | "error";

export type PathUpdateRequestOutcome =
  | { kind: "success"; points: LatLong[] }
  | { kind: "failure"; reason: "error" | "timeout" };

export type PathUpdateRequestTrigger =
  | "initial"
  | "distance_exceeded"
  | "failed_retry";

export function resolvePathUpdateRequestOutcome(
  result: PathUpdateServerResult,
): PathUpdateRequestOutcome {
  if (result === "timeout") {
    return { kind: "failure", reason: "timeout" };
  }
  if (result === "error") {
    return { kind: "failure", reason: "error" };
  }
  const points = result.val?.points;
  if (isUsablePathPoints(points)) {
    return { kind: "success", points: [...points] };
  }
  return { kind: "failure", reason: "error" };
}

export function pathUpdateErrorBandMessage(
  reason: "error" | "timeout",
  errorMessage: string,
  timeoutMessage: string,
): string {
  return reason === "timeout" ? timeoutMessage : errorMessage;
}

/** Whether a failed path update should show the top error band (any fetch failure). */
export function shouldShowPathUpdateErrorBand(
  outcome: PathUpdateRequestOutcome,
): boolean {
  return outcome.kind === "failure";
}
