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
  lint-pr:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@master
      with:
        ref: master
    - uses: yogevbd/pr-lint-action@master
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Add `pr-lint.config.js` file to your main folder:
```javascript
module.exports = {
  validLabels: [
    "bug",
    "skip-changelog",
    "enhancement",
    "feature"
  ],
  mandatorySections: [
    {
      beginsWith: "Changelog",
      endsWith: "End of changelog",
      message: "Changelog section is mandatory",
      validate: (section) => {
        return true;
      }
    }
  ]
}
```
