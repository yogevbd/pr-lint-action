const request = require('./request');

const {GITHUB_SHA, GITHUB_EVENT_PATH, GITHUB_TOKEN, GITHUB_WORKSPACE} = process.env;

const configFilePath = `${GITHUB_WORKSPACE}/pr-lint.config`;
const config = require(configFilePath);

const event = require(GITHUB_EVENT_PATH);
const {repository, pull_request} = event;

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

async function updatePreviousChecks() {
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

async function lintLabels(id) {
  const labels = pull_request.labels.map((l) => l.name);
  const validLabels = config.validLabels;
  if (validLabels && !labels.some(l => validLabels.includes(l))) {
    console.log('Lint labels failed')
    await failure(id, {
      title: `Please add at least one valid label - ${validLabels}`,
      summary: ``
    });
  }
}

async function lintBody(id) {
  const mandatorySections = config.mandatorySections;
  if (mandatorySections) {
    mandatorySections.forEach(async (mandatorySection) => {
      if (!verifySection(mandatorySection)) {
        await failure(id, {
          title: mandatorySection.message,
          summary: mandatorySection.message
        });
      }
    });
  }
  console.warn("id is:", id);
  validateJiraUrl(id);
  
}

function validateJiraUrl(jira) {
    console.log('validateJiraUrl');
    if (jira === '') { 
      return true
    } else {
      const validTicketsFormat = ['WOA', 'WOAI', 'CHAT', 'FRM', 'GROUP', 'OAV', 'CSF', 'WCN'];
      const exists = validTicketsFormat.map(format => {
          const re = new RegExp(format);
          console.log(jira);
          const result = re.test(jira.toUpperCase());
          return result;
      });
      console.log(exists.includes(true));
      return exists.includes(true);
    }
}

function verifySection(section) {
  const body = pull_request.body;
  let result = body.substring(
    body.indexOf(section.beginsWith) + section.beginsWith.length,
    body.indexOf(section.endsWith)
  );
  result = result.replace(new RegExp('\r', 'g'), '');
  result = result.replace(new RegExp('\n', 'g'), '');

  return result.length > (section.minimumLength || 0);
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
  console.log('running task');
  const id = await createCheck()

  try {
    await lintLabels(id);
    await lintBody(id);

    await updatePreviousChecks();
    await success(id);
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

async function failure(id, output) {
  await updateCheck(id, 'failure', output);
  process.exit(78);
}

async function success(id) {
  await updateCheck(id, 'success');
}



run().catch(exitWithError);
