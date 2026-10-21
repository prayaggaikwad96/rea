*** Begin Patch
*** Update File: src/artifacts/SafeOutputTree.ts
@@
   async closeHandles(): Promise<void> {
     const failures: unknown[] = [];
     for (const owner of this.#openHandles) {
+      // A failed write can already have been unlinked during rollback. Once
+      // its handle is closed, do not retain it as a pending file: a later
+      // rollback must continue from the confirmed removal progress.
+      const paths = [...this.#openFiles.entries()]
+        .filter(([, candidate]) => candidate === owner)
+        .map(([path]) => path);
       try {
         await this.#closeHandle(owner);
+        for (const path of paths) this.#openFiles.delete(path);
       } catch (cause: unknown) {
         failures.push(cause);
       }
*** End Patch