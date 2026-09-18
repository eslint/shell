/**
 * @fileoverview Rule to disallow `$(echo ...)` command substitutions.
 * Mirrors ShellCheck SC2116.
 */

import { isCommandNamed } from "./utils.js";
import type { ShellRuleDefinition } from "../types.js";

const rule: ShellRuleDefinition<{ MessageIds: "uselessEcho" }> = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Disallow useless `echo` inside command substitutions",
			recommended: true,
			url: "https://github.com/eslint/shell/blob/main/docs/rules/no-useless-echo.md",
		},
		schema: [],
		messages: {
			uselessEcho:
				"Useless echo? Instead of 'cmd $(echo foo)', just use 'cmd foo'. (ShellCheck SC2116)",
		},
	},

	create(context) {
		return {
			CommandSubstitution(node) {
				const first = node.body[0];

				if (
					node.body.length === 1 &&
					first !== undefined &&
					isCommandNamed(first, "echo") &&
					!first.negated &&
					first.redirects.length === 0
				) {
					context.report({
						node,
						messageId: "uselessEcho",
					});
				}
			},
		};
	},
};

export default rule;
