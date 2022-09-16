# Subgraph

To run subgraph locally, follow setup instructions in [main README](../../README.md#Running-full-stack-locally)

## Deploying Subgraphs to the Graph Protocol Hosted Service

### Add new subgraph

1. Add the subgraph in the dashboard
   \*\* Please note that once a subgraph is created on the hosted service it can only be deleted by contacting an Edge & Node admin on discord, so subgraphs should be created sparingly

2. Initialize the subgrah to the Passage Protocol account
   `yarn graph-deploy-hosted {SubgraphName}`

### Update existing subgraph

1. Go to the [hosted service dashboard](https://thegraph.com/hosted-service/dashboard) and get the access token, use that token to authorize deployments `yarn graph-authorize-hosted {accessToken}`. Make sure to get a token from the `Passage` account. You must be an admin on the Github org & switch to the account in the dashboard.

2. Prepare the subgraph manifest `yarn graph-prepare-{network name}`, then manually update the `startBlock` in `packages/subgraph/subgraph.yaml` to the latest PassageRegistry deployment block

3. run `yarn graph-codegen && yarn graph-build`

4. deploy the subgraph `yarn graph-deploy-hosted {subgraph-name}`

5. confirm the subgraph has successfully deployed https://thegraph.com/hosted-service/subgraph/passage-protocol/{subgraph-name}

### Deployed Subgraphs

Deployed subgraph endpoint for supported networks can be found in the `SUPPORTED_NETWORKS` list in `./packages/frontend/utils/constants.ts`

### Subgraph debugging

if subgraph experiences a sync error to get a detailed error message do the following
https://discord.com/channels/438038660412342282/438070183794573313/869643328138919946 (discord invite https://discord.com/invite/vtvv7FP) \*\*subject to change
navigate to a graphql client example https://graphiql-online.com/graphiql
add the endpoint `https://api.thegraph.com/index-node/graphql`
run the following query replacing the subgraph id with the subgraph you are interested in

```
{
  indexingStatuses(subgraphs: ["Qma2jsUa5mpD8Q9erZha5553MJihGRoaSgtVWS5uCZmdTo"]) {
    subgraph
    synced
    health
    entityCount
    fatalError {
      handler
      message
      deterministic
      block {
        hash
        number
      }
    }
    chains {
      chainHeadBlock {
        number
      }
      earliestBlock {
        number
      }
      latestBlock {
        number
      }
    }
  }
}
```

### Plugin Error

the shopify plugin fails to load but the build passes if the code is properly linted

```
Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Failed to load plugin '@shopify/assemblyscript' declared in '.eslintrc.js': Package subpath './lib/rules/brace-style' is not defined by "exports" in /home/steve/codes/passpro/passfull/passage-fullstack/packages/subgraph/node_modules/eslint/package.json
    at new NodeError (node:internal/errors:372:5)
    at throwExportsNotFound (node:internal/modules/esm/resolve:472:9)
    at packageExportsResolve (node:internal/modules/esm/resolve:753:3)
    at resolveExports (node:internal/modules/cjs/loader:482:36)
    at Function.Module._findPath (node:internal/modules/cjs/loader:522:31)
    at Function.Module._resolveFilename (node:internal/modules/cjs/loader:919:27)
    at Function.Module._load (node:internal/modules/cjs/loader:778:27)
    at Module.require (node:internal/modules/cjs/loader:1005:19)
    at require (node:internal/modules/cjs/helpers:102:18)
    at Object.<anonymous> (/home/steve/codes/passpro/passfull/passage-fullstack/packages/subgraph/node_modules/@typescript-eslint/eslint-plugin/dist/rules/brace-style.js:6:39)
```
