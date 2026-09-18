/**
 * @fileoverview Rule to require handling `cd` failure.
 * Mirrors ShellCheck SC2164.
 */

import { getCommandName } from "./utils.js";
import type { ShellRuleDefinition } from "../types.js";

const rule: ShellRuleDefinition<{
	MessageIds: "uncheckedCd" | "addGuard";
}> = {
	meta: {
		type: "problem",
		docs: {
			description:
				"Require `cd` failures to be handled, e.g. `cd ... || exit`",
			recommended: true,
			url: "https://github.com/eslint/shell/blob/main/docs/rules/require-cd-guard.md",
		},
		hasSuggestions: true,
		schema: [],
		messages: {
			uncheckedCd:
				"Use 'cd ... || exit' or 'cd ... || return' in case cd fails. (ShellCheck SC2164)",
			addGuard: "Add '|| exit' after the cd command.",
		},
	},

	create(context) {
		const { sourceCode } = context;

		return {
			Command(node) {
				if (getCommandName(node) !== "cd") {
					return;
				}

				// `! cd ...` uses the exit status explicitly.
				if (node.negated) {
					return;
				}

				const parent = sourceCode.getParent(node);

				if (parent) {
					// The left side of `&&`/`||` has its status checked.
					if (
						parent.type === "LogicalExpression" &&
						parent.left === node
					) {
						return;
					}

					// `if cd ...`, `while cd ...`, `until cd ...`
					if (
						(parent.type === "IfStatement" ||
							parent.type === "WhileStatement" ||
							parent.type === "UntilStatement") &&
						parent.test.includes(node)
					) {
						return;
					}
				}

				const canSuggest =
					!node.background && node.redirects.length === 0;

				context.report({
					node,
					messageId: "uncheckedCd",
					suggest: canSuggest
						? [
								{
									messageId: "addGuard",
									fix: fixer =>
										fixer.insertTextAfter(node, " || exit"),
								},
							]
						: [],
				});
			},
		};
	},
};

export default rule;
