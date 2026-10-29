# Fork synchronization reconciliation plan — 2026-10-29

## Status

This branch starts from the current upstream `morluto/rea` `main` SHA `c0c3902207d6b1a33709e42b80c7e570da7db964`. It is a review and planning branch only. The fork default branch still points to `b5fb661b0a985863f64b52a14ef5c41fb137f7dc` and is not synchronized.

GitHub reports the current upstream and fork histories as divergent: 157 commits on the upstream side and 2 commits on the fork side past the shared merge base. These numbers are historical graph metadata, not a recommendation to discard either side.

## Reconciliation steps

1. Preserve an immutable backup/reference to the current fork main and every topic branch that may contain work.
2. Identify the fork-only commits by subject, patch, and files; distinguish audit/documentation commits from source, dependency, generated, schema, workflow, and test changes.
3. Port only valuable changes to a branch based on current upstream main. Prefer small, auditable cherry-picks or recreations over a bulk merge when histories have materially diverged.
4. For each ported change, inspect the diff against current upstream to avoid reintroducing fixes already present upstream.
5. Run the project’s documented typecheck, lint, formatting, unit, integration, and relevant provider checks. Record exact command output and CI run links.
6. Open one reviewable PR with an explicit list of preserved, omitted, superseded, and unresolved fork-only changes.
7. Only update the fork default branch after the complete candidate has been reviewed and the required checks pass. Do not force-push or delete historical refs as part of this plan.

## Explicit unresolved items

- The stale sync PR #11 still points to `0a272d5cf5471f34eb0e686942357e27f2ee9507`; it should not be merged as-is.
- The two fork-side commits need their full impact reviewed. Do not assume they are safe to discard because one is described as audit-only.
- Local working-tree cleanliness, local-only refs, backups, and any unpushed local changes cannot be verified through the remote GitHub connector.
- No source-code synchronization or tests are claimed by this document.

## Review note

The default-branch synchronization candidate must not merge this planning change as code synchronization. The two fork-side commits are part of the history to preserve and assess; changes in PR #11 are not a complete reconciliation. Keep this branch draft until a fresh candidate has an explicit inventory of preserved/superseded commits and verified tests.
