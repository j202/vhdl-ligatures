import * as vscode from 'vscode';
import { VhdlParser } from './parserService';
import { collectMatches, Match } from './grammar';

const VHDL_EXTENSIONS = ['.vhd', '.vhdl'];

function isVhdlDocument(document: vscode.TextDocument): boolean {
  const lower = document.uri.fsPath.toLowerCase();
  return VHDL_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

// "calt"/"liga" are forced on regardless of the user's `editor.fontLigatures`
// setting, since rendering these specific tokens as ligatures is the point
// of the extension. The font itself is left alone: if it has no ligature
// for a given operator, that operator just renders as plain text.
const LIGATURE_FEATURE_SETTINGS = 'font-feature-settings: "calt" 1, "liga" 1;';

function createLigatureDecorationType(): vscode.TextEditorDecorationType {
  return vscode.window.createTextEditorDecorationType({
    textDecoration: `none; ${LIGATURE_FEATURE_SETTINGS}`,
  });
}

// The original two characters keep their real, untouched width - only
// `color: transparent` hides their ink - so VS Code's column/cursor math
// for this row is never wrong. Shrinking their width instead (`display:
// none`, zero `width`, `font-size: 0`) causes various caret and selection
// rendering bugs, since it lies about how wide real text is.
function createReplaceDecorationType(): vscode.TextEditorDecorationType {
  return vscode.window.createTextEditorDecorationType({
    color: 'transparent',
  });
}

function buildReplaceDecorationOptions(
  match: Extract<Match, { kind: 'replace' }>,
  document: vscode.TextDocument
): vscode.DecorationOptions {
  const range = new vscode.Range(document.positionAt(match.startIndex), document.positionAt(match.endIndex));
  return {
    range,
    renderOptions: {
      before: {
        // Literal "=>" (shaped into the real maps-to ligature by the font
        // settings below), flipped horizontally so it reads as that same
        // arrow backwards rather than an unrelated glyph. `display:
        // inline-block` is required for `transform` to apply at all
        // (Chromium ignores it on plain inline boxes). `margin-right:
        // -2ch` overlaps this glyph onto the invisible original text
        // instead of leaving it after with a gap.
        contentText: '=>',
        textDecoration: `none; display: inline-block; margin-right: -2ch; transform: scaleX(-1); ${LIGATURE_FEATURE_SETTINGS}`,
      },
    },
  };
}

interface DocState {
  version: number;
  replaceDecorations: vscode.DecorationOptions[];
  ligatureRanges: vscode.Range[];
}

export function activate(context: vscode.ExtensionContext): void {
  const parser = new VhdlParser();
  const replaceDecorationType = createReplaceDecorationType();
  const ligatureDecorationType = createLigatureDecorationType();
  const docStates = new Map<string, DocState>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  let grammarLoadFailed = false;

  async function recompute(document: vscode.TextDocument): Promise<void> {
    if (!isVhdlDocument(document)) return;
    try {
      await parser.ready();
    } catch (err) {
      if (!grammarLoadFailed) {
        grammarLoadFailed = true;
        console.error('vhdl-ligatures: failed to load grammar', err);
        void vscode.window.showErrorMessage(
          'VHDL Ligatures: could not load the VHDL grammar, so ligature rendering is disabled. Try reinstalling the extension.'
        );
      }
      return;
    }
    const tree = parser.parse(document.getText());
    const matches = collectMatches(tree.rootNode);
    const replaceDecorations: vscode.DecorationOptions[] = [];
    const ligatureRanges: vscode.Range[] = [];
    for (const m of matches) {
      if (m.kind === 'replace') {
        replaceDecorations.push(buildReplaceDecorationOptions(m, document));
      } else {
        ligatureRanges.push(new vscode.Range(document.positionAt(m.startIndex), document.positionAt(m.endIndex)));
      }
    }
    docStates.set(document.uri.toString(), { version: document.version, replaceDecorations, ligatureRanges });
    applyToVisibleEditors(document);
  }

  function scheduleRecompute(document: vscode.TextDocument): void {
    const key = document.uri.toString();
    const existing = timers.get(key);
    if (existing) clearTimeout(existing);
    timers.set(
      key,
      setTimeout(() => {
        timers.delete(key);
        recompute(document).catch((err) => console.error('vhdl-ligatures: parse failed', err));
      }, 120)
    );
  }

  // The arrow renders unconditionally, regardless of cursor position - a
  // real ligature font doesn't break a ligature apart just because the
  // caret sits on it, so this doesn't either.
  function applyToVisibleEditors(document: vscode.TextDocument): void {
    const key = document.uri.toString();
    const state = docStates.get(key);
    for (const editor of vscode.window.visibleTextEditors) {
      if (editor.document.uri.toString() !== key) continue;
      if (!state) {
        editor.setDecorations(replaceDecorationType, []);
        editor.setDecorations(ligatureDecorationType, []);
        continue;
      }
      editor.setDecorations(replaceDecorationType, state.replaceDecorations);
      editor.setDecorations(ligatureDecorationType, state.ligatureRanges);
    }
  }

  // --- event wiring ---

  for (const editor of vscode.window.visibleTextEditors) {
    if (isVhdlDocument(editor.document)) {
      recompute(editor.document).catch((err) => console.error('vhdl-ligatures: initial parse failed', err));
    }
  }

  context.subscriptions.push(
    replaceDecorationType,
    ligatureDecorationType,
    vscode.workspace.onDidOpenTextDocument((doc) => {
      if (isVhdlDocument(doc)) scheduleRecompute(doc);
    }),
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (isVhdlDocument(e.document)) scheduleRecompute(e.document);
    }),
    vscode.workspace.onDidCloseTextDocument((doc) => {
      docStates.delete(doc.uri.toString());
    }),
    vscode.window.onDidChangeVisibleTextEditors((editors) => {
      for (const editor of editors) {
        if (!isVhdlDocument(editor.document)) continue;
        if (docStates.has(editor.document.uri.toString())) {
          applyToVisibleEditors(editor.document);
        } else {
          recompute(editor.document).catch((err) => console.error('vhdl-ligatures: parse failed', err));
        }
      }
    })
  );
}

export function deactivate(): void {}
