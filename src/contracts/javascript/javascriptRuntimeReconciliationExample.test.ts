import { writeFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { createTestTempDirectory } from "../../../tests/fixtures/temporaryDirectory.js";
import { analyzeJavaScriptApplication } from "../../../tests/support/javascriptApplicationScope.js";
import { javascriptApplicationAnalysisResultSchema } from "../../domain/javascript/javascriptApplicationAnalysis.js";
import { analyzeJavaScriptStaticSource } from "../../domain/javascript/javascriptStaticAnalysis.js";
import {
  JAVASCRIPT_APPLICATION_EVIDENCE_EXAMPLE,
  JAVASCRIPT_APPLICATION_EVIDENCE_SOURCE,
} from "./javascriptRuntimeReconciliationExample.js";

const source = JAVASCRIPT_APPLICATION_EVIDENCE_SOURCE;

describe("canonical JavaScript application Evidence example", () => {
  it("keeps its counters synchronized with real source analysis", async () => {
    const { statistics } = javascriptApplicationAnalysisResultSchema.parse(
      JAVASCRIPT_APPLICATION_EVIDENCE_EXAMPLE.normalized_result,
    );

    // AST-node counts come directly from the analyzer that walks the syntax tree.
    const staticAnalysis = analyzeJavaScriptStaticSource(source);
    expect(statistics.visited_ast_nodes).toBe(
      staticAnalysis.visited_ast_nodes,
    );

    // Application-level findings include both static findings and semantic module
    // links, so compare against a real one-file application-analysis result.
    const root = await createTestTempDirectory(
      "rea-javascript-example-counters-",
    );
    await writeFile(`${root}/renderer.js`, source);
    const analyzed = await analyzeJavaScriptApplication({ input_path: root });
    if (!analyzed.ok) throw analyzed.error;
    const actual = javascriptApplicationAnalysisResultSchema.parse(
      analyzed.value.normalized_result,
    );

    expect(statistics.visited_ast_nodes).toBe(
      actual.statistics.visited_ast_nodes,
    );
    expect(statistics.findings).toBe(actual.statistics.findings);
  });
});
