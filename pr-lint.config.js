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
      validate: (section) => {
        return section.length > 10;
      }
    },
    {
      beginsWith: "#### Jira issue",
      endsWith: "#### Changelog",
      message: "Changelog section is mandatory",
      validate: (section) => {
        if (section === '') { 
          return true
        } else {
          const validTicketsFormat = ['WOA', 'WOAI', 'CHAT', 'FRM', 'GROUP', 'OAV', 'CSF', 'WCN'];
          const exists = validTicketsFormat.map(format => {
              const re = new RegExp(format);
              const result = re.test(section.toUpperCase());
              return result;
          });
          return exists.includes(true);
        }
      }
    },
  ],
}