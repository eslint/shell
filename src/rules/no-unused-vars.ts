/**
 * @fileoverview Rule to flag variables that are assigned but never used.
 * Mirrors ShellCheck SC2034.
 */

import { getCommandName, getStaticText } from "./utils.js";
import type {
	ArithmeticExpressionNode,
	BashRuleDefinition,
	IdentifierNode,
	WordNode,
} from "../types.js";

/** Variables that are meaningful to the shell or to common external tools. */
const SPECIAL_VARIABLES = new Set([
	"BASH_ENV",
	"CDPATH",
	"EDITOR",
	"ENV",
	"GLOBIGNORE",
	"HISTCONTROL",
	"HISTFILE",
	"HISTFILESIZE",
	"HISTSIZE",
	"HOME",
	"IFS",
	"LANG",
	"LC_ALL",
	"LC_COLLATE",
	"LC_CTYPE",
	"LC_MESSAGES",
	"LC_NUMERIC",
	"LD_LIBRARY_PATH",
	"OPTARG",
	"OPTERR",
	"OPTIND",
	"PAGER",
	"PATH",
	"PROMPT_COMMAND",
	"PS1",
	"PS2",
	"PS3",
	"PS4",
	"REPLY",
	"TERM",
	"TMOUT",
	"TZ",
	"VISUAL",
]);

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*/u;

/** `read` flags that consume the following word as their argument. */
const READ_FLAGS_WITH_ARGUMENT = /^-[a-zA-Z]*[adinNptu]$/u;

/** Arithmetic operators that assign to their left operand. */
const ARITHMETIC_ASSIGNMENT = /^(?:=|\+=|-=|\*=|\/=|%=|<<=|>>=|&=|\^=|\|=)$/u;

