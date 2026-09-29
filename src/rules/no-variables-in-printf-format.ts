/**
 * @fileoverview Rule to disallow variables in the printf format string.
 * Mirrors ShellCheck SC2059.
 */

import { getCommandName, getExpansions, getStaticText } from "./utils.js";
import type { BashRuleDefinition } from "../types.js";

const rule: BashRuleDefinition<{ MessageIds: "variableInFormat" }> = {
	meta: {
		type: "problem",
		docs: {
			description:
				"Disallow variables in the printf format string; use %s placeholders instead",
			recommended: true,
			url: "https://github.com/eslint/bash/blob/main/docs/rules/no-variables-in-printf-format.md",
		},
		schema: [],
		messages: {
			variableInFormat:
				"Don't use variables in the printf format string. Use printf '...%s...' \"$foo\". (ShellCheck SC2059)",
		},
	},

	create(context) {
		return {
			Command(node) {
				if (getCommandName(node) !== "printf") {
					return;
				}

				let formatIndex = 0;
				const first = node.arguments[0]
					? getStaticText(node.arguments[0])
					: null;

				if (first === "-v") {
					// `printf -v var format ...`
					formatIndex = 2;
				} else if (first !== null && first.startsWith("-v")) {
					// `printf -vvar format ...`
					formatIndex = 1;
				}

				const possibleFormat = node.arguments[formatIndex];
				if (possibleFormat && getStaticText(possibleFormat) === "--") {
					formatIndex++;
				}

				const format = node.arguments[formatIndex];

				if (!format) {
					return;
				}

				if (getExpansions(format, { includeQuoted: true }).length > 0) {
					context.report({
						node: format,
						messageId: "variableInFormat",
					});
				}
			},
		};
	},
};

export default rule;
