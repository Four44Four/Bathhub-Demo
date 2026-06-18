import {
  type FindNearestBathroomTarget,
  type FindNearestBathroomRequestPhase,
  resolveFindNearestBathroomResult,
} from "./FindNearestBathroomState";

export type FindNearestBathroomServerResult =
  | { errorMsg?: string; val: FindNearestBathroomTarget | null }
  | "timeout"
  | "error";

export type FindNearestBathroomFlowOutcome =
  | { kind: "enter_preview"; target: FindNearestBathroomTarget }
  | {
      kind: "terminal_failure";
      phase: Exclude<FindNearestBathroomRequestPhase, "idle" | "pending" | "success">;
    }
  | { kind: "noop" };

export function resolveFindNearestBathroomFlowOutcome(
  result: FindNearestBathroomServerResult,
): FindNearestBathroomFlowOutcome {
  const terminalPhase = resolveFindNearestBathroomResult(result);
  if (
    terminalPhase === "success" &&
    result !== "timeout" &&
    result !== "error" &&
    result.val
  ) {
    return { kind: "enter_preview", target: result.val };
  }
  if (terminalPhase === "success") {
    return { kind: "noop" };
  }
  return { kind: "terminal_failure", phase: terminalPhase };
}
