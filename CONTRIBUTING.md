# Contributing

## Trying it out

Open this folder in VS Code and press F5 (Run and Debug → "Run Extension"). This builds the extension and opens a new Extension Development Host window with `test-fixtures/demo.vhd` loaded. Open any other `.vhd`/`.vhdl` file there to try it on other code.

## Development

```sh
npm install       # also fetches the pinned grammar (see below)
npm run build     # compile TypeScript
npm run watch     # compile on change
npm test          # build, then run test/*.test.mjs
```

`src/grammar.ts` holds the tree-walking/matching logic and has no VS Code dependency, so it's unit-tested directly against compiled output with Node's built-in test runner. `src/extension.ts` is the VS Code wiring. `src/parserService.ts` loads the WASM grammar.

[`pre-commit`](https://pre-commit.com) runs cspell and some hygiene checks on commit; `pre-commit install` wires it into this clone's git hooks.

## Grammar

`npm install` fetches and verifies the WASM grammar via `postinstall`, from the release tag and checksum recorded in `grammar/tree-sitter-vhdl.version.json`.

```sh
npm run update-grammar -- <tag>     # pin to a specific release tag
npm run update-grammar -- latest    # resolve and pin to the newest release
npm run update-grammar              # re-verify the currently pinned tag
```
