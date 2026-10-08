/**
 * @fileoverview The ShellLanguage class, the ESLint Language implementation
 * for shell scripts.
 */

import type {
	File,
	Language,
	LanguageContext,
	OkParseResult,
	ParseResult,
} from "@eslint/core";
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

const SHELL_VARIANTS = new Set(["bash", "posix", "mksh"]);

export type ShellOkParseResult = OkParseResult<ProgramNode> & {
	comments: CommentNode[];
};

export interface ShellLanguageConstructorOptions {
	/** The shell dialect this language parses. Defaults to `"bash"`. */
	variant?: ShellVariant;
}

/**
 * ESLint Language implementation for shell scripts.
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

	defaultLanguageOptions: ShellLanguageOptions;

	constructor({ variant = "bash" }: ShellLanguageConstructorOptions = {}) {
		if (!SHELL_VARIANTS.has(variant)) {
			throw new TypeError(
				`Invalid shell variant "${String(variant)}". Expected "bash", "posix", or "mksh".`,
			);
		}

		this.defaultLanguageOptions = { variant };
	}

	validateLanguageOptions(languageOptions: ShellLanguageOptions): void {
		if (
			languageOptions.variant !== undefined &&
			!SHELL_VARIANTS.has(languageOptions.variant as string)
		) {
			throw new TypeError(
				`Invalid shell variant "${String(languageOptions.variant)}". Expected "bash", "posix", or "mksh".`,
			);
		}
	}

	parse(
		file: File,
		context?: LanguageContext<ShellLanguageOptions>,
	): ParseResult<ProgramNode> {
		const text = file.body as string;

		try {
			const { ast, comments } = parseShell(text, {
				variant:
					context?.languageOptions?.variant ??
					this.defaultLanguageOptions.variant,
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
