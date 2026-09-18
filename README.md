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

| Language      | Dialect  |
| ------------- | -------- |
| `shell/bash`  | Bash     |
| `shell/posix` | POSIX sh |
| `shell/mksh`  | mksh     |

The recommended configuration uses `shell/bash`. To lint scripts written for
another dialect, set `language` yourself:

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

### Language options

| Option    | Values                        | Default                | Description                |
| --------- | ----------------------------- | ---------------------- | -------------------------- |
| `variant` | `"bash"`, `"posix"`, `"mksh"` | The language's dialect | The shell dialect to parse |

Each language sets `variant` to its own dialect, so you only need this option
to override the dialect of the language you chose.

## Rules

Each rule mirrors a well-known ShellCheck check.

| Rule                                                                               | ShellCheck | Description                                             | Fixable | Recommended |
| ---------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------- | ------- | ----------- |
| [`no-backticks`](./docs/rules/no-backticks.md)                                     | SC2006     | Use `$(...)` instead of legacy backticks                | ✅      | error       |
| [`no-expansions-in-single-quotes`](./docs/rules/no-expansions-in-single-quotes.md) | SC2016     | Expressions don't expand in single quotes               |         | warn        |
| [`no-ls-iteration`](./docs/rules/no-ls-iteration.md)                               | SC2045     | Don't iterate over `ls` output; use globs               |         | error       |
| [`no-unquoted-expansions`](./docs/rules/no-unquoted-expansions.md)                 | SC2086/46  | Quote expansions subject to word splitting and globbing | ✅      | error       |
| [`no-unused-vars`](./docs/rules/no-unused-vars.md)                                 | SC2034     | Disallow variables that are assigned but never used     |         | error       |
| [`no-useless-cat`](./docs/rules/no-useless-cat.md)                                 | SC2002     | Don't pipe from a single-file `cat`                     |         | error       |
| [`no-useless-echo`](./docs/rules/no-useless-echo.md)                               | SC2116     | Disallow `$(echo ...)`                                  |         | error       |
| [`no-variables-in-printf-format`](./docs/rules/no-variables-in-printf-format.md)   | SC2059     | Don't put variables in the `printf` format string       |         | error       |
| [`require-cd-guard`](./docs/rules/require-cd-guard.md)                             | SC2164     | Handle `cd` failure with `\|\| exit` (has suggestions)  |         | error       |
| [`require-read-r`](./docs/rules/require-read-r.md)                                 | SC2162     | Use `read -r` so backslashes aren't mangled             | ✅      | error       |

### Rule options

`bash/no-unused-vars` accepts an object option:

```js
"bash/no-unused-vars": ["error", { allowed: ["MY_GLOBAL"] }]
```

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
