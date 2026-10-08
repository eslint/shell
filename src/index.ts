/**
 * @fileoverview The @eslint/shell plugin: a shell language definition for
 * ESLint, ShellCheck-inspired rules, and a recommended configuration.
 */

const plugin = {
	meta: {
		name: "@eslint/shell",
		namespace: "shell",
		version: "0.0.0", // x-release-please-version
	},
};

export default plugin;
export { parseShell, ShellSyntaxError } from "./parser/parse.js";
export type * from "./types.js";
