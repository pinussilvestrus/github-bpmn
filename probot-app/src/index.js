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
 * @param {Issue} options.issue
 * @param {Repository} options.repository
 *
 * @return {String}
 */
function getContextString(options) {

  const {
    comment,
    issue,
    repository
  } = options;

  return JSON.stringify({
    repository: repository.full_name,
    issue: comment ? comment.issue_url : issue.url,
    comment: comment ? comment.id : 'Not a comment'
  });

}

/**
 * Patches a comment or issue content.
 *
 * @param {String} options.body
 * @param {Array<Url>} options.urls
 * @param {Comment} options.comment
 * @param {GithubApiClient} options.github
 * @param {Issue} options.issue
 * @param {Repository} options.repository
 * @param {Function} options.templateFn
 *
 * @return {Promise}
 */
async function updateCommentOrIssue(options) {

  let {
    body,
    urls
  } = options;

  const {
    comment,
    github,
    issue,
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


  if (comment) {
    await github.issues.updateComment({
      owner: repository.owner.login,
      repo: repository.name,
      comment_id: comment.id,
      body: body
    });
  } else {

    await github.issues.update({
      owner: repository.owner.login,
      repo: repository.name,
      issue_number: issue.number,
      number: issue.number,
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

  await updateCommentOrIssue({
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
    repository
  } = payload;

  let {
    body
  } = comment || issue;

  const contextString = getContextString({ comment, issue, repository });

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
    repository,
    urls
  });

  log.info(`Added Loading Spinners, ${contextString}`);

  await processUrls(urls);

  await updateCommentOrIssue({
    body,
    comment,
    github,
    issue,
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
    'issue_comment.edited',
    'issues.opened',
    'issues.edited'
  ], renderDiagrams);
};
