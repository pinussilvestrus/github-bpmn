const {
  extractBpmnFileUrls,
  templates
} = require('./helper');

const processUrls = require('./process-urls');

let log;

/**
 * Generates String which contains necessary information about the current
 * processed comment
 *
 * @param {Comment} options.comment
 * @param {Repository} options.repository
 *
 * @return {String}
 */
function getContextString(options) {

  const {
    comment,
    repository
  } = options;

  return JSON.stringify({
    repository: repository.full_name,
    issue: comment.issue_url,
    comment: comment.id
  });

}

/**
 * Patches a comment content.
 *
 * @param {String} options.body
 * @param {Array<Url>} options.urls
 * @param {Comment} options.comment
 * @param {GithubApiClient} options.github
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

  await github.issues.updateComment({
    owner: repository.owner.login,
    repo: repository.name,
    comment_id: comment.id,
    body: body
  });
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
    repository
  } = payload;

  let {
    body
  } = comment;

  const contextString = getContextString({ comment, repository });

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
    repository,
    urls
  });

  log.info(`Added Loading Spinners, ${contextString}`);

  await processUrls(urls);

  await updateComment({
    body,
    comment,
    github,
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

  // TODO: add more events, e.g. issue.created ...
  app.on([
    'issue_comment.created',
    'issue_comment.edited'
  ], renderDiagrams);
};