const rule: BashRuleDefinition<{
	MessageIds: "unusedVariable";
	RuleOptions: [{ allowed?: string[] }?];
}> = {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow variables that are assigned but never used",
			recommended: true,
			url: "https://github.com/eslint/bash/blob/main/docs/rules/no-unused-vars.md",
		},
		schema: [
			{
				type: "object",
				properties: {
					allowed: {
						type: "array",
						items: { type: "string" },
					},
				},
				additionalProperties: false,
			},
		],
		defaultOptions: [{}],
		messages: {
			unusedVariable:
				"Variable '{{name}}' is assigned but never used. (ShellCheck SC2034)",
		},
	},

	create(context) {
		const [{ allowed = [] } = {}] = context.options;
		const allowedNames = new Set(allowed);
		const writes = new Map<string, IdentifierNode>();
		const reads = new Set<string>();

		// Set when the file uses constructs that can reference variables
		// dynamically (eval, source), making usage analysis unreliable.
		let unsafe = false;

		function addWrite(name: string, node: IdentifierNode): void {
			if (!writes.has(name)) {
				writes.set(name, node);
			}
		}

		function addReadableIdentifier(word: WordNode): void {
			const text = getStaticText(word);
			const match = text === null ? null : IDENTIFIER.exec(text);

			if (match) {
				reads.add(match[0]);
			}
		}

		/**
		 * Records reads/writes for bare identifiers inside arithmetic
		 * expressions, where `x` references the variable without `$`.
		 */
		function scanArithmetic(
			expression: ArithmeticExpressionNode,
			isWrite: boolean,
		): void {
			switch (expression.type) {
				case "Word": {
					const text = getStaticText(expression);
					const match = text === null ? null : IDENTIFIER.exec(text);

					if (match && match[0] === text) {
						if (isWrite) {
							const identifier: IdentifierNode = {
								type: "Identifier",
								start: expression.start,
								end: expression.end,
								name: text as string,
							};

							addWrite(text as string, identifier);
						} else {
							reads.add(match[0]);
						}
					}
					break;
				}

				case "BinaryArithmetic":
					if (ARITHMETIC_ASSIGNMENT.test(expression.operator)) {
						scanArithmetic(expression.left, true);

						// Compound assignments also read the variable.
						if (expression.operator !== "=") {
							scanArithmetic(expression.left, false);
						}
					} else {
						scanArithmetic(expression.left, false);
					}

					scanArithmetic(expression.right, false);
					break;

				case "UnaryArithmetic":
					if (
						expression.operator === "++" ||
						expression.operator === "--"
					) {
						scanArithmetic(expression.argument, true);
					}

					scanArithmetic(expression.argument, false);
					break;

				case "ParenthesizedArithmetic":
					scanArithmetic(expression.expression, false);
					break;

				// no default
			}
		}

		return {
			VariableAssignment(node) {
				if (node.name) {
					const parent = context.sourceCode.getParent(node);

					// Environment prefixes such as `FOO=1 cmd` are passed to
					// the command and therefore used.
					if (parent?.type === "Command" && parent.name !== null) {
						reads.add(node.name.name);
					}

					addWrite(node.name.name, node.name);
				}

				if (node.index) {
					scanArithmetic(node.index, false);
				}
			},

			ParameterExpansion(node) {
				reads.add(node.name);

				if (node.index) {
					scanArithmetic(node.index, false);
				}
			},

			ForStatement(node) {
				if (node.variable) {
					addWrite(node.variable.name, node.variable);
				}
			},

			ArithmeticCommand(node) {
				if (node.expression) {
					scanArithmetic(node.expression, false);
				}
			},

			ArithmeticExpansion(node) {
				if (node.expression) {
					scanArithmetic(node.expression, false);
				}
			},

			ArithmeticForStatement(node) {
				for (const expression of [node.init, node.test, node.update]) {
					if (expression) {
						scanArithmetic(expression, false);
					}
				}
			},

			LetCommand(node) {
				for (const expression of node.expressions) {
					scanArithmetic(expression, false);
				}
			},

			DeclarationCommand(node) {
				let exported = node.kind === "export";
				let nameref = node.kind === "nameref";

				for (const argument of node.arguments) {
					if (argument.type === "Word") {
						const text = getStaticText(argument);

						if (text !== null && text.startsWith("-")) {
							if (text.includes("x")) {
								exported = true;
							}

							if (text.includes("n")) {
								nameref = true;
							}
						}
					}
				}

				if (nameref) {
					unsafe = true;
				}

				if (!exported) {
					return;
				}

				// Exported variables are visible to child processes, so
				// consider them used.
				for (const argument of node.arguments) {
					if (
						argument.type === "VariableAssignment" &&
						argument.name
					) {
						reads.add(argument.name.name);
					}
				}
			},

			Command(node) {
				const name = getCommandName(node);

				switch (name) {
					case "eval":
					case "source":
					case ".":
						unsafe = true;
						break;

					case "unset":
					case "export":
					case "readonly":
						for (const argument of node.arguments) {
							addReadableIdentifier(argument);
						}
						break;

					case "getopts": {
						const variable = node.arguments[1];

						if (variable) {
							const text = getStaticText(variable);

							if (text !== null && IDENTIFIER.test(text)) {
								addWrite(text, {
									type: "Identifier",
									start: variable.start,
									end: variable.end,
									name: text,
								});
							}
						}
						break;
					}

					case "read":
					case "mapfile":
					case "readarray": {
						let skipNext = false;

						for (const argument of node.arguments) {
							if (skipNext) {
								skipNext = false;
								continue;
							}

							const text = getStaticText(argument);

							if (text === null) {
								continue;
							}

							if (text.startsWith("-")) {
								skipNext =
									name === "read" &&
									READ_FLAGS_WITH_ARGUMENT.test(text);
								continue;
							}

							if (IDENTIFIER.test(text)) {
								addWrite(text, {
									type: "Identifier",
									start: argument.start,
									end: argument.end,
									name: text,
								});
							}
						}
						break;
					}

					// no default
				}
			},

			"Program:exit"() {
				if (unsafe) {
					return;
				}

				for (const [name, identifier] of writes) {
					if (
						reads.has(name) ||
						SPECIAL_VARIABLES.has(name) ||
						allowedNames.has(name) ||
						name.startsWith("_")
					) {
						continue;
					}

					context.report({
						node: identifier,
						messageId: "unusedVariable",
						data: { name },
					});
				}
			},
		};
	},
};

export default rule;
