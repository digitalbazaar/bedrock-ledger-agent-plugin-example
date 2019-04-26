/*
 * Copyright (c) 2019 Digital Bazaar, Inc. All rights reserved.
 */
const bedrock = require('bedrock');
const brIdentity = require('bedrock-identity');
const brLedgerAgent = require('bedrock-ledger-agent');
const logger = bedrock.loggers.get('app');
const {promisify} = require('util');
const getAgentIterator = promisify(brLedgerAgent.getAgentIterator);
const {config, util: {delay, BedrockError}} = bedrock;
const {constants} = config;

require('bedrock-ledger-agent');
require('bedrock-ledger-node');
require('bedrock-ledger-context');
require('bedrock-ledger-storage-mongodb');
require('bedrock-ledger-consensus-continuity');
require('bedrock-ledger-consensus-continuity-storage');
require('bedrock-ledger-consensus-continuity-es-most-recent-participants');

const {permissions, roles} = config.permission;
roles['test.user'] = {
  id: 'test.user',
  label: 'Test User',
  comment: 'Role for test user.',
  sysPermission: [
    permissions.LEDGER_NODE_ACCESS.id,
    permissions.LEDGER_NODE_CREATE.id,
    permissions.LEDGER_NODE_REMOVE.id,
    permissions.LEDGER_AGENT_ACCESS.id,
    permissions.LEDGER_AGENT_CREATE.id,
    permissions.LEDGER_AGENT_REMOVE.id
  ]
};

bedrock.events.on('bedrock-express.ready', async () => {
  let ledgerAgent;
  while(!ledgerAgent) {
    ({ledgerAgent} = await setupTestLedger());
    if(!ledgerAgent) {
      // wait a second before trying again
      await delay(1000);
    }
  }
  logger.debug(
    'Successfully initialized ledger agent in worker.',
    {ledgerAgentId: ledgerAgent.id});
});

/**
 * Setup the Test Ledger.
 */
async function setupTestLedger() {
  // check to see if the ledger agent already exists
  try {
    const ledgerAgent = await _findAgent();
    return {ledgerAgent};
  } catch(e) {
    if(e.name !== 'NotFoundError') {
      throw e;
    }
  }
  // ledgerAgent was not found and needs to be initialized
  const setup = _setupGenesisNode;
  return new Promise((resolve, reject) => bedrock.runOnce(
    'test-ledger.setupLedger', setup, err => err ? reject(err) :
      resolve({ledgerAgent: null})));
}

async function _findAgent() {
  const options = {
    owner: config.server.baseUri + '/i/test-user'
  };
  let iterator;
  try {
    iterator = await getAgentIterator(null, options);
  } catch(e) {
    logger.error('Error while scanning for test ledger', {error: e});
    throw e;
  }
  for(const promise of iterator) {
    const ledgerAgent = await promise;
    if(ledgerAgent.ledgerNode.id) {
      return ledgerAgent;
    }
  }
  throw new BedrockError('Ledger agent not found.', 'NotFoundError');
}

// setup the genesis node
async function _setupGenesisNode() {
  try {
    const ledgerOwner = await _getLedgerOwner();
    ledgerOwner.identity.sysResourceRole = ledgerOwner.meta.sysResourceRole;
    const ledgerConfiguration = {
      '@context': constants.WEB_LEDGER_CONTEXT_V1_URL,
      type: 'WebLedgerConfiguration',
      ledger: '46c9382e-411f-4118-a8bb-830bacb747bc',
      consensusMethod: 'Continuity2017',
      electorSelectionMethod: {
        type: 'MostRecentParticipants',
      },
      sequence: 0,
    };

    const options = {
      ledgerConfiguration,
      genesis: true,
      public: true,
      owner: ledgerOwner.identity.id,
      // specify one or more plugins here
      plugins: ['example-agent'],
    };
    const addAgent = promisify(brLedgerAgent.add);
    await addAgent(ledgerOwner.identity, null, options);
  } catch(e) {
    logger.error('Error while initializing test ledger', {error: e});
    throw e;
  }
}

async function _getLedgerOwner() {
  // create admin identity
  const identity = {id: `${config.server.baseUri}/i/test-user`};
  const meta = {
    sysResourceRole: [{
      sysRole: 'test.user',
      generateResource: 'id'
    }],
  };
  return brIdentity.insert({actor: null, identity, meta});
}
