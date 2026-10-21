import { expect, it } from "vitest";
import { projectAnalysisError } from "../../domain/analysisErrorProjection.js";
import { NativeMatchingAdmission } from "./NativeMatchingAdmission.js";

const MAXIMUM_BYTES = 96 * 1024 * 1024;

it("reports the native matching representation ceiling as a fixed non-retryable allowance", async () => {
  const admission = new NativeMatchingAdmission("match_native_functions");
  let failure: unknown;
  try {
    await admission.checkpoint(MAXIMUM_BYTES + 1);
  } catch (error) {
    failure = error;
  }

  expect(failure).toBeDefined();
  const projected = projectAnalysisError(
    failure as Parameters<typeof projectAnalysisError>[0],
  );
  expect(projected).toMatchObject({
    code: "resource_constraint",
    category: "resource_constraint",
    retryable: false,
    details: {
      operation: "match_native_functions",
      resource: "capacity",
      reported_limits: { maximum_bytes: MAXIMUM_BYTES },
    },
  });
  expect(projected.remediation.action).toContain("96 MiB representation allowance");
  expect(projected.remediation.action).toContain("fixed byte allowance");
  expect(projected.remediation.action).not.toMatch(/Wait for an active analysis/u);
});
