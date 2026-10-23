import { expect, it } from "vitest";
import { evmInterfaceFailure } from "./EvmoleFailures.js";
import { OwnedCommandFailure } from "../process/OwnedCommand.js";
import { ArtifactReaderFailure } from "../artifacts/ArtifactReader.js";
import {
  AnalysisCancelledError,
  AnalysisInputError,
  AnalysisResourceConstraintError,
} from "../domain/analysisErrorCore.js";
import { projectAnalysisError } from "../domain/analysisErrorProjection.js";
import {
  DEFAULT_EVM_TIMEOUT_MS,
  MAX_EVM_TIMEOUT_MS,
} from "../domain/evm/evmInterface.js";
import type { ProviderProcessSnapshot } from "../process/ProviderProcess.js";

const snapshot: ProviderProcessSnapshot = {
  stdout: { text: "selected output", bytes: 15, observedBytes: 15 },
  stderr: { text: "warning", bytes: 7, observedBytes: 7 },
  exitCode: 0,
  signal: null,
};

it(
  "classifies an oversized input artifact as a fixed file-size resource constraint",
  () => {
    const source = new ArtifactReaderFailure(
      "limit",
      "Selected artifact exceeds 4194304 bytes: /selected.hex",
      { boundary: "file-size" },
    );
    const result = evmInterfaceFailure(
      source,
      "artifact-read",
      "/selected.hex",
    );
    expect(result).toBeInstanceOf(AnalysisResourceConstraintError);
    if (!(result instanceof AnalysisResourceConstraintError))
      throw new Error("Expected a file-size resource constraint");
    expect(result).toMatchObject({
      operation: "inspect_evm_interface",
      resource: "file-size",
      reportedLimits: { maximum_input_bytes: 4194304 },
      retryable: false,
    });
    expect(result.message).toContain("4194304 bytes");
    expect(result.remediationAction).toContain(
      "Do not truncate required bytes",
    );
    const projected = projectAnalysisError(result);
    expect(projected).toMatchObject({
      code: "resource_constraint",
      retryable: false,
      details: {
        operation: "inspect_evm_interface",
        resource: "file-size",
        reported_limits: { maximum_input_bytes: 4194304 },
      },
    });
    expect(projected.remediation.action).toContain(
      "Do not truncate required bytes",
    );
    expect(projected.remediation.action).toContain(
      "retrying the unchanged oversized input will fail again",
    );
  },
);

it("keeps non-file-size artifact refusals as input errors", () => {
  const cases = [
    new ArtifactReaderFailure("limit", "Artifact read rejected"),
    new ArtifactReaderFailure("limit", "Artifact read rejected", {
      boundary: "capacity",
    }),
    new ArtifactReaderFailure("path", "Artifact read rejected"),
    new ArtifactReaderFailure("format", "Artifact read rejected"),
  ];
  for (const source of cases) {
    expect(
      evmInterfaceFailure(source, "artifact-read", "/selected.hex"),
    ).toBeInstanceOf(AnalysisInputError);
  }
});

it.each(["worker", "configuration"] as const)(
  "does not classify file-size-shaped failures from the %s phase as input limits",
  (phase) => {
    const source = new ArtifactReaderFailure(
      "limit",
      "Selected artifact exceeds 4194304 bytes: /selected.hex",
      { boundary: "file-size" },
    );
    const result = evmInterfaceFailure(source, phase, "/selected.hex");
    expect(result).not.toBeInstanceOf(AnalysisResourceConstraintError);
    expect(result).not.toBeInstanceOf(AnalysisInputError);
  },
);

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

it("names timeout_ms, the omitted default, and the caps it does not raise", () => {
  const source = new OwnedCommandFailure(
    "timeout",
    "Command deadline elapsed.",
    snapshot,
    null,
  );
  const projected = projectAnalysisError(
    evmInterfaceFailure(
      source,
      "worker",
      "/selected.hex",
      undefined,
      undefined,
      undefined,
      45_000,
    ),
  );
  expect(projected).toMatchObject({
    code: "provider_timeout",
    details: { timeout_ms: 45_000 },
  });
  expect(projected.message).toContain("timeout_ms");
  expect(projected.message).toContain(String(DEFAULT_EVM_TIMEOUT_MS));
  expect(projected.remediation.action).toContain("--timeout-ms");
  expect(projected.remediation.action).toContain(String(MAX_EVM_TIMEOUT_MS));
  expect(projected.remediation.action).toContain("does not raise");
  expect(projected.remediation.action).toContain("no server restart");
});

it("says a CPU signal has no runtime override and timeout_ms does not raise it", () => {
  const source = new OwnedCommandFailure(
    "process",
    "signaled",
    {
      ...snapshot,
      exitCode: null,
      signal: "SIGXCPU",
    },
    null,
  );
  const projected = projectAnalysisError(
    evmInterfaceFailure(source, "worker", "/selected.hex", {
      addressSpaceBytes: 1024,
      cpuSeconds: 30,
      fileSizeBytes: 1024,
    }),
  );
  expect(projected).toMatchObject({
    code: "resource_constraint",
    details: { resource: "cpu" },
  });
  expect(projected.remediation.action).toContain("no runtime override");
  expect(projected.remediation.action).toContain(
    "timeout_ms does not raise it",
  );
});

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
