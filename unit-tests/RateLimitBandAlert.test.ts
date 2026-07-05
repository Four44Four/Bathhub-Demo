import {
  formatRateLimitViolationBandMessage,
  isRateLimitExceededMessage,
  resolveRateLimitViolationBandMessage,
} from "../app/_shared/rate-limit/RateLimitBandAlert";

describe("RateLimitBandAlert", () => {
  test("formatRateLimitViolationBandMessage uses spec task names", () => {
    expect(formatRateLimitViolationBandMessage("bathroom-create")).toBe(
      "Violated rate limit for bathroom creation",
    );
    expect(formatRateLimitViolationBandMessage("bathroom-read-sync")).toBe(
      "Violated rate limit for retrieving bathrooms",
    );
    expect(formatRateLimitViolationBandMessage("bathroom-find-nearest")).toBe(
      "Violated rate limit for finding nearest bathroom",
    );
    expect(formatRateLimitViolationBandMessage("bathroom-update")).toBe(
      "Violated rate limit for updating bathrooms",
    );
    expect(formatRateLimitViolationBandMessage("ors-path")).toBe(
      "Violated rate limit for path data generation",
    );
    expect(
      formatRateLimitViolationBandMessage("user-settings-default-db"),
    ).toBe("Violated rate limit for pulling current default DB");
    expect(
      formatRateLimitViolationBandMessage("user-settings-migration"),
    ).toBe("Violated rate limit for pulling migration scripts");
  });

  test("isRateLimitExceededMessage recognizes server denial payloads", () => {
    expect(
      isRateLimitExceededMessage(
        "Rate limit exceeded: bathroom creation is limited to 5 requests per minute.",
      ),
    ).toBe(true);
    expect(isRateLimitExceededMessage("Something else")).toBe(false);
    expect(isRateLimitExceededMessage(undefined)).toBe(false);
  });

  test("resolveRateLimitViolationBandMessage maps server messages to band text", () => {
    expect(
      resolveRateLimitViolationBandMessage(
        "Rate limit exceeded: bathroom creation is limited to 5 requests per minute.",
      ),
    ).toBe("Violated rate limit for bathroom creation");
    expect(
      resolveRateLimitViolationBandMessage(
        "Rate limit exceeded: bathroom reading and viewport sync is limited to 100 requests per 30 seconds.",
      ),
    ).toBe("Violated rate limit for retrieving bathrooms");
    expect(
      resolveRateLimitViolationBandMessage(
        "Rate limit exceeded: nearest bathroom lookup is limited to 20 requests per minute.",
      ),
    ).toBe("Violated rate limit for finding nearest bathroom");
    expect(
      resolveRateLimitViolationBandMessage(
        "Rate limit exceeded: route path generation is limited to 10 requests per minute.",
      ),
    ).toBe("Violated rate limit for path data generation");
    expect(
      resolveRateLimitViolationBandMessage(
        "Rate limit exceeded: default user settings database download is limited to 5 requests per minute.",
      ),
    ).toBe("Violated rate limit for pulling current default DB");
    expect(
      resolveRateLimitViolationBandMessage(
        "Rate limit exceeded: user settings migration scripts is limited to 5 requests per minute.",
      ),
    ).toBe("Violated rate limit for pulling migration scripts");
    expect(resolveRateLimitViolationBandMessage("network error")).toBeNull();
  });
});
