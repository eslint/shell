/**
 * @fileoverview Rule to flag expansion-like text inside single quotes.
 * Mirrors ShellCheck SC2016.
 */

import type { ShellRuleDefinition } from "../types.js";

/**
 * Matches text that looks like an intended expansion: `$name`, `${...}`,
 * `$(...)`, or backticks. Positional-style references such as `$1` are
 * excluded because they are common in awk/sed programs.
 */
const EXPANSION_LIKE = /\$[A-Za-z_{(]|`[^`]+`/u;

const rule: ShellRuleDefinition<{ MessageIds: "expansionInSingleQuotes" }> = {
	meta: {
		type: "suggestion",
		languages: ["shell/bash"],
		docs: {
			description:
				"Disallow expansion-like syntax inside single quotes, where it is not expanded",
			recommended: true,
			dialects: ["Bash", "POSIX sh", "mksh"],
			url: "https://github.com/eslint/shell/blob/main/docs/rules/no-expansions-in-single-quotes.md",
		},
		schema: [],
		messages: {
			expansionInSingleQuotes:
				"Expressions don't expand in single quotes; use double quotes for that. (ShellCheck SC2016)",
		},
	},

	create(context) {
		return {
			SingleQuotedString(node) {
				if (!node.dollar && EXPANSION_LIKE.test(node.value)) {
					context.report({
						node,
						messageId: "expansionInSingleQuotes",
					});
				}
			},
		};
	},
};

export default rule;
