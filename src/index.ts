/**
 * @fileoverview The @eslint/shell plugin: a shell language definition for
 * ESLint, ShellCheck-inspired rules, and a recommended configuration.
 */

import { ShellLanguage } from "./languages/shell-language.js";
import noBackticks from "./rules/no-backticks.js";

const rules = {
	"no-backticks": noBackticks,
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
