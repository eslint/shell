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
import shell from "@eslint/shell";

export default [
	// use the recommended rules for *.sh and *.bash files
	shell.configs.recommended,
];
```

Or configure it manually:

```js
import shell from "@eslint/shell";

export default [
	{
		files: ["**/*.sh"],
		plugins: { shell },
		language: "shell/bash",
		rules: {
			"shell/no-backticks": "error",
			"shell/no-unquoted-expansions": "error",
		},
	},
];
```

### Languages

The plugin provides one language per shell dialect:

| Language      | Description                           |
| ------------- | ------------------------------------- |
| `shell/bash`  | Bash. Used by the recommended config. |
| `shell/posix` | POSIX `sh`, without Bash extensions.  |
| `shell/mksh`  | MirBSD Korn shell.                    |

```js
export default [
	{
		files: ["**/*.sh"],
		plugins: { shell },
		language: "shell/posix",
		rules: { "shell/no-backticks": "error" },
	},
];
```

## Rules

Each rule mirrors a well-known ShellCheck check.

| Rule                                                                               | ShellCheck | Description                                             | Fixable | Recommended |
| ---------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------- | ------- | ----------- |
| [`no-backticks`](./docs/rules/no-backticks.md)                                     | SC2006     | Use `$(...)` instead of legacy backticks                | ✅      | error       |
| [`no-expansions-in-single-quotes`](./docs/rules/no-expansions-in-single-quotes.md) | SC2016     | Expressions don't expand in single quotes               |         | warn        |
| [`no-unquoted-expansions`](./docs/rules/no-unquoted-expansions.md)                 | SC2086/46  | Quote expansions subject to word splitting and globbing | ✅      | error       |
| [`no-useless-echo`](./docs/rules/no-useless-echo.md)                               | SC2116     | Disallow `$(echo ...)`                                  |         | error       |

## Configuration comments

Standard ESLint configuration comments work inside shell scripts:

```bash
# eslint-disable-next-line shell/no-backticks
echo `pwd`

echo `pwd` # eslint-disable-line shell/no-backticks -- legacy

# eslint shell/no-useless-echo: "warn"
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
