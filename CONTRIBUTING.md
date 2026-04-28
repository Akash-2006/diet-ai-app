# Contributing

## Branching

- Base new work from `dev`:

  `git checkout dev && git pull origin dev && git checkout -b feature/issue-N-short-slug`

## Commits

- Message format: `#N: short description` (issue number from GitHub)

## Pull requests

- Title: `#N: short description`
- Body: include `Closes #N` so merging auto-closes the issue
- Merge feature PRs into **`dev`** first; **`main`** for releases (`dev` → `main`)
