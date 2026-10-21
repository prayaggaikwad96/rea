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

it("classifies an oversized input artifact as a fixed file-size resource constraint", () => {
  const source = new ArtifactReaderFailure(
    "limit",
    "Selected artifact exceeds 4194304 bytes: /selected.hex",
    { boundary: "file-size" },
  );
  const result = evmInterfaceFailure(source, "artifact-read", "/selected.hex");
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
  expect(result.remediationAction).toContain("Do not truncate required bytes");
});

it.each([
  { boundary: undefined, reason: "limit" as const },
  { boundary: "capacity" as const, reason: "limit" as const },
  { boundary: undefined, reason: "path" as const },
  { boundary: undefined, reason: "format" as const },
])("keeps non-file-size artifact refusals as input errors (%j)", ({ boundary, reason }) => {
  const source = new ArtifactReaderFailure(
    reason,
    "Artifact read rejected",
    boundary === undefined ? undefined : { boundary },
  );
  const result = evmInterfaceFailure(source, "artifact-read", "/selected.hex");
  expect(result).toBeInstanceOf(AnalysisInputError);
});
