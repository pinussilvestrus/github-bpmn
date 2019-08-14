const rp = require('request-promise');

const fs = require('fs');

const imgur = require('imgur');

const { 
  promisify 
} = require('util');

const {
  convertAll
} = require('bpmn-to-image');

const extractBpmnFileUrl = require('./helper').extractBpmnFileUrl;

const writeFileAsync = promisify(fs.writeFile)

const deleteFileAsync = promisify(fs.unlink);

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */
module.exports = app => {

  app.on('issue_comment.created', async context => {

    const payload = context.payload,
        comment = payload.comment,
        repository = payload.repository,
        body = comment.body,
        github = context.github;

    if(!body) {
      return;
    }

    // check whether comment contains uploaded bpmn file 
    const url = extractBpmnFileUrl(body);

    if(!url) {
      return;
    }

    // fetch file content
    var content = await rp(url);

    // save to temp file
    const tmpFile = __dirname + '/../' + 'diagram.txt';

    await writeFileAsync(tmpFile, content);

    // generate image
    // TODO: catch errors
    await convertAll([
      {
        input: tmpFile,
        outputs: [
          'diagram.png'
        ]
      }
    ]);

    // upload imag, TODO: way to simply display raw image?
    const response = await imgur.uploadFile('diagram.png')

    if(!response || !response.data.link) {
      // TODO: better error logging
      return;
    }

    const imageUrl = response.data.link;

    // update comment
    const newBody = `<img src=${imageUrl} />`;

    await github.issues.updateComment({
      owner: repository.owner.login,
      repo: repository.name,
      comment_id: comment.id,
      body: newBody
    });

    // cleanup
    deleteFileAsync('diagram.png');
    deleteFileAsync('diagram.txt');
  });
}
