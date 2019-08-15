/* global $, BpmnJS, CmmnJS, window, atob, Promise, DmnJS */

// ==UserScript==
// @name         BPMN on hover
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  On hover over a bpmn file it will display it
// @author       Langleu
// @match        https://github.com/*
// @require      https://code.jquery.com/jquery-3.4.1.min.js
// @require      https://unpkg.com/bpmn-js@5.0.0/dist/bpmn-viewer.production.min.js
// @require      https://unpkg.com/cmmn-js@0.19.2/dist/cmmn-viewer.production.min.js
// @require      https://unpkg.com/dmn-js@7.0.0/dist/dmn-viewer.production.min.js
// @resource     https://unpkg.com/bpmn-js@5.0.0/dist/assets/diagram-js.css
// @resource     https://unpkg.com/cmmn-js@0.19.2/dist/assets/diagram-js.css
// @resource     https://unpkg.com/dmn-js@7.0.0/dist/assets/diagram-js.css
// ==/UserScript==

const thumb_selector = '.content a';

// returns source url for GitHub
function getSrc(src) {
  let splitSrc = src.split('/');
  let notAllowed = ['blob', 'https:', 'http:', 'github.com', 'master'];

  splitSrc = splitSrc.filter(function(word) {
    if (!notAllowed.includes(word))
      return word;
  });
  return `https://api.github.com/repos/${splitSrc.reverse().pop()}/${splitSrc.pop()}/contents/${splitSrc.reverse().join('/')}`;
}

// returns the viewer depending on the viewer type
function returnViewer(type) {
  switch (type) {
  case 'bpmn':
    return new BpmnJS({
      container: $('#js-canvas')
    });
  case 'cmmn':
    return new CmmnJS({
      container: $('#js-canvas')
    });
  case 'dmn':
    return new DmnJS({
      container: $('#js-canvas')
    });
  default:
    return;
  }
}

// exports and appends an SVG for any viewer
function exportSVG(viewer, posX, posY, ele) {
  viewer.saveSVG(function(err, svg) {
    ele.append(`<div class="svg"> ${svg} </div>`);

    $('.svg')
      .css('position', 'fixed')
      .css('bottom', (window.innerHeight - posY) * 0.5)
      .css('left', posX + 25)
      .css('z-index', 9999)
      .css('background-color', 'white')
      .css('height', '50%')
      .css('width', '50%')
      .css('box-shadow', '0px 0px 20px 5px rgba(0,0,0,1)');

    $('.svg svg')
      .attr('width', '100%')
      .attr('height', '100%');
  });
}

// shows BPMN, CMMN and DMN (DRD) diagrams
function showDiagram(e) {
  let sourceUrl = this.href || e.href;
  let viewerType = null;

  // to which parent element the svg will be appended
  let ele = $('.file-wrap');
  if (e.href)
    ele = $('body');

  if (sourceUrl.includes('.bpmn')) {
    viewerType = 'bpmn';
  } else if (sourceUrl.includes('.cmmn')) {
    viewerType = 'cmmn';
  } else if (sourceUrl.includes('.dmn')) {
    viewerType = 'dmn';
  } else {
    return;
  }

  var loc = getSrc(sourceUrl);

  $('body').append('<div class="canvas js-canvas-parent"> <div id="js-canvas"></div> </div>');
  $('.js-canvas-parent').css('visibility', 'hidden');

  var viewer = returnViewer(viewerType);

  // ajax call to request content from github usercontent
  $.ajax(loc, {
    dataType: 'json'
  }).done(function(json) {
    let xml = b64DecodeUnicode(json.content);

    viewer.importXML(xml, function(err) {

      if (viewerType == 'dmn') {
        var activeView = viewer.getActiveView();
        // apply initial logic in DRD view
        if (activeView.type === 'drd') {
          var activeEditor = viewer.getActiveViewer();

          // access active editor components
          var canvas = activeEditor.get('canvas');

          // zoom to fit full viewport
          canvas.zoom('fit-viewport');

          exportSVG(activeEditor, e.clientX, e.clientY, ele);
        }
      } else {
        (err) ? console.error(err): viewer.get('canvas').zoom('fit-viewport');

        exportSVG(viewer, e.clientX, e.clientY, ele);
      }
    });
  });
}

// removes diagram from drom
function hideDiagram(e) {
  $('.svg').remove();
  $('.js-canvas-parent').remove();
}

function addRenderButton() {
  if ($('.final-path').length &&
            $('.final-path').text().includes('.bpmn') ||
            $('.final-path').text().includes('.cmmn') ||
            $('.final-path').text().includes('.dmn')
  ) {
    $('.Box-header .BtnGroup').append('<a id="render-diagram" class="btn btn-sm BtnGroup-item" href="#">Render</a>');
  }
  $('a#render-diagram').on('click', openDiagram);
}

// opens the diagram in a new window
async function openDiagram() {
  showDiagram(this);

  await Sleep(500);
  var w = window.open();
  var html = $('.svg').html();
  $(w.document.body).html(html);
}

/**
     * Active calls
     */

// add the render button in case of a site refresh
addRenderButton();
$('body').on('mouseenter', thumb_selector, showDiagram);
$('body').on('mouseleave', thumb_selector, hideDiagram);

// listens to node remove event in DOM, as GitHub dynamically changes the view within the a repository
$('body').on('DOMNodeRemoved', async function(event) {
  if (typeof event.target.className == 'string' && event.target.className.includes('container-lg')) {
    await Sleep(500);

    addRenderButton();
  }
});

/**
     * Helper functions
     */

function b64DecodeUnicode(str) {
  // Going backwards: from bytestream, to percent-encoding, to original string.
  return decodeURIComponent(atob(str).split('').map(function(c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
}

function Sleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}