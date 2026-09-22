# ESLint Bash Language Plugin

A Bash language plugin for [ESLint](https://eslint.org), providing:

- an ESLint-style **parser** for Bash (wrapping
  [mvdan-sh](https://www.npmjs.com/package/mvdan-sh), the parser behind
  `shfmt`) that produces an ESTree-style syntax tree,
- an ESLint **language** implementation so rules can traverse that tree,
- **rules** inspired by [ShellCheck](https://www.shellcheck.net) checks, and
- a **recommended configuration**.

## Installation

```bash
npm install --save-dev eslint @eslint/bash
```

Requires Node.js `^20.19.0 || ^22.13.0 || >=24`. Tested with ESLint v10.

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
