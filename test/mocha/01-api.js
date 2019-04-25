/*!
 * Copyright (c) 2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const {config} = require('bedrock');
const {create} = require('apisauce');
const https = require('https');
const httpsAgent = new https.Agent({rejectUnauthorized: false});

const baseURL = `${config.server.baseUri}/ledger-agents`;
const api = create({baseURL});

describe('ledger agent plugin API', () => {
  it('is fully operational', async () => {
    const r = await api.get('', {}, {httpsAgent});
    should.exist(r.data.ledgerAgent[0]);
    const [ledgerAgent] = r.data.ledgerAgent;
    const ledgerAgentId = ledgerAgent.id.split(':')[2];
    const {service} = ledgerAgent;
    service.should.be.an('object');
    service.should.have.property('urn:example:query-service');
    service['urn:example:query-service'].should.be.an('object');
    Object.keys(service['urn:example:query-service'])
      .should.have.same.members(['id']);
    service['urn:example:query-service'].id.should.be.a('string');
    const pluginServiceId = service['urn:example:query-service'].id;
    const pluginPath = `/${ledgerAgentId}/plugins/example-agent`;
    pluginServiceId.should.equal(
      `${config.server.baseUri}/ledger-agents${pluginPath}`);

    // a NotFoundError is expected because there is no record with an id of
    // `urn:foo` in the system
    const {data} = await api.post(
      pluginPath, {recordId: 'urn:foo'}, {httpsAgent});
    should.exist(data);
    data.should.be.an('object');
    data.type.should.equal('NotFoundError');
    data.message.should.equal(
      'Failed to get history for the specified record.');
  });
});
