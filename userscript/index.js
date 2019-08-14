// ==UserScript==
// @name         BPMN on hover
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  On hover over a bpmn file it will display it
// @author       Langleu
// @match        https://github.com/*
// @require      https://code.jquery.com/jquery-3.4.1.min.js
// @require      https://unpkg.com/bpmn-js@5.0.0/dist/bpmn-viewer.production.min.js
// @resource     https://unpkg.com/bpmn-js@5.0.0/dist/assets/diagram-js.css
// @grant        GM_log
// ==/UserScript==

try {
    var thumb_selector = 'a';

    function getSrc(src) {
        let splitSrc = src.split('/');
        let notAllowed = ['blob', 'https:', 'http:', 'github.com', 'master']

        splitSrc = splitSrc.filter(function (word) {
            if (!notAllowed.includes(word))
                return word;
        });
        return `https://api.github.com/repos/${splitSrc.reverse().pop()}/${splitSrc.pop()}/contents/${splitSrc.reverse().join('/')}`
    }

    function showDiagramm(e) {
        if (!this.href.includes('.bpmn'))
            return;

        var loc = getSrc(this.href);

        $('body').append('<div class="canvas js-canvas-parent"> <div id="js-canvas"></div> </div>');
        $('.js-canvas-parent').css('visibility', 'hidden');

        var viewer = new BpmnJS({
            container: $('#js-canvas')
        });

        $.ajax(loc, {
            dataType: 'json'
        }).done(function (json) {
            let xml = atob(json.content);

            viewer.importXML(xml, function (err) {
                (err) ? console.error(err): viewer.get('canvas').zoom('fit-viewport');

                viewer.saveSVG(function (err, svg) {
                    $('.file-wrap').append(`<div class="svg"> ${svg} </div>`);

                    $('.svg')
                        .css('position', 'fixed')
                        .css('top', e.clientY + 25)
                        .css('left', e.clientX + 25)
                        .css('z-index', 9999)
                        .css('background-color', 'white')
                        .css('height', `50%`)
                        .css('width', `50%`)
                        .css('box-shadow', '0px 0px 20px 5px rgba(0,0,0,1)');

                    $('.svg svg')
                        .attr('width', '100%')
                        .attr('height', '100%');
                });
            });
        });
    }

    function hideDiagramm(e) {
        $('.svg').remove();
        $('.js-canvas-parent').remove();
    }

    $('body').on('mouseenter', thumb_selector, showDiagramm);
    $('body').on('mouseleave', thumb_selector, hideDiagramm);
} catch (e) {
    GM_log(e);
}