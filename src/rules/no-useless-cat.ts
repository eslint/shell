/**
 * @fileoverview Rule to disallow piping from a single-file `cat`.
 * Mirrors ShellCheck SC2002.
 */

import { getCommandName, getStaticText } from "./utils.js";
import type { BashRuleDefinition } from "../types.js";

const rule: BashRuleDefinition<{ MessageIds: "uselessCat" }> = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Disallow useless `cat` at the start of a pipeline",
			recommended: true,
			url: "https://github.com/eslint/bash/blob/main/docs/rules/no-useless-cat.md",
		},
		schema: [],
		messages: {
			uselessCat:
				"Useless cat. Consider 'cmd < file' or 'cmd file' instead. (ShellCheck SC2002)",
		},
	},

	create(context) {
		return {
			Pipeline(node) {
				const first = node.commands[0];

				if (
					!first ||
					first.type !== "Command" ||
					getCommandName(first) !== "cat" ||
					first.redirects.length > 0 ||
					first.arguments.length !== 1
				) {
					return;
				}

				const argument = first.arguments[0];
				const text = argument ? getStaticText(argument) : null;

				// Skip flags (e.g. `cat -n file`) and stdin markers.
				if (text === null || text.startsWith("-")) {
					return;
				}

				context.report({
					node: first,
					messageId: "uselessCat",
				});
			},
		};
	},
};

export default rule;
