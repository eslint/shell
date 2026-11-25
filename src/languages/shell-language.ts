/**
 * @fileoverview The ShellLanguage class, the ESLint Language implementation
 * for shell scripts.
 */

//------------------------------------------------------------------------------
// Import
//------------------------------------------------------------------------------

import type { File, Language, OkParseResult, ParseResult } from "@eslint/core";
import { ShellSyntaxError, parseShell } from "../parser/parse.js";
import { ShellSourceCode } from "./shell-source-code.js";
import { visitorKeys } from "../visitor-keys.js";
import type {
	ShellLanguageOptions,
	ShellNode,
	ShellVariant,
	CommentNode,
	ProgramNode,
} from "../types.js";

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

const SHELL_MODES = new Set(["bash", "posix", "mksh"]);

//------------------------------------------------------------------------------
// Types
//------------------------------------------------------------------------------

/**
 * Options for creating a shell language instance.
 */
export interface ShellLanguageConstructorOptions {
	/** The shell dialect to parse. Defaults to `"bash"`. */
	mode?: ShellVariant;
}

/**
 * A successful parse containing the shell AST and its comments.
 */
export type ShellOkParseResult = OkParseResult<ProgramNode> & {
	comments: CommentNode[];
};

//------------------------------------------------------------------------------
// Exports
//------------------------------------------------------------------------------

/**
 * ESLint Language implementation for shell scripts. Each instance parses
 * one shell dialect, chosen by the `mode` constructor option.
 */
export class ShellLanguage implements Language<{
	LangOptions: ShellLanguageOptions;
	Code: ShellSourceCode;
	RootNode: ProgramNode;
	Node: ShellNode;
}> {
	/**
	 * The type of file to read.
	 */
	fileType = "text" as const;

	/**
	 * The line number at which the parser starts counting.
	 */
	lineStart = 1 as const;

	/**
	 * The column number at which the parser starts counting.
	 */
	columnStart = 1 as const;

	/**
	 * The name of the key that holds the type of the node.
	 */
	nodeTypeKey = "type";

	/**
	 * The child properties to visit for each shell node type, in traversal order.
	 */
	visitorKeys = visitorKeys;

	/**
	 * Default language options. User-defined options are merged with this object.
	 */
	defaultLanguageOptions: ShellLanguageOptions = {};

	/**
	 * The shell parser mode.
	 */
	#mode: ShellVariant;

	/**
	 * Creates a new instance.
	 * @param [options] The options to use for this instance.
	 * @param [options.mode] The shell parser mode to use.
	 * @throws {TypeError} When the requested dialect is unsupported.
	 */
	constructor({ mode = "bash" }: ShellLanguageConstructorOptions = {}) {
		if (!SHELL_MODES.has(mode)) {
			throw new TypeError(
				`Invalid shell mode "${String(mode)}". Expected "bash", "posix", or "mksh".`,
			);
		}

		this.#mode = mode;
	}

	/**
	 * Validates the language options.
	 */
	validateLanguageOptions(_languageOptions?: ShellLanguageOptions): void {
		// There are no language options to validate.
	}

	/**
	 * Parses the given file into an AST.
	 * @param file The virtual file to parse.
	 * @returns The result of parsing.
	 */
	parse(file: File): ParseResult<ProgramNode> {
		const text = file.body as string;

		try {
			const { ast, comments } = parseShell(text, {
				variant: this.#mode,
				path: file.path,
			});

			return { ok: true, ast, comments };
		} catch (error) {
			if (error instanceof ShellSyntaxError) {
				return {
					ok: false,
					errors: [
						{
							message: error.message,
							line: error.line,
							column: error.column,
						},
					],
				};
			}

			return {
				ok: false,
				errors: [
					{
						message:
							error instanceof Error
								? error.message
								: String(error),
						line: 1,
						column: 1,
					},
				],
			};
		}
	}

	/**
	 * Creates a new `ShellSourceCode` object from the given information.
	 * @param file The virtual file to create a `ShellSourceCode` object from.
	 * @param parseResult The result returned from `parse()`.
	 * @returns The new `ShellSourceCode` object.
	 */
	createSourceCode(
		file: File,
		parseResult: ShellOkParseResult,
	): ShellSourceCode {
		return new ShellSourceCode({
			text: file.body as string,
			ast: parseResult.ast,
		});
	}
}
