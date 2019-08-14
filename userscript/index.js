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
// @grant        GM_log
// ==/UserScript==

try {
    var thumb_selector = 'a';

    // returns source url for GitHub
    function getSrc(src) {
        let splitSrc = src.split('/');
        let notAllowed = ['blob', 'https:', 'http:', 'github.com', 'master']

        splitSrc = splitSrc.filter(function (word) {
            if (!notAllowed.includes(word))
                return word;
        });
        return `https://api.github.com/repos/${splitSrc.reverse().pop()}/${splitSrc.pop()}/contents/${splitSrc.reverse().join('/')}`
    }

    // returns the viewer depending on the viewer type
    function returnViewer(type) {
        switch (type) {
            case 'bpmn':
                return new BpmnJS({
                    container: $('#js-canvas')
                });
                break;
            case 'cmmn':
                return new CmmnJS({
                    container: $('#js-canvas')
                });
                break;
            case 'dmn':
                return new DmnJS({
                    container: $('#js-canvas')
                });
                break;
            default:
                return;
        }
    }

    // exports and appends an SVG for any viewer
    function exportSVG(viewer, posX, posY) {
        viewer.saveSVG(function (err, svg) {
            $('.file-wrap').append(`<div class="svg"> ${svg} </div>`);

            $('.svg')
                .css('position', 'fixed')
                .css('bottom', window.innerHeight - posY)
                .css('left', posX + 25)
                .css('z-index', 9999)
                .css('background-color', 'white')
                .css('height', `50%`)
                .css('width', `50%`)
                .css('box-shadow', '0px 0px 20px 5px rgba(0,0,0,1)');

            $('.svg svg')
                .attr('width', '100%')
                .attr('height', '100%');
        });
    }

    // shows BPMN, CMMN and DMN (DRD) diagrams
    function showDiagram(e) {
        let sourceUrl = this.href;
        let viewerType = null;
        
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
        }).done(function (json) {
            let xml = atob(json.content);

            viewer.importXML(xml, function (err) {
                

                if (viewerType == 'dmn') {
                    var activeView = viewer.getActiveView();
                    // apply initial logic in DRD view
                    if (activeView.type === 'drd') {
                      var activeEditor = viewer.getActiveViewer();
                    
                      // access active editor components
                      var canvas = activeEditor.get('canvas');
                      
                      // zoom to fit full viewport
                      canvas.zoom('fit-viewport');

                      exportSVG(activeEditor, e.clientX, e.clientY);                        
                    }
                } else {
                    (err) ? console.error(err): viewer.get('canvas').zoom('fit-viewport');

                    exportSVG(viewer, e.clientX, e.clientY);
                }
            });
        });
    }

    // removes diagram from drom
    function hideDiagram(e) {
        $('.svg').remove();
        $('.js-canvas-parent').remove();
    }

    $('body').on('mouseenter', thumb_selector, showDiagram);
    $('body').on('mouseleave', thumb_selector, hideDiagram);
} catch (e) {
    GM_log(e);
}