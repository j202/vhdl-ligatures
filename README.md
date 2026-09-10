<p align="center">
  <img src="icon.png" width="120" alt="VHDL Ligatures icon">
</p>

<h1 align="center">VHDL Ligatures</h1>

A VS Code extension that turns on ligature rendering for VHDL's two-character operators (`<=`, `:=`, `=>`, `>=`, `/=`) in `.vhd`/`.vhdl` files, using a real parser ([`tree-sitter-vhdl`](https://github.com/jpt13653903/tree-sitter-vhdl)) to handle the one case ligatures can't manage on their own: `<=` means signal assignment (`sig <= value;`) or comparison (`if a <= b then`) depending on grammar context, and a ligature only ever sees the same two characters.

## What it does

Signal-assignment `<=` is the only token substituted: it renders as the font's own `=>` ligature, mirrored horizontally, so it reads as that same arrow backwards rather than an unrelated symbol.

Every other operator - comparison `<=`, `:=`, `=>`, `>=`, `/=` - has exactly one meaning wherever it appears, so it's left as ordinary text with the `calt`/`liga` font features forced on; the font's own ligature renders it from there.

Only tokens inside a successfully-parsed region get decorated.

## Requirements

A font with ligatures for these operator pairs - JetBrains Mono, Fira Code, and Cascadia Code all qualify. The extension requests the `calt`/`liga` font features directly on these tokens, independent of `editor.fontLigatures`.

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

## License

[MIT](LICENSE) · [Third-party notices](THIRD-PARTY-NOTICES.md)
