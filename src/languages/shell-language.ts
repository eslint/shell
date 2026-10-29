/**
 * @fileoverview The ShellLanguage class, the ESLint Language implementation
 * for shell scripts.
 */

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

const SHELL_MODES = new Set(["bash", "posix", "mksh"]);

export interface ShellLanguageConstructorOptions {
	/** The shell dialect to parse. Defaults to `"bash"`. */
	mode?: ShellVariant;
}

export type ShellOkParseResult = OkParseResult<ProgramNode> & {
	comments: CommentNode[];
};

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
	fileType = "text" as const;
	lineStart = 1 as const;
	columnStart = 1 as const;
	nodeTypeKey = "type";
	visitorKeys = visitorKeys;

	defaultLanguageOptions: ShellLanguageOptions = {};

	#mode: ShellVariant;

	constructor({ mode = "bash" }: ShellLanguageConstructorOptions = {}) {
		if (!SHELL_MODES.has(mode)) {
			throw new TypeError(
				`Invalid shell mode "${String(mode)}". Expected "bash", "posix", or "mksh".`,
			);
		}

		this.#mode = mode;
	}

	validateLanguageOptions(): void {
		// There are no language options to validate.
	}

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
