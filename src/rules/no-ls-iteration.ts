/**
 * @fileoverview Rule to disallow iterating over `ls` output.
 * Mirrors ShellCheck SC2045/SC2012.
 */

import { isCommandNamed } from "./utils.js";
import type { BashRuleDefinition, StatementNode } from "../types.js";

/**
 * Determines whether a command substitution body starts with `ls`.
 */
function startsWithLs(body: StatementNode[]): boolean {
	const first = body[0];

	if (!first) {
		return false;
	}

	if (first.type === "Pipeline") {
		const firstCommand = first.commands[0];

		return firstCommand !== undefined && isCommandNamed(firstCommand, "ls");
	}

	return isCommandNamed(first, "ls");
}

const rule: BashRuleDefinition<{ MessageIds: "lsIteration" }> = {
	meta: {
		type: "problem",
		docs: {
			description:
				"Disallow iterating over `ls` output, which breaks on special characters",
			recommended: true,
			url: "https://github.com/eslint/bash/blob/main/docs/rules/no-ls-iteration.md",
		},
		schema: [],
		messages: {
			lsIteration:
				"Iterating over ls output is fragile. Use globs (e.g. *) instead. (ShellCheck SC2045)",
		},
	},

	create(context) {
		return {
			ForStatement(node) {
				for (const word of node.words) {
					for (const part of word.parts) {
						if (
							part.type === "CommandSubstitution" &&
							startsWithLs(part.body)
						) {
							context.report({
								node: part,
								messageId: "lsIteration",
							});
						}
					}
				}
			},
		};
	},
};

export default rule;
