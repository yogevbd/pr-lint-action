# PR Lint Action

Lint PR before merging. Usefull for generating automatic changelog and release notes with `github-release-notes`

## Example usage
Create `.github/main.workflow` containing:

```
workflow "PR Lint Action" {
  on = "pull_request"
  resolves = "VerifyLabels"
}

action "VerifyLabels" {
  uses = "yogevbd/pr-lint-action@master"
  secrets = ["GITHUB_TOKEN"]
  env = {
    VALID_LABELS = "bug,enhancement,feature"
  }
}
```

Edit `VALID_LABELS` array to contain your desired valid labels.
