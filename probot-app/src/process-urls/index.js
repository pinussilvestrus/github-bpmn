const rp = require('request-promise');

const fs = require('fs');

const imgur = require('imgur');

const {
  promisify
} = require('util');

const {
  convertAll
} = require('bpmn-to-image');

const writeFileAsync = promisify(fs.writeFile);

const deleteFileAsync = promisify(fs.unlink);

/**
 * Processes all url occurrences by
 * - Fetching the url's content
 * - Saving file content to disk
 * - Render bpmn content to image
 * - Upload to imgur file space
 *
 * @param {Array<Url>} urls
 *
 * @return {Promise}
 */
module.exports = async function processUrls(urls) {

  await Promise.all(urls.map(async (u, idx) => {

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

      // TODO: better error handling
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

  }));
};