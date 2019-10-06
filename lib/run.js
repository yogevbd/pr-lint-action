const request = require('./request');

const {GITHUB_SHA, GITHUB_EVENT_PATH, GITHUB_TOKEN} = process.env;
const event = require(GITHUB_EVENT_PATH);
const {repository, pull_request} = event;
const labels = pull_request.labels.map((l) => l.name);
const validLabels = process.env.VALID_LABELS.split(',');

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

function verifyLabel() {
  let success = 0;
  if (labels.some(l => validLabels.includes(l))) {
    success = 1;
  }

  return {
    conclusion: success == 1 ? 'success' : 'failure',
    output: {
      title: `Please add at least one valid label - ${validLabels}`,
      summary: ``
    }
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
  const id = await createCheck();

  try {
    const {conclusion, output} = verifyLabel();
    await updateCheck(id, conclusion, output);
    if (conclusion === 'failure') {
      console.log(conclusion);
      process.exit(78);
    } else {
      updatePreveiousChecks();
    }
  } catch (err) {
    await updateCheck(id, 'failure');
    exitWithError(err);
  }
}

run().catch(exitWithError);
