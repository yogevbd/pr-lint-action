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