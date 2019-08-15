const {
  extractBpmnFileUrls,
  templates
} = require('./helper');

const processUrls = require('./process-urls');

let log;

/**
 * Generates String which contains necessary information about the current
 * processed comment | issue | pull_request
 *
 * @param {Comment} options.comment
 * @param {Issue} options.issue
 * @param {PullRequest} options.pull_request
 * @param {Repository} options.repository
 *
 * @return {String}
 */
function getContextString(options) {

  const {
    comment,
    issue,
    pull_request,
    repository
  } = options;

  return JSON.stringify({
    repository: repository.full_name,
    issue: comment ? comment.issue_url : (issue ||{}).url,
    pull_request: (pull_request || {}).url,
    comment: (comment || {}).id
  });

}

/**
 * Patches a comment or issue or pull request content.
 *
 * @param {String} options.body
 * @param {Array<Url>} options.urls
 * @param {Comment} options.comment
 * @param {GithubApiClient} options.github
 * @param {Issue} options.issue
 * @param {PullRequest} options.pull_request
 * @param {Repository} options.repository
 * @param {Function} options.templateFn
 *
 * @return {Promise}
 */
async function updateComment(options) {

  let {
    body,
    urls
  } = options;

  const {
    comment,
    github,
    issue,
    pull_request,
    repository,
    templateFn
  } = options;

  urls.forEach(u => {
    const {
      url
    } = u;

    // updated 'to' idx
    const to = u.to = body.indexOf(url) + url.length;

    const tag = templateFn(u);

    body = body.slice(0, to + 1) + tag + body.slice(to + 1);

  });


  // TODO: refactor me to a better fit pattern
  if (comment) {
    await github.issues.updateComment({
      owner: repository.owner.login,
      repo: repository.name,
      comment_id: comment.id,
      body: body
    });
  } else if (issue) {

    await github.issues.update({
      owner: repository.owner.login,
      repo: repository.name,
      issue_number: issue.number,
      number: issue.number,
      body: body
    });
  } else {

    await github.pullRequests.update({
      owner: repository.owner.login,
      repo: repository.name,
      pull_number: pull_request.number,
      number: pull_request.number,
      body: body
    });
  }


}

/**
 * Adds a loading spinner for every url occurence
 * @param {*} options
 *
 * @return {Promise}
 */
async function addLoadingSpinners(options) {

  await updateComment({
    ...options,
    templateFn: templates.renderSpinnerTmpl
  });

}

/**
 * Renders all attached bpmn file urls to actual diagram
 *
 * @param {*} context
 *
 * @return {Promise}
 */
async function renderDiagrams(context) {

  const {
    github,
    payload
  } = context;

  const {
    comment,
    issue,
    pull_request,
    repository
  } = payload;

  let {
    body
  } = comment || issue || pull_request;

  const contextString = getContextString({ comment, issue, pull_request, repository });

  if (!body) {
    return;
  }

  // check whether comment contains uploaded bpmn file
  const urls = extractBpmnFileUrls(body);

  if (!urls || !urls.length) {
    return;
  }

  log.info(`Processing of Created Comment started, ${contextString}`);

  await addLoadingSpinners({
    body,
    comment,
    github,
    issue,
    pull_request,
    repository,
    urls
  });

  log.info(`Added Loading Spinners, ${contextString}`);

  await processUrls(urls);

  await updateComment({
    body,
    comment,
    github,
    issue,
    pull_request,
    repository,
    templateFn: templates.renderDiagramTmpl,
    urls
  });

  log.info(`Comment updated with Rendered Diagrams, ${contextString}`);

  // TODO: cleanup imgur files afterwards?
}

/**
 * Probot App entry point
 * @param {import('probot').Application} app
 */
module.exports = app => {

  log = app.log;

  app.on([
    'issue_comment.created',
    'issue_comment.edited',
    'issues.opened',
    'issues.edited',
    'pull_request.opened',
    'pull_request.edited'
  ], renderDiagrams);
};
