import * as path from 'path';
import { Parser, Language, Tree } from 'web-tree-sitter';

let initialized: Promise<Language> | undefined;

function loadLanguage(): Promise<Language> {
  if (!initialized) {
    const wasmPath = path.join(__dirname, '..', 'grammar', 'tree-sitter-vhdl.wasm');
    initialized = Parser.init().then(() => Language.load(wasmPath));
  }
  return initialized;
}

export class VhdlParser {
  private parser: Parser | undefined;

  async ready(): Promise<void> {
    if (this.parser) return;
    const language = await loadLanguage();
    this.parser = new Parser();
    this.parser.setLanguage(language);
  }

  parse(source: string): Tree {
    if (!this.parser) {
      throw new Error('VhdlParser used before ready()');
    }
    const tree = this.parser.parse(source);
    if (!tree) {
      throw new Error('tree-sitter failed to produce a parse tree');
    }
    return tree;
  }
}
