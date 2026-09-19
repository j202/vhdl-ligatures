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

[`pre-commit`](https://pre-commit.com) runs cspell, some hygiene checks and a commit message check on commit; `pre-commit install` wires it into this clone's git hooks.

## Grammar

`npm install` fetches and verifies the WASM grammar via `postinstall`, from the release tag and checksum recorded in `grammar/tree-sitter-vhdl.version.json`.

```sh
npm run update-grammar -- <tag>     # pin to a specific release tag
npm run update-grammar -- latest    # resolve and pin to the newest release
npm run update-grammar              # re-verify the currently pinned tag
```

## Commits

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org): `type(scope): summary`. [`commitizen`](https://commitizen-tools.github.io/commitizen/) reads them to pick the next version and write the changelog.

| Type | Effect |
| --- | --- |
| `feat` | minor bump, listed in the changelog |
| `fix`, `refactor`, `perf` | patch bump, listed in the changelog |
| `feat!:` (any type with `!`) or a `BREAKING CHANGE:` footer | minor bump while the version is 0.x, major after |
| `build`, `chore`, `ci`, `docs`, `style`, `test` | no release |

`cz commit` (`pipx install commitizen`) prompts for each part of a message. The `commit-msg` hook installed by `pre-commit install` and the `commits` job in CI reject messages that don't match, and messages whose first line is longer than 72 characters. Both also spellcheck the message with cspell; words it doesn't know go in `.cspell/project-words.txt`.

## Releasing

Run the **Release** workflow on `main` from the Actions tab, or with `gh workflow run release.yml --ref main`. It:

1. Computes the next version from the commits since the last tag, updates `package.json`, `package-lock.json` and `CHANGELOG.md`, and commits and tags locally. The `increment` input overrides the computed bump.
2. Runs the tests and builds the `.vsix`.
3. Pushes the commit and tag together.
4. Creates the GitHub Release with the new changelog section as its notes and the `.vsix` attached.
5. Starts the **Publish to Marketplace** workflow on the new tag, which publishes that same `.vsix` once the `marketplace` environment's reviewer approves.

The `dry_run` input stops after step 2 and uploads the `.vsix` as a workflow artifact. `cz bump --dry-run` previews the next version and changelog section locally.

The **Publish to Marketplace** workflow takes a release tag and publishes the `.vsix` attached to that release. Run it with `gh workflow run publish.yml --ref <tag> -f tag=<tag>` to retry a failed publish; the `marketplace` environment only accepts runs on `v*` tags.

### Repository setup

- The `release` environment holds `RELEASE_TOKEN`, a token that can push to `main` past branch protection and create releases.
- The `marketplace` environment holds `VSCE_PAT`.
- Required reviewers on an environment gate the job that uses it.
