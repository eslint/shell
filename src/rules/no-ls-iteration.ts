/**
 * @fileoverview Rule to disallow iterating over `ls` output.
 * Mirrors ShellCheck SC2045.
 */

import { startsWithCommand } from "./utils.js";
import type { BashRuleDefinition } from "../types.js";

const rule: BashRuleDefinition<{ MessageIds: "lsIteration" }> = {
	meta: {
		type: "problem",
		languages: ["shell/bash"],
		docs: {
			description:
				"Disallow iterating over `ls` output, which breaks on special characters",
			recommended: true,
			dialects: ["Bash", "POSIX sh", "mksh"],
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
							startsWithCommand(part.body, "ls")
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
