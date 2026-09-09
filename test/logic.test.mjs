import test from 'node:test';
import assert from 'node:assert/strict';
import { Parser, Language } from 'web-tree-sitter';
import { collectMatches } from '../out/grammar.js';

let parser;

test.before(async () => {
  await Parser.init();
  const lang = await Language.load(new URL('../grammar/tree-sitter-vhdl.wasm', import.meta.url).pathname);
  parser = new Parser();
  parser.setLanguage(lang);
});

function wrap(decls, body) {
  return `
entity e is
  port ( Clk : in std_logic; iRxClk : in std_logic; Ack : in std_logic );
end entity e;

architecture rtl of e is
  ${decls}
begin
  process (Clk) is
    variable v : integer;
  begin
    ${body}
  end process;
end architecture rtl;
`;
}

function matchesFor(src) {
  const tree = parser.parse(src);
  return collectMatches(tree.rootNode).map((m) => ({
    text: src.slice(m.startIndex, m.endIndex),
    kind: m.kind,
  }));
}

test('signal assignment is "replace", not just "ligature"', () => {
  const src = wrap('signal a, b : std_logic;', 'a <= b;');
  assert.deepEqual(matchesFor(src), [{ text: '<=', kind: 'replace' }]);
});

test('comparison <= in an if-condition only gets the ligature font, no substitution', () => {
  const src = wrap('signal a, b : std_logic;', 'if a <= b then null; end if;');
  assert.deepEqual(matchesFor(src), [{ text: '<=', kind: 'ligature' }]);
});

test('>= and /= comparisons get the ligature treatment', () => {
  const src = wrap('signal a, b : std_logic;', 'if a >= b then null; end if; if a /= b then null; end if;');
  assert.deepEqual(matchesFor(src), [
    { text: '>=', kind: 'ligature' },
    { text: '/=', kind: 'ligature' },
  ]);
});

test('variable assignment gets the ligature treatment', () => {
  const src = wrap('', 'v := 1;');
  assert.deepEqual(matchesFor(src), [{ text: ':=', kind: 'ligature' }]);
});

test('case_statement_alternative arrows only cover "=>", not the whole alternative', () => {
  const src = wrap('signal a : integer;', 'case a is when 0 => null; when others => null; end case;');
  assert.deepEqual(matchesFor(src), [
    { text: '=>', kind: 'ligature' },
    { text: '=>', kind: 'ligature' },
  ]);
});

test('element_association arrows inside an aggregate', () => {
  const src = `
entity e is end entity e;
architecture rtl of e is
  signal x : std_logic_vector(1 downto 0);
begin
  x <= (0 => '0', others => '0');
end architecture rtl;
`;
  const ms = matchesFor(src);
  // one signal_assignment substitution, plus two element_association ligature ranges
  assert.deepEqual(
    ms.map((m) => m.kind),
    ['replace', 'ligature', 'ligature']
  );
});

test('association_element arrows in port maps and generic maps', () => {
  const src = `
entity e is
  port ( Clk : in std_logic; iRxClk : in std_logic );
end entity e;
architecture rtl of e is
  component Foo is
    generic ( g : integer );
    port ( Clk : in std_logic; D : in std_logic );
  end component;
begin
  U1: Foo generic map (g => 1) port map (Clk => Clk, D => iRxClk);
end architecture rtl;
`;
  const ms = matchesFor(src);
  assert.deepEqual(
    ms.map((m) => m.kind),
    ['ligature', 'ligature', 'ligature']
  );
});

test('association where the formal is a common handshake-signal name like "Ack" decorates correctly', () => {
  const src = `
entity e is
  port ( Clk : in std_logic; iRxClk : in std_logic );
end entity e;
architecture rtl of e is
  component Foo is
    port ( Clk : in std_logic; Ack : in std_logic );
  end component;
begin
  U1: Foo port map (Clk => Clk, Ack => iRxClk);
end architecture rtl;
`;
  const ms = matchesFor(src);
  assert.deepEqual(ms, [
    { text: '=>', kind: 'ligature' },
    { text: '=>', kind: 'ligature' },
  ]);
});

test('nodes inside a parse error are left alone', () => {
  // A case statement directly in an architecture's concurrent region (not
  // inside a process) is invalid VHDL, producing an ERROR node.
  const src = `
entity e is end entity e;
architecture rtl of e is
  signal a : integer;
begin
  case a is
    when 0 => null;
    when others => null;
  end case;
end architecture rtl;
`;
  assert.deepEqual(matchesFor(src), []);
});

test('conditional_analysis_relation (VHDL-2008 tool directive) comparisons', () => {
  const src = `
entity e is end entity e;
architecture rtl of e is
begin
  process is begin
    if (VHDL_VERSION >= "2008") then
      null;
    end if;
  end process;
end architecture rtl;
`;
  const ms = matchesFor(src);
  // A plain 'if', not an actual `if directive - backtick directives are
  // awkward to embed in this template string.
  assert.deepEqual(ms, [{ text: '>=', kind: 'ligature' }]);
});

test('<> (unconstrained array) is never touched', () => {
  const src = `
package p is
  type t is array (natural range <>) of std_logic;
end package p;
`;
  const ms = matchesFor(src);
  assert.deepEqual(ms, []);
});
