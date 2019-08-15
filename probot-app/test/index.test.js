/* global jest, expect, describe, test, beforeEach */

const nock = require('nock');

const { Probot } = require('probot');

jest.mock('bpmn-to-image');
jest.mock('imgur');

const renderBpmnApp = require('../src');

const payload = require('./fixtures/issue_comment.created');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1v7jeps" targetNamespace="http://bpmn.io/schema/bpmn" exporter="Camunda Modeler" exporterVersion="3.3.0-nightly">
  <bpmn:process id="Process_1r6cnd7" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1">
      <bpmn:outgoing>SequenceFlow_0xbi38e</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:sequenceFlow id="SequenceFlow_0xbi38e" sourceRef="StartEvent_1" targetRef="ExclusiveGateway_0d80meh" />
    <bpmn:endEvent id="EndEvent_14564ng">
      <bpmn:incoming>SequenceFlow_0wetfnk</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="SequenceFlow_087tlq4" sourceRef="IntermediateThrowEvent_0hxqe4w" targetRef="Task_1aaly1t" />
    <bpmn:task id="Task_1aaly1t">
      <bpmn:incoming>SequenceFlow_087tlq4</bpmn:incoming>
      <bpmn:outgoing>SequenceFlow_0wetfnk</bpmn:outgoing>
    </bpmn:task>
    <bpmn:sequenceFlow id="SequenceFlow_0wetfnk" sourceRef="Task_1aaly1t" targetRef="EndEvent_14564ng" />
    <bpmn:eventBasedGateway id="ExclusiveGateway_0d80meh">
      <bpmn:incoming>SequenceFlow_0xbi38e</bpmn:incoming>
      <bpmn:outgoing>SequenceFlow_0t7oahk</bpmn:outgoing>
    </bpmn:eventBasedGateway>
    <bpmn:intermediateCatchEvent id="IntermediateThrowEvent_0hxqe4w">
      <bpmn:incoming>SequenceFlow_0t7oahk</bpmn:incoming>
      <bpmn:outgoing>SequenceFlow_087tlq4</bpmn:outgoing>
      <bpmn:messageEventDefinition />
    </bpmn:intermediateCatchEvent>
    <bpmn:sequenceFlow id="SequenceFlow_0t7oahk" sourceRef="ExclusiveGateway_0d80meh" targetRef="IntermediateThrowEvent_0hxqe4w" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1r6cnd7">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="162" y="99" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="SequenceFlow_0xbi38e_di" bpmnElement="SequenceFlow_0xbi38e">
        <di:waypoint x="198" y="117" />
        <di:waypoint x="245" y="117" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNShape id="EndEvent_14564ng_di" bpmnElement="EndEvent_14564ng">
        <dc:Bounds x="562" y="99" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="SequenceFlow_087tlq4_di" bpmnElement="SequenceFlow_087tlq4">
        <di:waypoint x="378" y="117" />
        <di:waypoint x="420" y="117" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNShape id="Task_1aaly1t_di" bpmnElement="Task_1aaly1t">
        <dc:Bounds x="420" y="77" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="SequenceFlow_0wetfnk_di" bpmnElement="SequenceFlow_0wetfnk">
        <di:waypoint x="520" y="117" />
        <di:waypoint x="562" y="117" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNShape id="EventBasedGateway_1mekx4f_di" bpmnElement="ExclusiveGateway_0d80meh">
        <dc:Bounds x="245" y="92" width="50" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="IntermediateCatchEvent_1te0yds_di" bpmnElement="IntermediateThrowEvent_0hxqe4w">
        <dc:Bounds x="342" y="99" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="SequenceFlow_0t7oahk_di" bpmnElement="SequenceFlow_0t7oahk">
        <di:waypoint x="295" y="117" />
        <di:waypoint x="342" y="117" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;

nock.disableNetConnect();

describe('render-bpmn', () => {
  let probot;

  // load probot
  beforeEach(() => {
    probot = new Probot({});
    // Load our app into probot
    const app = probot.load(renderBpmnApp);

    // just return a test token
    app.app = () => 'test';
  });

  // mock requests
  beforeEach(() => {

    nock.enableNetConnect();

    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' });

    nock('https://github.com')
      .get('/pinussilvestrus/github-bpmn/files/3504544/diagram_copypaste.bpmn.txt')
      .reply(200, xml);

    nock('https://api.imgur.com')
      .post('/3/image')
      .reply(200, {
        data: {
          link: 'foo'
        }
      });

  });

  test('update comment after created', async () => {

    nock('https://api.github.com')
      .patch(
        '/repos/pinussilvestrus/github-bpmn/issues/comments/1', (body) => {

          // then, update #1 loading spinner
          expect(body).not.toBeUndefined();
          expect(body.body).toContain(
            '![](https://github.com/pinussilvestrus/github-bpmn/blob/master/probot-app/src/misc/loading.gif?raw=true)'
          );

          nock('https://api.github.com')
            .patch(
              '/repos/pinussilvestrus/github-bpmn/issues/comments/1', (body) => {

                // then, update #2 rendered diagram
                expect(body).not.toBeUndefined();
                expect(body.body).toContain(
                  '<img data-original=https://github.com/pinussilvestrus/github-bpmn/files/3504544/diagram_copypaste.bpmn.txt'
                );

                return true;
              })
            .reply(200);

          return true;
        })
      .reply(200);

    // when
    await probot.receive({ name: 'issue_comment', payload });
  });
});