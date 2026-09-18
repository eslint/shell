/**
 * @fileoverview The @eslint/shell plugin: a shell language definition for
 * ESLint, ShellCheck-inspired rules, and a recommended configuration.
 * @author Claude Opus 5.5
 */

//------------------------------------------------------------------------------
// Plugin
//------------------------------------------------------------------------------

const plugin = {
	meta: {
		name: "@eslint/shell",
		namespace: "shell",
		version: "0.0.0", // x-release-please-version
	},
};

//------------------------------------------------------------------------------
// Exports
//------------------------------------------------------------------------------

export default plugin;
export { parseBash, BashSyntaxError } from "./parser/parse.js";
export type * from "./types.js";
