function renderDiagramTmpl(options) {

  const {
    uploadedUrl,
    url
  } = options;

  return `<br/><img data-original=${url} src=${uploadedUrl} />`;
}

function renderSpinnerTmpl(options) {

  const {
    url
  } = options;


  return `<span data-original=${url}/>
![](https://github.com/pinussilvestrus/github-bpmn/blob/master/probot-app/src/misc/loading.gif?raw=true)
`;
}

module.exports = {
  renderDiagramTmpl,
  renderSpinnerTmpl
};