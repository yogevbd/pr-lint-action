# PR Lint Action

Lint PR before merging. Usefull for generating automatic changelog and release notes with `github-release-notes`

## Example usage
Create `.github/workflows/lint-pr.yml` containing:

```yml
name: Lint PR

on:
  pull_request:
    types: [labeled, unlabeled, opened, edited]

jobs:
  enforce-label:
    runs-on: ubuntu-latest
    steps:
    - uses: yogevbd/pr-lint-action@master
      env:
        VALID_LABELS: bug,enhancement,feature
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Edit `VALID_LABELS` to contain your desired valid labels.

