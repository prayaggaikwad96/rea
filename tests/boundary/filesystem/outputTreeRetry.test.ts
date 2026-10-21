import { createHash } from "node:crypto";
import { access, chmod, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { expect, it } from "vitest";
import { ArtifactReaderFailure } from "../../../src/artifacts/ArtifactReader.js";
import { SafeOutputTree } from "../../../src/artifacts/SafeOutputTree.js";
import { createTestTempDirectory } from "../../fixtures/temporaryDirectory.js";

it.skipIf(process.platform === "win32" || process.getuid?.() === 0)(
  "retries rollback after a partial file removal and root-removal denial",
  async () => {
    const parent = await createTestTempDirectory("rea-safe-output-retry-");
    const output = join(parent, "published");
    const tree = await SafeOutputTree.create(output);
    const bytes = Buffer.from("x");

    try {
      await expect(
        tree.write("partial.txt", Readable.from([bytes]), {
          bytes: 2,
          sha256: createHash("sha256").update(bytes).digest("hex"),
        }),
      ).rejects.toMatchObject({ reason: "integrity" });

      // Removing the output root now fails, but the already-unlinked partial
      // file must not be re-admitted through its closed handle on the retry.
      await chmod(parent, 0o500);
      const first = await tree.rollback().catch((cause: unknown) => cause);
      expect(first).toBeInstanceOf(ArtifactReaderFailure);
      expect(first).toMatchObject({
        cause: { code: "EACCES", syscall: "rmdir" },
      });
      expect(await readdir(output)).toEqual([]);

      await chmod(parent, 0o700);
      expect(await tree.rollback()).toEqual({
        status: "complete",
        residualPaths: [],
      });
      await expect(access(output)).rejects.toThrow();
      expect(await readdir(parent)).toEqual([]);
    } finally {
      await chmod(parent, 0o700).catch(() => undefined);
      await tree.closeHandles().catch(() => undefined);
      await rm(parent, { recursive: true, force: true });
    }
  },
);
