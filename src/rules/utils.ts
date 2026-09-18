/**
 * @fileoverview Shared helpers for shell rules.
 */

import type {
	CommandNode,
	CommandSubstitutionNode,
	ParameterExpansionNode,
	StatementNode,
	WordNode,
	WordPartNode,
} from "../types.js";

/**
 * Returns the plain text of a word when it is fully static (made up only of
 * literals and quoted literals), or `null` when the word contains
 * expansions. Quotes are removed from the result.
 */
export function getStaticText(word: WordNode): string | null {
	let result = "";

	for (const part of word.parts) {
		const text = getStaticPartText(part);

		if (text === null) {
			return null;
		}

		result += text;
	}

	return result;
}

function getStaticPartText(part: WordPartNode): string | null {
	switch (part.type) {
		case "Literal":
			return part.value;

		case "SingleQuotedString":
			return part.value;

		case "DoubleQuotedString": {
			let result = "";

			for (const inner of part.parts) {
				const text = getStaticPartText(inner);

				if (text === null) {
					return null;
				}

				result += text;
			}

			return result;
		}

		default:
			return null;
	}
}

/**
 * Returns the name of a command when it is a static word, or `null`.
 */
export function getCommandName(command: CommandNode): string | null {
	if (!command.name) {
		return null;
	}

	return getStaticText(command.name);
}

/**
 * Determines whether a command node is a simple command with the given name.
 */
export function isCommandNamed(
	statement: StatementNode,
	name: string,
): statement is CommandNode {
	return statement.type === "Command" && getCommandName(statement) === name;
}

/**
 * Returns all expansions in a word, including those nested inside double
 * quotes when `includeQuoted` is `true`.
 */
export function getExpansions(
	word: WordNode,
	{ includeQuoted = false } = {},
): (ParameterExpansionNode | CommandSubstitutionNode)[] {
	const expansions: (ParameterExpansionNode | CommandSubstitutionNode)[] = [];

	const visitParts = (parts: WordPartNode[], quoted: boolean): void => {
		for (const part of parts) {
			if (
				part.type === "ParameterExpansion" ||
				part.type === "CommandSubstitution"
			) {
				if (!quoted || includeQuoted) {
					expansions.push(part);
				}
			} else if (part.type === "DoubleQuotedString") {
				visitParts(part.parts, true);
			}
		}
	};

	visitParts(word.parts, false);

	return expansions;
}
