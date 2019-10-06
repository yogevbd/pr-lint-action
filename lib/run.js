const request = require('./request');

const { GITHUB_SHA, GITHUB_EVENT_PATH, GITHUB_TOKEN } = process.env;
const event = require(GITHUB_EVENT_PATH);
const { repository, pull_request } = event;
const labels = {id: "labels", data: pull_request.labels.map((l) => l.name)};
const body = {id: "body", data: pull_request};
const validLabels = process.env.VALID_LABELS.split(',');
const mandatorySections = process.env.DESCRIPTION_SECTIONS;

const {
  owner: {login: owner}
} = repository;
const {name: repo} = repository;

const checkName = 'lint-pr';

const headers = {
  'Content-Type': 'application/json',
  Accept: 'application/vnd.github.antiope-preview+json',
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  'User-Agent': 'pr-lint-action'
}

async function updatePreveiousChecks() {
  try {
    const response = await request(`https://api.github.com/repos/${owner}/${repo}/commits/${pull_request.head.ref}/check-runs`, {
      method: 'GET',
      headers
    });

    const checkRuns = response.data.check_runs;
    if (checkRuns) {
      checkRuns.filter(checkRun => checkRun.name === checkName).forEach(async (checkRun) => {
        await request(`https://api.github.com/repos/${owner}/${repo}/check-runs/${checkRun.id}`, {
          method: 'PATCH',
          headers,
          body: {
            conclusion: 'success'
          }
        });
      });
    }
  } catch (error) {
    console.log(error);
  }
}

async function createCheck() {
  const body = {
    name: checkName,
    head_sha: GITHUB_SHA,
    status: 'in_progress',
    started_at: new Date(),
    external_id: '1'
  }

  const {data} = await request(`https://api.github.com/repos/${owner}/${repo}/check-runs`, {
    method: 'POST',
    headers,
    body
  })
  const {id} = data;
  return id;
}

function lintSection(section) {
  let success = 0;
  switch (section.id) {
    case 'labels':
        if (section.data.some(l => validLabels.includes(l))) {
          success = 1;
        }
        return {
          conclusion: success === 1 ? 'success' : 'failure',
          output: {
            title: `Please add at least one valid label - ${validLabels}`,
            summary: ``
          }
        }
    case 'body':
      const pr = parsePR(section.data);
      success = await validatePrBody(pr);
      console.log({success});
      return {
        conclusion: success === 1 ? 'success' : 'failure',
        output: {
          title: `Changelog should not be empty!`,
          summary: ``
        }
      }
  }
}

function validatePrBody(pr) {
  const {changelog, jira} = pr;
  console.log(pr);
  validateJiraUrl(jira) ? 1 : 0;
  if (changelog === '') {
    return 0;
  }
  return 1;
}

function validateJiraUrl(jira) {
    if (jira === '') { 
      return true
    } else {
      const validTicketsFormat = ['WOA', 'WOAI', 'CHAT', 'FRM', 'GROUP', 'OAV', 'CSF', 'WCN'];
      const exists = validTicketsFormat.map(format => {
          const re = new RegExp(format);
          const result = re.test(jira.toUpperCase());
          return result;
      });
      console.log(exists.includes(true));
      return exists.includes(true);
    }
}

async function updateCheck(id, conclusion, output) {
  const body = {
    name: checkName,
    head_sha: GITHUB_SHA,
    status: 'completed',
    completed_at: new Date(),
    conclusion,
    output
  }

  await request(`https://api.github.com/repos/${owner}/${repo}/check-runs/${id}`, {
    method: 'PATCH',
    headers,
    body
  })
}

function exitWithError(err) {
  console.error('Error', err.stack);
  if (err.data) {
    console.error(err.data);
  }
  process.exit(1);
}

async function run() {
  console.log(mandatorySections);
  console.log(JSON.stringify(mandatorySections));
  const id = await createCheck()
  let result = {conclusion: 'failure', output: {
    title: `Something went wrong`,
    summary: ``
  }}
  try {
    result = lintSection(labels);
    await runUpdateCheck(id, result);
    result = lintSection(body);
    await runUpdateCheck(id, result);
    updatePreveiousChecks();
  } catch (err) {
    await updateCheck(id, 'failure');
    exitWithError(err);
  }
}

async function runUpdateCheck(id, result) {
  const {conclusion, output} = result;
  await updateCheck(id, conclusion, output);
    if (result.conclusion === 'failure') {
      console.log(conclusion);
      process.exit(78);
    }
}

function parsePR(pr) {
  let changelog = '';
  let notesForQA = '';
  let jira = '';
  let breakingChanges = '';
  const sections = (pr.body ? pr.body : '').split(/#### /);
  sections.splice(0, 1);
  for (const section of sections) {
    const lines = section.trim().split('\r\n');
    const name = lines.splice(0, 1)[0].toLowerCase();
    const body = lines.join('\r\n').trim();
    if (name.startsWith('changelog')) {
      changelog = body;
    } else if (name.startsWith('notes for qa')) {
      notesForQA = body;
    } else if (name.startsWith('jira')) {
      jira = body;
    } else if (name.startsWith('breaking changes')) {
      breakingChanges = body;
    }
  }

  return {
    date: pr.merged_at,
    number: pr.number,
    changelog,
    notesForQA,
    jira,
    breakingChanges,
    body: pr.body,
    title: pr.title
  };
}


run().catch(exitWithError);
