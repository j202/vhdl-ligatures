#!/usr/bin/env node

// Fetches the pinned tree-sitter-vhdl.wasm from a tagged GitHub release
// into grammar/. `<tag>` pins to that tag; `latest` resolves and pins to
// whatever's newest; no argument (what postinstall runs) re-fetches the
// currently pinned tag and verifies the checksum still matches.
//
// Bumping is always this explicit, separate step, never automatic:
// grammar.ts's matching logic depends on specific upstream node type
// names and behavior, and a new tag isn't safe to adopt until the test
// suite confirms those assumptions still hold.

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const REPO = 'jpt13653903/tree-sitter-vhdl';
const GRAMMAR_DIR = path.join(import.meta.dirname, '..', 'grammar');
const WASM_PATH = path.join(GRAMMAR_DIR, 'tree-sitter-vhdl.wasm');
const MANIFEST_PATH = path.join(GRAMMAR_DIR, 'tree-sitter-vhdl.version.json');

let requestedTag = process.argv[2];
if (requestedTag === 'latest') {
  const releaseUrl = `https://api.github.com/repos/${REPO}/releases/latest`;
  const releaseResponse = await fetch(releaseUrl);
  if (!releaseResponse.ok) {
    throw new Error(`${releaseResponse.status} ${releaseResponse.statusText} fetching ${releaseUrl}`);
  }
  requestedTag = (await releaseResponse.json()).tag_name;
  console.log(`Latest release is ${requestedTag}`);
}
const tag = requestedTag ?? JSON.parse(await readFile(MANIFEST_PATH, 'utf8')).tag;

const url = `https://github.com/${REPO}/releases/download/${tag}/tree-sitter-vhdl.wasm`;
console.log(`Fetching ${url}`);
const response = await fetch(url);
if (!response.ok) {
  throw new Error(`${response.status} ${response.statusText} fetching ${url}`);
}
const buffer = Buffer.from(await response.arrayBuffer());
const sha256 = createHash('sha256').update(buffer).digest('hex');

if (!requestedTag) {
  const previous = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  if (previous.sha256 !== sha256) {
    throw new Error(`Checksum mismatch for ${tag}: expected ${previous.sha256}, got ${sha256}`);
  }
  console.log(`Verified: ${tag} still matches recorded checksum.`);
}

await writeFile(WASM_PATH, buffer);
await writeFile(MANIFEST_PATH, JSON.stringify({ repo: REPO, tag, sha256 }, null, 2) + '\n');
console.log(`Wrote ${WASM_PATH} (${buffer.length} bytes) and ${MANIFEST_PATH}, pinned to ${tag}.`);
