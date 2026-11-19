# Project continuity rules

- Before every change, inspect the current branch, working tree, latest commits, and the exact current implementation. Treat the newest committed and approved project state as the source of truth.
- Build each change on top of that latest state. Preserve previously approved behavior, styling, profile-specific colors, investment risk/return presentation, smart zone search, chart hover/tooltips, and other existing interactions unless the user explicitly asks to change them.
- Make the smallest scoped change that satisfies the request. Do not replace a component with an older version, revert unrelated work, or restore an old commit wholesale to fix one regression.
- When something appears missing, trace its implementation and history first; restore only the missing behavior while keeping newer changes around it.
- Before committing or publishing, inspect the complete diff against the intended base and check that unrelated files and features were not removed. Keep unrelated untracked files untouched.
- Do not publish to `main` or production unless the user explicitly requests it. When they do, compare the target branch and all intended recent work before merging so newer approved changes are not omitted.
- The user has explicitly requested that changes made for them be published to the production website by default. After each requested change, build and publish the intended tracked changes to `main`/Vercel; do not leave the requested change only in the local working tree. Keep unrelated untracked files out of commits.
