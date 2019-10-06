module.exports = {
  validLabels: [
    "bug",
    "skip-changelog",
    "enhancement",
    "feature"
  ],
  mandatorySections: [
    {
      beginsWith: "#### Changelog",
      endsWith: "#### Breaking changes",
      message: "Changelog section is mandatory",
      minimumLength: 10
    }
  ]
}