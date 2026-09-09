// Pure tree-walking logic, independent of vscode, so it can be unit-tested
// with plain Node + web-tree-sitter. Byte offsets in the source, not
// vscode.Position, are the output; extension.ts converts those to editor
// positions since only it has a TextDocument to do that conversion with.

// `replace` is only for signal-assignment "<=", the one case a font
// ligature can't handle: ligature substitution is driven purely by the
// two source characters, so it can't distinguish signal-assignment from
// comparison. Every other operator has exactly one meaning wherever it
// appears, so those get `ligature` instead - extension.ts leaves the real
// characters untouched and just points the font at them, letting the
// font's own OpenType ligature render the connected glyph.
export type Match =
  | { kind: 'replace'; startIndex: number; endIndex: number }
  | { kind: 'ligature'; startIndex: number; endIndex: number };

const RELATIONAL_LIGATURE_TEXT = new Set(['<=', '>=', '/=']);

// Node types whose own text is the *entire* two-character token (no
// surrounding node to drill into).
const LIGATURE_BARE_TOKEN_TYPES = new Set(['variable_assignment']);

// Node types that wrap a "=>" anonymous token among other children
// (the target/expression either side) - must match just that child,
// not the whole node.
const ARROW_WRAPPER_TYPES = new Set([
  'element_association',
  'association_element',
  'case_statement_alternative',
  'case_generate_body',
]);

// Minimal structural shape we need from a web-tree-sitter Node, so this
// file has no import-time dependency on the web-tree-sitter package
// either - just duck-typed for testability.
export interface TSNode {
  type: string;
  text: string;
  startIndex: number;
  endIndex: number;
  isError?: boolean;
  children: (TSNode | null)[];
}

export function collectMatches(root: TSNode): Match[] {
  const out: Match[] = [];
  walk(root, false, out);
  return out;
}

function walk(node: TSNode, inError: boolean, out: Match[]): void {
  const isErrorNode = node.type === 'ERROR' || node.isError === true;
  const childInError = inError || isErrorNode;

  if (!inError && !isErrorNode) {
    if (node.type === 'signal_assignment') {
      out.push({ kind: 'replace', startIndex: node.startIndex, endIndex: node.endIndex });
    } else if (LIGATURE_BARE_TOKEN_TYPES.has(node.type)) {
      out.push({ kind: 'ligature', startIndex: node.startIndex, endIndex: node.endIndex });
    } else if (node.type === 'relational_operator') {
      if (RELATIONAL_LIGATURE_TEXT.has(node.text)) {
        out.push({ kind: 'ligature', startIndex: node.startIndex, endIndex: node.endIndex });
      }
    } else if (node.type === 'conditional_analysis_relation') {
      for (const child of node.children) {
        if (!child) continue;
        if (child.type !== child.text) continue; // only the bare operator token
        if (RELATIONAL_LIGATURE_TEXT.has(child.text)) {
          out.push({ kind: 'ligature', startIndex: child.startIndex, endIndex: child.endIndex });
        }
      }
    } else if (ARROW_WRAPPER_TYPES.has(node.type)) {
      const arrow = node.children.find((c) => c !== null && c.type === '=>');
      if (arrow) {
        out.push({ kind: 'ligature', startIndex: arrow.startIndex, endIndex: arrow.endIndex });
      }
    }
  }

  for (const child of node.children) {
    if (child) walk(child, childInError, out);
  }
}
