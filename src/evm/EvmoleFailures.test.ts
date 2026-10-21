import { expect, it } from "vitest";
import { evmInterfaceFailure } from "./EvmoleFailures.js";
import { OwnedCommandFailure } from "../process/OwnedCommand.js";
import {
  AnalysisCancelledError,
  AnalysisInputError,
  AnalysisResourceConstraintError,
} from "../domain/analysisErrorCore.js";
import { ArtifactReaderFailure } from "../artifacts/ArtifactReader.js";
import type { ProviderProcessSnapshot } from "../process/ProviderProcess.js";

const snapshot: ProviderProcessSnapshot = {
  stdout: { text: "selected output", bytes: 15, observedBytes: 15 },
  stderr: { text: "warning", bytes: 7, observedBytes: 7 },
  exitCode: 0,
  signal: null,
};

it.each([
  undefined,
  null,
  "caller stopped",
  { requested: "stop" },
  new AnalysisCancelledError("foreign", {
    cleanup: { reason: "foreign owner", resources: ["foreign-resource"] },
  }),
])(
  "retains the exact command cancellation reason as opaque data: %j",
  (reason) => {
    const source = new OwnedCommandFailure(
      "cancelled",
      "cancelled",
      snapshot,
      null,
      {
        cancellation: { reason },
      },
    );
    const result = evmInterfaceFailure(source, "worker", "/selected.hex");
    expect(result).toBeInstanceOf(AnalysisCancelledError);
    expect(result.cause).toBe(reason);
    expect(result.capturedOutput).toEqual({
      stdout: "selected output",
      stderr: "warning",
      truncated: false,
    });
    expect(result.cleanupIncomplete).toBe(false);
  },
);

it.each([
  { failure: "process" as const, cleanup: null, tag: "ProviderAdapterError" },
  { failure: "timeout" as const, cleanup: null, tag: "AnalysisTimeoutError" },
  {
    failure: "cancelled" as const,
    cleanup: "close refused",
    tag: "ProviderAdapterError",
  },
])("keeps $tag ahead of recorded cancellation", ({ failure, cleanup, tag }) => {
  const source = new OwnedCommandFailure(
    failure,
    "physical outcome",
    snapshot,
    cleanup,
    {
      cancellation: { reason: "later interruption" },
    },
    ["exact-owner"],
  );
  const result = evmInterfaceFailure(source, "worker", "/selected.hex");
  expect(result._tag).toBe(tag);
  if (cleanup !== null) {
    expect(result.cleanupIncomplete).toBe(true);
    expect(result.cleanupResources).toEqual(["exact-owner"]);
  }
});

it("classifies an oversized input artifact as a fixed file-size resource constraint", () => {
  const source = new ArtifactReaderFailure(
    "limit",
    "Selected artifact exceeds 4194304 bytes: /selected.hex",
    { boundary: "file-size" },
  );

  const result = evmInterfaceFailure(source, "artifact-read", "/selected.hex");

  expect(result).toBeInstanceOf(AnalysisResourceConstraintError);
  expect(result).toMatchObject({
    operation: "inspect_evm_interface",
    resource: "file-size",
    reportedLimits: { maximum_input_bytes: 4194304 },
    retryable: false,
  });
  expect(result.message).toContain("4194304 bytes");
  expect(result.remediationAction).toContain("Do not truncate required bytes");
});

it.each([
  { boundary: undefined, reason: "limit" },
  { boundary: "capacity" as const, reason: "limit" },
  { boundary: undefined, reason: "path" },
  { boundary: undefined, reason: "format" },
])(
  "keeps non-file-size artifact refusals as input errors (%j)",
  ({ boundary, reason }) => {
    const source = new ArtifactReaderFailure(
      reason,
      "Artifact read rejected",
      boundary === undefined ? undefined : { boundary },
    );
    const result = evmInterfaceFailure(source, "artifact-read", "/selected.hex");
    expect(result).toBeInstanceOf(AnalysisInputError);
  },
);
