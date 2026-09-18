/**
 * @fileoverview Rule to require the `-r` flag when using `read`.
 * Mirrors ShellCheck SC2162.
 */

import { getCommandName, getStaticText } from "./utils.js";
import type { BashRuleDefinition } from "../types.js";

const rule: BashRuleDefinition<{ MessageIds: "missingR" }> = {
	meta: {
		type: "problem",
		docs: {
			description: "Require `read -r` so backslashes are not mangled",
			recommended: true,
			url: "https://github.com/eslint/bash/blob/main/docs/rules/require-read-r.md",
		},
		fixable: "code",
		schema: [],
		messages: {
			missingR:
				"read without -r will mangle backslashes. (ShellCheck SC2162)",
		},
	},

	create(context) {
		return {
			Command(node) {
				if (getCommandName(node) !== "read" || !node.name) {
					return;
				}

				for (const argument of node.arguments) {
					const text = getStaticText(argument);

					if (text === "--") {
						break;
					}

					if (text !== null && /^-[a-zA-Z]*r/u.test(text)) {
						return;
					}
				}

				const name = node.name;

				context.report({
					node: name,
					messageId: "missingR",
					fix: fixer => fixer.insertTextAfter(name, " -r"),
				});
			},
		};
	},
};

export default rule;
