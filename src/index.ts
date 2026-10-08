/**
 * @fileoverview The @eslint/shell plugin: a shell language definition for
 * ESLint, ShellCheck-inspired rules, and a recommended configuration.
 */

import { ShellLanguage } from "./languages/shell-language.js";
import noBackticks from "./rules/no-backticks.js";
import noExpansionsInSingleQuotes from "./rules/no-expansions-in-single-quotes.js";
import noUnquotedExpansions from "./rules/no-unquoted-expansions.js";

const rules = {
	"no-backticks": noBackticks,
	"no-expansions-in-single-quotes": noExpansionsInSingleQuotes,
	"no-unquoted-expansions": noUnquotedExpansions,
};

const plugin = {
	meta: {
		name: "@eslint/shell",
		namespace: "shell",
		version: "0.0.0", // x-release-please-version
	},
	languages: {
		bash: new ShellLanguage({ variant: "bash" }),
		posix: new ShellLanguage({ variant: "posix" }),
		mksh: new ShellLanguage({ variant: "mksh" }),
	},
	rules,
	configs: {
		recommended: {
			name: "shell/recommended",
			files: ["**/*.sh", "**/*.bash"],
			language: "shell/bash",
			plugins: {},
			rules: {
				"shell/no-backticks": "error",
				"shell/no-expansions-in-single-quotes": "warn",
				"shell/no-unquoted-expansions": "error",
			},
		},
	},
};

// The recommended config must reference the plugin itself.
Object.assign(plugin.configs.recommended.plugins, { shell: plugin });

export default plugin;
export { ShellLanguage } from "./languages/shell-language.js";
export { ShellSourceCode } from "./languages/shell-source-code.js";
export { parseShell, ShellSyntaxError } from "./parser/parse.js";
export { visitorKeys } from "./visitor-keys.js";
export type * from "./types.js";
