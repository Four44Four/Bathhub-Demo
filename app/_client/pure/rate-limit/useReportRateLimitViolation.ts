import { useCallback } from "react";

import { resolveRateLimitViolationBandMessage } from "@/app/_shared/rate-limit/RateLimitBandAlert";

import { useAlertSystem } from "../../viewport2d/AlertSystem";

/** Shows a negative band alert when `errorMsg` is a server rate-limit violation. */
export function useReportRateLimitViolation() {
  const { showBandAlert } = useAlertSystem();

  return useCallback(
    (errorMsg: string | undefined): boolean => {
      const message = resolveRateLimitViolationBandMessage(errorMsg);
      if (message == null) {
        return false;
      }
      showBandAlert({ message, positive: false });
      return true;
    },
    [showBandAlert],
  );
}
