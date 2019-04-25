/*!
 * Copyright (c) 2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const {asyncHandler, express} = require('bedrock-express');
const bedrock = require('bedrock');

const router = express.Router();

module.exports = {
  type: 'ledgerAgentPlugin',
  api: {
    router,
    // the serviceType informs the HTTP URL that will be used to access
    // this API. Use the namespacing convention demonstrated here to avoid
    // possible conflicts with other plugins.
    serviceType: 'urn:example:query-service'
  }
};

// must delay defining router endpoints until validation schemas are loaded
// in `bedrock.init` handler in `bedrock-validation`
bedrock.events.on('bedrock.init', () => {
  // TODO: add validation and authentication
  router.post(
    '/', /* validate(),*/
    asyncHandler(async (req, res) => {

      // any other core storage API or a custom ledger storage plugin API may
      // be utilized here

      // use the `getRecordHistory` API provided by
      // bedrock-ledger-storage-mongodb
      const {ledgerNode: {storage: {operations: {getRecordHistory}}}} =
        req.ledgerAgent;

      // extract the API parameters from the request body
      const {maxBlockHeight, recordId} = req.body;

      const result = await getRecordHistory({maxBlockHeight, recordId});

      res.json(result);
    }));
});
