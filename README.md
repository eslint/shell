# ESLint Shell Language Plugin

A shell language plugin for [ESLint](https://eslint.org), providing:

- an ESLint-style **parser** for shell scripts (wrapping
  [mvdan-sh](https://www.npmjs.com/package/mvdan-sh), the parser behind
  `shfmt`) that produces an ESTree-style syntax tree,
- an ESLint **language** implementation so rules can traverse that tree,
- **rules** inspired by [ShellCheck](https://www.shellcheck.net) checks, and
- a **recommended configuration**.

## Installation

```bash
npm install --save-dev eslint @eslint/shell
```

Requires Node.js `^20.19.0 || ^22.13.0 || >=24`. Tested with ESLint v10.

## Usage

Add the plugin to your `eslint.config.js`:

```js
import bash from "@eslint/bash";

export default [
	// use the recommended rules for *.sh and *.bash files
	bash.configs.recommended,
];
```

### Language options

| Option    | Values                        | Default  | Description                |
| --------- | ----------------------------- | -------- | -------------------------- |
| `variant` | `"bash"`, `"posix"`, `"mksh"` | `"bash"` | The shell dialect to parse |

```js
export default [
	{
		files: ["**/*.sh"],
		plugins: { bash },
		language: "bash/bash",
		languageOptions: { variant: "posix" },
	},
];
```

## Configuration comments

Standard ESLint configuration comments work inside Bash files:

```bash
# eslint-disable-next-line bash/no-backticks
echo `pwd`

echo `pwd` # eslint-disable-line bash/no-backticks -- legacy

# eslint bash/no-useless-echo: "warn"
```

## Syntax tree

The tree format is documented in [docs/syntax-tree.md](docs/syntax-tree.md).
Nodes carry `start`/`end` character offsets instead of `range`/`loc`
properties; use `sourceCode.getRange(node)` and `sourceCode.getLoc(node)`.

The parser is also exported directly:

```js
import { parseShell } from "@eslint/shell";

const { ast, comments } = parseShell('echo "hello"\n');
```

## Development

```bash
npm install
npm test          # unit + integration tests (Vitest)
npm run lint      # ESLint on the plugin's own sources
npm run fmt       # Prettier
npm run build     # compile TypeScript to dist/
```

Pre-commit hooks (via [yorkie](https://www.npmjs.com/package/yorkie) and
lint-staged) run Prettier and ESLint on staged files. Releases are managed
with [release-please](https://github.com/googleapis/release-please) through
GitHub Actions.

## License

Apache-2.0
