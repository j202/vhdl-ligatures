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

## License

[MIT](LICENSE) · [Third-party notices](THIRD-PARTY-NOTICES.md)
