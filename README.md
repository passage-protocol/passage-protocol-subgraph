## Passage Protocol Subgraph
Subgraphs for the Passage Protocol

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
