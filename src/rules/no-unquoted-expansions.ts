/**
 * @fileoverview Rule to require quoting expansions that undergo word
 * splitting and globbing.
 */

//------------------------------------------------------------------------------
// Imports
//------------------------------------------------------------------------------

import type { ShellRuleDefinition, WordNode } from "../types.js";
import { startsWithCommand } from "./utils.js";

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

/**
 * Parameters that always expand to values that cannot split, so quoting is
 * unnecessary.
 */
const SAFE_PARAMETERS = new Set(["?", "$", "!", "#", "-"]);

/**
 * Operators of the "use alternate value" expansion. `${var:+word}` expands
 * to `word` or to nothing, so it's `word` that needs quoting.
 */
const ALTERNATE_VALUE_OPERATORS = new Set(["+", ":+"]);

/**
 * Characters that make unquoted text split (whitespace) or glob (`*`, `?`,
 * `[`) after expansion.
 */
const SPLIT_OR_GLOB_CHARS = /[\s*?[]/u;

/**
 * Checks whether a word has unquoted text that the shell would split or glob.
 * Escaped characters such as `\ ` are skipped because they don't split.
 * @param word The word to check.
 * @returns `true` if a literal part contains splitting or glob characters.
 */
function hasSplittingLiteral(word: WordNode): boolean {
	return word.parts.some(
		part =>
			part.type === "Literal" &&
			SPLIT_OR_GLOB_CHARS.test(part.value.replace(/\\./gsu, "")),
	);
}

/** Heredoc-style redirect operators whose targets never word-split. */
const NON_SPLITTING_REDIRECTS = new Set(["<<", "<<-", "<<<"]);

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

const rule: ShellRuleDefinition<{
	MessageIds:
		| "unquotedParameterExpansion"
		| "unquotedCommandSubstitution"
		| "unquotedAlternateValue";
}> = {
	meta: {
		type: "problem",
		docs: {
			description:
				"Require quoting parameter expansions and command substitutions that are subject to word splitting",
			recommended: true,
			url: "https://github.com/eslint/shell/blob/main/docs/rules/no-unquoted-expansions.md",
		},
		fixable: "code",
		schema: [],
		messages: {
			unquotedParameterExpansion:
				'Double quote "{{expansion}}" to prevent word splitting and globbing.',
			unquotedCommandSubstitution:
				"Quote this command substitution to prevent word splitting.",
			unquotedAlternateValue:
				'Double quote the alternate value in "{{expansion}}" to prevent word splitting and globbing.',
		},
	},

	create(context) {
		const { sourceCode } = context;

		function checkWord(word: WordNode, isForWord = false): void {
			for (const part of word.parts) {
				if (
					part.type !== "ParameterExpansion" &&
					part.type !== "CommandSubstitution"
				) {
					continue;
				}

				if (part.type === "ParameterExpansion") {
					if (part.lengthOf || SAFE_PARAMETERS.has(part.name)) {
						continue;
					}

					if (
						part.operator &&
						ALTERNATE_VALUE_OPERATORS.has(part.operator)
					) {
						if (part.word) {
							// Quoting the whole expansion would change its meaning
							// when the parameter is unset, so there's no autofix.
							if (hasSplittingLiteral(part.word)) {
								context.report({
									node: part,
									messageId: "unquotedAlternateValue",
									data: {
										expansion: sourceCode.getText(part),
									},
								});
							}

							checkWord(part.word, isForWord);
						}

						continue;
					}
				}

				// Only offer a fix when the expansion is the entire word.
				const isWholeWord =
					word.parts.length === 1 &&
					word.start === part.start &&
					word.end === part.end;
				const isLsIteration =
					isForWord &&
					part.type === "CommandSubstitution" &&
					startsWithCommand(part.body, "ls");

				context.report({
					node: part,
					messageId:
						part.type === "ParameterExpansion"
							? "unquotedParameterExpansion"
							: "unquotedCommandSubstitution",
					data:
						part.type === "ParameterExpansion"
							? { expansion: sourceCode.getText(part) }
							: {},
					fix:
						isWholeWord && !isLsIteration
							? fixer =>
									fixer.replaceText(
										word,
										`"${sourceCode.getText(word)}"`,
									)
							: undefined,
				});
			}
		}

		return {
			Command(node) {
				if (node.name) {
					checkWord(node.name);
				}

				for (const argument of node.arguments) {
					checkWord(argument);
				}
			},

			ForStatement(node) {
				for (const word of node.words) {
					checkWord(word, true);
				}
			},

			Redirect(node) {
				if (
					node.target &&
					!NON_SPLITTING_REDIRECTS.has(node.operator)
				) {
					checkWord(node.target);
				}
			},
		};
	},
};

export default rule;
