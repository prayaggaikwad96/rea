# REA fork synchronization plan — refreshed 2026-10-30

## Current verified refs

- Upstream repository: [`morluto/rea`](https://github.com/morluto/rea), branch `main`, SHA `b1ff7cdacc03110d51bcac33da3cbb7850ac27fc`.
- Fork repository: [`prayaggaikwad96/rea`](https://github.com/prayaggaikwad96/rea), branch `main`, SHA `602468df998508a5a748036cce1e2becc6a51d15`.
- Shared merge base: `1e421242b97a533a5c03458ac074d4353ec17bf3`.
- Fork `main` is 187 commits behind upstream and has 4 fork-only commits beyond the merge base. Those fork-only commits are the audit-document history; the compared default-branch tree difference is the audit document.
- A remote safety ref `safety/backup-main-2026-10-30` preserves the fork's pre-sync `main` tip `602468df998508a5a748036cce1e2becc6a51d15`.

## Candidate and historical PRs

- Current candidate: `sync/upstream-main-2026-10-30`, based on upstream SHA `b1ff7cdacc03110d51bcac33da3cbb7850ac27fc`.
- Draft review: [fork PR #13](https://github.com/prayaggaikwad96/rea/pull/13).
- Old sync PR #11 used head `0a272d5cf5471f34eb0e686942357e27f2ee9507`. Current upstream comparison shows that head is already an ancestor of upstream `main` (zero commits ahead, 183 behind), so that old candidate does not need a separate merge.
- Documentation-only PR #12's earlier ref/counts were stale. Its updated reconciliation guidance is consolidated here; its original branch history remains preserved.

## Safe procedure

1. Keep fork `main`, upstream `main`, and the safety backup unchanged while reviewing the candidate.
2. Review the current-upstream candidate's full commit range and file tree. The PR intentionally includes the upstream changes since the common ancestor; do not mistake its size for unrelated fork-only work.
3. Confirm the retained historical audit document and the new 2026-10-30 audit are present.
4. Run all required upstream workflows on the exact candidate head. Resolve any failed, skipped, or approval-gated workflow before merge.
5. Confirm local working trees, unpushed commits, and offline backups do not contain changes absent from the remote fork.
6. Require human review and merge normally only after the above gates pass. Do not force-push or reset fork `main`.
7. After merge, fetch both upstream and fork refs again and record exact SHAs and ahead/behind counts.

## Current blockers

- PR #13 currently has no workflow runs/checks recorded on its exact head.
- The local fork checkout and offline backup state have not been inspected.
- This GitHub-only workflow cannot configure or verify all owner-side security settings.

## Completion criteria

Synchronization is complete only after the approved PR is merged, the fork's resulting `main` contains the latest upstream changes, fork-only documentation is preserved, required CI passes, and the post-merge upstream/fork comparison is recorded. Until then, leave PR #13 draft and do not claim the fork is synchronized.
