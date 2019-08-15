/* global Promise */

const rp = require('request-promise');

const fs = require('fs');

const imgur = require('imgur');

const {
  promisify
} = require('util');

const {
  convertAll
} = require('bpmn-to-image');

const {
  extractBpmnFileUrls,
  templates
} = require('./helper');

let log;

const writeFileAsync = promisify(fs.writeFile);

const deleteFileAsync = promisify(fs.unlink);

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

async function addLoadingSpinners(options) {

  await updateComment({
    ...options,
    templateFn: templates.renderSpinnerTmpl
  });

}

async function processUrls(urls) {

  async function process(u, idx) {

    const {
      url
    } = u;

    if (!url) {
      return;
    }

    // fetch file content
    const content = await rp(url);

    // save to temp file
    const tmpFile = `${__dirname}/../diagram.${idx}.txt`,
          tmpImgFile = `diagram.${idx}.png`;

    await writeFileAsync(tmpFile, content);

    // generate + upload image
    let response;

    try {
      await convertAll([
        {
          input: tmpFile,
          outputs: [ tmpImgFile ]
        }
      ]);

      // TODO: way to simply display raw image on GitHub markdown?
      response = await imgur.uploadFile(tmpImgFile);

    } catch (error) {

      log.error(error, 'Error un upload file');

      return;
    }

    if (!response || !response.data.link) {

      return;
    }

    // cleanup
    deleteFileAsync(tmpFile);
    deleteFileAsync(tmpImgFile);

    Object.assign(u, {
      uploadedUrl: response.data.link
    });
  }

  const promises = urls.map(process);

  return await Promise.all(promises);
}

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
