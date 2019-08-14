const rp = require('request-promise');

const fs = require('fs');

const imgur = require('imgur');

const { 
  promisify 
} = require('util');

const {
  convertAll
} = require('bpmn-to-image');

const extractBpmnFileUrls = require('./helper').extractBpmnFileUrls;

const writeFileAsync = promisify(fs.writeFile)

const deleteFileAsync = promisify(fs.unlink);

async function updateComment(options) {

  let {
    body,
    urls
  } = options;

  const {
    comment,
    github,
    repository
  } = options;

  // update comment
  urls.forEach(u => {
    const {
      url,
      uploadedUrl
    } = u;

    // updated 'to' idx
    const to = u.to = body.indexOf(url) + url.length;

    const img = `<br/><img src=${uploadedUrl} />`;

    body = body.slice(0, to + 1) + img + body.slice(to + 1);

  });

  await github.issues.updateComment({
    owner: repository.owner.login,
    repo: repository.name,
    comment_id: comment.id,
    body: body
  });
}

async function processUrls(urls) {

  async function process(u, idx) {

    const {
      url
     } = u;

    if(!url) {
      return;
    }

    // fetch file content
    const content = await rp(url);

    // save to temp file
    const tmpFile = `${__dirname}/../diagram.${idx}.txt`,
          tmpImgFile = `diagram.${idx}.png`;

    await writeFileAsync(tmpFile, content);

    // generate image
    // TODO: catch errors
    await convertAll([
      {
        input: tmpFile,
        outputs: [ tmpImgFile ]
      }
    ]);

    // upload image
    // TODO: way to simply display raw image on GitHub markdown?
    const response = await imgur.uploadFile(tmpImgFile)

    if(!response || !response.data.link) {

      // TODO: better error logging
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

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */
module.exports = app => {

  // TODO: add more events, e.g. issue_comment.updated ...
  app.on('issue_comment.created', async context => {

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

    if(!body) {
      return;
    }

    // check whether comment contains uploaded bpmn file 
    const urls = extractBpmnFileUrls(body);

    if(!urls || !urls.length) {
      return;
    }

    await processUrls(urls);
    await updateComment({ 
      body, 
      comment,
      github, 
      repository,
      urls
    });

  });
}
