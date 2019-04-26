# bedrock-ledger-agent-plugin-example

[bedrock-ledger-agent](https://github.com/digitalbazaar/bedrock-ledger-agent/)
provides a core set of HTTP APIs for interacting with Bedrock ledgers.
Additional HTTP APIs may be defined through the use of ledger agent plugins.
This module provides a template for such a plugin. A single plugin may define multiple HTTP APIs and/or multiple plugins may be utilized.

## System Requirements
- Linux / macOS
- Node 10+ and a proper C/C++ compiler [toolchain](https://github.com/nodejs/node-gyp#on-unix)
    for building native dependencies.
- Redis 3+
- MongoDB 3.6+

## Run the Tests
```sh
# clone the repo
git clone https://github.com/digitalbazaar/bedrock-ledger-agent-plugin-example.git

# install dev dependencies
cd bedrock-ledger-agent-plugin-example
npm install

# install the test suite
cd test
npm install

# run the tests
npm test
```

## Add the Plugin to a Bedrock Ledger
This code is extracted from the [test suite](./test/ledger.js). A `plugins`
parameter is passed to the ledger agent `add` API. The string `example-agent`
corresponds to the name the plugin provided when it registered itself via
the `brLedgerNode.use` API [as shown here](./lib/index.js).

```js
// require the plugin which will self-register
require('bedrock-ledger-agent-plugin-example');

// when the ledger is initialized
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
```

## Discover the Plugin API Endpoint
Make an HTTP GET request to the `ledger-agents` endpoint to determine the
URL assigned to the ledger agent plugin. After the ledger agent is initialized,
the plugin's endpoint will remain the same. One may safely hard-code the URL
into client applications or use discovery combined with caching. For Node.js
and the browser, the [web-ledger-client](https://github.com/digitalbazaar/web-ledger-client)
`getAgent` API may be used for this purpose.

```sh
curl -k -H "Accept: application/json" https://bedrock.localhost:18443/ledger-agents | json_pp
```
returns:
```json
{
  "ledgerAgent": [
    {
      "id": "urn:uuid:0e4e819f-8d3a-4697-9223-27195f92590e",
      "service": {
        "ledgerAgentStatusService": "https://bedrock.localhost:18443/ledger-agents/0e4e819f-8d3a-4697-9223-27195f92590e",
        "ledgerConfigService": "https://bedrock.localhost:18443/ledger-agents/0e4e819f-8d3a-4697-9223-27195f92590e/config",
        "ledgerOperationService": "https://bedrock.localhost:18443/ledger-agents/0e4e819f-8d3a-4697-9223-27195f92590e/operations",
        "ledgerEventService": "https://bedrock.localhost:18443/ledger-agents/0e4e819f-8d3a-4697-9223-27195f92590e/events",
        "ledgerBlockService": "https://bedrock.localhost:18443/ledger-agents/0e4e819f-8d3a-4697-9223-27195f92590e/blocks",
        "ledgerQueryService": "https://bedrock.localhost:18443/ledger-agents/0e4e819f-8d3a-4697-9223-27195f92590e/query",
        "urn:example:query-service": {
          "id": "https://bedrock.localhost:18443/ledger-agents/0e4e819f-8d3a-4697-9223-27195f92590e/plugins/example-agent"
        }
      }
    }
  ]
}

```

## Interact with the Plugin API Endpoint
This example plugin provides an HTTP POST handler for the plugin endpoint which
has been discovered to be `https://bedrock.localhost:18443/ledger-agents/0e4e819f-8d3a-4697-9223-27195f92590e/plugins/example-agent`

A POST request may be sent to the endpoint:
```sh
curl -k -X POST -H "Content-Type: application/json" -H "Accept: application/json" https://bedrock.localhost:18443/ledger-agents/0e4e819f-8d3a-4697-9223-27195f92590e/plugins/example-agent -d '{"recordId": "urn:foo"}' | json_pp
```
