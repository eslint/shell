/**
 * @fileoverview Rule to disallow piping from a single-file `cat`.
 * Mirrors ShellCheck SC2002.
 */

import { getCommandName, getStaticText } from "./utils.js";
import type { BashRuleDefinition, WordNode, WordPartNode } from "../types.js";

function hasPotentialExpansion(word: WordNode): boolean {
	const checkParts = (parts: WordPartNode[], quoted = false): boolean =>
		parts.some(part => {
			switch (part.type) {
				case "Literal":
					return (
						!quoted &&
						(part.value.includes("*") ||
							part.value.includes("?") ||
							part.value.includes("[") ||
							part.value.includes("{") ||
							part.value.includes("}"))
					);
				case "SingleQuotedString":
					return part.dollar;
				case "DoubleQuotedString":
					return checkParts(part.parts, true);
				default:
					return false;
			}
		});

	return checkParts(word.parts);
}

const rule: BashRuleDefinition<{ MessageIds: "uselessCat" }> = {
	meta: {
		type: "suggestion",
		languages: ["shell/bash"],
		docs: {
			description: "Disallow useless `cat` at the start of a pipeline",
			recommended: true,
			dialects: ["Bash", "POSIX sh", "mksh"],
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

				// Skip flags, stdin markers, and arguments that can expand to
				// multiple words.
				if (
					text === null ||
					text.startsWith("-") ||
					!argument ||
					hasPotentialExpansion(argument)
				) {
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
